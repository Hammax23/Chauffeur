import { openSseStream, type SseConnectionStatus, type SseStreamHandle } from "./sse-client";

export type DriverOfferEventType =
  | "snapshot"
  | "offer_created"
  | "offer_revoked"
  | "offer_claimed"
  | "offer_declined"
  | "live_auto_toggled";

export interface DriverOfferRide {
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
  specialRequirements?: string;
  createdAt: string;
  liveOffer: boolean;
}

export interface DriverOfferEvent {
  type: DriverOfferEventType;
  bookingId: string;
  serverTime: string;
  ride?: DriverOfferRide;
  liveAutoMode?: boolean;
}

export type DriverStreamStatus = SseConnectionStatus;

export interface DriverStreamHandlers {
  onEvent: (event: DriverOfferEvent) => void;
  onStatus?: (
    status: DriverStreamStatus,
    info?: { error?: string; nextRetryMs?: number }
  ) => void;
}

export interface DriverStreamHandle {
  close(): void;
}

export function openDriverStream(handlers: DriverStreamHandlers): DriverStreamHandle {
  const handle: SseStreamHandle = openSseStream(
    { path: "/driver/stream" },
    {
      onStatus: handlers.onStatus,
      onEvent: (frame) => {
        if (frame.type !== "offer") return;
        try {
          const parsed = JSON.parse(frame.data) as DriverOfferEvent;
          handlers.onEvent(parsed);
        } catch (e) {
          if (__DEV__) {
            console.warn("[driver-stream] Failed to parse event:", e, frame.data);
          }
        }
      },
    }
  );

  return { close: () => handle.close() };
}
