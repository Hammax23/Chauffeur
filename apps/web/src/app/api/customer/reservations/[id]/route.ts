import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { publishReservationFromDb } from "@/lib/realtime-bus";
import { serializeCustomerDriver } from "@/lib/customer-visible-driver";
import {
  getActiveCustomerFromRequest,
  customerAuthFailurePayload,
} from "@/lib/customer-auth";
import {
  extractStripePaymentIntentId,
  getCancelMoneyDecision,
} from "@/lib/cancel-policy";
import { refundPaymentIntent } from "@/lib/off-session-charge";

// GET - Get single reservation details
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getActiveCustomerFromRequest(req);
    if (!auth.ok) {
      const fail = customerAuthFailurePayload(auth.reason);
      return NextResponse.json(fail.body, { status: fail.status });
    }
    const tokenData = auth.customer;

    const { id } = await params;

    const reservation = await prisma.reservation.findFirst({
      where: { bookingId: id, customerId: tokenData.id },
      include: {
        assignedDriver: true,
        tripReview: true,
        fareAdjustments: { orderBy: { createdAt: "asc" } },
      },
    });

    if (!reservation) {
      return NextResponse.json({ success: false, error: "Reservation not found" }, { status: 404 });
    }

    const siteBase = (process.env.NEXT_PUBLIC_SITE_URL || "https://sarjworldwide.ca").replace(
      /\/$/,
      ""
    );
    const trackLink =
      reservation.trackLink?.trim() || `${siteBase}/track/${reservation.bookingId}`;

    const cancelPreview = getCancelMoneyDecision({
      serviceDate: reservation.serviceDate,
      serviceTime: reservation.serviceTime,
      isLongDistance: reservation.isLongDistance,
      actor: "customer",
    });

    return NextResponse.json({
      success: true,
      reservation: {
        id: reservation.id,
        bookingId: reservation.bookingId,
        trackLink,
        status: reservation.status,
        firstName: reservation.firstName,
        lastName: reservation.lastName,
        email: reservation.email,
        phone: reservation.phone,
        serviceType: reservation.serviceType,
        vehicle: reservation.vehicle,
        passengers: reservation.passengers,
        childSeats: reservation.childSeats,
        etr407: reservation.etr407,
        serviceDate: reservation.serviceDate,
        serviceTime: reservation.serviceTime,
        pickupLocation: reservation.pickupLocation,
        stops: reservation.stops || "",
        dropoffLocation: reservation.dropoffLocation,
        distance: reservation.distance || "",
        duration: reservation.duration || "",
        airline: reservation.airline || "",
        flightNumber: reservation.flightNumber || "",
        rideFare: reservation.rideFare,
        stopCharge: reservation.stopCharge,
        childSeatCharge: reservation.childSeatCharge,
        subtotal: reservation.subtotal,
        hst: reservation.hst,
        gratuity: reservation.gratuity,
        total: reservation.total,
        paymentStatus: reservation.paymentStatus || "PENDING",
        specialRequirements: reservation.specialRequirements || "",
        isLongDistance: reservation.isLongDistance,
        driverArrivedAt: reservation.driverArrivedAt?.toISOString() || null,
        waitMinutesBilled: reservation.waitMinutesBilled,
        waitChargeAmount: reservation.waitChargeAmount,
        actualLandingAt: reservation.actualLandingAt?.toISOString() || null,
        mgWaitMinutesBilled: reservation.mgWaitMinutesBilled,
        mgWaitChargeAmount: reservation.mgWaitChargeAmount,
        noShowMarkedAt: reservation.noShowMarkedAt?.toISOString() || null,
        statusUpdatedAt: reservation.statusUpdatedAt?.toISOString() || null,
        completedAt: reservation.completedAt?.toISOString() || null,
        createdAt: reservation.createdAt.toISOString(),
        cancelPolicy: {
          refundPercent: cancelPreview.refundPercent,
          keepPercent: cancelPreview.keepPercent,
          label: cancelPreview.label,
          freeUntil: cancelPreview.freeUntil?.toISOString() || null,
        },
        fareAdjustments: reservation.fareAdjustments.map((a) => ({
          id: a.id,
          type: a.type,
          description: a.description,
          amount: a.amount,
          hst: a.hst,
          total: a.total,
          status: a.status,
          createdAt: a.createdAt.toISOString(),
        })),
        driver: serializeCustomerDriver(
          reservation.status,
          reservation.assignedDriver,
          reservation.driverResponse
        ),
        review: reservation.tripReview
          ? {
              stars: reservation.tripReview.stars,
              comment: reservation.tripReview.comment,
              createdAt: reservation.tripReview.createdAt.toISOString(),
            }
          : null,
        canReview:
          reservation.status === "DONE" &&
          !!reservation.assignedDriverId &&
          !reservation.tripReview,
      },
    });
  } catch (error) {
    console.error("Reservation fetch error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch reservation" }, { status: 500 });
  }
}

// DELETE - Cancel reservation (PENDING or ACCEPTED before trip starts) + Stripe refund policy
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getActiveCustomerFromRequest(req);
    if (!auth.ok) {
      const fail = customerAuthFailurePayload(auth.reason);
      return NextResponse.json(fail.body, { status: fail.status });
    }
    const tokenData = auth.customer;

    const { id } = await params;

    let reason = "";
    try {
      const body = await req.json();
      reason = String(body?.reason || "").trim().slice(0, 200);
    } catch {
      /* no body */
    }

    const reservation = await prisma.reservation.findFirst({
      where: { bookingId: id, customerId: tokenData.id },
    });

    if (!reservation) {
      return NextResponse.json({ success: false, error: "Reservation not found" }, { status: 404 });
    }

    const cancellable = reservation.status === "PENDING" || reservation.status === "ACCEPTED";
    if (!cancellable) {
      return NextResponse.json(
        {
          success: false,
          error:
            "This trip can no longer be cancelled in the app. Please contact support.",
        },
        { status: 400 }
      );
    }

    const decision = getCancelMoneyDecision({
      serviceDate: reservation.serviceDate,
      serviceTime: reservation.serviceTime,
      isLongDistance: reservation.isLongDistance,
      actor: "customer",
    });

    let refundResult: { refunded: boolean; amount?: number; message?: string } = {
      refunded: false,
    };
    let nextPaymentStatus = reservation.paymentStatus || "PENDING";

    const piId = extractStripePaymentIntentId(reservation);
    const payStatus = String(reservation.paymentStatus || "").toUpperCase();
    const alreadyRefunded =
      payStatus === "REFUNDED" || payStatus === "PARTIALLY_REFUNDED";
    const isPaid = payStatus === "PAID";

    if (alreadyRefunded) {
      return NextResponse.json(
        {
          success: false,
          error: "This booking was already refunded. Contact support if you need help.",
          code: "ALREADY_REFUNDED",
        },
        { status: 400 }
      );
    }

    if (isPaid && piId && decision.refundPercent > 0 && process.env.STRIPE_SECRET_KEY) {
      const refund = await refundPaymentIntent({
        paymentIntentId: piId,
        refundPercent: decision.refundPercent,
        reason: reason || decision.label,
        metadata: {
          bookingId: reservation.bookingId,
          cancelPolicy: decision.label,
        },
      });
      if (refund.ok) {
        refundResult = { refunded: true, amount: refund.amount };
        nextPaymentStatus =
          decision.refundPercent >= 100 ? "REFUNDED" : "PARTIALLY_REFUNDED";
      } else {
        refundResult = { refunded: false, message: refund.message };
        console.error(
          `[cancel] Stripe refund failed for ${reservation.bookingId}:`,
          refund.message
        );
      }
    } else if (isPaid && decision.refundPercent <= 0) {
      nextPaymentStatus = "PAID"; // kept — late cancel
      refundResult = { refunded: false, message: decision.label };
    }

    const noteBits = [
      reservation.specialRequirements?.trim() || "",
      reason ? `Cancel reason: ${reason}` : "",
      `Cancel policy: ${decision.label}`,
      decision.refundPercent > 0
        ? `Refund: ${decision.refundPercent}%${
            refundResult.refunded ? ` ($${refundResult.amount?.toFixed(2)})` : " (pending/failed — ops)"
          }`
        : "Refund: none (fare kept per policy)",
    ].filter(Boolean);

    await prisma.reservation.update({
      where: { id: reservation.id },
      data: {
        status: "CANCELLED",
        paymentStatus: nextPaymentStatus,
        specialRequirements: noteBits.join("\n") || reservation.specialRequirements,
      },
    });

    const { revokeOffersForBooking } = await import("@/lib/live-auto");
    await revokeOffersForBooking(id);

    await publishReservationFromDb(id, "reservation_cancelled");

    return NextResponse.json({
      success: true,
      message: "Reservation cancelled successfully",
      cancelPolicy: {
        label: decision.label,
        refundPercent: decision.refundPercent,
        keepPercent: decision.keepPercent,
        isLongDistance: decision.isLongDistance,
      },
      refund: refundResult,
    });
  } catch (error) {
    console.error("Cancel reservation error:", error);
    return NextResponse.json({ success: false, error: "Failed to cancel reservation" }, { status: 500 });
  }
}
