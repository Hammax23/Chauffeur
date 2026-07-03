import { NextRequest, NextResponse } from "next/server";
import {
  checkRateLimit,
  recordFailedAttempt,
  getClientIP,
} from "@/lib/admin-auth";
import { generateOTP, createOTPSession, sendOTPEmail } from "@/lib/admin-otp";
import { getSeoPanelAllowedEmail, authenticateSeoPanelPassword } from "@/lib/seo-auth";

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIP(request);
    const rateLimit = checkRateLimit(`seo-login:${ip}`);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: `Too many attempts. Please try again in ${rateLimit.remainingTime} seconds.`,
          locked: true,
          remainingTime: rateLimit.remainingTime,
        },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: "Email and password are required" },
        { status: 400 }
      );
    }

    const allowedEmail = getSeoPanelAllowedEmail();
    if (!allowedEmail || email.trim().toLowerCase() !== allowedEmail) {
      recordFailedAttempt(`seo-login:${ip}`);
      return NextResponse.json(
        { success: false, error: "Invalid credentials" },
        { status: 401 }
      );
    }

    const authResult = await authenticateSeoPanelPassword(password);
    if (!authResult.success) {
      recordFailedAttempt(`seo-login:${ip}`);
      return NextResponse.json(
        { success: false, error: authResult.error || "Invalid credentials" },
        { status: 401 }
      );
    }

    const otp = generateOTP();
    const sessionId = createOTPSession(otp);
    const emailResult = await sendOTPEmail(otp, { panel: "seo" });

    if (!emailResult.success) {
      return NextResponse.json(
        { success: false, error: "Failed to send verification code. Please try again." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Verification code sent to admin email",
      sessionId,
    });
  } catch (error) {
    console.error("[SEO Panel Send OTP]", error);
    return NextResponse.json({ success: false, error: "Failed to process request" }, { status: 500 });
  }
}
