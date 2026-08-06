import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCustomerFromRequest } from "@/lib/customer-auth";
import {
  formatUsCanadaE164,
  phoneLookupVariants,
  validateUsCanadaPhone,
} from "@/lib/phone-us-ca";
import { PHONE_OTP_LENGTH, STATIC_PHONE_OTP } from "@/lib/phone-otp";

/**
 * Authenticated: verify static/real OTP and persist phone on the customer.
 */
export async function POST(req: NextRequest) {
  try {
    const tokenData = getCustomerFromRequest(req);
    if (!tokenData) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

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

    const taken = await prisma.customer.findFirst({
      where: {
        phone: { in: phoneLookupVariants(phone) },
        NOT: { id: tokenData.id },
      },
      select: { id: true },
    });

    if (taken) {
      return NextResponse.json(
        { success: false, error: "This phone number is already registered." },
        { status: 409 }
      );
    }

    const customer = await prisma.customer.update({
      where: { id: tokenData.id },
      data: { phone: e164 },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        city: true,
        photo: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Phone verified",
      customer,
    });
  } catch (error) {
    console.error("Customer phone verify-otp error:", error);
    return NextResponse.json(
      { success: false, error: "Verification failed" },
      { status: 500 }
    );
  }
}
