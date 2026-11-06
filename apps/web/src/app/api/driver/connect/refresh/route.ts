// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { createConnectOnboardingLink } from "@/lib/stripe-connect";

/**
 * GET /api/driver/connect/refresh?d=<driverId>
 *   Stripe hits this when the hosted onboarding link expires. We mint a fresh
 *   onboarding URL and 302 to it. No auth — the driverId is a public identifier and
 *   Stripe would already reject stale links on its own side.
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const driverId = url.searchParams.get("d");
  if (!driverId) {
    return NextResponse.json({ error: "Missing driver id" }, { status: 400 });
  }

  try {
    const driver = await prisma.driver.findUnique({
      where: { id: driverId },
      select: {
        id: true,
        email: true,
        phone: true,
        name: true,
        stripeConnectAccountId: true,
      },
    });
    if (!driver) {
      return NextResponse.json({ error: "Driver not found" }, { status: 404 });
    }

    const link = await createConnectOnboardingLink(driver, "stripe_refresh");
    return NextResponse.redirect(link.url, 302);
  } catch (error: any) {
    console.error("[driver connect refresh]", error);
    return NextResponse.json(
      { error: error?.message || "Failed to refresh onboarding" },
      { status: 500 }
    );
  }
}
