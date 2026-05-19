import { openSseStream, type SseConnectionStatus, type SseStreamHandle } from "./sse-client";
import type { ReservationLiveEvent } from "./reservation-stream";

/**
 * Per-customer live stream. One subscription receives events for ANY of the
 * customer's reservations (status changes, driver assignments, new bookings,
 * cancellations). Used by the reservations list and home screens so they stay
 * in sync without per-row connections.
 */

export type CustomerStreamStatus = SseConnectionStatus;

export interface CustomerStreamHandlers {
  onEvent: (event: ReservationLiveEvent) => void;
  onStatus?: (
    status: CustomerStreamStatus,
    info?: { error?: string; nextRetryMs?: number }
  ) => void;
}

export interface CustomerStreamHandle {
  close(): void;
}

export function openCustomerReservationsStream(
  handlers: CustomerStreamHandlers
): CustomerStreamHandle {
  const handle: SseStreamHandle = openSseStream(
    { path: "/customer/stream" },
    {
      onStatus: handlers.onStatus,
      onEvent: (frame) => {
        if (frame.type !== "reservation") return;
        try {
          const parsed = JSON.parse(frame.data) as ReservationLiveEvent;
          handlers.onEvent(parsed);
        } catch (e) {
          if (__DEV__) {
            console.warn("[customer-stream] Failed to parse event:", e, frame.data);
          }
        }
      },
    }
  );
  return { close: handle.close };
}
