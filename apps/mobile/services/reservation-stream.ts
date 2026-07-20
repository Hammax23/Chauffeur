import { openSseStream, type SseConnectionStatus, type SseStreamHandle } from "./sse-client";

/**
 * Per-reservation live stream. Subscribes to
 * GET /api/customer/reservations/[id]/stream and decodes each `reservation`
 * event into a typed `ReservationLiveEvent`.
 */

export type ReservationLiveEventType =
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

export interface ReservationLiveEvent {
  type: ReservationLiveEventType;
  bookingId: string;
  serverTime: string;
  seq?: number;
  data?: ReservationLiveData;
  location?: DriverLocationLivePayload;
}

// Re-export connection-status type for hooks that already imported it from here.
export type ReservationStreamStatus = SseConnectionStatus;

export interface ReservationStreamHandlers {
  onEvent: (event: ReservationLiveEvent) => void;
  onStatus?: (
    status: ReservationStreamStatus,
    info?: { error?: string; nextRetryMs?: number }
  ) => void;
}

export interface ReservationStreamHandle {
  close(): void;
}

export function openReservationStream(
  bookingId: string,
  handlers: ReservationStreamHandlers
): ReservationStreamHandle {
  const handle: SseStreamHandle = openSseStream(
    { path: `/customer/reservations/${encodeURIComponent(bookingId)}/stream` },
    {
      onStatus: handlers.onStatus,
      onEvent: (frame) => {
        if (frame.type !== "reservation") return;
        try {
          const parsed = JSON.parse(frame.data) as ReservationLiveEvent;
          handlers.onEvent(parsed);
        } catch (e) {
          if (__DEV__) {
            console.warn("[reservation-stream] Failed to parse event:", e, frame.data);
          }
        }
      },
    }
  );
  return { close: handle.close };
}
