import { NextRequest, NextResponse } from "next/server";
import {
  authenticateAdmin,
  checkRateLimit,
  recordFailedAttempt,
  getClientIP,
} from "@/lib/admin-auth";
import {
  generateOTP,
  createOTPSession,
  sendOTPEmail,
} from "@/lib/admin-otp";

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIP(request);

    // Check rate limiting
    const rateLimit = checkRateLimit(ip);
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

    // Verify email matches admin email
    const adminEmail = process.env.ADMIN_EMAIL;
    if (!adminEmail || email.toLowerCase() !== adminEmail.toLowerCase()) {
      recordFailedAttempt(ip);
      return NextResponse.json(
        { success: false, error: "Invalid admin credentials" },
        { status: 401 }
      );
    }

    // Verify password
    const authResult = await authenticateAdmin(password);

    if (!authResult.success) {
      recordFailedAttempt(ip);
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: 401 }
      );
    }

    // Password correct - generate and send OTP
    const otp = generateOTP();
    
    // Create JWT-based session with OTP encoded (survives server restarts)
    const sessionId = createOTPSession(otp);

    // Send OTP email
    const emailResult = await sendOTPEmail(otp);

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
  } catch (error: any) {
    console.error("Send OTP error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to process request" },
      { status: 500 }
    );
  }
}
