import * as Notifications from "expo-notifications";
import { Alert, InteractionManager } from "react-native";
import { router } from "expo-router";
import { getDriverRideDetail } from "./api";

/** Push payload shapes used across SARJ (driver / concierge / future customer). */
export type SarjNotificationData = {
  type?: string;
  bookingId?: string;
  rideId?: string;
  channelId?: string;
  eventId?: string;
  [key: string]: unknown;
};

const TERMINAL_RIDE_STATUSES = new Set(["DONE", "CANCELLED"]);

/** Prevents double-navigation from cold-start + response listener. */
const handledResponseKeys = new Set<string>();

/** Serialize navigations so cold-start + tap + in-app banner don't race. */
let routeChain: Promise<unknown> = Promise.resolve();

/** Optional UI hook (in-app banner) — dismiss overlay when a booking is opened. */
let onBookingOpenedFromNotification: ((bookingId: string) => void) | null = null;

export function setNotificationBookingOpenedListener(
  fn: ((bookingId: string) => void) | null
) {
  onBookingOpenedFromNotification = fn;
}

function responseKey(
  response: Notifications.NotificationResponse | null | undefined
): string | null {
  if (!response) return null;
  const id = response.notification.request.identifier;
  const action = response.actionIdentifier || "default";
  const date = response.notification.date ?? 0;
  return `${id}::${action}::${date}`;
}

export function parseNotificationData(raw: unknown): SarjNotificationData {
  if (!raw || typeof raw !== "object") return {};
  return raw as SarjNotificationData;
}

function isUnavailableError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err || "");
  return /not found|no longer|unavailable|403|404/i.test(msg);
}

async function clearBadgeSafely() {
  try {
    await Notifications.setBadgeCountAsync(0);
  } catch {
    // ignore
  }
}

/**
 * Remove tray banners that belong to a booking (or concierge ride).
 * Call after the driver opens / completes / rejects that job.
 */
export async function dismissPresentedForEntity(opts: {
  bookingId?: string | null;
  rideId?: string | null;
}): Promise<void> {
  const bookingId = opts.bookingId?.trim() || "";
  const rideId = opts.rideId?.trim() || "";
  if (!bookingId && !rideId) return;

  try {
    const presented = await Notifications.getPresentedNotificationsAsync();
    await Promise.all(
      presented
        .filter((n) => {
          const data = parseNotificationData(n.request.content.data);
          if (bookingId && String(data.bookingId || "") === bookingId) return true;
          if (rideId && String(data.rideId || "") === rideId) return true;
          return false;
        })
        .map((n) => Notifications.dismissNotificationAsync(n.request.identifier))
    );
  } catch {
    // Tray APIs can be unavailable on some simulators — ignore
  }
}

async function clearLastResponseSafely() {
  try {
    await Notifications.clearLastNotificationResponseAsync();
  } catch {
    try {
      Notifications.clearLastNotificationResponse();
    } catch {
      // older native modules
    }
  }
}

/**
 * Mark this OS response as consumed so remount / re-open does not re-route.
 */
export async function consumeNotificationResponse(
  response: Notifications.NotificationResponse
): Promise<boolean> {
  const key = responseKey(response);
  if (!key) return false;
  if (handledResponseKeys.has(key)) return false;
  handledResponseKeys.add(key);
  if (handledResponseKeys.size > 80) {
    const first = handledResponseKeys.values().next().value;
    if (first) handledResponseKeys.delete(first);
  }
  await clearLastResponseSafely();
  return true;
}

type DeepLinkResult =
  | { kind: "navigated"; bookingId?: string; rideId?: string; terminal?: boolean }
  | { kind: "skipped" }
  | { kind: "ignored" }
  | { kind: "unavailable"; bookingId?: string };

function goRequests() {
  router.push({ pathname: "/driver", params: { tab: "requests" } });
}

function goRideDetails(bookingId: string, fromNotification: "1" | "stale") {
  router.push({
    pathname: "/driver/ride-details",
    params: { bookingId, fromNotification },
  });
}

function showUnavailable(title: string, body: string, enabled: boolean) {
  if (!enabled) return;
  Alert.alert(title, body);
}

function enqueueRoute<T>(fn: () => Promise<T>): Promise<T> {
  const next = routeChain.then(fn, fn);
  routeChain = next.then(
    () => undefined,
    () => undefined
  );
  return next;
}

/** Core resolver — no queue (callers must enqueue once at the edge). */
async function resolveDriverBookingNavigation(
  bookingIdRaw: string,
  opts?: { type?: string; showUnavailableAlert?: boolean }
): Promise<DeepLinkResult> {
  const bookingId = bookingIdRaw.trim();
  const showAlert = opts?.showUnavailableAlert !== false;
  const type = opts?.type || "";

  if (!bookingId) {
    goRequests();
    return { kind: "navigated" };
  }

  onBookingOpenedFromNotification?.(bookingId);
  await dismissPresentedForEntity({ bookingId });
  await clearBadgeSafely();

  try {
    const detail = await getDriverRideDetail(bookingId);
    if (!detail.success || !detail.ride) {
      showUnavailable(
        "Reservation unavailable",
        "This reservation is no longer available. Pull to refresh your requests.",
        showAlert
      );
      goRequests();
      return { kind: "unavailable", bookingId };
    }

    const status = String(detail.ride.status || "").toUpperCase();
    const terminal = TERMINAL_RIDE_STATUSES.has(status);

    // Live offer expired / taken / completed by someone else
    if (type === "live_offer" && (status !== "PENDING" || terminal)) {
      showUnavailable(
        "Offer unavailable",
        "This live offer is no longer available. Check your other requests.",
        showAlert
      );
      goRequests();
      return { kind: "unavailable", bookingId };
    }

    goRideDetails(bookingId, terminal ? "stale" : "1");
    return { kind: "navigated", bookingId, terminal };
  } catch (err) {
    if (isUnavailableError(err)) {
      showUnavailable(
        "Reservation unavailable",
        "This reservation is no longer available. Pull to refresh your requests.",
        showAlert
      );
      goRequests();
      return { kind: "unavailable", bookingId };
    }
    // Network / transient — open details; screen retries on focus
    goRideDetails(bookingId, "1");
    return { kind: "navigated", bookingId };
  }
}

/**
 * Open a booking from any entry (push tap, in-app banner).
 * Always resolves against current server state — never re-assigns.
 */
export async function openDriverBookingFromNotification(
  bookingIdRaw: string,
  opts?: { type?: string; showUnavailableAlert?: boolean }
): Promise<DeepLinkResult> {
  return enqueueRoute(() => resolveDriverBookingNavigation(bookingIdRaw, opts));
}

/**
 * Single entry for notification taps (foreground, background, killed).
 */
export async function routeDriverNotificationResponse(
  response: Notifications.NotificationResponse
): Promise<DeepLinkResult> {
  return enqueueRoute(async () => {
    const accepted = await consumeNotificationResponse(response);
    if (!accepted) return { kind: "skipped" as const };

    const data = parseNotificationData(response.notification.request.content.data);
    const type = String(data.type || "");

    if (type === "concierge_offer" || type === "concierge_dispute") {
      const rideId = String(data.rideId || "") || null;
      await dismissPresentedForEntity({ rideId });
      await clearBadgeSafely();
      router.push("/driver/concierge");
      return { kind: "navigated" as const, rideId: rideId || undefined };
    }

    if (type !== "new_assignment" && type !== "live_offer") {
      return { kind: "ignored" as const };
    }

    const bookingId = String(data.bookingId || "").trim();
    return resolveDriverBookingNavigation(bookingId, { type });
  });
}

/**
 * Cold-start: wait until navigation stack is ready, then handle one last response.
 * Call only when driver session is authenticated.
 */
export async function routeDriverLastNotificationResponse(): Promise<DeepLinkResult> {
  return new Promise((resolve) => {
    InteractionManager.runAfterInteractions(() => {
      setTimeout(() => {
        void (async () => {
          try {
            const last = await Notifications.getLastNotificationResponseAsync();
            if (!last) {
              resolve({ kind: "ignored" });
              return;
            }
            resolve(await routeDriverNotificationResponse(last));
          } catch {
            resolve({ kind: "ignored" });
          }
        })();
      }, 350);
    });
  });
}
