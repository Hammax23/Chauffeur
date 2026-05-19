import { EventEmitter } from "node:events";
import prisma from "@/lib/prisma";

/**
 * In-process pub/sub for live reservation updates (status, driver assignment, timing).
 *
 * The bus is keyed by `bookingId`. Each subscriber receives a typed event whenever
 * the reservation changes. SSE endpoints subscribe per-connection and forward
 * frames to the client.
 *
 * Scope: single Node process. For multi-replica deployments, swap this module for
 * a Redis pub/sub adapter (same surface area).
 */

export type ReservationEventType =
  | "snapshot"
  | "reservation_created"
  | "reservation_cancelled"
  | "status_changed"
  | "driver_assigned"
  | "driver_unassigned"
  | "timing_updated";

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

export interface ReservationEvent {
  type: ReservationEventType;
  bookingId: string;
  serverTime: string;
  data: ReservationLiveData;
}

type Listener = (event: ReservationEvent) => void;

/**
 * Persist the emitter across hot reloads / module re-eval in dev so subscribers
 * created on the first compile keep receiving events from later compiles.
 */
declare global {
  // eslint-disable-next-line no-var
  var __sarjReservationBus: EventEmitter | undefined;
}

const emitter: EventEmitter =
  globalThis.__sarjReservationBus ??
  (globalThis.__sarjReservationBus = (() => {
    const e = new EventEmitter();
    e.setMaxListeners(0);
    return e;
  })());

const reservationChannel = (bookingId: string) => `reservation:${bookingId}`;
const customerChannel = (customerId: string) => `customer:${customerId}`;

export function subscribeReservation(bookingId: string, listener: Listener): () => void {
  emitter.on(reservationChannel(bookingId), listener);
  return () => emitter.off(reservationChannel(bookingId), listener);
}

/** Subscribe to every reservation event owned by this customer (used by the
 * reservations list / home screen). */
export function subscribeCustomer(customerId: string, listener: Listener): () => void {
  emitter.on(customerChannel(customerId), listener);
  return () => emitter.off(customerChannel(customerId), listener);
}

export function publishReservation(event: ReservationEvent): void {
  emitter.emit(reservationChannel(event.bookingId), event);
  if (event.data.customerId) {
    emitter.emit(customerChannel(event.data.customerId), event);
  }
}

/** Build a `ReservationLiveData` snapshot from the database (used for SSE replays). */
export async function loadReservationLiveData(bookingId: string): Promise<ReservationLiveData | null> {
  const r = await prisma.reservation.findUnique({
    where: { bookingId },
    include: { assignedDriver: true },
  });
  if (!r) return null;
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

/**
 * Convenience helper: load a fresh snapshot from DB and publish the given event type.
 * Use this from any route that mutates a reservation (status, assignment, etc).
 */
export async function publishReservationFromDb(
  bookingId: string,
  type: ReservationEventType
): Promise<void> {
  try {
    const data = await loadReservationLiveData(bookingId);
    if (!data) return;
    publishReservation({
      type,
      bookingId,
      serverTime: new Date().toISOString(),
      data,
    });
  } catch (err) {
    console.error("[realtime-bus] Failed to publish reservation update:", err);
  }
}
