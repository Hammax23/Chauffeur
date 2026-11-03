import prisma from "@/lib/prisma";
import { notifyUserDevices } from "@/lib/push-devices";

function shortLocation(value: string | null | undefined, max = 48): string {
  const raw = (value || "").trim();
  if (!raw) return "";
  const first = raw.split(",")[0]?.trim() || raw;
  if (first.length <= max) return first;
  return `${first.slice(0, max - 1)}…`;
}

/** Notify the customer that a chauffeur was assigned to their booking. */
export async function notifyCustomerDriverAssigned(bookingId: string): Promise<void> {
  try {
    const reservation = await prisma.reservation.findUnique({
      where: { bookingId },
      select: {
        bookingId: true,
        status: true,
        driverResponse: true,
        pickupLocation: true,
        serviceDate: true,
        serviceTime: true,
        customerId: true,
        customer: { select: { firstName: true } },
        assignedDriver: { select: { name: true } },
      },
    });

    if (!reservation?.customerId || !reservation.assignedDriver) return;

    const { isDriverVisibleToCustomer } = await import("@/lib/customer-visible-driver");
    // Never push chauffeur details before accept (defense in depth).
    if (
      !isDriverVisibleToCustomer({
        status: reservation.status,
        driverResponse: reservation.driverResponse,
      })
    ) {
      return;
    }

    const driverName = reservation.assignedDriver.name || "your chauffeur";
    await notifyUserDevices(
      "CUSTOMER",
      reservation.customerId,
      "Driver assigned",
      `${driverName} is assigned to your ride on ${reservation.serviceDate} ${reservation.serviceTime}.`,
      {
        type: "driver_assigned",
        bookingId: reservation.bookingId,
        screen: "TrackRide",
      }
    );
  } catch (error) {
    console.error("[notifyCustomerDriverAssigned]", error);
  }
}

/** Notify the customer that live tracking unlocked — chauffeur is On the Way. */
export async function notifyCustomerDriverOnTheWay(bookingId: string): Promise<void> {
  try {
    const reservation = await prisma.reservation.findUnique({
      where: { bookingId },
      select: {
        bookingId: true,
        status: true,
        customerId: true,
        assignedDriver: { select: { name: true } },
      },
    });

    if (!reservation?.customerId) {
      console.warn(
        `[notifyCustomerDriverOnTheWay] skip — no customerId bookingId=${bookingId}`
      );
      return;
    }

    const driverName =
      reservation.assignedDriver?.name?.trim() || "Your chauffeur";

    const pushed = await notifyUserDevices(
      "CUSTOMER",
      reservation.customerId,
      "Driver on the way",
      `${driverName} is heading to pickup. Live location is now available.`,
      {
        type: "driver_on_the_way",
        bookingId: reservation.bookingId,
        channelId: "reservations",
        collapseId: `driver_on_the_way:${reservation.bookingId}`,
        eventId: `driver_on_the_way:${reservation.bookingId}:${Date.now()}`,
        screen: "customer/track-ride",
      }
    );
    if (!pushed.success) {
      console.warn(
        `[notifyCustomerDriverOnTheWay] skip — ${pushed.error || "failed"} bookingId=${bookingId}`
      );
    }
  } catch (error) {
    console.error("[notifyCustomerDriverOnTheWay]", error);
  }
}

/** Notify the customer that the chauffeur has arrived at pickup. */
export async function notifyCustomerDriverArrived(bookingId: string): Promise<void> {
  try {
    const reservation = await prisma.reservation.findUnique({
      where: { bookingId },
      select: {
        bookingId: true,
        customerId: true,
        pickupLocation: true,
        assignedDriver: { select: { name: true } },
      },
    });

    if (!reservation?.customerId) {
      console.warn(
        `[notifyCustomerDriverArrived] skip — no customerId bookingId=${bookingId}`
      );
      return;
    }

    const driverName =
      reservation.assignedDriver?.name?.trim() || "Your chauffeur";
    const pickup = shortLocation(reservation.pickupLocation);
    const body = pickup
      ? `${driverName} has arrived at ${pickup}.`
      : `${driverName} has arrived at pickup.`;

    const pushed = await notifyUserDevices(
      "CUSTOMER",
      reservation.customerId,
      "Driver has arrived",
      body,
      {
        type: "driver_arrived",
        bookingId: reservation.bookingId,
        channelId: "reservations",
        collapseId: `driver_arrived:${reservation.bookingId}`,
        eventId: `driver_arrived:${reservation.bookingId}:${Date.now()}`,
        screen: "customer/track-ride",
      }
    );
    if (!pushed.success) {
      console.warn(
        `[notifyCustomerDriverArrived] skip — ${pushed.error || "failed"} bookingId=${bookingId}`
      );
    }
  } catch (error) {
    console.error("[notifyCustomerDriverArrived]", error);
  }
}

/** Notify the customer that the trip has started (Customer In Car). */
export async function notifyCustomerTripStarted(bookingId: string): Promise<void> {
  try {
    const reservation = await prisma.reservation.findUnique({
      where: { bookingId },
      select: {
        bookingId: true,
        customerId: true,
        assignedDriver: { select: { name: true } },
      },
    });

    if (!reservation?.customerId) {
      console.warn(
        `[notifyCustomerTripStarted] skip — no customerId bookingId=${bookingId}`
      );
      return;
    }

    const driverName =
      reservation.assignedDriver?.name?.trim() || "Your chauffeur";

    const pushed = await notifyUserDevices(
      "CUSTOMER",
      reservation.customerId,
      "Trip started",
      `${driverName} has started your trip. Enjoy the ride.`,
      {
        type: "trip_started",
        bookingId: reservation.bookingId,
        channelId: "reservations",
        collapseId: `trip_started:${reservation.bookingId}`,
        eventId: `trip_started:${reservation.bookingId}:${Date.now()}`,
        screen: "customer/track-ride",
      }
    );
    if (!pushed.success) {
      console.warn(
        `[notifyCustomerTripStarted] skip — ${pushed.error || "failed"} bookingId=${bookingId}`
      );
    }
  } catch (error) {
    console.error("[notifyCustomerTripStarted]", error);
  }
}

/** Notify the customer that the trip is complete (+ soft review CTA). */
export async function notifyCustomerTripCompleted(bookingId: string): Promise<void> {
  try {
    const reservation = await prisma.reservation.findUnique({
      where: { bookingId },
      select: {
        bookingId: true,
        customerId: true,
        dropoffLocation: true,
        assignedDriver: { select: { name: true } },
        tripReview: { select: { id: true } },
      },
    });

    if (!reservation?.customerId) {
      console.warn(
        `[notifyCustomerTripCompleted] skip — no customerId bookingId=${bookingId}`
      );
      return;
    }

    const dropoff = shortLocation(reservation.dropoffLocation);
    const driverName = reservation.assignedDriver?.name?.trim();
    const canReview = !!reservation.assignedDriver && !reservation.tripReview;
    const thanks = dropoff
      ? `Your trip to ${dropoff} is complete.`
      : "Your trip is complete.";
    const reviewBit = canReview
      ? driverName
        ? ` Tap to rate ${driverName}.`
        : " Tap to rate your chauffeur."
      : " Thank you for riding with SARJ.";

    const pushed = await notifyUserDevices(
      "CUSTOMER",
      reservation.customerId,
      "Trip completed",
      `${thanks}${reviewBit}`,
      {
        type: canReview ? "trip_review_request" : "trip_completed",
        bookingId: reservation.bookingId,
        channelId: "reservations",
        collapseId: `trip_completed:${reservation.bookingId}`,
        eventId: `trip_completed:${reservation.bookingId}:${Date.now()}`,
        screen: "customer/trip-detail",
      }
    );
    if (!pushed.success) {
      console.warn(
        `[notifyCustomerTripCompleted] skip — ${pushed.error || "failed"} bookingId=${bookingId}`
      );
    }
  } catch (error) {
    console.error("[notifyCustomerTripCompleted]", error);
  }
}

/** Booking created / paid confirmation. */
export async function notifyCustomerBookingConfirmed(bookingId: string): Promise<void> {
  try {
    const reservation = await prisma.reservation.findUnique({
      where: { bookingId },
      select: {
        bookingId: true,
        customerId: true,
        pickupLocation: true,
        serviceDate: true,
        serviceTime: true,
        paymentStatus: true,
        total: true,
      },
    });
    if (!reservation?.customerId) return;

    const pickup = shortLocation(reservation.pickupLocation) || "your pickup";
    const when = [reservation.serviceDate, reservation.serviceTime]
      .filter(Boolean)
      .join(" · ");
    const paid =
      String(reservation.paymentStatus || "").toUpperCase() === "PAID"
        ? ` · $${Number(reservation.total || 0).toFixed(2)} paid`
        : "";
    const body = when
      ? `${pickup} on ${when}${paid}. We'll notify you when a chauffeur is assigned.`
      : `Booking ${reservation.bookingId} is confirmed${paid}.`;

    await notifyUserDevices(
      "CUSTOMER",
      reservation.customerId,
      "Booking confirmed",
      body,
      {
        type: "booking_confirmed",
        bookingId: reservation.bookingId,
        channelId: "reservations",
        collapseId: `booking_confirmed:${reservation.bookingId}`,
        eventId: `booking_confirmed:${reservation.bookingId}:${Date.now()}`,
        screen: "customer/trip-detail",
      }
    );
  } catch (error) {
    console.error("[notifyCustomerBookingConfirmed]", error);
  }
}

/** Pay-later / checkout completed — card captured after booking was created unpaid. */
export async function notifyCustomerPaymentReceived(bookingId: string): Promise<void> {
  try {
    const reservation = await prisma.reservation.findUnique({
      where: { bookingId },
      select: {
        bookingId: true,
        customerId: true,
        total: true,
        pickupLocation: true,
        serviceDate: true,
        serviceTime: true,
      },
    });
    if (!reservation?.customerId) return;

    const pickup = shortLocation(reservation.pickupLocation);
    const when = [reservation.serviceDate, reservation.serviceTime]
      .filter(Boolean)
      .join(" · ");
    const amount = `$${Number(reservation.total || 0).toFixed(2)}`;
    const detail = [pickup, when].filter(Boolean).join(" · ");
    const body = detail
      ? `Payment of ${amount} received for ${detail}.`
      : `Payment of ${amount} received for booking ${reservation.bookingId}.`;

    await notifyUserDevices(
      "CUSTOMER",
      reservation.customerId,
      "Payment received",
      body,
      {
        type: "payment_received",
        bookingId: reservation.bookingId,
        channelId: "reservations",
        collapseId: `payment_received:${reservation.bookingId}`,
        eventId: `payment_received:${reservation.bookingId}:${Date.now()}`,
        screen: "customer/trip-detail",
      }
    );
  } catch (error) {
    console.error("[notifyCustomerPaymentReceived]", error);
  }
}

/** Chauffeur no longer on the booking (decline / reassign before new accept). */
export async function notifyCustomerDriverUnassigned(bookingId: string): Promise<void> {
  try {
    const reservation = await prisma.reservation.findUnique({
      where: { bookingId },
      select: {
        bookingId: true,
        customerId: true,
        pickupLocation: true,
        serviceDate: true,
        serviceTime: true,
      },
    });
    if (!reservation?.customerId) return;

    const pickup = shortLocation(reservation.pickupLocation);
    const when = [reservation.serviceDate, reservation.serviceTime]
      .filter(Boolean)
      .join(" · ");
    const context = [pickup, when].filter(Boolean).join(" · ");
    const body = context
      ? `Your chauffeur is no longer available for ${context}. We're arranging another.`
      : "Your chauffeur is no longer available. We're arranging another.";

    await notifyUserDevices(
      "CUSTOMER",
      reservation.customerId,
      "Chauffeur update",
      body,
      {
        type: "driver_unassigned",
        bookingId: reservation.bookingId,
        channelId: "reservations",
        collapseId: `driver_unassigned:${reservation.bookingId}`,
        eventId: `driver_unassigned:${reservation.bookingId}:${Date.now()}`,
        screen: "customer/trip-detail",
      }
    );
  } catch (error) {
    console.error("[notifyCustomerDriverUnassigned]", error);
  }
}

async function markPreTripReminderSent(bookingId: string): Promise<void> {
  await prisma.$executeRaw`
    UPDATE "Reservation"
    SET "preTripReminderSentAt" = NOW()
    WHERE "bookingId" = ${bookingId}
      AND "preTripReminderSentAt" IS NULL
  `;
}

/** ~1 hour before scheduled pickup. */
export async function notifyCustomerPreTripReminder(bookingId: string): Promise<void> {
  try {
    const already = await prisma.$queryRaw<Array<{ sent: Date | null }>>`
      SELECT "preTripReminderSentAt" AS sent
      FROM "Reservation"
      WHERE "bookingId" = ${bookingId}
      LIMIT 1
    `;
    if (already[0]?.sent) return;

    const reservation = await prisma.reservation.findUnique({
      where: { bookingId },
      select: {
        bookingId: true,
        customerId: true,
        pickupLocation: true,
        serviceDate: true,
        serviceTime: true,
        assignedDriver: { select: { name: true } },
      },
    });
    if (!reservation?.customerId) return;

    const pickup = shortLocation(reservation.pickupLocation) || "pickup";
    const when = [reservation.serviceDate, reservation.serviceTime]
      .filter(Boolean)
      .join(" · ");
    const driver = reservation.assignedDriver?.name?.trim();
    const body = driver
      ? `${driver} will meet you at ${pickup}${when ? ` (${when})` : ""}.`
      : `Your SARJ ride to ${pickup} is coming up${when ? ` · ${when}` : ""}.`;

    const pushed = await notifyUserDevices(
      "CUSTOMER",
      reservation.customerId,
      "Ride coming up",
      body,
      {
        type: "pre_trip_reminder",
        bookingId: reservation.bookingId,
        channelId: "reservations",
        collapseId: `pre_trip_reminder:${reservation.bookingId}`,
        eventId: `pre_trip_reminder:${reservation.bookingId}`,
        screen: "customer/trip-detail",
      }
    );

    if (pushed.success || pushed.tokenCount === 0) {
      await markPreTripReminderSent(bookingId);
    }
  } catch (error) {
    console.error("[notifyCustomerPreTripReminder]", error);
  }
}

/** Notify the customer that their reservation was cancelled (admin / ops — not self-cancel). */
export async function notifyCustomerReservationCancelled(bookingId: string): Promise<void> {
  try {
    const reservation = await prisma.reservation.findUnique({
      where: { bookingId },
      select: {
        bookingId: true,
        customerId: true,
        pickupLocation: true,
        serviceDate: true,
        serviceTime: true,
      },
    });
    if (!reservation?.customerId) return;

    const pickup = shortLocation(reservation.pickupLocation);
    const when = [reservation.serviceDate, reservation.serviceTime]
      .filter(Boolean)
      .join(" · ");
    const details = [pickup, when].filter(Boolean).join(" · ");
    const body = details
      ? `Your reservation was cancelled (${details}).`
      : "Your reservation was cancelled.";

    await notifyUserDevices(
      "CUSTOMER",
      reservation.customerId,
      "Reservation cancelled",
      body,
      {
        type: "reservation_cancelled",
        bookingId: reservation.bookingId,
        channelId: "reservations",
        collapseId: `reservation_cancelled:${reservation.bookingId}`,
        eventId: `reservation_cancelled:${reservation.bookingId}:${Date.now()}`,
        screen: "customer/track-ride",
      }
    );
  } catch (error) {
    console.error("[notifyCustomerReservationCancelled]", error);
  }
}

/**
 * Fire customer lifecycle pushes for a status transition (mobile PATCH + web driver-status).
 * Only first meaningful transitions — STOP→CIC does not re-fire trip_started.
 */
export function fireCustomerLifecyclePush(
  bookingId: string,
  status: string,
  prev: {
    status: string;
    driverOnTheWayAt?: Date | null;
    driverArrivedAt?: Date | null;
  }
): void {
  const prevStatus = String(prev.status || "").toUpperCase();

  if (status === "ON THE WAY" && !prev.driverOnTheWayAt) {
    void notifyCustomerDriverOnTheWay(bookingId).catch((err) =>
      console.error("[on-the-way] customer push", err)
    );
    return;
  }

  if (status === "ARRIVED" && !prev.driverArrivedAt) {
    void notifyCustomerDriverArrived(bookingId).catch((err) =>
      console.error("[arrived] customer push", err)
    );
    return;
  }

  if (status === "CIC" && prevStatus !== "STOP" && prevStatus !== "CIC") {
    void notifyCustomerTripStarted(bookingId).catch((err) =>
      console.error("[trip-started] customer push", err)
    );
    return;
  }

  if (status === "DONE" && prevStatus !== "DONE") {
    void notifyCustomerTripCompleted(bookingId).catch((err) =>
      console.error("[trip-completed] customer push", err)
    );
  }
}
