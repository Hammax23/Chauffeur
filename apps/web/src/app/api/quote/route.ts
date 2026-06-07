import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { sanitizeInput, sanitizeArray } from "@/lib/sanitize";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { verifyTurnstile } from "@/lib/turnstile";
import prisma from "@/lib/prisma";
import { buildQuoteAdminEmail, buildQuoteUserEmail } from "@/lib/email-templates";

export async function POST(request: NextRequest) {
  try {
    // Rate limiting: 5 requests per minute per IP
    const clientIp = getClientIp(request);
    const rateLimit = checkRateLimit(`quote:${clientIp}`, { maxRequests: 5, windowMs: 60 * 1000 });
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: `Too many requests. Please try again in ${rateLimit.resetIn} seconds.` },
        { status: 429 }
      );
    }

    const body = await request.json();

    // Turnstile verification
    const turnstileResult = await verifyTurnstile(body.turnstileToken, clientIp);
    if (!turnstileResult.success) {
      return NextResponse.json({ error: turnstileResult.error }, { status: 403 });
    }

    // Sanitize all inputs
    const passengerName = sanitizeInput(body.passengerName);
    const passengers = sanitizeInput(body.passengers);
    const phone = sanitizeInput(body.phone);
    const phoneCode = sanitizeInput(body.phoneCode);
    const email = sanitizeInput(body.email);
    const serviceType = sanitizeInput(body.serviceType);
    const vehicleType = sanitizeInput(body.vehicleType);
    const pickupLocation = sanitizeInput(body.pickupLocation);
    const dropoffLocation = sanitizeInput(body.dropoffLocation);
    const additionalNotes = sanitizeInput(body.additionalNotes);
    const stops = sanitizeArray(body.stops);

    if (!passengerName || !passengers || !phone || !email || !serviceType || !vehicleType || !pickupLocation || !dropoffLocation) {
      return NextResponse.json({ error: "Please fill in all required fields" }, { status: 400 });
    }

    const fullPhone = `${phoneCode}${phone}`;

    const quotePayload = {
      passengerName,
      passengers,
      email,
      phone: fullPhone,
      serviceType,
      vehicleType,
      pickup: pickupLocation,
      dropoff: dropoffLocation,
      stops,
      notes: additionalNotes || undefined,
    };

    const adminEmailHtml = buildQuoteAdminEmail(quotePayload);
    const userEmailHtml = buildQuoteUserEmail(quotePayload);

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 465,
      secure: true,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
      tls: { rejectUnauthorized: false },
    });

    await transporter.verify();

    await transporter.sendMail({
      from: `"SARJ Website" <${process.env.SMTP_USER}>`,
      to: process.env.CONTACT_EMAIL,
      subject: `New Online Quote: ${passengerName} - ${serviceType}`,
      html: adminEmailHtml,
    });

    await transporter.sendMail({
      from: `"SARJ WORLDWIDE" <${process.env.SMTP_USER}>`,
      to: email,
      subject: "Your Online Quote Form is Successfully Submitted - SARJ WORLDWIDE",
      html: userEmailHtml,
    });

    // Save quote to database
    const quoteId = `QT-${Date.now().toString(36).toUpperCase()}`;
    await prisma.quote.create({
      data: {
        quoteId,
        passengerName,
        passengers,
        phone: fullPhone,
        email,
        serviceType,
        vehicle: vehicleType,
        pickupLocation,
        stops: stops.length > 0 ? stops.join(" | ") : null,
        dropoffLocation,
        additionalNotes: additionalNotes || null,
        status: "NEW",
      },
    });

    return NextResponse.json({ success: true, message: "Your quote request has been sent successfully!" });
  } catch (error: any) {
    console.error("Quote email error:", error);
    let errorMessage = "Failed to send quote. Please try again later.";
    if (error.code === "EAUTH") errorMessage = "Email authentication failed.";
    else if (error.code === "ECONNECTION" || error.code === "ESOCKET") errorMessage = "Could not connect to email server.";
    return NextResponse.json({ error: errorMessage, details: error.message }, { status: 500 });
  }
}
