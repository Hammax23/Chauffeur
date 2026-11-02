import { NextRequest, NextResponse } from "next/server";
import {
  checkRateLimit,
  recordFailedAttempt,
  getClientIP,
} from "@/lib/admin-auth";
import { generateOTP, createOTPSession, sendOTPEmail } from "@/lib/admin-otp";
import {
  getSeoPanelAllowedEmail,
  authenticateSeoPanelPassword,
  generateSeoPanelToken,
  SEO_PANEL_COOKIE_NAME,
  getSeoPanelSessionCookieOptions,
} from "@/lib/seo-auth";
import { clearAttempts } from "@/lib/admin-auth";

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

    // Optional: skip the emailed code (set SEO_PANEL_OTP_DISABLED=true, e.g. in local .env).
    if (process.env.SEO_PANEL_OTP_DISABLED === "true") {
      clearAttempts(`seo-login:${ip}`);
      const response = NextResponse.json({ success: true, authenticated: true, message: "Login successful" });
      response.cookies.set(SEO_PANEL_COOKIE_NAME, generateSeoPanelToken(), getSeoPanelSessionCookieOptions());
      return response;
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
