import "server-only";

import prisma from "@/lib/prisma";
import {
  publishCrossBus,
  subscribeCrossBus,
  registerCrossBusReload,
  emitCrossBusLocal,
  type CrossBusEnvelope,
} from "@/lib/cross-process-bus";

/**
 * Pub/sub for live reservation updates (status, driver assignment, timing).
 *
 * Local + Postgres LISTEN/NOTIFY so every Node process / PM2 worker receives
 * the same events (multi-replica safe).
 */

export type ReservationEventType =
  | "snapshot"
  | "reservation_created"
  | "reservation_cancelled"
  | "status_changed"
  | "driver_assigned"
  | "driver_unassigned"
  | "timing_updated"
  | "driver_location";

export interface ReservationLiveDriver {
  name: string;
  phone: string;
  photo: string | null;
  vehicle: string | null;
  vehiclePlate: string | null;
  rating: number | null;
}

export interface ReservationLiveData {
  bookingId: string;
  status: string;
  statusUpdatedAt: string | null;
  driverOnTheWayAt: string | null;
  driverStopPeriodsJson: string | null;
  completedAt: string | null;
  /** Customer who owns this reservation. Routed to customer-scoped subscribers. */
  customerId: string | null;
  driver: ReservationLiveDriver | null;
}

export interface DriverLocationLivePayload {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  heading: number | null;
  speed: number | null;
  updatedAt: string;
}

export interface ReservationEvent {
  type: ReservationEventType;
  bookingId: string;
  serverTime: string;
  seq?: number;
  /** Present for status / snapshot events */
  data?: ReservationLiveData;
  /** Present for driver_location events */
  location?: DriverLocationLivePayload;
}

type Listener = (event: ReservationEvent) => void;

const reservationChannel = (bookingId: string) => `reservation:${bookingId}`;
const customerChannel = (customerId: string) => `customer:${customerId}`;

export function subscribeReservation(bookingId: string, listener: Listener): () => void {
  return subscribeCrossBus("reservation", reservationChannel(bookingId), (payload) => {
    listener(payload as ReservationEvent);
  });
}

/** Subscribe to every reservation event owned by this customer (list / home). */
export function subscribeCustomer(customerId: string, listener: Listener): () => void {
  return subscribeCrossBus("reservation", customerChannel(customerId), (payload) => {
    listener(payload as ReservationEvent);
  });
}

export function publishReservation(event: ReservationEvent): void {
  publishCrossBus("reservation", reservationChannel(event.bookingId), event);
  if (event.data?.customerId) {
    publishCrossBus("reservation", customerChannel(event.data.customerId), event);
  }
}

/**
 * Throttled live GPS for an active booking. Publishes only on the reservation
 * channel (not customer list) to keep location traffic scoped.
 */
const LOCATION_THROTTLE_MS = 2_500;
declare global {
  // eslint-disable-next-line no-var
  var __sarjLocThrottle: Map<string, number> | undefined;
}

function locationThrottleMap(): Map<string, number> {
  if (!globalThis.__sarjLocThrottle) {
    globalThis.__sarjLocThrottle = new Map();
  }
  return globalThis.__sarjLocThrottle;
}

export function publishDriverLocationEvent(params: {
  bookingId: string;
  latitude: number;
  longitude: number;
  accuracy?: number | null;
  heading?: number | null;
  speed?: number | null;
  force?: boolean;
}): boolean {
  const key = params.bookingId;
  const now = Date.now();
  const map = locationThrottleMap();
  const last = map.get(key) ?? 0;
  if (!params.force && now - last < LOCATION_THROTTLE_MS) {
    return false;
  }
  map.set(key, now);

  const event: ReservationEvent = {
    type: "driver_location",
    bookingId: params.bookingId,
    serverTime: new Date().toISOString(),
    location: {
      latitude: params.latitude,
      longitude: params.longitude,
      accuracy: params.accuracy ?? null,
      heading: params.heading ?? null,
      speed: params.speed ?? null,
      updatedAt: new Date().toISOString(),
    },
  };
  publishCrossBus("reservation", reservationChannel(params.bookingId), event);
  return true;
}

/** Map a Prisma reservation (+ optional assignedDriver) into live payload. */
export function mapReservationLiveData(r: {
  bookingId: string;
  status: string;
  statusUpdatedAt: Date | null;
  driverOnTheWayAt: Date | null;
  driverStopPeriodsJson: string | null;
  completedAt: Date | null;
  customerId: string | null;
  assignedDriver: {
    name: string;
    phone: string;
    photo: string | null;
    vehicle: string | null;
    vehiclePlate: string | null;
    rating: number | null;
  } | null;
}): ReservationLiveData {
  return {
    bookingId: r.bookingId,
    status: r.status,
    statusUpdatedAt: r.statusUpdatedAt?.toISOString() ?? null,
    driverOnTheWayAt: r.driverOnTheWayAt?.toISOString() ?? null,
    driverStopPeriodsJson: r.driverStopPeriodsJson ?? null,
    completedAt: r.completedAt?.toISOString() ?? null,
    customerId: r.customerId ?? null,
    driver: r.assignedDriver
      ? {
          name: r.assignedDriver.name,
          phone: r.assignedDriver.phone,
          photo: r.assignedDriver.photo,
          vehicle: r.assignedDriver.vehicle ?? null,
          vehiclePlate: r.assignedDriver.vehiclePlate ?? null,
          rating: r.assignedDriver.rating ?? null,
        }
      : null,
  };
}

/** Build a `ReservationLiveData` snapshot from the database (SSE replays). */
export async function loadReservationLiveData(bookingId: string): Promise<ReservationLiveData | null> {
  const r = await prisma.reservation.findUnique({
    where: { bookingId },
    include: { assignedDriver: true },
  });
  if (!r) return null;
  return mapReservationLiveData(r);
}

/** Batch-load live payloads — one query instead of N× findUnique. */
export async function loadReservationLiveDataMany(
  bookingIds: string[]
): Promise<ReservationLiveData[]> {
  if (bookingIds.length === 0) return [];
  const rows = await prisma.reservation.findMany({
    where: { bookingId: { in: bookingIds } },
    include: { assignedDriver: true },
  });
  const byId = new Map(rows.map((r) => [r.bookingId, mapReservationLiveData(r)]));
  return bookingIds.map((id) => byId.get(id)).filter((d): d is ReservationLiveData => !!d);
}

/**
 * Publish when you already have live data (skips extra DB round-trip).
 */
export function publishReservationData(
  bookingId: string,
  type: ReservationEventType,
  data: ReservationLiveData
): void {
  publishReservation({
    type,
    bookingId,
    serverTime: new Date().toISOString(),
    data,
  });
}

/**
 * Load a fresh snapshot from DB and publish. Prefer `publishReservationData`
 * when the mutator already has the row in memory.
 */
export async function publishReservationFromDb(
  bookingId: string,
  type: ReservationEventType
): Promise<void> {
  try {
    const data = await loadReservationLiveData(bookingId);
    if (!data) return;
    publishReservationData(bookingId, type, data);
  } catch (err) {
    console.error("[realtime-bus] Failed to publish reservation update:", err);
  }
}

/** Oversized NOTIFY poke: rebuild from DB and emit locally only (no re-NOTIFY). */
async function handleReservationPoke(envelope: CrossBusEnvelope): Promise<void> {
  const channel = envelope.channel;
  if (!channel || !channel.startsWith("reservation:")) return;
  const bookingId = channel.slice("reservation:".length);
  if (!bookingId) return;
  try {
    const data = await loadReservationLiveData(bookingId);
    if (!data) return;
    const event: ReservationEvent = {
      type: "status_changed",
      bookingId,
      serverTime: new Date().toISOString(),
      data,
    };
    emitCrossBusLocal("reservation", reservationChannel(bookingId), event);
    if (data.customerId) {
      emitCrossBusLocal("reservation", customerChannel(data.customerId), event);
    }
  } catch (err) {
    console.error("[realtime-bus] poke reload failed:", err);
  }
}

registerCrossBusReload("reservation", handleReservationPoke);
