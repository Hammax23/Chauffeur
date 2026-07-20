import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, type AppStateStatus } from "react-native";
import { useFocusEffect } from "expo-router";
import {
  openReservationStream,
  type DriverLocationLivePayload,
  type ReservationLiveData,
  type ReservationLiveEvent,
  type ReservationStreamHandle,
  type ReservationStreamStatus,
} from "../services/reservation-stream";

export interface UseReservationStreamOptions {
  /** Stop the stream when the screen blurs (default: true). */
  pauseOnBlur?: boolean;
  /** Stop the stream when the app is backgrounded (default: true). */
  pauseOnBackground?: boolean;
  /** Called every time the server pushes a new event (snapshot/status_changed/...). */
  onEvent?: (event: ReservationLiveEvent) => void;
}

export interface UseReservationStreamResult {
  data: ReservationLiveData | null;
  location: DriverLocationLivePayload | null;
  status: ReservationStreamStatus;
  error: string | null;
  /** ms until the next reconnect when status === "reconnecting". */
  nextRetryMs: number | null;
  /** ISO of the last server event we received (snapshot or push). */
  lastEventAt: string | null;
}

/**
 * Subscribes to /api/customer/reservations/[id]/stream and exposes a live
 * reservation snapshot. Auto-pauses while the screen is blurred or the app is
 * backgrounded so we never hold an SSE connection while the user can't see it.
 * On AppState resume, forces a fresh SSE reconnect so missed events are recovered via snapshot.
 */
export function useReservationStream(
  bookingId: string | null | undefined,
  options: UseReservationStreamOptions = {}
): UseReservationStreamResult {
  const { pauseOnBlur = true, pauseOnBackground = true, onEvent } = options;

  const [data, setData] = useState<ReservationLiveData | null>(null);
  const [location, setLocation] = useState<DriverLocationLivePayload | null>(null);
  const [status, setStatus] = useState<ReservationStreamStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [nextRetryMs, setNextRetryMs] = useState<number | null>(null);
  const [lastEventAt, setLastEventAt] = useState<string | null>(null);

  const handleRef = useRef<ReservationStreamHandle | null>(null);
  const focusedRef = useRef(false);
  const foregroundedRef = useRef(AppState.currentState === "active");
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  const teardown = useCallback(() => {
    handleRef.current?.close();
    handleRef.current = null;
  }, []);

  const startStream = useCallback(() => {
    if (!bookingId) return;
    const focusOk = !pauseOnBlur || focusedRef.current;
    const fgOk = !pauseOnBackground || foregroundedRef.current;
    if (!focusOk || !fgOk) {
      teardown();
      setStatus((s) => (s === "closed" ? s : "idle"));
      return;
    }

    // Always reopen — resume/focus must get a fresh snapshot
    teardown();

    handleRef.current = openReservationStream(bookingId, {
      onEvent: (event) => {
        setLastEventAt(event.serverTime);
        setError(null);
        if (event.type === "driver_location" && event.location) {
          setLocation(event.location);
        } else if (event.data) {
          setData(event.data);
        }
        onEventRef.current?.(event);
      },
      onStatus: (next, info) => {
        setStatus(next);
        if (next === "reconnecting") {
          setError(info?.error ?? null);
          setNextRetryMs(info?.nextRetryMs ?? null);
        } else if (next === "open") {
          setError(null);
          setNextRetryMs(null);
        } else if (next === "closed") {
          setNextRetryMs(null);
        }
      },
    });
  }, [bookingId, pauseOnBackground, pauseOnBlur, teardown]);

  // Mount / unmount + bookingId change
  useEffect(() => {
    if (!bookingId) {
      teardown();
      setData(null);
      setLocation(null);
      setStatus("idle");
      setError(null);
      setNextRetryMs(null);
      setLastEventAt(null);
      return;
    }
    startStream();
    return teardown;
  }, [bookingId, startStream, teardown]);

  // App background / foreground — force reconnect on resume
  useEffect(() => {
    const sub = AppState.addEventListener("change", (next: AppStateStatus) => {
      const wasForeground = foregroundedRef.current;
      foregroundedRef.current = next === "active";
      if (foregroundedRef.current && !wasForeground) {
        startStream();
      } else if (!foregroundedRef.current && pauseOnBackground) {
        teardown();
        setStatus((s) => (s === "closed" ? s : "idle"));
      }
    });
    return () => sub.remove();
  }, [startStream, pauseOnBackground, teardown]);

  // Screen focus / blur
  useFocusEffect(
    useCallback(() => {
      focusedRef.current = true;
      startStream();
      return () => {
        focusedRef.current = false;
        if (pauseOnBlur) {
          teardown();
          setStatus((s) => (s === "closed" ? s : "idle"));
        }
      };
    }, [startStream, pauseOnBlur, teardown])
  );

  return { data, location, status, error, nextRetryMs, lastEventAt };
}
