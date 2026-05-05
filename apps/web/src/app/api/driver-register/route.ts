import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Resend } from "resend";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import {
  mergeDriverInviteRegistration,
  getVisibleComplianceDocKeys,
  parseVisibleFieldsFromDb,
  DRIVER_INVITE_FIELD_LABELS,
  type DriverInviteFieldKey,
  type MergedDriverRegistration,
} from "@/lib/driver-invite-config";

// Initialize Resend only if API key exists
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

// Rate limiting map
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS = 5;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(ip);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }

  if (record.count >= MAX_REQUESTS) {
    return false;
  }

  record.count++;
  return true;
}

// Sanitize input
function sanitizeInput(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, "")
    .slice(0, 500);
}

function sanitizeDocUrl(url: string | null): string | null {
  if (!url || typeof url !== "string") return null;
  const t = url.trim().replace(/[<>]/g, "").slice(0, 2048);
  return t || null;
}

// Generate unique driver ID
function generateDriverId(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let id = "DRV-";
  for (let i = 0; i < 6; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}

// POST: Register driver with valid invite token
export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { success: false, error: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const {
      token,
      turnstileToken,
      name,
      phone,
      email,
      vehicle,
      vehiclePlate,
      photo,
      backgroundCheck,
      commercialInsurance,
      driverLicence,
      proofOfWorkEligibility,
      municipalTaxiLimoLicence,
      vehicleInsurance,
      vehicleRegistration,
    } = body;

    if (!token || typeof token !== "string") {
      return NextResponse.json({ success: false, error: "Invalid invitation" }, { status: 400 });
    }

    // Validate invite token early (needed for dynamic field merge)
    const invite = await prisma.driverInvite.findUnique({
      where: { token },
    });

    if (!invite) {
      return NextResponse.json(
        { success: false, error: "Invalid invitation link" },
        { status: 404 }
      );
    }

    if (invite.status !== "PENDING") {
      return NextResponse.json(
        { success: false, error: "This invitation has already been used or is no longer valid" },
        { status: 410 }
      );
    }

    if (new Date() > invite.expiresAt) {
      await prisma.driverInvite.update({
        where: { id: invite.id },
        data: { status: "EXPIRED" },
      });

      return NextResponse.json(
        { success: false, error: "This invitation has expired" },
        { status: 410 }
      );
    }

    const merged = mergeDriverInviteRegistration(invite, {
      name,
      email,
      phone,
      vehicle,
      vehiclePlate,
      photo,
      backgroundCheck,
      commercialInsurance,
      driverLicence,
      proofOfWorkEligibility,
      municipalTaxiLimoLicence,
      vehicleInsurance,
      vehicleRegistration,
    });

    if (!merged.name || !merged.email || !merged.phone || !merged.vehicle || !merged.vehiclePlate) {
      return NextResponse.json(
        { success: false, error: "Missing required registration information" },
        { status: 400 }
      );
    }

    const visibleParsed = parseVisibleFieldsFromDb(invite.visibleFields);
    for (const key of getVisibleComplianceDocKeys(visibleParsed)) {
      const val = merged[key as keyof MergedDriverRegistration];
      if (val == null || (typeof val === "string" && !val.trim())) {
        return NextResponse.json(
          {
            success: false,
            error: `Required document missing: ${DRIVER_INVITE_FIELD_LABELS[key as DriverInviteFieldKey]}`,
          },
          { status: 400 }
        );
      }
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(merged.email)) {
      return NextResponse.json(
        { success: false, error: "Please enter a valid email address" },
        { status: 400 }
      );
    }

    const phoneRegex = /^[\d\s\-+()]{10,}$/;
    if (!phoneRegex.test(merged.phone)) {
      return NextResponse.json(
        { success: false, error: "Please enter a valid phone number" },
        { status: 400 }
      );
    }

    // Verify Turnstile token
    if (!turnstileToken) {
      return NextResponse.json(
        { success: false, error: "Security verification required" },
        { status: 400 }
      );
    }

    const turnstileResponse = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          secret: process.env.TURNSTILE_SECRET_KEY || "",
          response: turnstileToken,
          remoteip: ip,
        }),
      }
    );

    const turnstileResult = await turnstileResponse.json();
    if (!turnstileResult.success) {
      return NextResponse.json(
        { success: false, error: "Security verification failed. Please try again." },
        { status: 400 }
      );
    }

    // Check if email already exists
    const existingDriver = await prisma.driver.findUnique({
      where: { email: sanitizeInput(merged.email) },
    });

    if (existingDriver) {
      return NextResponse.json(
        { success: false, error: "A driver with this email already exists" },
        { status: 400 }
      );
    }

    const plainPassword = crypto.randomBytes(18).toString("base64url").slice(0, 20);
    const hashedPassword = await bcrypt.hash(plainPassword, 12);

    // Generate unique driver ID
    let driverId = generateDriverId();
    let idExists = true;
    let attempts = 0;

    while (idExists && attempts < 10) {
      const existing = await prisma.driver.findUnique({
        where: { driverId },
      });
      if (!existing) {
        idExists = false;
      } else {
        driverId = generateDriverId();
        attempts++;
      }
    }

    // Create driver using transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create the driver
      const driver = await tx.driver.create({
        data: {
          driverId,
          name: sanitizeInput(merged.name),
          phone: sanitizeInput(merged.phone),
          email: sanitizeInput(merged.email),
          vehicle: sanitizeInput(merged.vehicle),
          vehiclePlate: sanitizeInput(merged.vehiclePlate).toUpperCase(),
          password: hashedPassword,
          photo: merged.photo || null,
          backgroundCheckUrl: sanitizeDocUrl(merged.backgroundCheck),
          commercialInsuranceUrl: sanitizeDocUrl(merged.commercialInsurance),
          driverLicenceUrl: sanitizeDocUrl(merged.driverLicence),
          proofOfWorkEligibilityUrl: sanitizeDocUrl(merged.proofOfWorkEligibility),
          municipalTaxiLimoLicenceUrl: sanitizeDocUrl(merged.municipalTaxiLimoLicence),
          vehicleInsuranceUrl: sanitizeDocUrl(merged.vehicleInsurance),
          vehicleRegistrationUrl: sanitizeDocUrl(merged.vehicleRegistration),
          status: "available",
          rating: 5.0,
          totalTrips: 0,
        },
      });

      // Mark invite as used
      await tx.driverInvite.update({
        where: { id: invite.id },
        data: {
          status: "USED",
          usedAt: new Date(),
        },
      });

      return driver;
    });

    // Send notification emails (only if Resend is configured)
    if (resend) {
      // Send notification email to admin
      try {
        await resend.emails.send({
          from: "SARJ Worldwide <no-reply@sarjworldwide.com>",
          to: process.env.ADMIN_EMAIL || "reserve@sarjworldwide.com",
          subject: `New Driver Registration: ${result.name}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%); padding: 30px; text-align: center;">
                <h1 style="color: #C9A063; margin: 0; font-size: 24px;">New Driver Registration</h1>
              </div>
              <div style="padding: 30px; background: #ffffff;">
                <p style="color: #333; font-size: 16px; margin-bottom: 20px;">
                  A new driver has registered through the invitation link.
                </p>
                
                <div style="background: #f8f8f8; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                  <h3 style="color: #C9A063; margin-top: 0;">Driver Details</h3>
                  <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                      <td style="padding: 8px 0; color: #666; width: 40%;">Driver ID:</td>
                      <td style="padding: 8px 0; color: #333; font-weight: bold;">${result.driverId}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; color: #666;">Name:</td>
                      <td style="padding: 8px 0; color: #333; font-weight: bold;">${result.name}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; color: #666;">Email:</td>
                      <td style="padding: 8px 0; color: #333;">${result.email}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; color: #666;">Phone:</td>
                      <td style="padding: 8px 0; color: #333;">${result.phone}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; color: #666;">Vehicle:</td>
                      <td style="padding: 8px 0; color: #333;">${result.vehicle}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; color: #666;">Vehicle Plate:</td>
                      <td style="padding: 8px 0; color: #333; font-weight: bold;">${result.vehiclePlate}</td>
                    </tr>
                  </table>
                </div>
                
                <p style="color: #666; font-size: 14px;">
                  You can view and manage this driver in your admin panel.
                </p>
              </div>
              <div style="background: #f5f5f5; padding: 20px; text-align: center;">
                <p style="color: #999; font-size: 12px; margin: 0;">
                  This is an automated notification from SARJ Worldwide.
                </p>
              </div>
            </div>
          `,
        });
      } catch (emailError) {
        console.error("Failed to send admin notification email:", emailError);
      }

      // Send confirmation email to driver
      try {
        await resend.emails.send({
          from: "SARJ Worldwide <no-reply@sarjworldwide.com>",
          to: result.email,
          subject: "Welcome to SARJ Worldwide - Registration Complete",
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%); padding: 30px; text-align: center;">
                <h1 style="color: #C9A063; margin: 0; font-size: 24px;">Welcome to SARJ Worldwide</h1>
              </div>
              <div style="padding: 30px; background: #ffffff;">
                <p style="color: #333; font-size: 16px; margin-bottom: 20px;">
                  Dear ${result.name},
                </p>
                <p style="color: #333; font-size: 16px; margin-bottom: 20px;">
                  Thank you for registering as a driver with SARJ Worldwide. Your registration has been successfully completed.
                </p>
                
                <div style="background: #f8f8f8; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                  <h3 style="color: #C9A063; margin-top: 0;">Your Details</h3>
                  <p style="margin: 5px 0;"><strong>Driver ID:</strong> ${result.driverId}</p>
                  <p style="margin: 5px 0;"><strong>Vehicle:</strong> ${result.vehicle}</p>
                  <p style="margin: 5px 0;"><strong>Plate:</strong> ${result.vehiclePlate}</p>
                  <p style="margin: 12px 0 0 0; padding-top: 12px; border-top: 1px solid #ddd; color: #333;"><strong>Driver app login password:</strong></p>
                  <p style="margin: 8px 0 0 0; font-family: monospace; font-size: 15px; font-weight: bold; letter-spacing: 0.5px;">${plainPassword}</p>
                  <p style="margin: 8px 0 0 0; font-size: 13px; color: #666;">Use this email and password to sign in to the driver app. Store it securely.</p>
                </div>
                
                <p style="color: #666; font-size: 14px;">
                  Our team will be in touch with you shortly regarding next steps and trip assignments.
                </p>
              </div>
              <div style="background: #f5f5f5; padding: 20px; text-align: center;">
                <p style="color: #999; font-size: 12px; margin: 0;">
                  © ${new Date().getFullYear()} SARJ Worldwide. All rights reserved.
                </p>
              </div>
            </div>
          `,
        });
      } catch (emailError) {
        console.error("Failed to send driver confirmation email:", emailError);
      }
    }

    return NextResponse.json({
      success: true,
      message: "Registration successful! Welcome to SARJ Worldwide.",
      driver: {
        driverId: result.driverId,
        name: result.name,
      },
    });
  } catch (error: any) {
    console.error("Driver registration error:", error);

    if (error?.code === "P2002") {
      return NextResponse.json(
        { success: false, error: "A driver with this email or information already exists" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: "Registration failed. Please try again." },
      { status: 500 }
    );
  }
}
