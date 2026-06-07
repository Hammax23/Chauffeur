import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { sanitizeInput } from "@/lib/sanitize";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { verifyTurnstile } from "@/lib/turnstile";
import { buildContactAdminEmail, buildContactUserEmail } from "@/lib/email-templates";

export async function POST(request: NextRequest) {
  try {
    // Rate limiting: 5 requests per minute per IP
    const clientIp = getClientIp(request);
    const rateLimit = checkRateLimit(`contact:${clientIp}`, { maxRequests: 5, windowMs: 60 * 1000 });
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
    const fullName = sanitizeInput(body.fullName);
    const email = sanitizeInput(body.email);
    const phone = sanitizeInput(body.phone);
    const phoneCode = sanitizeInput(body.phoneCode);
    const pickup = sanitizeInput(body.pickup);
    const dropoff = sanitizeInput(body.dropoff);
    const additionalNotes = sanitizeInput(body.additionalNotes);

    // Validate required fields
    if (!fullName || !email || !phone) {
      return NextResponse.json(
        { error: "Please fill in all required fields" },
        { status: 400 }
      );
    }

    const fullPhone = `${phoneCode}${phone}`;

    const adminEmailHtml = buildContactAdminEmail({
      fullName,
      email,
      phone: fullPhone,
      pickup: pickup || undefined,
      dropoff: dropoff || undefined,
      notes: additionalNotes || undefined,
    });

    const userEmailHtml = buildContactUserEmail({
      fullName,
      email,
      phone: fullPhone,
      pickup: pickup || undefined,
      dropoff: dropoff || undefined,
    });

    // Create transporter with Hostinger SMTP
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 465,
      secure: true,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
      tls: {
        rejectUnauthorized: false,
      },
      debug: true,
      logger: true,
    });

    // Verify connection
    await transporter.verify();
    console.log("SMTP connection verified successfully");

    // Send email to admin
    await transporter.sendMail({
      from: `"SARJ Website" <${process.env.SMTP_USER}>`,
      to: process.env.CONTACT_EMAIL,
      subject: `New Contact Form: ${fullName}`,
      html: adminEmailHtml,
    });

    // Send confirmation email to user
    await transporter.sendMail({
      from: `"SARJ WORLDWIDE" <${process.env.SMTP_USER}>`,
      to: email,
      subject: "Your Booking Form is Successfully Submitted - SARJ WORLDWIDE",
      html: userEmailHtml,
    });

    return NextResponse.json({
      success: true,
      message: "Your message has been sent successfully!",
    });
  } catch (error: any) {
    console.error("Email error:", error);
    
    let errorMessage = "Failed to send message. Please try again later.";
    if (error.code === "EAUTH") {
      errorMessage = "Email authentication failed. Check email password in Hostinger.";
    } else if (error.code === "ECONNECTION" || error.code === "ESOCKET") {
      errorMessage = "Could not connect to email server.";
    }
    
    return NextResponse.json(
      { error: errorMessage, details: error.message },
      { status: 500 }
    );
  }
}
