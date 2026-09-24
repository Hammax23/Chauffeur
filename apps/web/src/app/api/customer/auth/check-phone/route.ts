import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  formatAuthPhoneE164,
  phoneLookupVariants,
  validateAuthPhone,
} from "@/lib/phone-us-ca";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const phone = typeof body?.phone === "string" ? body.phone : "";

    const phoneError = validateAuthPhone(phone);
    if (phoneError) {
      return NextResponse.json(
        { success: false, available: false, error: phoneError },
        { status: 400 }
      );
    }

    const e164 = formatAuthPhoneE164(phone);
    if (!e164) {
      return NextResponse.json(
        {
          success: false,
          available: false,
          error: "Enter a valid phone number.",
        },
        { status: 400 }
      );
    }

    const variants = phoneLookupVariants(phone);
    const existing = await prisma.customer.findFirst({
      where: { phone: { in: variants } },
      select: { id: true },
    });

    if (existing) {
      return NextResponse.json({
        success: true,
        available: false,
        error: "This phone number is already registered.",
      });
    }

    return NextResponse.json({
      success: true,
      available: true,
      phone: e164,
    });
  } catch (error) {
    console.error("Check phone error:", error);
    return NextResponse.json(
      { success: false, available: false, error: "Unable to check phone number" },
      { status: 500 }
    );
  }
}
