import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import prisma from "@/lib/prisma";
import {
  formatUsCanadaE164,
  phoneLookupVariants,
  validateUsCanadaPhone,
} from "@/lib/phone-us-ca";
import { PHONE_OTP_LENGTH, STATIC_PHONE_OTP } from "@/lib/phone-otp";

const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret-key";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const phone = typeof body?.phone === "string" ? body.phone : "";
    const otp = typeof body?.otp === "string" ? body.otp.trim() : "";

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

    if (!new RegExp(`^\\d{${PHONE_OTP_LENGTH}}$`).test(otp)) {
      return NextResponse.json(
        { success: false, error: `Enter the ${PHONE_OTP_LENGTH}-digit verification code.` },
        { status: 400 }
      );
    }

    if (otp !== STATIC_PHONE_OTP) {
      return NextResponse.json(
        { success: false, error: "Invalid code. Please try again." },
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

    const phoneVerificationToken = jwt.sign(
      { phone: e164, purpose: "phone_verify" },
      JWT_SECRET,
      { expiresIn: "15m" }
    );

    return NextResponse.json({
      success: true,
      message: "Phone verified",
      phone: e164,
      phoneVerificationToken,
    });
  } catch (error) {
    console.error("Verify phone OTP error:", error);
    return NextResponse.json(
      { success: false, error: "Verification failed" },
      { status: 500 }
    );
  }
}
