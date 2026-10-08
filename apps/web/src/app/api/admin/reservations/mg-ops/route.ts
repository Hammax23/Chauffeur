import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { verifyOperationalManagerAuth } from "@/lib/operational-manager-auth";
import {
  billMgWaitIfNeeded,
  markReservationNoShow,
  reservationHasMeetGreet,
} from "@/lib/fare-adjustments";

async function authorize(request: NextRequest) {
  const admin = await verifyAdminAuth(request);
  if (admin.authenticated) {
    return { ok: true as const, actor: "admin" };
  }
  const ops = await verifyOperationalManagerAuth(request);
  if (ops?.authenticated) {
    return { ok: true as const, actor: "ops" };
  }
  return { ok: false as const, actor: "" };
}

/**
 * Admin/ops Meet & Greet + no-show controls.
 * Body actions:
 *  - set_landing: { bookingId, actualLandingAt: ISO }
 *  - charge_mg_wait: { bookingId, endedAt?: ISO, force?: boolean }
 *  - mark_no_show: { bookingId, notes?: string }
 *  - set_long_distance: { bookingId, isLongDistance: boolean }
 */
export async function POST(request: NextRequest) {
  const auth = await authorize(request);
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const bookingId = String(body?.bookingId || "").trim();
    const action = String(body?.action || "").trim().toLowerCase();

    if (!bookingId || !action) {
      return NextResponse.json(
        { success: false, error: "bookingId and action required" },
        { status: 400 }
      );
    }

    const reservation = await prisma.reservation.findUnique({ where: { bookingId } });
    if (!reservation) {
      return NextResponse.json({ success: false, error: "Reservation not found" }, { status: 404 });
    }

    if (action === "set_landing") {
      const raw = body?.actualLandingAt;
      const landing = raw ? new Date(String(raw)) : null;
      if (!landing || Number.isNaN(landing.getTime())) {
        return NextResponse.json(
          { success: false, error: "actualLandingAt must be a valid ISO datetime" },
          { status: 400 }
        );
      }
      const updated = await prisma.reservation.update({
        where: { id: reservation.id },
        data: { actualLandingAt: landing },
      });
      return NextResponse.json({
        success: true,
        action,
        bookingId,
        actualLandingAt: updated.actualLandingAt?.toISOString() || null,
        hasMeetGreet: reservationHasMeetGreet(reservation),
      });
    }

    if (action === "charge_mg_wait") {
      const endedAt = body?.endedAt ? new Date(String(body.endedAt)) : new Date();
      if (Number.isNaN(endedAt.getTime())) {
        return NextResponse.json({ success: false, error: "Invalid endedAt" }, { status: 400 });
      }
      const force = body?.force === true;
      if (!force && !reservationHasMeetGreet(reservation)) {
        return NextResponse.json(
          {
            success: false,
            error: "Booking is not Meet & Greet. Pass force:true to override.",
          },
          { status: 400 }
        );
      }
      const result = await billMgWaitIfNeeded(
        {
          id: reservation.id,
          bookingId: reservation.bookingId,
          customerId: reservation.customerId,
          stripeCustomerId: reservation.stripeCustomerId,
          stripePaymentMethodId: reservation.stripePaymentMethodId,
          specialRequirements: reservation.specialRequirements,
          serviceDate: reservation.serviceDate,
          serviceTime: reservation.serviceTime,
          actualLandingAt: reservation.actualLandingAt,
          mgWaitMinutesBilled: reservation.mgWaitMinutesBilled,
        },
        { endedAt, force }
      );
      const fresh = await prisma.reservation.findUnique({
        where: { id: reservation.id },
        select: {
          mgWaitMinutesBilled: true,
          mgWaitChargeAmount: true,
          actualLandingAt: true,
        },
      });
      return NextResponse.json({
        success: true,
        action,
        bookingId,
        result,
        mgWaitMinutesBilled: fresh?.mgWaitMinutesBilled ?? 0,
        mgWaitChargeAmount: fresh?.mgWaitChargeAmount ?? 0,
        actualLandingAt: fresh?.actualLandingAt?.toISOString() || null,
      });
    }

    if (action === "mark_no_show") {
      const marked = await markReservationNoShow({
        bookingId,
        markedBy: auth.actor,
        notes: body?.notes ? String(body.notes) : undefined,
      });
      if (!marked.ok) {
        return NextResponse.json(
          { success: false, error: marked.error || "Failed" },
          { status: 400 }
        );
      }
      return NextResponse.json({ success: true, action, ...marked });
    }

    if (action === "set_long_distance") {
      const isLongDistance = body?.isLongDistance === true;
      await prisma.reservation.update({
        where: { id: reservation.id },
        data: { isLongDistance },
      });
      return NextResponse.json({ success: true, action, bookingId, isLongDistance });
    }

    return NextResponse.json(
      {
        success: false,
        error: "Unknown action. Use set_landing | charge_mg_wait | mark_no_show | set_long_distance",
      },
      { status: 400 }
    );
  } catch (e) {
    console.error("[admin mg-ops]", e);
    return NextResponse.json({ success: false, error: "MG ops failed" }, { status: 500 });
  }
}
