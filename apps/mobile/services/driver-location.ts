import * as Location from "expo-location";
import { AppState, Platform } from "react-native";
import { isRunningInExpoGo } from "expo";
import { updateDriverLocation } from "./api";
import { DRIVER_BG_TASK_NAME } from "./driver-location-task";

let subscription: Location.LocationSubscription | null = null;
let lastSentAt = 0;
let heartbeatTimer: ReturnType<typeof setInterval> | null = null;

/** Keep `lastLocationUpdatedAt` fresh even when the car is stopped (red light / traffic). */
const HEARTBEAT_MS = 12_000;
/** Native BG cadence — time-based, not movement-based. */
const BG_TIME_INTERVAL_MS = 4_000;

/** Expo Go does not support background location (Android: none; iOS: unreliable off simulator). Using any BG API triggers warnings and can crash Android. */
function isExpoGoLocationLimited(): boolean {
  return isRunningInExpoGo();
}

export async function ensureForegroundLocationPermission(): Promise<{
  granted: boolean;
  canAskAgain: boolean;
}> {
  const current = await Location.getForegroundPermissionsAsync();
  if (current.status === "granted") {
    return { granted: true, canAskAgain: current.canAskAgain };
  }

  const req = await Location.requestForegroundPermissionsAsync();
  return { granted: req.status === "granted", canAskAgain: req.canAskAgain };
}

/** Needed for Uber-style tracking while the app is in the background (development / release builds). */
export async function ensureBackgroundLocationPermission(): Promise<boolean> {
  const fg = await Location.getForegroundPermissionsAsync();
  if (fg.status !== "granted") {
    return false;
  }

  const existing = await Location.getBackgroundPermissionsAsync();
  if (existing.status === "granted") {
    return true;
  }

  const req = await Location.requestBackgroundPermissionsAsync();
  return req.status === "granted";
}

async function sendLocationSnapshot(loc: Location.LocationObject) {
  const { latitude, longitude, accuracy, heading, speed } = loc.coords;
  try {
    await updateDriverLocation({
      latitude,
      longitude,
      accuracy: typeof accuracy === "number" ? accuracy : null,
      heading: typeof heading === "number" && heading >= 0 ? heading : null,
      speed: typeof speed === "number" ? speed : null,
    });
  } catch (e) {
    if (__DEV__) {
      console.warn(
        "[DriverLocation] Failed to POST /driver/location:",
        e instanceof Error ? e.message : e
      );
    }
  }
}

async function flushCurrentLocation() {
  try {
    const loc = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.BestForNavigation,
    });
    lastSentAt = Date.now();
    await sendLocationSnapshot(loc);
  } catch (e) {
    if (__DEV__) {
      console.warn("[DriverLocation] getCurrentPositionAsync:", e instanceof Error ? e.message : e);
    }
  }
}

async function flushHeartbeat(minSendIntervalMs: number) {
  const now = Date.now();
  if (now - lastSentAt < minSendIntervalMs) return;
  await flushCurrentLocation();
}

function stopHeartbeat() {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
}

function startHeartbeat(minSendIntervalMs: number) {
  stopHeartbeat();
  // Immediate ping so customer UI never sits on a cold stamp after start/resume.
  void flushHeartbeat(0);
  heartbeatTimer = setInterval(() => {
    void flushHeartbeat(minSendIntervalMs);
  }, HEARTBEAT_MS);
}

async function stopForegroundWatch() {
  try {
    subscription?.remove();
  } catch {
    // ignore
  }
  subscription = null;
}

async function stopBackgroundUpdates() {
  try {
    const started = await Location.hasStartedLocationUpdatesAsync(DRIVER_BG_TASK_NAME);
    if (started) {
      await Location.stopLocationUpdatesAsync(DRIVER_BG_TASK_NAME);
    }
  } catch {
    // ignore
  }
}

export async function stopDriverLocationTracking() {
  stopHeartbeat();
  await stopForegroundWatch();
  await stopBackgroundUpdates();
  lastSentAt = 0;
}

/**
 * If the OS killed the BG task mid-trip, restart it. Safe to call on a timer.
 */
export async function ensureDriverLocationHealthy(options?: {
  minSendIntervalMs?: number;
}): Promise<void> {
  const minSendIntervalMs = options?.minSendIntervalMs ?? 4_000;
  const expoGoLimited = isExpoGoLocationLimited();

  if (expoGoLimited) {
    if (!subscription) {
      await startDriverLocationTracking({ minSendIntervalMs, force: true });
    } else {
      startHeartbeat(minSendIntervalMs);
    }
    return;
  }

  try {
    const started = await Location.hasStartedLocationUpdatesAsync(DRIVER_BG_TASK_NAME);
    if (!started) {
      await startDriverLocationTracking({ minSendIntervalMs, force: true });
      return;
    }
  } catch {
    await startDriverLocationTracking({ minSendIntervalMs, force: true });
    return;
  }

  // Task alive — keep JS heartbeat running for stationary heartbeats while foregrounded.
  startHeartbeat(minSendIntervalMs);
}

async function startForegroundWatchFallback(minSendIntervalMs: number) {
  await stopForegroundWatch();

  try {
    subscription = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.BestForNavigation,
        timeInterval: Platform.OS === "android" ? 2000 : 1000,
        // 0 = emit on timeInterval even when parked (critical for live track).
        distanceInterval: 0,
      },
      async (loc) => {
        // Still post from the watch while foregrounded; BG task + heartbeat cover background.
        if (AppState.currentState !== "active") {
          return;
        }

        const now = Date.now();
        if (now - lastSentAt < minSendIntervalMs) {
          return;
        }
        lastSentAt = now;

        await sendLocationSnapshot(loc);
      }
    );
  } catch (e) {
    if (__DEV__) {
      console.warn("[DriverLocation] watchPositionAsync failed:", e instanceof Error ? e.message : e);
    }
  }
}

/**
 * Starts native background location (TaskManager) when possible — continues after app is minimized,
 * until logout or process kill. Falls back to foreground-only updates in Expo Go on Android.
 */
export async function startDriverLocationTracking(options?: {
  minSendIntervalMs?: number;
  force?: boolean;
}) {
  const minSendIntervalMs = options?.minSendIntervalMs ?? 4_000;

  const expoGoLimited = isExpoGoLocationLimited();

  if (!options?.force) {
    if (subscription) {
      startHeartbeat(minSendIntervalMs);
      return;
    }
    if (!expoGoLimited) {
      try {
        if (await Location.hasStartedLocationUpdatesAsync(DRIVER_BG_TASK_NAME)) {
          startHeartbeat(minSendIntervalMs);
          return;
        }
      } catch {
        // ignore
      }
    }
  }

  if (options?.force) {
    await stopDriverLocationTracking();
  }

  const { granted } = await ensureForegroundLocationPermission();
  if (!granted) {
    return;
  }

  await flushCurrentLocation();
  startHeartbeat(minSendIntervalMs);

  // Expo Go: never touch background permission or TaskManager location updates — avoids warnings + Android kills.
  if (expoGoLimited) {
    await startForegroundWatchFallback(minSendIntervalMs);
    return;
  }

  await ensureBackgroundLocationPermission();

  try {
    await Location.startLocationUpdatesAsync(DRIVER_BG_TASK_NAME, {
      accuracy: Location.Accuracy.BestForNavigation,
      timeInterval: BG_TIME_INTERVAL_MS,
      // Must be 0 — a positive distance filter freezes posts at red lights / traffic.
      distanceInterval: 0,
      // Don't batch/delay deliveries on iOS.
      deferredUpdatesInterval: 0,
      pausesUpdatesAutomatically: false,
      activityType: Location.LocationActivityType.AutomotiveNavigation,
      showsBackgroundLocationIndicator: true,
      foregroundService:
        Platform.OS === "android"
          ? {
              notificationTitle: "SARJ Driver — Live location",
              notificationBody:
                "Your position is shared with the customer until the trip ends or you log out.",
              notificationColor: "#D4A04A",
              killServiceOnDestroy: false,
            }
          : undefined,
    });
    return;
  } catch (e) {
    if (__DEV__) {
      console.warn(
        "[DriverLocation] Background tracking unavailable, using foreground watch:",
        e instanceof Error ? e.message : e
      );
    }
  }

  await startForegroundWatchFallback(minSendIntervalMs);
}

export async function restartDriverLocationTracking(options?: { minSendIntervalMs?: number }) {
  await startDriverLocationTracking({ ...options, force: true });
}
