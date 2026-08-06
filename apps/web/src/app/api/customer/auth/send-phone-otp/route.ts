import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  formatUsCanadaE164,
  phoneLookupVariants,
  validateUsCanadaPhone,
} from "@/lib/phone-us-ca";
import { PHONE_OTP_LENGTH } from "@/lib/phone-otp";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const phone = typeof body?.phone === "string" ? body.phone : "";

    const phoneError = validateUsCanadaPhone(phone);
    if (phoneError) {
      return NextResponse.json({ success: false, error: phoneError }, { status: 400 });
    }

    const e164 = formatUsCanadaE164(phone);
    if (!e164) {
      return NextResponse.json(
        { success: false, error: "Enter a valid US or Canada (+1) phone number." },
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

    // TODO: send SMS via provider. For now verify accepts static OTP "1234".

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
