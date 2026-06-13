import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { sanitizeInput, isValidEmail } from "@/lib/sanitize";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { verifyTurnstile } from "@/lib/turnstile";
import { buildContactAdminEmail, buildContactUserEmail } from "@/lib/email-templates";
import { CONTACT_SERVICE_TYPE_SET } from "@/lib/contact-service-types";
import prisma from "@/lib/prisma";

function contactRecipientEmail(): string | undefined {
  return (
    process.env.CONTACT_EMAIL?.trim() ||
    process.env.ADMIN_EMAIL?.trim() ||
    process.env.SMTP_USER?.trim() ||
    undefined
  );
}

export async function POST(request: NextRequest) {
  try {
    const clientIp = getClientIp(request);
    const rateLimit = checkRateLimit(`contact:${clientIp}`, { maxRequests: 5, windowMs: 60 * 1000 });
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: `Too many requests. Please try again in ${rateLimit.resetIn} seconds.` },
        { status: 429 }
      );
    }

    const body = await request.json();

    const turnstileResult = await verifyTurnstile(body.turnstileToken, clientIp);
    if (!turnstileResult.success) {
      return NextResponse.json({ error: turnstileResult.error }, { status: 403 });
    }

    const fullName = sanitizeInput(body.fullName);
    const email = sanitizeInput(body.email);
    const phone = sanitizeInput(body.phone);
    const phoneCode = sanitizeInput(body.phoneCode) || "+1";
    const serviceType = sanitizeInput(body.serviceType);
    const pickup = sanitizeInput(body.pickup);
    const dropoff = sanitizeInput(body.dropoff);
    const pickupTime = sanitizeInput(body.pickupTime);
    const additionalNotes = sanitizeInput(body.additionalNotes);

    if (!fullName || !email || !phone || !serviceType) {
      return NextResponse.json({ error: "Please fill in all required fields" }, { status: 400 });
    }

    if (!isValidEmail(email)) {
      return NextResponse.json({ error: "Please enter a valid email address" }, { status: 400 });
    }

    if (!CONTACT_SERVICE_TYPE_SET.has(serviceType)) {
      return NextResponse.json({ error: "Please select a valid service type" }, { status: 400 });
    }

    const adminTo = contactRecipientEmail();
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
      console.error("Contact form: SMTP not configured");
      return NextResponse.json(
        { error: "Email service is not configured. Please try again later or call us directly." },
        { status: 503 }
      );
    }

    if (!adminTo) {
      console.error("Contact form: no CONTACT_EMAIL / ADMIN_EMAIL / SMTP_USER");
      return NextResponse.json(
        { error: "Email service is not configured. Please try again later or call us directly." },
        { status: 503 }
      );
    }

    const fullPhone = `${phoneCode}${phone}`;

    const adminEmailHtml = buildContactAdminEmail({
      fullName,
      email,
      phone: fullPhone,
      serviceType,
      pickup: pickup || undefined,
      dropoff: dropoff || undefined,
      pickupTime: pickupTime || undefined,
      notes: additionalNotes || undefined,
    });

    const userEmailHtml = buildContactUserEmail({
      fullName,
      email,
      phone: fullPhone,
      serviceType,
      pickup: pickup || undefined,
      dropoff: dropoff || undefined,
      pickupTime: pickupTime || undefined,
      notes: additionalNotes || undefined,
    });

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 465,
      secure: true,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
      tls: { rejectUnauthorized: false },
    });

    await transporter.verify();

    await transporter.sendMail({
      from: `"SARJ Website" <${process.env.SMTP_USER}>`,
      to: adminTo,
      subject: `New Contact Form: ${fullName} — ${serviceType}`,
      html: adminEmailHtml,
    });

    await transporter.sendMail({
      from: `"SARJ WORLDWIDE" <${process.env.SMTP_USER}>`,
      to: email,
      subject: "Your Message Has Been Received - SARJ WORLDWIDE",
      html: userEmailHtml,
    });

    const quoteId = `CF-${Date.now().toString(36).toUpperCase()}`;
    await prisma.quote.create({
      data: {
        quoteId,
        passengerName: fullName,
        passengers: "N/A",
        phone: fullPhone,
        email,
        serviceType,
        vehicle: null,
        pickupTime: pickupTime || null,
        pickupLocation: pickup || "Not provided",
        dropoffLocation: dropoff || "Not provided",
        additionalNotes: additionalNotes || null,
        status: "NEW",
      },
    });

    return NextResponse.json({
      success: true,
      message: "Your message has been sent successfully!",
    });
  } catch (error: unknown) {
    console.error("Contact form error:", error);
    const err = error as { code?: string; message?: string };

    let errorMessage = "Failed to send message. Please try again later.";
    if (err.code === "EAUTH") {
      errorMessage = "Email authentication failed. Please try again later or call us directly.";
    } else if (err.code === "ECONNECTION" || err.code === "ESOCKET") {
      errorMessage = "Could not connect to email server. Please try again later.";
    }

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
