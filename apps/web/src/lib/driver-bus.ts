import { EventEmitter } from "node:events";

/**
 * In-process pub/sub for driver Live Auto Mode offers.
 * Scope: single Node process (same constraint as realtime-bus / chat-bus).
 */

export type DriverOfferEventType =
  | "snapshot"
  | "offer_created"
  | "offer_revoked"
  | "offer_claimed"
  | "offer_declined"
  | "live_auto_toggled";

export interface DriverOfferRidePayload {
  bookingId: string;
  status: string;
  customerName: string;
  phone: string;
  email: string;
  serviceType: string;
  vehicle: string;
  passengers: number;
  childSeats: number;
  serviceDate: string;
  serviceTime: string;
  pickupLocation: string;
  stops: string;
  dropoffLocation: string;
  distance: string;
  duration: string;
  total: number;
  createdAt: string;
  /** true when this card came from Live Auto broadcast (not manual assign). */
  liveOffer: boolean;
}

export interface DriverOfferEvent {
  type: DriverOfferEventType;
  bookingId: string;
  serverTime: string;
  /** Present for offer_created / snapshot */
  ride?: DriverOfferRidePayload;
  liveAutoMode?: boolean;
}

type Listener = (event: DriverOfferEvent) => void;

declare global {
  // eslint-disable-next-line no-var
  var __sarjDriverBus: EventEmitter | undefined;
}

const emitter: EventEmitter =
  globalThis.__sarjDriverBus ??
  (globalThis.__sarjDriverBus = (() => {
    const e = new EventEmitter();
    e.setMaxListeners(0);
    return e;
  })());

const driverChannel = (driverId: string) => `driver:${driverId}`;
const OPS_CHANNEL = "ops:live-auto";

export function subscribeDriver(driverId: string, listener: Listener): () => void {
  emitter.on(driverChannel(driverId), listener);
  return () => emitter.off(driverChannel(driverId), listener);
}

export function publishDriver(driverId: string, event: DriverOfferEvent): void {
  emitter.emit(driverChannel(driverId), event);
}

/** Admin Live Auto dashboard — all offer lifecycle events. */
export function subscribeOpsLiveAuto(listener: Listener): () => void {
  emitter.on(OPS_CHANNEL, listener);
  return () => emitter.off(OPS_CHANNEL, listener);
}

export function publishOpsLiveAuto(event: DriverOfferEvent): void {
  emitter.emit(OPS_CHANNEL, event);
}

export function publishDriverMany(driverIds: string[], event: DriverOfferEvent): void {
  for (const id of driverIds) {
    publishDriver(id, event);
  }
  publishOpsLiveAuto(event);
}
