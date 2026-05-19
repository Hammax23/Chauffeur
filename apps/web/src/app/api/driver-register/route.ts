import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { escapeHtml, sendTransactionalEmail } from "@/lib/email-delivery";
import {
  mergeDriverInviteRegistration,
  getVisibleComplianceDocKeys,
  parseVisibleFieldsFromDb,
  DRIVER_INVITE_FIELD_LABELS,
  type DriverInviteFieldKey,
  type MergedDriverRegistration,
} from "@/lib/driver-invite-config";

const ISO_DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Parse YYYY-MM-DD as UTC midnight; invalid calendar dates return null. */
function parseDateOnlyUtc(iso: unknown): Date | null {
  if (typeof iso !== "string") return null;
  const m = iso.trim().match(ISO_DATE_ONLY);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const dt = new Date(Date.UTC(y, mo - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) return null;
  return dt;
}

/** Expiry date is valid through end of that calendar day (UTC). */
function documentStatusForExpiry(expiryUtc: Date): "VALID" | "EXPIRED" {
  const now = new Date();
  const todayStart = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const expiryStart = Date.UTC(expiryUtc.getUTCFullYear(), expiryUtc.getUTCMonth(), expiryUtc.getUTCDate());
  return expiryStart < todayStart ? "EXPIRED" : "VALID";
}

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
      documentExpiries: rawDocumentExpiries,
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
    const documentExpiries =
      rawDocumentExpiries && typeof rawDocumentExpiries === "object" && !Array.isArray(rawDocumentExpiries)
        ? (rawDocumentExpiries as Record<string, unknown>)
        : {};

    const complianceExpiryUtc = new Map<DriverInviteFieldKey, Date>();
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
      const exp = parseDateOnlyUtc(documentExpiries[key]);
      if (!exp) {
        return NextResponse.json(
          {
            success: false,
            error: `Enter the expiry date on the document using format YYYY-MM-DD (year-month-day), e.g. 2030-08-21 — for: ${DRIVER_INVITE_FIELD_LABELS[key as DriverInviteFieldKey]}`,
          },
          { status: 400 }
        );
      }
      complianceExpiryUtc.set(key, exp);
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

    // Create pending application (admin must approve before driver account is created)
    const result = await prisma.$transaction(async (tx) => {
      // Block token reuse immediately on first submit (enterprise: one-time onboarding link)
      await tx.driverInvite.update({
        where: { id: invite.id },
        data: { status: "USED", usedAt: new Date() },
      });

      const app = await tx.driverApplication.create({
        data: {
          inviteId: invite.id,
          status: "SUBMITTED",
          name: sanitizeInput(merged.name),
          phone: sanitizeInput(merged.phone),
          email: sanitizeInput(merged.email),
          vehicle: sanitizeInput(merged.vehicle),
          vehiclePlate: sanitizeInput(merged.vehiclePlate).toUpperCase(),
          photo: merged.photo || null,
          backgroundCheckUrl: sanitizeDocUrl(merged.backgroundCheck),
          commercialInsuranceUrl: sanitizeDocUrl(merged.commercialInsurance),
          driverLicenceUrl: sanitizeDocUrl(merged.driverLicence),
          proofOfWorkEligibilityUrl: sanitizeDocUrl(merged.proofOfWorkEligibility),
          municipalTaxiLimoLicenceUrl: sanitizeDocUrl(merged.municipalTaxiLimoLicence),
          vehicleInsuranceUrl: sanitizeDocUrl(merged.vehicleInsurance),
          vehicleRegistrationUrl: sanitizeDocUrl(merged.vehicleRegistration),
        },
      });

      const urlByKey: Partial<Record<DriverInviteFieldKey, string | null>> = {
        backgroundCheck: sanitizeDocUrl(merged.backgroundCheck),
        commercialInsurance: sanitizeDocUrl(merged.commercialInsurance),
        driverLicence: sanitizeDocUrl(merged.driverLicence),
        proofOfWorkEligibility: sanitizeDocUrl(merged.proofOfWorkEligibility),
        municipalTaxiLimoLicence: sanitizeDocUrl(merged.municipalTaxiLimoLicence),
        vehicleInsurance: sanitizeDocUrl(merged.vehicleInsurance),
        vehicleRegistration: sanitizeDocUrl(merged.vehicleRegistration),
      };

      for (const key of getVisibleComplianceDocKeys(visibleParsed)) {
        const url = urlByKey[key];
        const exp = complianceExpiryUtc.get(key);
        if (!url || !exp) continue;
        await tx.driverApplicationDocument.create({
          data: {
            applicationId: app.id,
            key,
            url,
            confirmedExpiryDate: exp,
            expirySource: "DRIVER",
            status: documentStatusForExpiry(exp),
          },
        });
      }

      return app;
    });

    const safeName = escapeHtml(result.name);
    const refId = escapeHtml(result.id);
    const adm = {
      name: escapeHtml(result.name),
      email: escapeHtml(result.email),
      phone: escapeHtml(result.phone),
      vehicle: escapeHtml(result.vehicle),
      vehiclePlate: escapeHtml(result.vehiclePlate),
    };

    const adminEmailHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%); padding: 30px; text-align: center;">
                <h1 style="color: #C9A063; margin: 0; font-size: 24px;">New Driver Application</h1>
              </div>
              <div style="padding: 30px; background: #ffffff;">
                <p style="color: #333; font-size: 16px; margin-bottom: 20px;">
                  A driver has submitted the invitation registration form. Admin approval is required before the driver can log in.
                </p>
                <div style="background: #f8f8f8; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                  <h3 style="color: #C9A063; margin-top: 0;">Driver Details</h3>
                  <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                      <td style="padding: 8px 0; color: #666;">Name:</td>
                      <td style="padding: 8px 0; color: #333; font-weight: bold;">${adm.name}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; color: #666;">Email:</td>
                      <td style="padding: 8px 0; color: #333;">${adm.email}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; color: #666;">Phone:</td>
                      <td style="padding: 8px 0; color: #333;">${adm.phone}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; color: #666;">Vehicle:</td>
                      <td style="padding: 8px 0; color: #333;">${adm.vehicle}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; color: #666;">Vehicle Plate:</td>
                      <td style="padding: 8px 0; color: #333; font-weight: bold;">${adm.vehiclePlate}</td>
                    </tr>
                  </table>
                </div>
                <p style="color: #666; font-size: 14px;">
                  Please review documents and approve/reject in the admin panel.
                </p>
              </div>
              <div style="background: #f5f5f5; padding: 20px; text-align: center;">
                <p style="color: #999; font-size: 12px; margin: 0;">
                  This is an automated notification from SARJ Worldwide.
                </p>
              </div>
            </div>
          `;

    const driverEmailHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%); padding: 28px; text-align: center;">
                <h1 style="color: #C9A063; margin: 0; font-size: 22px;">Application Submitted</h1>
              </div>
              <div style="padding: 28px 30px; background: #ffffff;">
                <p style="color: #333; font-size: 16px; margin: 0 0 16px 0;">
                  Thank you, <strong>${safeName}</strong>. Your details have been received successfully.
                </p>
                <p style="color: #555; font-size: 14px; line-height: 1.6; margin: 0 0 22px 0;">
                  Please stay connected to your email. After our team reviews and approves your information and documents,
                  you will be informed there.
                </p>
                <div style="background: #f8f8f8; border: 1px solid #e5e5e5; border-radius: 10px; padding: 16px 18px;">
                  <p style="color: #888; font-size: 12px; margin: 0 0 6px 0; text-transform: uppercase; letter-spacing: 0.04em;">
                    Reference ID
                  </p>
                  <p style="color: #1a1a1a; font-size: 15px; font-family: ui-monospace, Consolas, monospace; margin: 0; word-break: break-all;">
                    ${refId}
                  </p>
                </div>
                <p style="color: #999; font-size: 12px; margin: 22px 0 0 0;">
                  Keep this email for your records. If you did not submit this application, please contact support.
                </p>
              </div>
              <div style="background: #f5f5f5; padding: 18px; text-align: center;">
                <p style="color: #999; font-size: 12px; margin: 0;">
                  © ${new Date().getFullYear()} SARJ Worldwide. All rights reserved.
                </p>
              </div>
            </div>
          `;

    const adminTo = process.env.ADMIN_EMAIL || "reserve@sarjworldwide.com";

    const adminSent = await sendTransactionalEmail({
      to: adminTo,
      subject: `Driver Application Submitted: ${result.name}`,
      html: adminEmailHtml,
      logLabel: "driver-register-admin",
    });

    const driverSent = await sendTransactionalEmail({
      to: result.email,
      subject: "Application submitted — SARJ Worldwide",
      html: driverEmailHtml,
      logLabel: "driver-register-driver",
    });

    if (!adminSent || !driverSent) {
      console.warn("[driver-register] Email incomplete:", { adminSent, driverSent });
    }

    return NextResponse.json({
      success: true,
      message: "Application submitted. Admin approval is required before you can sign in.",
      application: { id: result.id },
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
