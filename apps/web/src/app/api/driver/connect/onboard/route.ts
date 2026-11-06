// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import prisma from "@/lib/prisma";
import { getAppJwtSecret } from "@/lib/app-jwt-secret";
import { createConnectOnboardingLink } from "@/lib/stripe-connect";

function getDriverFromToken(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  try {
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, getAppJwtSecret()) as {
      id: string;
      email: string;
      type: string;
    };
    if (decoded.type !== "driver") return null;
    return decoded;
  } catch {
    return null;
  }
}

/**
 * POST /api/driver/connect/onboard
 *   Creates (or re-uses) the driver's Stripe Express account and returns a hosted
 *   onboarding URL. The driver opens it in a WebBrowser (mobile) or external tab (web).
 */
export async function POST(req: NextRequest) {
  const tokenData = getDriverFromToken(req);
  if (!tokenData) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json(
      { success: false, error: "Stripe is not configured on this environment" },
      { status: 503 }
    );
  }

  try {
    const driver = await prisma.driver.findUnique({
      where: { id: tokenData.id },
      select: {
        id: true,
        email: true,
        phone: true,
        name: true,
        stripeConnectAccountId: true,
      },
    });
    if (!driver) {
      return NextResponse.json({ success: false, error: "Driver not found" }, { status: 404 });
    }

    const link = await createConnectOnboardingLink(driver, `driver:${driver.id}`);
    return NextResponse.json({
      success: true,
      url: link.url,
      stripeAccountId: link.stripeAccountId,
      expiresAt: link.expiresAt,
    });
  } catch (error: any) {
    console.error("[driver connect onboard POST]", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to start onboarding" },
      { status: 500 }
    );
  }
}
