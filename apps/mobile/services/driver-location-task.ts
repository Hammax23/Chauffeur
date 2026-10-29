/**
 * Registers the background location task. Imported once from root `_layout` so TaskManager
 * knows the handler before `startLocationUpdatesAsync` runs.
 */
import * as TaskManager from "expo-task-manager";
import type { LocationObject } from "expo-location";
import { getDriverToken, updateDriverLocation } from "./api";

export const DRIVER_BG_TASK_NAME = "sarj-driver-live-location";

let lastBgSentAt = 0;
/** Keep posts flowing while stationary (paired with distanceInterval: 0 on the native task). */
const BG_MIN_INTERVAL_MS = 4000;
let lastAuthWarnAt = 0;

async function haltTrackingAfterAuthFailure() {
  try {
    const { stopDriverLocationTracking } = await import("./driver-location");
    await stopDriverLocationTracking();
  } catch {
    /* ignore */
  }
}

function isUnauthorizedError(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e ?? "");
  return /unauthorized|401/i.test(msg);
}

async function postFromLocation(loc: LocationObject) {
  const token = await getDriverToken();
  if (!token) {
    await haltTrackingAfterAuthFailure();
    return;
  }

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
    if (isUnauthorizedError(e)) {
      await haltTrackingAfterAuthFailure();
      const now = Date.now();
      if (__DEV__ && now - lastAuthWarnAt > 15_000) {
        lastAuthWarnAt = now;
        console.warn(
          "[DriverBG] Location POST unauthorized — tracking stopped. Re-login as driver if needed."
        );
      }
      return;
    }
    if (__DEV__) {
      console.warn("[DriverBG] POST failed:", e instanceof Error ? e.message : e);
    }
  }
}

TaskManager.defineTask(DRIVER_BG_TASK_NAME, async ({ data, error }) => {
  if (error) {
    if (__DEV__) {
      console.warn("[DriverBG] task error:", error);
    }
    return;
  }

  const locations = (data as { locations?: LocationObject[] } | undefined)?.locations;
  if (!locations?.length) {
    return;
  }

  const loc = locations[locations.length - 1];
  const now = Date.now();
  if (now - lastBgSentAt < BG_MIN_INTERVAL_MS) {
    return;
  }
  lastBgSentAt = now;

  await postFromLocation(loc);
});
