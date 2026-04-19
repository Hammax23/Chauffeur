import { NextRequest, NextResponse } from "next/server";
import {
  authenticateAdmin,
  checkRateLimit,
  recordFailedAttempt,
  clearAttempts,
  getClientIP,
  COOKIE_NAME,
} from "@/lib/admin-auth";

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIP(request);

    // Check rate limiting
    const rateLimit = checkRateLimit(ip);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: `Too many login attempts. Please try again in ${rateLimit.remainingTime} seconds.`,
          locked: true,
          remainingTime: rateLimit.remainingTime,
        },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { password } = body;

    if (!password) {
      return NextResponse.json(
        { success: false, error: "Password is required" },
        { status: 400 }
      );
    }

    // Authenticate
    const result = await authenticateAdmin(password);

    if (!result.success) {
      // Record failed attempt
      recordFailedAttempt(ip);
      
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 401 }
      );
    }

    // Clear failed attempts on success
    clearAttempts(ip);

    // Create response with secure cookie
    const response = NextResponse.json({
      success: true,
      message: "Login successful",
    });

    // Set secure HTTP-only cookie
    response.cookies.set(COOKIE_NAME, result.token!, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 60 * 60 * 24, // 24 hours
      path: "/",
    });

    return response;
  } catch (error: any) {
    console.error("Admin login error:", error);
    return NextResponse.json(
      { success: false, error: "Login failed. Please try again." },
      { status: 500 }
    );
  }
}
