// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import prisma from "@/lib/prisma";
import { getAppJwtSecret } from "@/lib/app-jwt-secret";
import {
  isStripeConnectEnabled,
  refreshConnectStatusForDriver,
} from "@/lib/stripe-connect";

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
 * GET /api/driver/connect/status
 *   Returns the driver's current Stripe Connect state. If `?refresh=1`, forces a
 *   live `stripe.accounts.retrieve` call and mirrors the latest flags onto the row.
 */
export async function GET(req: NextRequest) {
  const tokenData = getDriverFromToken(req);
  if (!tokenData) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const driver = await prisma.driver.findUnique({
      where: { id: tokenData.id },
      select: {
        id: true,
        stripeConnectAccountId: true,
        stripeConnectStatus: true,
        stripeConnectUpdatedAt: true,
      },
    });
    if (!driver) {
      return NextResponse.json({ success: false, error: "Driver not found" }, { status: 404 });
    }

    const url = new URL(req.url);
    const refresh = url.searchParams.get("refresh") === "1";

    let snapshot = null as any;
    if (refresh && driver.stripeConnectAccountId) {
      try {
        snapshot = await refreshConnectStatusForDriver(driver.id, `driver:${driver.id}`);
      } catch (e) {
        console.error("[driver connect status] refresh failed", e);
      }
    }

    return NextResponse.json({
      success: true,
      connectAvailable: Boolean(process.env.STRIPE_SECRET_KEY),
      payoutsLive: isStripeConnectEnabled(),
      status: snapshot?.status || driver.stripeConnectStatus || "NOT_STARTED",
      stripeAccountId: driver.stripeConnectAccountId,
      payoutsEnabled: snapshot?.payoutsEnabled ?? null,
      chargesEnabled: snapshot?.chargesEnabled ?? null,
      requirementsDue: snapshot?.requirementsDue || [],
      requirementsDisabledReason: snapshot?.requirementsDisabledReason || null,
      updatedAt: (snapshot?.updatedAt ?? driver.stripeConnectUpdatedAt?.toISOString()) || null,
    });
  } catch (error) {
    console.error("[driver connect status GET]", error);
    return NextResponse.json({ success: false, error: "Failed to load status" }, { status: 500 });
  }
}
