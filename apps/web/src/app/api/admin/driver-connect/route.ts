// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyAdminAuth } from "@/lib/admin-auth";
import {
  createConnectOnboardingLink,
  isStripeConnectEnabled,
  refreshConnectStatusForDriver,
} from "@/lib/stripe-connect";
import { writeAudit } from "@/lib/driver-pay";

/** GET: list all drivers with their Connect status (admin view). */
export async function GET(req: NextRequest) {
  const auth = await verifyAdminAuth(req);
  if (!auth.authenticated) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const url = new URL(req.url);
    const driverId = url.searchParams.get("driverId")?.trim() || undefined;

    const where = driverId ? { id: driverId } : {};
    const drivers = await prisma.driver.findMany({
      where,
      orderBy: { name: "asc" },
      select: {
        id: true,
        driverId: true,
        name: true,
        email: true,
        vehicle: true,
        stripeConnectAccountId: true,
        stripeConnectStatus: true,
        stripeConnectUpdatedAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      connectAvailable: Boolean(process.env.STRIPE_SECRET_KEY),
      payoutsLive: isStripeConnectEnabled(),
      drivers: drivers.map((d) => ({
        id: d.id,
        driverId: d.driverId,
        name: d.name,
        email: d.email,
        vehicle: d.vehicle,
        stripeConnectAccountId: d.stripeConnectAccountId,
        stripeConnectStatus: d.stripeConnectStatus,
        stripeConnectUpdatedAt: d.stripeConnectUpdatedAt
          ? d.stripeConnectUpdatedAt.toISOString()
          : null,
      })),
    });
  } catch (error) {
    console.error("[admin driver-connect GET]", error);
    return NextResponse.json({ success: false, error: "Failed to load" }, { status: 500 });
  }
}

/** POST: `action=onboard|refresh` for a driver. */
export async function POST(req: NextRequest) {
  const auth = await verifyAdminAuth(req);
  if (!auth.authenticated) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json(
      { success: false, error: "Stripe is not configured on this environment" },
      { status: 503 }
    );
  }

  try {
    const body = await req.json();
    const action = String(body.action || "onboard").toLowerCase();
    const driverId = typeof body.driverId === "string" ? body.driverId.trim() : "";
    if (!driverId) {
      return NextResponse.json({ success: false, error: "driverId required" }, { status: 400 });
    }

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
      return NextResponse.json({ success: false, error: "Driver not found" }, { status: 404 });
    }

    const actor = auth.actor || "admin";

    if (action === "refresh") {
      const snap = await refreshConnectStatusForDriver(driver.id, actor);
      return NextResponse.json({ success: true, snapshot: snap });
    }

    // Default — onboard (create or re-link).
    const link = await createConnectOnboardingLink(driver, actor);
    await writeAudit({
      action: "admin_requested_connect_onboarding",
      entityType: "CONNECT",
      entityId: driver.id,
      details: { stripeAccountId: link.stripeAccountId },
      actor,
    });
    return NextResponse.json({
      success: true,
      url: link.url,
      stripeAccountId: link.stripeAccountId,
      expiresAt: link.expiresAt,
    });
  } catch (error: any) {
    console.error("[admin driver-connect POST]", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to process" },
      { status: 500 }
    );
  }
}
