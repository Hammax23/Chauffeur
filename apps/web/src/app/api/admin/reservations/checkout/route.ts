import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { verifyOperationalManagerAuth } from "@/lib/operational-manager-auth";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { createReservationPaymentLink } from "@/lib/reservation-payment-link";

async function verifyStaff(request: NextRequest) {
  const adminAuth = await verifyAdminAuth(request);
  if (adminAuth.authenticated) return true;
  const opsAuth = await verifyOperationalManagerAuth(request);
  return opsAuth.authenticated;
}

/** Stripe Checkout Session — shareable pay link for a reservation (admin / ops). */
export async function POST(request: NextRequest) {
  if (!(await verifyStaff(request))) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const clientIp = getClientIp(request);
  const rateLimit = checkRateLimit(`reservation-checkout:${clientIp}`, {
    maxRequests: 20,
    windowMs: 60 * 1000,
  });
  if (!rateLimit.success) {
    return NextResponse.json(
      { success: false, error: `Too many requests. Try again in ${rateLimit.resetIn}s.` },
      { status: 429 }
    );
  }

  try {
    const body = await request.json();
    const bookingId = String(body.bookingId || "").trim();
    if (!bookingId) {
      return NextResponse.json({ success: false, error: "bookingId required" }, { status: 400 });
    }

    const reservation = await prisma.reservation.findUnique({ where: { bookingId } });
    if (!reservation) {
      return NextResponse.json({ success: false, error: "Reservation not found" }, { status: 404 });
    }

    if (reservation.paymentStatus === "PAID") {
      return NextResponse.json(
        { success: false, error: "Reservation is already paid" },
        { status: 400 }
      );
    }

    if (["CANCELLED", "CANCELED"].includes(String(reservation.status || "").toUpperCase())) {
      return NextResponse.json(
        { success: false, error: "Reservation is cancelled" },
        { status: 400 }
      );
    }

    const { url, sessionId, amount } = await createReservationPaymentLink({
      bookingId,
      total: Number(reservation.total) || 0,
      email: reservation.email,
      firstName: reservation.firstName,
      lastName: reservation.lastName,
      pickupLocation: reservation.pickupLocation,
      returnBaseUrl: body.returnBaseUrl,
    });

    return NextResponse.json({
      success: true,
      url,
      sessionId,
      amount,
      bookingId,
      currency: "CAD",
    });
  } catch (e) {
    console.error("[reservation checkout]", e);
    const message = e instanceof Error ? e.message : "Checkout session failed";
    const status = message.includes("$0.50") ? 400 : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
