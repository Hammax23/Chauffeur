import { NextRequest, NextResponse } from "next/server";
import {
  getCustomerFromRequest,
  customerInactiveHttpResponse,
} from "@/lib/customer-auth";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { resolveAppReservationFare } from "@/lib/app-reservation-fare";
import prisma from "@/lib/prisma";
import { normalizePromoCode } from "@/lib/promotions";

export async function POST(req: NextRequest) {
  try {
    const tokenData = getCustomerFromRequest(req);
    if (!tokenData) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const clientIp = getClientIp(req);
    const rateLimit = checkRateLimit(`promo-validate:${tokenData.id}:${clientIp}`, {
      maxRequests: 20,
      windowMs: 60 * 1000,
    });
    if (!rateLimit.success) {
      return NextResponse.json(
        {
          success: false,
          error: `Too many requests. Please try again in ${rateLimit.resetIn} seconds.`,
        },
        { status: 429 }
      );
    }

    const dbCustomer = await prisma.customer.findUnique({
      where: { id: tokenData.id },
      select: {
        id: true,
        accountStatus: true,
        deactivatedAt: true,
        oauthProvider: true,
      },
    });
    if (!dbCustomer) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const inactive = customerInactiveHttpResponse(dbCustomer);
    if (inactive) {
      return NextResponse.json(inactive.body, { status: inactive.status });
    }

    const body = await req.json();
    const code = normalizePromoCode(body?.code ?? body?.promoCode);
    if (!code) {
      return NextResponse.json(
        { success: false, error: "Enter a promo code." },
        { status: 400 }
      );
    }

    const fare = await resolveAppReservationFare({
      ...body,
      promoCode: code,
      customerId: tokenData.id,
    });

    if ("error" in fare) {
      return NextResponse.json({ success: false, error: fare.error }, { status: 400 });
    }

    const { pricing } = fare;
    return NextResponse.json({
      success: true,
      promoCode: pricing.promoCode,
      discountAmount: pricing.discountAmount,
      pricing: {
        rideFare: pricing.rideFare,
        stopCharge: pricing.stopCharge,
        childSeatCharge: pricing.childSeatCharge,
        airportPickupFee: pricing.airportPickupFee,
        subtotal: pricing.subtotal,
        discountAmount: pricing.discountAmount,
        hst: pricing.hst,
        gratuity: pricing.gratuity,
        gratuityPercent: pricing.gratuityPercent,
        total: pricing.total,
      },
    });
  } catch (error) {
    console.error("[customer/promotions/validate]", error);
    return NextResponse.json(
      { success: false, error: "Could not validate promo code." },
      { status: 500 }
    );
  }
}
