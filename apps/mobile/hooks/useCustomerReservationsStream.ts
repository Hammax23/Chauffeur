import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, type AppStateStatus } from "react-native";
import { useFocusEffect } from "expo-router";
import {
  openCustomerReservationsStream,
  type CustomerStreamHandle,
  type CustomerStreamStatus,
} from "../services/customer-stream";
import type { ReservationLiveEvent } from "../services/reservation-stream";

export interface UseCustomerReservationsStreamOptions {
  /** Pause the stream when the screen blurs (default: true). */
  pauseOnBlur?: boolean;
  /** Pause the stream when the app is backgrounded (default: true). */
  pauseOnBackground?: boolean;
  /**
   * Disable the stream entirely (useful before sign-in completes). When false,
   * the connection is opened on focus + foreground.
   */
  enabled?: boolean;
  /**
   * Called for every reservation event from the server. Use this to merge live
   * data into your local list (status_changed, driver_assigned, etc.).
   */
  onEvent: (event: ReservationLiveEvent) => void;
}

export interface UseCustomerReservationsStreamResult {
  status: CustomerStreamStatus;
  error: string | null;
  nextRetryMs: number | null;
  /** ISO of the last server event received (snapshot or push). */
  lastEventAt: string | null;
}

/**
 * Subscribes to /api/customer/stream and forwards every reservation event to
 * `onEvent`. On AppState resume, forces a fresh SSE reconnect for snapshot recovery.
 */
export function useCustomerReservationsStream(
  options: UseCustomerReservationsStreamOptions
): UseCustomerReservationsStreamResult {
  const { pauseOnBlur = true, pauseOnBackground = true, enabled = true, onEvent } = options;

  const [status, setStatus] = useState<CustomerStreamStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [nextRetryMs, setNextRetryMs] = useState<number | null>(null);
  const [lastEventAt, setLastEventAt] = useState<string | null>(null);

  const handleRef = useRef<CustomerStreamHandle | null>(null);
  const focusedRef = useRef(false);
  const foregroundedRef = useRef(AppState.currentState === "active");
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  const teardown = useCallback(() => {
    handleRef.current?.close();
    handleRef.current = null;
  }, []);

  const startStream = useCallback(() => {
    if (!enabled) return;
    const focusOk = !pauseOnBlur || focusedRef.current;
    const fgOk = !pauseOnBackground || foregroundedRef.current;
    if (!focusOk || !fgOk) {
      teardown();
      setStatus((s) => (s === "closed" ? s : "idle"));
      return;
    }

    teardown();

    handleRef.current = openCustomerReservationsStream({
      onEvent: (event) => {
        if (event.type === "driver_location") return;
        setLastEventAt(event.serverTime);
        setError(null);
        onEventRef.current(event);
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
  }, [enabled, pauseOnBackground, pauseOnBlur, teardown]);

  useEffect(() => {
    if (!enabled) {
      teardown();
      setStatus("idle");
      setError(null);
      setNextRetryMs(null);
      return;
    }
    startStream();
    return teardown;
  }, [enabled, startStream, teardown]);

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

  return { status, error, nextRetryMs, lastEventAt };
}
