import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import {
  createPasswordResetOtpSession,
  generateCustomerOTP,
  sendCustomerPasswordResetOtpEmail,
} from "@/lib/customer-otp";

const SUCCESS_MESSAGE =
  "We sent a 6-digit verification code to your email. Enter it to reset your password.";

const ACCOUNT_NOT_FOUND_MESSAGE =
  "No account is registered with this email address. Please check the email or create a new account.";

export async function POST(req: NextRequest) {
  try {
    const clientIp = getClientIp(req);
    const rateLimit = checkRateLimit(`forgot-password:${clientIp}`, {
      maxRequests: 5,
      windowMs: 15 * 60 * 1000,
    });

    if (!rateLimit.success) {
      return NextResponse.json(
        {
          success: false,
          error: `Too many requests. Try again in ${rateLimit.resetIn} seconds.`,
        },
        { status: 429 }
      );
    }

    const body = await req.json();
    const emailRaw = typeof body.email === "string" ? body.email.trim() : "";

    if (!emailRaw || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailRaw)) {
      return NextResponse.json(
        { success: false, error: "Please enter a valid email address." },
        { status: 400 }
      );
    }

    const email = emailRaw.toLowerCase();
    const emailRate = checkRateLimit(`forgot-password-email:${email}`, {
      maxRequests: 3,
      windowMs: 15 * 60 * 1000,
    });
    if (!emailRate.success) {
      return NextResponse.json(
        {
          success: false,
          error: `Too many requests for this email. Try again in ${emailRate.resetIn} seconds.`,
        },
        { status: 429 }
      );
    }

    const customer = await prisma.customer.findUnique({
      where: { email },
      select: { id: true, email: true, firstName: true },
    });

    if (!customer) {
      return NextResponse.json(
        { success: false, error: ACCOUNT_NOT_FOUND_MESSAGE },
        { status: 404 }
      );
    }

    const otp = generateCustomerOTP();
    const sessionId = createPasswordResetOtpSession({
      otp,
      email,
      customerId: customer.id,
    });

    const sent = await sendCustomerPasswordResetOtpEmail(customer.email, otp);
    if (!sent) {
      console.error("[forgot-password] Failed to send OTP email to", customer.email);
      return NextResponse.json(
        {
          success: false,
          error: "Unable to send verification email right now. Please try again later.",
        },
        { status: 503 }
      );
    }

    if (process.env.NODE_ENV === "development") {
      console.info(`[forgot-password] OTP for ${email}: ${otp}`);
    }

    return NextResponse.json({
      success: true,
      message: SUCCESS_MESSAGE,
      sessionId,
      emailMasked: maskEmail(email),
    });
  } catch (error) {
    console.error("[forgot-password]", error);
    return NextResponse.json(
      { success: false, error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) return email;
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}${"*".repeat(Math.max(local.length - visible.length, 3))}@${domain}`;
}
