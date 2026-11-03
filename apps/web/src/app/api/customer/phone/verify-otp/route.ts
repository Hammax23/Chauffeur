import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  getActiveCustomerFromRequest,
  customerAuthFailurePayload,
} from "@/lib/customer-auth";
import {
  formatAuthPhoneE164,
  phoneLookupVariants,
  validateAuthPhone,
} from "@/lib/phone-us-ca";
import { consumePhoneOtp, PHONE_OTP_LENGTH } from "@/lib/phone-otp";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

/**
 * Authenticated: verify OTP and persist phone on the customer.
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await getActiveCustomerFromRequest(req);
    if (!auth.ok) {
      const fail = customerAuthFailurePayload(auth.reason);
      return NextResponse.json(fail.body, { status: fail.status });
    }
    const tokenData = auth.customer;

    const ip = getClientIp(req);
    const rl = await checkRateLimit(`phone-verify-otp:${tokenData.id}:${ip}`, {
      maxRequests: 20,
      windowMs: 15 * 60 * 1000,
    });
    if (!rl.success) {
      return NextResponse.json(
        {
          success: false,
          error: `Too many attempts. Please try again in ${rl.resetIn} seconds.`,
        },
        { status: 429 }
      );
    }

    const body = await req.json();
    const phone = typeof body?.phone === "string" ? body.phone : "";
    const otp = typeof body?.otp === "string" ? body.otp.trim() : "";

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

    if (!new RegExp(`^\\d{${PHONE_OTP_LENGTH}}$`).test(otp)) {
      return NextResponse.json(
        { success: false, error: `Enter the ${PHONE_OTP_LENGTH}-digit verification code.` },
        { status: 400 }
      );
    }

    if (!await consumePhoneOtp(e164, otp)) {
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
