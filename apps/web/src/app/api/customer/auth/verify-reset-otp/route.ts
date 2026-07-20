import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import {
  createPasswordResetToken,
  verifyPasswordResetOtp,
} from "@/lib/customer-otp";

export async function POST(req: NextRequest) {
  try {
    const clientIp = getClientIp(req);
    const rateLimit = checkRateLimit(`verify-reset-otp:${clientIp}`, {
      maxRequests: 20,
      windowMs: 15 * 60 * 1000,
    });

    if (!rateLimit.success) {
      return NextResponse.json(
        {
          success: false,
          error: `Too many attempts. Try again in ${rateLimit.resetIn} seconds.`,
        },
        { status: 429 }
      );
    }

    const body = await req.json();
    const sessionId = typeof body.sessionId === "string" ? body.sessionId.trim() : "";
    const otp = typeof body.otp === "string" ? body.otp.trim() : "";

    if (!sessionId || !otp) {
      return NextResponse.json(
        { success: false, error: "Verification code is required." },
        { status: 400 }
      );
    }

    if (!/^\d{6}$/.test(otp)) {
      return NextResponse.json(
        { success: false, error: "Enter the 6-digit code from your email." },
        { status: 400 }
      );
    }

    const result = verifyPasswordResetOtp(sessionId, otp);
    if (!result.valid) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    const resetToken = createPasswordResetToken({
      email: result.email,
      customerId: result.customerId,
    });

    return NextResponse.json({
      success: true,
      message: "Code verified. You can set a new password.",
      resetToken,
    });
  } catch (error) {
    console.error("[verify-reset-otp]", error);
    return NextResponse.json(
      { success: false, error: "Verification failed. Please try again." },
      { status: 500 }
    );
  }
}
