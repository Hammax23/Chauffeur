import { sendBulkPushNotifications } from "@/lib/push-notifications";
import prisma from "@/lib/prisma";
import { listPushTokensByUserIds, notifyUserDevices } from "@/lib/push-devices";

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
        status: true,
        pickupLocation: true,
        dropoffLocation: true,
        serviceDate: true,
        serviceTime: true,
        assignedDriverId: true,
      },
    });

    if (!reservation) return;
    // Requests + Accept only apply to PENDING — don't notify on DONE/active reassigns.
    if (reservation.status !== "PENDING") return;

    const targetDriverId = driverId || reservation.assignedDriverId;
    if (!targetDriverId) return;

    const { title, body } = buildDriverAssignmentCopy(reservation);
    await notifyUserDevices("DRIVER", targetDriverId, title, body, {
      type: "new_assignment",
      bookingId: reservation.bookingId,
      screen: "DriverDashboard",
      channelId: "reservations",
    });
  } catch (error) {
    console.error("[notifyDriverReservationAssigned]", error);
  }
}

/** Build Expo push payloads for Live Auto marketplace offers (one row per device token). */
export function mapDriversToLiveOfferPushes(
  drivers: Array<{ id?: string; pushToken: string | null | undefined }>,
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
  drivers: Array<{ id?: string; pushToken: string | null | undefined }>,
  reservation: {
    bookingId: string;
    pickupLocation?: string | null;
    dropoffLocation?: string | null;
    serviceDate?: string | null;
    serviceTime?: string | null;
  }
): Promise<void> {
  const driverIds = drivers.map((d) => d.id).filter((id): id is string => !!id);
  if (driverIds.length > 0) {
    const byUser = await listPushTokensByUserIds("DRIVER", driverIds);
    const flat: Array<{ pushToken: string }> = [];
    for (const tokens of byUser.values()) {
      for (const t of tokens) flat.push({ pushToken: t });
    }
    // Also include any legacy tokens passed in that aren't in PushDevice yet
    for (const d of drivers) {
      if (d.pushToken && !flat.some((f) => f.pushToken === d.pushToken)) {
        flat.push({ pushToken: d.pushToken });
      }
    }
    const payload = mapDriversToLiveOfferPushes(flat, reservation);
    if (payload.length === 0) return;
    await sendBulkPushNotifications(payload);
    return;
  }

  const payload = mapDriversToLiveOfferPushes(drivers, reservation);
  if (payload.length === 0) return;
  await sendBulkPushNotifications(payload);
}

/** Push when a customer leaves a trip review for the assigned driver. */
export async function notifyDriverTripReviewed(input: {
  driverId: string;
  bookingId: string;
  customerName: string;
  stars: number;
}): Promise<void> {
  try {
    const stars = Math.min(5, Math.max(1, Math.floor(input.stars) || 1));
    const starLabel = "★".repeat(stars) + "☆".repeat(5 - stars);
    const name = input.customerName.trim() || "A customer";

    await notifyUserDevices(
      "DRIVER",
      input.driverId,
      "New customer review",
      `${name} rated you ${starLabel}`,
      {
        type: "trip_review",
        bookingId: input.bookingId,
        screen: "DriverReviews",
        channelId: "reservations",
      }
    );
  } catch (error) {
    console.error("[notifyDriverTripReviewed]", error);
  }
}
