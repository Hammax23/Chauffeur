import { sendBulkPushNotifications } from "@/lib/push-notifications";
import prisma from "@/lib/prisma";
import {
  canDriverAcceptRule,
  isMembershipActive,
} from "@/lib/concierge-rules";
import { listPushTokensByUserIds, notifyUserDevices } from "@/lib/push-devices";

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
        driver: { select: { id: true, name: true } },
      },
    });

    const eligible = profiles.filter(
      (p) =>
        isMembershipActive(p.membershipStatus, p.membershipExpiresAt) &&
        canDriverAcceptRule(p.vehicleClass, ride.vehicleRequestRule, p.vehicleLabel)
    );

    if (eligible.length === 0) return;

    const pickup = (ride.pickupLocation || "").split(",")[0]?.trim() || "Pickup";
    const hotel = ride.hotel.name;
    const byUser = await listPushTokensByUserIds(
      "DRIVER",
      eligible.map((p) => p.driver.id)
    );

    const payloads: Array<{
      pushToken: string;
      title: string;
      body: string;
      data: Record<string, string>;
    }> = [];
    for (const tokens of byUser.values()) {
      for (const pushToken of tokens) {
        payloads.push({
          pushToken,
          title: "Hotel Concierge request",
          body: `${hotel}: ${pickup} · $${ride.fare.toFixed(0)} · ${ride.vehicleRequestRule}`,
          data: {
            type: "concierge_offer",
            channelId: "reservations",
            rideId: ride.id,
            requestCode: ride.requestCode,
          },
        });
      }
    }

    if (payloads.length === 0) return;
    await sendBulkPushNotifications(payloads);
  } catch (e) {
    console.error("[concierge-push] offer fan-out", e);
  }
}

/** Log + surface for admin; openDisputes count already on admin dashboard. */
export async function notifyCommissionDispute(rideId: string): Promise<void> {
  try {
    const ride = await prisma.conciergeRideRequest.findUnique({
      where: { id: rideId },
      select: {
        id: true,
        requestCode: true,
        hotelCommission: true,
        hotel: { select: { name: true } },
        assignedDriverProfile: {
          include: { driver: { select: { id: true, name: true } } },
        },
      },
    });
    if (!ride) return;

    console.warn(
      `[concierge-dispute] ${ride.requestCode} at ${ride.hotel.name} · $${ride.hotelCommission}`
    );

    const driverId = ride.assignedDriverProfile?.driver?.id;
    if (driverId) {
      await notifyUserDevices(
        "DRIVER",
        driverId,
        "Commission dispute",
        `${ride.requestCode}: hotel commission claims do not match. Admin will review.`,
        {
          type: "concierge_dispute",
          channelId: "default",
          rideId: ride.id,
          requestCode: ride.requestCode,
        }
      );
    }
  } catch (e) {
    console.error("[concierge-push] dispute", e);
  }
}
