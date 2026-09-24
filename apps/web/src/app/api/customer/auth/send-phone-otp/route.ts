import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  formatAuthPhoneE164,
  phoneLookupVariants,
  validateAuthPhone,
} from "@/lib/phone-us-ca";
import { issueAndSmsPhoneOtp, PHONE_OTP_LENGTH } from "@/lib/phone-otp";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const phone = typeof body?.phone === "string" ? body.phone : "";

    const phoneError = validateAuthPhone(phone);
    if (phoneError) {
      return NextResponse.json({ success: false, error: phoneError }, { status: 400 });
    }

    const e164 = formatAuthPhoneE164(phone);
    if (!e164) {
      return NextResponse.json(
        { success: false, error: "Enter a valid phone number." },
        { status: 400 }
      );
    }

    const existing = await prisma.customer.findFirst({
      where: { phone: { in: phoneLookupVariants(phone) } },
      select: { id: true },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: "This phone number is already registered." },
        { status: 409 }
      );
    }

    const sent = await issueAndSmsPhoneOtp(e164);
    if (!sent.ok) {
      return NextResponse.json(
        { success: false, error: sent.error || "Unable to send verification code" },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Verification code sent",
      phone: e164,
      otpLength: PHONE_OTP_LENGTH,
    });
  } catch (error) {
    console.error("Send phone OTP error:", error);
    return NextResponse.json(
      { success: false, error: "Unable to send verification code" },
      { status: 500 }
    );
  }
}
