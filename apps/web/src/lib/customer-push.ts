import prisma from "@/lib/prisma";
import { notifyUserDevices } from "@/lib/push-devices";

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

export async function notifyCustomerReservationCancelled(bookingId: string): Promise<void> {
  try {
    const reservation = await prisma.reservation.findUnique({
      where: { bookingId },
      select: {
        bookingId: true,
        customerId: true,
      },
    });
    if (!reservation?.customerId) return;

    await notifyUserDevices(
      "CUSTOMER",
      reservation.customerId,
      "Reservation update",
      "Your reservation was cancelled.",
      { type: "reservation_cancelled", bookingId: reservation.bookingId }
    );
  } catch (error) {
    console.error("[notifyCustomerReservationCancelled]", error);
  }
}
