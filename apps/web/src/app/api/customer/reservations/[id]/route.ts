import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { publishReservationFromDb } from "@/lib/realtime-bus";
import { serializeCustomerDriver } from "@/lib/customer-visible-driver";
import {
  getActiveCustomerFromRequest,
  customerAuthFailurePayload,
} from "@/lib/customer-auth";

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
      include: { assignedDriver: true, tripReview: true },
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
        statusUpdatedAt: reservation.statusUpdatedAt?.toISOString() || null,
        completedAt: reservation.completedAt?.toISOString() || null,
        createdAt: reservation.createdAt.toISOString(),
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

// DELETE - Cancel reservation (only if PENDING)
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

    const reservation = await prisma.reservation.findFirst({
      where: { bookingId: id, customerId: tokenData.id },
    });

    if (!reservation) {
      return NextResponse.json({ success: false, error: "Reservation not found" }, { status: 404 });
    }

    if (reservation.status !== "PENDING") {
      return NextResponse.json(
        { success: false, error: "Only pending reservations can be cancelled" },
        { status: 400 }
      );
    }

    await prisma.reservation.update({
      where: { id: reservation.id },
      data: { status: "CANCELLED" },
    });

    const { revokeOffersForBooking } = await import("@/lib/live-auto");
    await revokeOffersForBooking(id);

    await publishReservationFromDb(id, "reservation_cancelled");

    return NextResponse.json({ success: true, message: "Reservation cancelled successfully" });
  } catch (error) {
    console.error("Cancel reservation error:", error);
    return NextResponse.json({ success: false, error: "Failed to cancel reservation" }, { status: 500 });
  }
}
