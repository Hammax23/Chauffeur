import { NextRequest, NextResponse } from "next/server";
import {
  authenticateOperationalManager,
  OPERATIONAL_MANAGER_COOKIE_NAME,
  checkRateLimit,
  recordFailedAttempt,
  clearAttempts,
  getClientIP,
} from "@/lib/operational-manager-auth";

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIP(request);
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
    const email = typeof body?.email === "string" ? body.email : "";
    const password = typeof body?.password === "string" ? body.password : "";

    if (!email?.trim() || !password) {
      return NextResponse.json(
        { success: false, error: "Email and password are required" },
        { status: 400 }
      );
    }

    const result = await authenticateOperationalManager(email, password);

    if (!result.success) {
      recordFailedAttempt(ip);
      return NextResponse.json({ success: false, error: result.error }, { status: 401 });
    }

    clearAttempts(ip);

    const response = NextResponse.json({ success: true, message: "Login successful" });

    response.cookies.set(OPERATIONAL_MANAGER_COOKIE_NAME, result.token!, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 60 * 60 * 24,
      path: "/",
    });

    return response;
  } catch (e) {
    console.error("Operational manager login error:", e);
    return NextResponse.json({ success: false, error: "Login failed" }, { status: 500 });
  }
}
