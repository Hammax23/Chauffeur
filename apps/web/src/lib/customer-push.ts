import { sendPushNotification } from "@/lib/push-notifications";
import prisma from "@/lib/prisma";

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
        customer: { select: { pushToken: true, firstName: true } },
        assignedDriver: { select: { name: true } },
      },
    });

    const token = reservation?.customer?.pushToken;
    if (!token || !reservation?.assignedDriver) return;

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
    await sendPushNotification(
      token,
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

export async function notifyCustomerReservationCancelled(bookingId: string): Promise<void> {
  try {
    const reservation = await prisma.reservation.findUnique({
      where: { bookingId },
      select: {
        bookingId: true,
        customer: { select: { pushToken: true } },
      },
    });
    const token = reservation?.customer?.pushToken;
    if (!token || !reservation) return;

    await sendPushNotification(
      token,
      "Reservation update",
      "Your reservation was cancelled.",
      { type: "reservation_cancelled", bookingId: reservation.bookingId }
    );
  } catch (error) {
    console.error("[notifyCustomerReservationCancelled]", error);
  }
}
