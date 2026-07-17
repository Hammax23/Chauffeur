import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { verifyPasswordResetToken } from "@/lib/customer-otp";
import { validatePassword } from "@/lib/password-policy";

export async function POST(req: NextRequest) {
  try {
    const clientIp = getClientIp(req);
    const rateLimit = checkRateLimit(`reset-password:${clientIp}`, {
      maxRequests: 10,
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
    const resetToken = typeof body.resetToken === "string" ? body.resetToken.trim() : "";
    const newPassword = typeof body.newPassword === "string" ? body.newPassword : "";

    if (!resetToken) {
      return NextResponse.json(
        { success: false, error: "Reset session expired. Please start again." },
        { status: 400 }
      );
    }

    const passwordError = validatePassword(newPassword);
    if (passwordError) {
      return NextResponse.json(
        { success: false, error: passwordError },
        { status: 400 }
      );
    }

    const tokenResult = verifyPasswordResetToken(resetToken);
    if (!tokenResult.valid) {
      return NextResponse.json(
        { success: false, error: tokenResult.error },
        { status: 400 }
      );
    }

    const customer = await prisma.customer.findUnique({
      where: { id: tokenResult.customerId },
      select: { id: true, email: true },
    });

    if (!customer || customer.email.toLowerCase() !== tokenResult.email.toLowerCase()) {
      return NextResponse.json(
        { success: false, error: "Account not found. Please start again." },
        { status: 404 }
      );
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);

    await prisma.customer.update({
      where: { id: customer.id },
      data: { password: hashedPassword },
    });

    return NextResponse.json({
      success: true,
      message: "Password updated successfully. You can sign in now.",
    });
  } catch (error) {
    console.error("[reset-password]", error);
    return NextResponse.json(
      { success: false, error: "Failed to reset password. Please try again." },
      { status: 500 }
    );
  }
}
