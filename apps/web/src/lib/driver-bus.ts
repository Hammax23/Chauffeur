import { publishCrossBus, subscribeCrossBus } from "@/lib/cross-process-bus";

/**
 * Pub/sub for driver Live Auto Mode offers.
 * Local + Postgres LISTEN/NOTIFY (multi-process safe).
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

const driverChannel = (driverId: string) => `driver:${driverId}`;
const OPS_CHANNEL = "ops:live-auto";

export function subscribeDriver(driverId: string, listener: Listener): () => void {
  return subscribeCrossBus("driver", driverChannel(driverId), (payload) => {
    listener(payload as DriverOfferEvent);
  });
}

export function publishDriver(driverId: string, event: DriverOfferEvent): void {
  publishCrossBus("driver", driverChannel(driverId), event);
}

/** Admin Live Auto dashboard — all offer lifecycle events. */
export function subscribeOpsLiveAuto(listener: Listener): () => void {
  return subscribeCrossBus("driver", OPS_CHANNEL, (payload) => {
    listener(payload as DriverOfferEvent);
  });
}

export function publishOpsLiveAuto(event: DriverOfferEvent): void {
  publishCrossBus("driver", OPS_CHANNEL, event);
}

export function publishDriverMany(driverIds: string[], event: DriverOfferEvent): void {
  for (const id of driverIds) {
    publishDriver(id, event);
  }
  publishOpsLiveAuto(event);
}
