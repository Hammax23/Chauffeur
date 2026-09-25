import { NextRequest, NextResponse } from "next/server";
import {
  getCustomerFromRequest,
  customerInactiveHttpResponse,
} from "@/lib/customer-auth";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import prisma from "@/lib/prisma";
import { listActiveAppBannerPromotions } from "@/lib/promotions";

export async function GET(req: NextRequest) {
  try {
    const tokenData = getCustomerFromRequest(req);
    if (!tokenData) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const clientIp = getClientIp(req);
    const rateLimit = checkRateLimit(`promo-active:${tokenData.id}:${clientIp}`, {
      maxRequests: 40,
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

    const promotions = await listActiveAppBannerPromotions(5);
    return NextResponse.json({ success: true, promotions });
  } catch (error) {
    console.error("[customer/promotions/active]", error);
    return NextResponse.json(
      { success: false, error: "Could not load promotions." },
      { status: 500 }
    );
  }
}
