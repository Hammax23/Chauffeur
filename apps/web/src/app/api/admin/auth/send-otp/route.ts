import { NextRequest, NextResponse } from "next/server";
import {
  authenticateAdmin,
  authenticateAdminUser,
  hasAnyAdminUser,
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
    const rateLimit = await checkRateLimit(ip);
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
    const { email, password } = body as { email?: string; password?: string };

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: "Email and password are required" },
        { status: 400 }
      );
    }

    const emailKey = String(email).trim().toLowerCase();

    // ── Phase 2 — AdminUser lookup first ────────────────────────────────────
    // If this email matches an active AdminUser with the right password, log in
    // as that admin (audit trail = this admin's email, OTP sent to this inbox).
    const adminUser = await authenticateAdminUser(emailKey, password);

    let actor: { adminId: string | null; email: string | null } = {
      adminId: null,
      email: null,
    };
    let otpRecipient = emailKey;

    if (adminUser) {
      actor = { adminId: adminUser.id, email: adminUser.email };
      otpRecipient = adminUser.email;
    } else {
      // No AdminUser match. Fall back to the legacy single-admin env flow only
      // when the AdminUser table is empty (first-time bootstrap) OR the request
      // email matches ADMIN_EMAIL explicitly.
      const populated = await hasAnyAdminUser();
      const legacyAdminEmail = (process.env.ADMIN_EMAIL || "").toLowerCase();

      if (populated && emailKey !== legacyAdminEmail) {
        await recordFailedAttempt(ip);
        return NextResponse.json(
          { success: false, error: "Invalid admin credentials" },
          { status: 401 }
        );
      }

      // Legacy single-admin env check (password only).
      const legacy = await authenticateAdmin(password);
      if (!legacy.success) {
        await recordFailedAttempt(ip);
        return NextResponse.json(
          { success: false, error: legacy.error || "Invalid admin credentials" },
          { status: 401 }
        );
      }
      // Keep OTP delivery to ADMIN_EMAIL for the legacy flow.
      otpRecipient = legacyAdminEmail || emailKey;
    }

    // Password correct — generate and send OTP.
    const otp = generateOTP();
    const sessionId = createOTPSession(otp, actor);

    const emailResult = await sendOTPEmail(otp, { to: otpRecipient });

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
