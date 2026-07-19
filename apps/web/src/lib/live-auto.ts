import prisma from "@/lib/prisma";
import { driverHasActiveAssignmentElsewhere, findBusyDriverIds } from "@/lib/data-store";
import {
  publishDriver,
  publishDriverMany,
  publishOpsLiveAuto,
  type DriverOfferRidePayload,
} from "@/lib/driver-bus";
import { publishReservationFromDb } from "@/lib/realtime-bus";

export type OpsSettingsData = {
  liveAutoMode: boolean;
  onlyActiveDrivers: boolean;
  updatedAt: string;
};

function mapRidePayload(
  r: {
    bookingId: string;
    status: string;
    firstName: string;
    lastName: string;
    phone: string;
    email: string;
    serviceType: string;
    vehicle: string;
    passengers: number;
    childSeats: number;
    serviceDate: string;
    serviceTime: string;
    pickupLocation: string;
    stops: string | null;
    dropoffLocation: string;
    distance: string | null;
    duration: string | null;
    total: number;
    createdAt: Date;
  },
  liveOffer: boolean
): DriverOfferRidePayload {
  return {
    bookingId: r.bookingId,
    status: r.status,
    customerName: `${r.firstName} ${r.lastName}`.trim(),
    phone: r.phone,
    email: r.email,
    serviceType: r.serviceType,
    vehicle: r.vehicle,
    passengers: r.passengers,
    childSeats: r.childSeats,
    serviceDate: r.serviceDate,
    serviceTime: r.serviceTime,
    pickupLocation: r.pickupLocation,
    stops: r.stops || "",
    dropoffLocation: r.dropoffLocation,
    distance: r.distance || "",
    duration: r.duration || "",
    total: r.total,
    createdAt: r.createdAt.toISOString(),
    liveOffer,
  };
}

export async function getOpsSettings(): Promise<OpsSettingsData> {
  const row = await prisma.opsSettings.upsert({
    where: { id: "global" },
    create: { id: "global", liveAutoMode: false, onlyActiveDrivers: true },
    update: {},
  });
  return {
    liveAutoMode: row.liveAutoMode,
    onlyActiveDrivers: row.onlyActiveDrivers,
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function updateOpsSettings(patch: {
  liveAutoMode?: boolean;
  onlyActiveDrivers?: boolean;
}): Promise<OpsSettingsData> {
  const row = await prisma.opsSettings.upsert({
    where: { id: "global" },
    create: {
      id: "global",
      liveAutoMode: patch.liveAutoMode ?? false,
      onlyActiveDrivers: patch.onlyActiveDrivers ?? true,
    },
    update: {
      ...(typeof patch.liveAutoMode === "boolean" ? { liveAutoMode: patch.liveAutoMode } : {}),
      ...(typeof patch.onlyActiveDrivers === "boolean"
        ? { onlyActiveDrivers: patch.onlyActiveDrivers }
        : {}),
    },
  });

  if (patch.liveAutoMode === false) {
    await revokeAllOpenOffers("Live Auto Mode disabled");
  }

  publishOpsLiveAuto({
    type: "live_auto_toggled",
    bookingId: "",
    serverTime: new Date().toISOString(),
    liveAutoMode: row.liveAutoMode,
  });

  return {
    liveAutoMode: row.liveAutoMode,
    onlyActiveDrivers: row.onlyActiveDrivers,
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function selectEligibleDrivers(bookingId: string, onlyAvailable: boolean) {
  const reservation = await prisma.reservation.findUnique({
    where: { bookingId },
    select: { rejectedDriverIds: true },
  });
  const rejected = new Set(
    (reservation?.rejectedDriverIds || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
  );

  // Match admin Drivers page "Available" badge: status === "available"
  const drivers = await prisma.driver.findMany({
    where: onlyAvailable ? { status: "available" } : undefined,
    select: { id: true, pushToken: true, name: true, isActive: true, status: true },
  });

  const candidates = drivers.filter((d) => !rejected.has(d.id));
  const busy = await findBusyDriverIds(
    candidates.map((d) => d.id),
    bookingId
  );

  return candidates
    .filter((d) => !busy.has(d.id))
    .map((d) => ({ id: d.id, pushToken: d.pushToken, name: d.name }));
}

/**
 * Broadcast a PENDING unassigned reservation to all eligible drivers.
 * Safe to call multiple times — existing OPEN offers are kept; new drivers get new rows.
 */
export async function broadcastLiveOffers(bookingId: string): Promise<{
  offered: number;
  driverIds: string[];
}> {
  const settings = await getOpsSettings();
  if (!settings.liveAutoMode) {
    return { offered: 0, driverIds: [] };
  }

  const reservation = await prisma.reservation.findUnique({ where: { bookingId } });
  if (!reservation) return { offered: 0, driverIds: [] };
  if (reservation.status !== "PENDING" || reservation.assignedDriverId) {
    return { offered: 0, driverIds: [] };
  }

  const eligible = await selectEligibleDrivers(bookingId, settings.onlyActiveDrivers);
  if (eligible.length === 0) {
    return { offered: 0, driverIds: [] };
  }

  const now = new Date();
  await prisma.$transaction(
    eligible.map((d) =>
      prisma.rideOffer.upsert({
        where: { bookingId_driverId: { bookingId, driverId: d.id } },
        create: { bookingId, driverId: d.id, status: "OPEN" },
        update: {
          // Re-open if previously declined/revoked and ride is still open
          status: "OPEN",
          respondedAt: null,
          createdAt: now,
        },
      })
    )
  );

  const ride = mapRidePayload(reservation, true);
  const serverTime = new Date().toISOString();
  const driverIds = eligible.map((d) => d.id);

  publishDriverMany(driverIds, {
    type: "offer_created",
    bookingId,
    serverTime,
    ride,
  });

  const { sendDriverLiveOfferPushes } = await import("@/lib/driver-push");
  void sendDriverLiveOfferPushes(eligible, {
    bookingId,
    pickupLocation: reservation.pickupLocation,
    dropoffLocation: reservation.dropoffLocation,
    serviceDate: reservation.serviceDate,
    serviceTime: reservation.serviceTime,
  }).catch((err) => console.error("[live-auto] push failed:", err));

  return { offered: driverIds.length, driverIds };
}

/** When a driver goes online, pull them into every currently open Live Auto ride. */
export async function syncDriverIntoOpenLiveOffers(driverId: string): Promise<number> {
  const settings = await getOpsSettings();
  if (!settings.liveAutoMode) return 0;

  const driver = await prisma.driver.findUnique({
    where: { id: driverId },
    select: { id: true, isActive: true, pushToken: true, status: true },
  });
  if (!driver) return 0;
  // Same rule as broadcast: admin "Available" = status available
  if (settings.onlyActiveDrivers && driver.status !== "available") return 0;
  if (await driverHasActiveAssignmentElsewhere(driverId, "__none__")) return 0;

  const openBookings = await prisma.reservation.findMany({
    where: { status: "PENDING", assignedDriverId: null },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  if (openBookings.length === 0) return 0;

  let added = 0;
  const serverTime = new Date().toISOString();
  const { buildDriverLiveOfferCopy } = await import("@/lib/driver-push");
  const { sendBulkPushNotifications } = await import("@/lib/push-notifications");
  const pushItems: Array<{
    pushToken: string;
    title: string;
    body: string;
    data: Record<string, string>;
  }> = [];

  const toOffer = openBookings.filter((reservation) => {
    const rejected = new Set(
      (reservation.rejectedDriverIds || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    );
    return !rejected.has(driverId);
  });

  if (toOffer.length > 0) {
    await prisma.$transaction(
      toOffer.map((reservation) =>
        prisma.rideOffer.upsert({
          where: { bookingId_driverId: { bookingId: reservation.bookingId, driverId } },
          create: { bookingId: reservation.bookingId, driverId, status: "OPEN" },
          update: { status: "OPEN", respondedAt: null },
        })
      )
    );
  }

  for (const reservation of toOffer) {
    const ride = mapRidePayload(reservation, true);
    publishDriver(driverId, {
      type: "offer_created",
      bookingId: reservation.bookingId,
      serverTime,
      ride,
    });
    publishOpsLiveAuto({
      type: "offer_created",
      bookingId: reservation.bookingId,
      serverTime,
      ride,
    });

    if (driver.pushToken) {
      const copy = buildDriverLiveOfferCopy(reservation);
      pushItems.push({
        pushToken: driver.pushToken,
        title: copy.title,
        body: copy.body,
        data: {
          type: "live_offer",
          bookingId: reservation.bookingId,
          screen: "DriverDashboard",
          channelId: "reservations",
        },
      });
    }
    added += 1;
  }

  if (pushItems.length > 0) {
    void sendBulkPushNotifications(pushItems).catch(() => {});
  }

  return added;
}

/** Driver went offline — pull their open marketplace offers so they don't keep ghost cards. */
export async function revokeOpenOffersForDriver(driverId: string): Promise<number> {
  const open = await prisma.rideOffer.findMany({
    where: { driverId, status: "OPEN" },
    select: { bookingId: true },
  });
  if (open.length === 0) return 0;

  await prisma.rideOffer.updateMany({
    where: { driverId, status: "OPEN" },
    data: { status: "REVOKED", respondedAt: new Date() },
  });

  const serverTime = new Date().toISOString();
  for (const o of open) {
    publishDriver(driverId, {
      type: "offer_revoked",
      bookingId: o.bookingId,
      serverTime,
    });
  }
  publishOpsLiveAuto({
    type: "offer_revoked",
    bookingId: "",
    serverTime,
  });

  return open.length;
}

/** Notify one driver instantly about a manually assigned PENDING request. */
export async function notifyDriverOfManualAssignment(bookingId: string, driverId: string): Promise<void> {
  const reservation = await prisma.reservation.findUnique({ where: { bookingId } });
  if (!reservation || reservation.assignedDriverId !== driverId) return;

  // Ensure an offer row exists so reject/accept paths are consistent.
  // Re-send after a prior reject: reopen CLAIMED from DECLINED.
  await prisma.rideOffer.upsert({
    where: { bookingId_driverId: { bookingId, driverId } },
    create: {
      bookingId,
      driverId,
      status: "CLAIMED",
      respondedAt: new Date(),
    },
    update: {
      status: "CLAIMED",
      respondedAt: new Date(),
    },
  });

  const ride = mapRidePayload(reservation, false);
  publishDriver(driverId, {
    type: "offer_created",
    bookingId,
    serverTime: new Date().toISOString(),
    ride,
  });
}

/** If Live Auto Mode is on, broadcast after a new reservation is created. */
export async function maybeBroadcastNewReservation(bookingId: string): Promise<void> {
  try {
    const settings = await getOpsSettings();
    if (!settings.liveAutoMode) return;
    await broadcastLiveOffers(bookingId);
  } catch (err) {
    console.error("[live-auto] broadcast error:", err);
  }
}

export async function revokeAllOpenOffers(reason?: string): Promise<number> {
  const open = await prisma.rideOffer.findMany({
    where: { status: "OPEN" },
    select: { bookingId: true, driverId: true },
  });
  if (open.length === 0) return 0;

  await prisma.rideOffer.updateMany({
    where: { status: "OPEN" },
    data: { status: "REVOKED", respondedAt: new Date() },
  });

  const byBooking = new Map<string, string[]>();
  for (const o of open) {
    const list = byBooking.get(o.bookingId) || [];
    list.push(o.driverId);
    byBooking.set(o.bookingId, list);
  }

  const serverTime = new Date().toISOString();
  for (const [bookingId, driverIds] of byBooking) {
    publishDriverMany(driverIds, {
      type: "offer_revoked",
      bookingId,
      serverTime,
    });
  }

  if (reason) {
    console.info(`[live-auto] revoked ${open.length} open offers — ${reason}`);
  }
  return open.length;
}

/** Revoke open offers for one booking (e.g. manual admin assign, cancel). */
export async function revokeOffersForBooking(
  bookingId: string,
  exceptDriverId?: string
): Promise<void> {
  const open = await prisma.rideOffer.findMany({
    where: {
      bookingId,
      status: "OPEN",
      ...(exceptDriverId ? { driverId: { not: exceptDriverId } } : {}),
    },
    select: { driverId: true },
  });

  await prisma.rideOffer.updateMany({
    where: {
      bookingId,
      status: "OPEN",
      ...(exceptDriverId ? { driverId: { not: exceptDriverId } } : {}),
    },
    data: { status: "REVOKED", respondedAt: new Date() },
  });

  // Manual assign winner: clear any leftover OPEN offer so admin counts stay accurate
  if (exceptDriverId) {
    await prisma.rideOffer.upsert({
      where: { bookingId_driverId: { bookingId, driverId: exceptDriverId } },
      create: {
        bookingId,
        driverId: exceptDriverId,
        status: "CLAIMED",
        respondedAt: new Date(),
      },
      update: { status: "CLAIMED", respondedAt: new Date() },
    });
  }

  if (open.length === 0) return;

  const serverTime = new Date().toISOString();
  publishDriverMany(
    open.map((o) => o.driverId),
    { type: "offer_revoked", bookingId, serverTime }
  );
}

/**
 * First-accept-wins claim. Returns conflict if another driver already claimed.
 */
export async function claimLiveOffer(
  bookingId: string,
  driverId: string
): Promise<
  | { ok: true }
  | { ok: false; reason: "not_found" | "taken" | "busy" | "ineligible" }
> {
  if (await driverHasActiveAssignmentElsewhere(driverId, bookingId)) {
    return { ok: false, reason: "busy" };
  }

  const result = await prisma.$transaction(async (tx) => {
    const reservation = await tx.reservation.findUnique({ where: { bookingId } });
    if (!reservation) return { ok: false as const, reason: "not_found" as const };

    const offer = await tx.rideOffer.findUnique({
      where: { bookingId_driverId: { bookingId, driverId } },
    });

    // Manual assign path: already assigned to this driver
    if (reservation.assignedDriverId === driverId && reservation.status === "PENDING") {
      const now = new Date();
      await tx.reservation.update({
        where: { id: reservation.id },
        data: {
          status: "ACCEPTED",
          driverResponse: "ACCEPTED",
          driverRespondedAt: now,
          statusUpdatedAt: now,
        },
      });
      if (offer) {
        await tx.rideOffer.update({
          where: { id: offer.id },
          data: { status: "CLAIMED", respondedAt: now },
        });
      }
      return { ok: true as const, mode: "manual" as const, loserIds: [] as string[] };
    }

    // Already taken by someone else / not pending
    if (reservation.assignedDriverId || reservation.status !== "PENDING") {
      return { ok: false as const, reason: "taken" as const };
    }

    // Live marketplace: must have an OPEN offer for this driver
    if (offer?.status !== "OPEN") {
      return { ok: false as const, reason: "ineligible" as const };
    }

    const now = new Date();
    const claimed = await tx.reservation.updateMany({
      where: {
        bookingId,
        assignedDriverId: null,
        status: "PENDING",
      },
      data: {
        assignedDriverId: driverId,
        status: "ACCEPTED",
        driverResponse: "ACCEPTED",
        driverRespondedAt: now,
        statusUpdatedAt: now,
      },
    });

    if (claimed.count === 0) {
      return { ok: false as const, reason: "taken" as const };
    }

    const losers = await tx.rideOffer.findMany({
      where: { bookingId, status: "OPEN", driverId: { not: driverId } },
      select: { driverId: true },
    });

    await tx.rideOffer.update({
      where: { id: offer.id },
      data: { status: "CLAIMED", respondedAt: now },
    });

    if (losers.length > 0) {
      await tx.rideOffer.updateMany({
        where: { bookingId, status: "OPEN", driverId: { not: driverId } },
        data: { status: "REVOKED", respondedAt: now },
      });
    }

    return {
      ok: true as const,
      mode: "live" as const,
      loserIds: losers.map((l) => l.driverId),
    };
  });

  if (!result.ok) return result;

  const serverTime = new Date().toISOString();

  if (result.mode === "live") {
    publishDriver(driverId, {
      type: "offer_claimed",
      bookingId,
      serverTime,
    });
    if (result.loserIds.length > 0) {
      publishDriverMany(result.loserIds, {
        type: "offer_revoked",
        bookingId,
        serverTime,
      });
    }
  }

  await publishReservationFromDb(bookingId, "driver_assigned");
  // Customer push must not block SSE/offer fan-out
  void import("@/lib/customer-push")
    .then(({ notifyCustomerDriverAssigned }) => notifyCustomerDriverAssigned(bookingId))
    .catch((err) => console.error("[claimLiveOffer] customer push", err));

  return { ok: true };
}

export async function declineLiveOffer(
  bookingId: string,
  driverId: string
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const reservation = await prisma.reservation.findUnique({ where: { bookingId } });
  if (!reservation) return { ok: false, reason: "not_found" };

  const offer = await prisma.rideOffer.findUnique({
    where: { bookingId_driverId: { bookingId, driverId } },
  });

  const isAssignee = reservation.assignedDriverId === driverId;
  const isOpenMarketplaceOffer =
    !!offer &&
    offer.status === "OPEN" &&
    !reservation.assignedDriverId &&
    reservation.status === "PENDING";

  // Manual-assign winner often has CLAIMED offer (not OPEN) — must still allow reject
  if (!isAssignee && !isOpenMarketplaceOffer) {
    return { ok: false, reason: "not_found" };
  }

  const appendRejected = (existing: string | null | undefined) => {
    const parts = (existing || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (!parts.includes(driverId)) parts.push(driverId);
    return parts.join(",");
  };

  if (isOpenMarketplaceOffer && offer) {
    await prisma.rideOffer.update({
      where: { id: offer.id },
      data: { status: "DECLINED", respondedAt: new Date() },
    });

    await prisma.reservation.update({
      where: { id: reservation.id },
      data: { rejectedDriverIds: appendRejected(reservation.rejectedDriverIds) },
    });

    const serverTime = new Date().toISOString();
    publishDriver(driverId, { type: "offer_declined", bookingId, serverTime });
    publishOpsLiveAuto({ type: "offer_declined", bookingId, serverTime });

    return { ok: true };
  }

  // Assigned to this driver (PENDING request or already claimed) — unassign
  await prisma.$transaction(async (tx) => {
    await tx.reservation.update({
      where: { id: reservation.id },
      data: {
        assignedDriverId: null,
        driverResponse: "REJECTED",
        driverRespondedAt: new Date(),
        rejectedDriverIds: appendRejected(reservation.rejectedDriverIds),
        // Keep booking PENDING so ops can reassign
        status: reservation.status === "ACCEPTED" ? "PENDING" : reservation.status,
      },
    });

    if (offer) {
      await tx.rideOffer.update({
        where: { id: offer.id },
        data: { status: "DECLINED", respondedAt: new Date() },
      });
    } else {
      await tx.rideOffer.upsert({
        where: { bookingId_driverId: { bookingId, driverId } },
        create: {
          bookingId,
          driverId,
          status: "DECLINED",
          respondedAt: new Date(),
        },
        update: { status: "DECLINED", respondedAt: new Date() },
      });
    }
  });

  const serverTime = new Date().toISOString();
  publishDriver(driverId, { type: "offer_declined", bookingId, serverTime });
  publishOpsLiveAuto({ type: "offer_declined", bookingId, serverTime });

  try {
    await publishReservationFromDb(bookingId, "driver_unassigned");
  } catch (err) {
    console.error("[declineLiveOffer] publishReservationFromDb", err);
  }

  // Re-broadcast to remaining drivers if Live Auto is on (this driver is in rejected list)
  try {
    await maybeBroadcastNewReservation(bookingId);
  } catch (err) {
    console.error("[declineLiveOffer] maybeBroadcast", err);
  }

  return { ok: true };
}

export async function listOpenOffersForDriver(driverId: string): Promise<DriverOfferRidePayload[]> {
  const offers = await prisma.rideOffer.findMany({
    where: { driverId, status: "OPEN" },
    orderBy: { createdAt: "desc" },
  });
  if (offers.length === 0) return [];

  const bookingIds = offers.map((o) => o.bookingId);
  const reservations = await prisma.reservation.findMany({
    where: {
      bookingId: { in: bookingIds },
      status: "PENDING",
      assignedDriverId: null,
    },
  });

  return reservations.map((r) => mapRidePayload(r, true));
}

export async function getLiveAutoDashboard() {
  const settings = await getOpsSettings();

  const openOfferBookingRows = await prisma.rideOffer.findMany({
    where: { status: "OPEN" },
    distinct: ["bookingId"],
    select: { bookingId: true },
  });
  const openBookingIds = openOfferBookingRows.map((o) => o.bookingId);

  const [availableDrivers, openOffers, openBookings, offerCounts] = await Promise.all([
    prisma.driver.count({ where: { status: "available" } }),
    prisma.rideOffer.count({ where: { status: "OPEN" } }),
    openBookingIds.length === 0
      ? Promise.resolve([])
      : prisma.reservation.findMany({
          where: {
            status: "PENDING",
            assignedDriverId: null,
            bookingId: { in: openBookingIds },
          },
          orderBy: { createdAt: "desc" },
          take: 50,
          select: {
            bookingId: true,
            firstName: true,
            lastName: true,
            pickupLocation: true,
            dropoffLocation: true,
            vehicle: true,
            serviceDate: true,
            serviceTime: true,
            createdAt: true,
          },
        }),
    prisma.rideOffer.groupBy({
      by: ["bookingId"],
      where: { status: "OPEN" },
      _count: { _all: true },
    }),
  ]);

  const countMap = new Map(offerCounts.map((c) => [c.bookingId, c._count._all]));

  return {
    settings,
    stats: {
      activeDrivers: availableDrivers,
      openOffers,
      broadcastingRides: openBookings.length,
    },
    broadcasting: openBookings.map((r) => ({
      bookingId: r.bookingId,
      customerName: `${r.firstName} ${r.lastName}`.trim(),
      pickupLocation: r.pickupLocation,
      dropoffLocation: r.dropoffLocation,
      vehicle: r.vehicle,
      serviceDate: r.serviceDate,
      serviceTime: r.serviceTime,
      createdAt: r.createdAt.toISOString(),
      offeredTo: countMap.get(r.bookingId) || 0,
    })),
  };
}
