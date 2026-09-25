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
  normalizeE164,
} from "@/lib/phone-us-ca";
import { issueAndSmsPhoneOtp, PHONE_OTP_LENGTH } from "@/lib/phone-otp";

/**
 * Authenticated: send phone OTP to complete / link a mobile number (OAuth onboarding).
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await getActiveCustomerFromRequest(req);
    if (!auth.ok) {
      const fail = customerAuthFailurePayload(auth.reason);
      return NextResponse.json(fail.body, { status: fail.status });
    }
    const tokenData = auth.customer;

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

    const me = await prisma.customer.findUnique({
      where: { id: tokenData.id },
      select: { phone: true },
    });
    const current =
      formatAuthPhoneE164(me?.phone || "") || normalizeE164(me?.phone || "");
    if (current && current === e164) {
      return NextResponse.json(
        {
          success: false,
          error: "This is already your verified phone number.",
          code: "PHONE_UNCHANGED",
        },
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
    console.error("Customer phone send-otp error:", error);
    return NextResponse.json(
      { success: false, error: "Unable to send verification code" },
      { status: 500 }
    );
  }
}
