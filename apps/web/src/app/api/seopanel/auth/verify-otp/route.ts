import { NextRequest, NextResponse } from "next/server";
import { clearAttempts, getClientIP } from "@/lib/admin-auth";
import { verifyOTP } from "@/lib/admin-otp";
import {
  generateSeoPanelToken,
  SEO_PANEL_COOKIE_NAME,
  getSeoPanelSessionCookieOptions,
} from "@/lib/seo-auth";

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIP(request);
    const body = await request.json();
    const { sessionId, otp } = body;

    if (!sessionId || !otp) {
      return NextResponse.json(
        { success: false, error: "Session ID and OTP are required" },
        { status: 400 }
      );
    }

    const otpResult = verifyOTP(sessionId, otp);
    if (!otpResult.valid) {
      return NextResponse.json(
        { success: false, error: otpResult.error },
        { status: 401 }
      );
    }

    clearAttempts(`seo-login:${ip}`);
    const token = generateSeoPanelToken();

    const response = NextResponse.json({ success: true, message: "Login successful" });
    response.cookies.set(SEO_PANEL_COOKIE_NAME, token, getSeoPanelSessionCookieOptions());
    return response;
  } catch (error) {
    console.error("[SEO Panel Verify OTP]", error);
    return NextResponse.json({ success: false, error: "Failed to verify OTP" }, { status: 500 });
  }
}
