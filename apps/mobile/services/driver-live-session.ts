/**
 * Keeps GPS live tracking aligned with server ride state: ON THE WAY / ARRIVED / CIC = session active.
 * Source of truth is GET /driver/rides?tab=upcoming — no separate local "session" flag.
 */
import { getDriverRides } from "./api";
import { startDriverLocationTracking, stopDriverLocationTracking } from "./driver-location";

/** Reservation statuses where the driver is actively serving the trip (Uber-style live leg). */
export const LIVE_RIDE_STATUSES = new Set(["ON THE WAY", "ARRIVED", "CIC", "STOP"]);

export function rideNeedsLiveTracking(status: string): boolean {
  return LIVE_RIDE_STATUSES.has(status);
}

/** Apply start/stop from an already-fetched ride list (no extra HTTP). */
export async function syncLiveTrackingFromRideList(
  rides: Array<{ status: string }>
): Promise<void> {
  try {
    const hasLiveRide = rides.some((r) => rideNeedsLiveTracking(r.status));
    if (hasLiveRide) {
      await startDriverLocationTracking();
    } else {
      await stopDriverLocationTracking();
    }
  } catch {
    // Same policy as syncDriverLiveTracking — don't thrash on transient errors.
  }
}

/**
 * Fetch upcoming rides from API and start/stop background location accordingly.
 * On network failure, does nothing so we don't kill GPS while offline mid-trip.
 */
export async function syncDriverLiveTracking(): Promise<void> {
  try {
    const data = await getDriverRides("upcoming");
    if (!data.success) return;
    await syncLiveTrackingFromRideList(data.rides);
  } catch {
    // Preserve current tracking if the request fails (e.g. no connectivity).
  }
}
