import { sendBulkPushNotifications } from "@/lib/push-notifications";
import prisma from "@/lib/prisma";
import {
  canDriverAcceptRule,
  isMembershipActive,
} from "@/lib/concierge-rules";

/** Fan-out push to eligible ONLINE concierge drivers when a request opens. */
export async function notifyConciergeOffer(rideId: string): Promise<void> {
  try {
    const ride = await prisma.conciergeRideRequest.findUnique({
      where: { id: rideId },
      select: {
        id: true,
        status: true,
        requestCode: true,
        pickupLocation: true,
        dropoffLocation: true,
        vehicleRequestRule: true,
        fare: true,
        hotel: { select: { name: true } },
      },
    });
    if (!ride || ride.status !== "OPEN") return;

    const profiles = await prisma.conciergeDriverProfile.findMany({
      where: { availability: "ONLINE" },
      include: {
        driver: { select: { id: true, pushToken: true, name: true } },
      },
    });

    const eligible = profiles.filter(
      (p) =>
        isMembershipActive(p.membershipStatus, p.membershipExpiresAt) &&
        canDriverAcceptRule(p.vehicleClass, ride.vehicleRequestRule, p.vehicleLabel) &&
        !!p.driver.pushToken
    );

    if (eligible.length === 0) return;

    const pickup = (ride.pickupLocation || "").split(",")[0]?.trim() || "Pickup";
    const hotel = ride.hotel.name;

    await sendBulkPushNotifications(
      eligible.map((p) => ({
        pushToken: p.driver.pushToken as string,
        title: "Hotel Concierge request",
        body: `${hotel}: ${pickup} · $${ride.fare.toFixed(0)} · ${ride.vehicleRequestRule}`,
        data: {
          type: "concierge_offer",
          channelId: "reservations",
          rideId: ride.id,
          requestCode: ride.requestCode,
        },
      }))
    );
  } catch (e) {
    console.error("[concierge-push] offer fan-out", e);
  }
}

/** Notify concierge when driver is assigned (optional — uses no push token on Concierge yet). */
export async function notifyCommissionDispute(rideId: string): Promise<void> {
  try {
    const ride = await prisma.conciergeRideRequest.findUnique({
      where: { id: rideId },
      select: {
        requestCode: true,
        hotel: { select: { name: true } },
        hotelCommission: true,
      },
    });
    if (!ride) return;
    // Admin surface is primary for V1; log for ops visibility
    console.warn(
      `[concierge-dispute] ${ride.requestCode} at ${ride.hotel.name} · $${ride.hotelCommission}`
    );
  } catch (e) {
    console.error("[concierge-push] dispute", e);
  }
}
