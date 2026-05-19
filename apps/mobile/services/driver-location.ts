import * as Location from "expo-location";
import { AppState, Platform } from "react-native";
import { isRunningInExpoGo } from "expo";
import { updateDriverLocation } from "./api";
import { DRIVER_BG_TASK_NAME } from "./driver-location-task";

let subscription: Location.LocationSubscription | null = null;
let lastSentAt = 0;

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
      accuracy: Location.Accuracy.High,
    });
    lastSentAt = Date.now();
    await sendLocationSnapshot(loc);
  } catch (e) {
    if (__DEV__) {
      console.warn("[DriverLocation] getCurrentPositionAsync:", e instanceof Error ? e.message : e);
    }
  }
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
  await stopForegroundWatch();
  await stopBackgroundUpdates();
  lastSentAt = 0;
}

async function startForegroundWatchFallback(minSendIntervalMs: number) {
  await stopForegroundWatch();

  try {
    subscription = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: Platform.OS === "android" ? 2000 : 1000,
        distanceInterval: 5,
      },
      async (loc) => {
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
  const minSendIntervalMs = options?.minSendIntervalMs ?? 5000;

  const expoGoLimited = isExpoGoLocationLimited();

  if (!options?.force) {
    if (subscription) {
      return;
    }
    if (!expoGoLimited) {
      try {
        if (await Location.hasStartedLocationUpdatesAsync(DRIVER_BG_TASK_NAME)) {
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

  // Expo Go: never touch background permission or TaskManager location updates — avoids warnings + Android kills.
  if (expoGoLimited) {
    await startForegroundWatchFallback(minSendIntervalMs);
    return;
  }

  await ensureBackgroundLocationPermission();

  try {
    await Location.startLocationUpdatesAsync(DRIVER_BG_TASK_NAME, {
      accuracy: Location.Accuracy.High,
      timeInterval: minSendIntervalMs,
      distanceInterval: 15,
      deferredUpdatesInterval: minSendIntervalMs * 2,
      pausesUpdatesAutomatically: false,
      activityType: Location.LocationActivityType.AutomotiveNavigation,
      showsBackgroundLocationIndicator: true,
      foregroundService:
        Platform.OS === "android"
          ? {
              notificationTitle: "SARJ Driver — Live location",
              notificationBody:
                "Your position is shared with dispatch until you log out or force-close this app.",
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
