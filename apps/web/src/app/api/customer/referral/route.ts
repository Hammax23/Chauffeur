import { NextRequest, NextResponse } from "next/server";
import {
  getCustomerFromRequest,
  customerInactiveHttpResponse,
} from "@/lib/customer-auth";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import prisma from "@/lib/prisma";
import { getReferralProgress } from "@/lib/referrals";

export async function GET(req: NextRequest) {
  try {
    const tokenData = getCustomerFromRequest(req);
    if (!tokenData) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
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

    const progress = await getReferralProgress(tokenData.id);
    return NextResponse.json({ success: true, referral: progress });
  } catch (error) {
    console.error("[customer/referral]", error);
    return NextResponse.json(
      { success: false, error: "Could not load referral status." },
      { status: 500 }
    );
  }
}
