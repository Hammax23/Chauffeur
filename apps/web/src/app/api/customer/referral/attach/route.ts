import { NextRequest, NextResponse } from "next/server";
import {
  getCustomerFromRequest,
  customerInactiveHttpResponse,
} from "@/lib/customer-auth";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import prisma from "@/lib/prisma";
import { attributeReferral, normalizeReferralCode } from "@/lib/referrals";

/** Attach a referral code after signup (e.g. OAuth users after phone verify). */
export async function POST(req: NextRequest) {
  try {
    const tokenData = getCustomerFromRequest(req);
    if (!tokenData) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const clientIp = getClientIp(req);
    const rateLimit = checkRateLimit(`referral-attach:${tokenData.id}:${clientIp}`, {
      maxRequests: 8,
      windowMs: 60 * 60 * 1000,
    });
    if (!rateLimit.success) {
      return NextResponse.json(
        {
          success: false,
          error: `Too many attempts. Try again in ${rateLimit.resetIn} seconds.`,
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
        registrationSource: true,
      },
    });
    if (!dbCustomer) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const inactive = customerInactiveHttpResponse(dbCustomer);
    if (inactive) {
      return NextResponse.json(inactive.body, { status: inactive.status });
    }

    if (dbCustomer.registrationSource !== "app") {
      return NextResponse.json(
        { success: false, error: "Referrals are only available in the mobile app." },
        { status: 400 }
      );
    }

    const body = await req.json();
    const code = normalizeReferralCode(body?.referralCode ?? body?.code);
    if (!code) {
      return NextResponse.json(
        { success: false, error: "Enter a referral code." },
        { status: 400 }
      );
    }

    const result = await attributeReferral({
      refereeId: tokenData.id,
      referralCode: code,
    });
    if (!result.ok) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: "Referral linked." });
  } catch (error) {
    console.error("[customer/referral/attach]", error);
    return NextResponse.json(
      { success: false, error: "Could not link referral code." },
      { status: 500 }
    );
  }
}
