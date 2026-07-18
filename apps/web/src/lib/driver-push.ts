import { sendPushNotification, sendBulkPushNotifications } from "@/lib/push-notifications";
import prisma from "@/lib/prisma";

function shortLocation(value: string | null | undefined, max = 42): string {
  const raw = (value || "").trim();
  if (!raw) return "Pickup TBD";
  const first = raw.split(",")[0]?.trim() || raw;
  if (first.length <= max) return first;
  return `${first.slice(0, max - 1)}…`;
}

export function buildDriverAssignmentCopy(input: {
  pickupLocation?: string | null;
  dropoffLocation?: string | null;
  serviceDate?: string | null;
  serviceTime?: string | null;
}): { title: string; body: string } {
  const pickup = shortLocation(input.pickupLocation);
  const dropoff = shortLocation(input.dropoffLocation);
  const when = [input.serviceDate, input.serviceTime].filter(Boolean).join(" · ");
  return {
    title: "New Reservation Assigned",
    body: when
      ? `${pickup} → ${dropoff}\n${when}`
      : `${pickup} → ${dropoff}`,
  };
}

export function buildDriverLiveOfferCopy(input: {
  pickupLocation?: string | null;
  dropoffLocation?: string | null;
  serviceDate?: string | null;
  serviceTime?: string | null;
}): { title: string; body: string } {
  const pickup = shortLocation(input.pickupLocation);
  const dropoff = shortLocation(input.dropoffLocation);
  const when = [input.serviceDate, input.serviceTime].filter(Boolean).join(" · ");
  return {
    title: "New Reservation Available",
    body: when
      ? `${pickup} → ${dropoff}\n${when}`
      : `${pickup} → ${dropoff}`,
  };
}

/** Push when admin/ops manually assigns a reservation to a driver. */
export async function notifyDriverReservationAssigned(
  bookingId: string,
  driverId?: string
): Promise<void> {
  try {
    const reservation = await prisma.reservation.findUnique({
      where: { bookingId },
      select: {
        bookingId: true,
        pickupLocation: true,
        dropoffLocation: true,
        serviceDate: true,
        serviceTime: true,
        assignedDriverId: true,
        assignedDriver: { select: { id: true, pushToken: true } },
      },
    });

    if (!reservation) return;

    const targetDriverId = driverId || reservation.assignedDriverId;
    if (!targetDriverId) return;

    let pushToken = reservation.assignedDriver?.pushToken ?? null;
    if (!pushToken || reservation.assignedDriver?.id !== targetDriverId) {
      const driver = await prisma.driver.findUnique({
        where: { id: targetDriverId },
        select: { pushToken: true },
      });
      pushToken = driver?.pushToken ?? null;
    }

    if (!pushToken) return;

    const { title, body } = buildDriverAssignmentCopy(reservation);
    await sendPushNotification(pushToken, title, body, {
      type: "new_assignment",
      bookingId: reservation.bookingId,
      screen: "DriverDashboard",
      channelId: "reservations",
    });
  } catch (error) {
    console.error("[notifyDriverReservationAssigned]", error);
  }
}

/** Build Expo push payloads for Live Auto marketplace offers. */
export function mapDriversToLiveOfferPushes(
  drivers: Array<{ pushToken: string | null | undefined }>,
  reservation: {
    bookingId: string;
    pickupLocation?: string | null;
    dropoffLocation?: string | null;
    serviceDate?: string | null;
    serviceTime?: string | null;
  }
): Array<{ pushToken: string; title: string; body: string; data: Record<string, string> }> {
  const { title, body } = buildDriverLiveOfferCopy(reservation);
  return drivers
    .filter((d) => !!d.pushToken)
    .map((d) => ({
      pushToken: d.pushToken as string,
      title,
      body,
      data: {
        type: "live_offer",
        bookingId: reservation.bookingId,
        screen: "DriverDashboard",
        channelId: "reservations",
      },
    }));
}

export async function sendDriverLiveOfferPushes(
  drivers: Array<{ pushToken: string | null | undefined }>,
  reservation: {
    bookingId: string;
    pickupLocation?: string | null;
    dropoffLocation?: string | null;
    serviceDate?: string | null;
    serviceTime?: string | null;
  }
): Promise<void> {
  const payload = mapDriversToLiveOfferPushes(drivers, reservation);
  if (payload.length === 0) return;
  await sendBulkPushNotifications(payload);
}
