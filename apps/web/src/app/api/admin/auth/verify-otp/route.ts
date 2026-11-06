import { NextRequest, NextResponse } from "next/server";
import {
  generateToken,
  clearAttempts,
  getClientIP,
  COOKIE_NAME,
  getAdminSessionCookieOptions,
} from "@/lib/admin-auth";
import { verifyOTP } from "@/lib/admin-otp";

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

    // Verify OTP
    const otpResult = await verifyOTP(sessionId, otp);

    if (!otpResult.valid) {
      return NextResponse.json(
        { success: false, error: otpResult.error },
        { status: 401 }
      );
    }

    // OTP verified - clear rate limit and issue token. For Phase 2 the OTP
    // session carries the resolved AdminUser identity so the JWT can embed
    // sub+email (audit trail per admin). Legacy single-admin tokens have no actor.
    await clearAttempts(ip);
    const token = generateToken(otpResult.actor || undefined);

    // Create response with secure cookie
    const response = NextResponse.json({
      success: true,
      message: "Login successful",
    });

    // Set secure HTTP-only cookie
    response.cookies.set(COOKIE_NAME, token, getAdminSessionCookieOptions());

    return response;
  } catch (error: any) {
    console.error("Verify OTP error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to verify OTP" },
      { status: 500 }
    );
  }
}
