import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { verifyOperationalManagerAuth } from "@/lib/operational-manager-auth";
import { createAndChargeFareAdjustment } from "@/lib/fare-adjustments";

/**
 * Admin/ops: add a post-booking fare line and charge saved cards.
 * Body: { bookingId, type, description, amount } — amount is pre-HST CAD.
 */
export async function POST(request: NextRequest) {
  const admin = await verifyAdminAuth(request);
  const ops = admin.authenticated ? null : await verifyOperationalManagerAuth(request);
  if (!admin.authenticated && !ops?.authenticated) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const bookingId = String(body?.bookingId || "").trim();
    const type = String(body?.type || "OTHER").trim().toUpperCase() || "OTHER";
    const description = String(body?.description || "").trim() || `${type} adjustment`;
    const amount = Number(body?.amount);

    if (!bookingId || !Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json(
        { success: false, error: "bookingId and positive amount required" },
        { status: 400 }
      );
    }

    const reservation = await prisma.reservation.findUnique({
      where: { bookingId },
    });
    if (!reservation) {
      return NextResponse.json({ success: false, error: "Reservation not found" }, { status: 404 });
    }

    const result = await createAndChargeFareAdjustment({
      reservationId: reservation.id,
      bookingId: reservation.bookingId,
      customerId: reservation.customerId,
      stripeCustomerId: reservation.stripeCustomerId,
      preferredPaymentMethodId: reservation.stripePaymentMethodId,
      type,
      description,
      amount,
      idempotencyKey: `admin:${bookingId}:${type}:${amount}:${description.slice(0, 40)}:${Date.now()}`,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (e) {
    console.error("[admin fare-adjustment]", e);
    return NextResponse.json({ success: false, error: "Failed to create adjustment" }, { status: 500 });
  }
}
