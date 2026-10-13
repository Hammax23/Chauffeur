import * as Notifications from "expo-notifications";
import { InteractionManager } from "react-native";
import { router } from "expo-router";

function parseData(raw: Record<string, unknown> | undefined) {
  const data = raw || {};
  return {
    type: String(data.type || ""),
    bookingId: String(data.bookingId || "").trim(),
    name: typeof data.name === "string" ? data.name.trim() : "",
  };
}

/** Prevents double-navigation from cold-start + response listener. */
const handledResponseKeys = new Set<string>();

function responseKey(
  response: Notifications.NotificationResponse | null | undefined
): string | null {
  if (!response) return null;
  const id = response.notification.request.identifier;
  const action = response.actionIdentifier || "default";
  const date = response.notification.date ?? 0;
  return `${id}::${action}::${date}`;
}

async function clearBadgeSafely() {
  try {
    await Notifications.setBadgeCountAsync(0);
  } catch {
    // ignore
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

async function consumeResponse(
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

async function dismissPresentedForBooking(bookingId: string): Promise<void> {
  if (!bookingId) return;
  try {
    const presented = await Notifications.getPresentedNotificationsAsync();
    await Promise.all(
      presented
        .filter((n) => {
          const data = parseData(
            n.request.content.data as Record<string, unknown> | undefined
          );
          return data.bookingId === bookingId;
        })
        .map((n) => Notifications.dismissNotificationAsync(n.request.identifier))
    );
  } catch {
    // Tray APIs can be unavailable on some simulators
  }
}

/**
 * Open chat or Track Ride when a customer push is tapped.
 */
export async function routeCustomerNotificationResponse(
  response: Notifications.NotificationResponse
): Promise<boolean> {
  if (!(await consumeResponse(response))) return false;

  const data = parseData(
    response.notification.request.content.data as Record<string, unknown> | undefined
  );
  if (!data.bookingId) return false;

  await dismissPresentedForBooking(data.bookingId);
  await clearBadgeSafely();

  if (data.type === "chat") {
    router.push({
      pathname: "/customer/chat",
      params: {
        bookingId: data.bookingId,
        ...(data.name ? { name: data.name } : {}),
      },
    });
    return true;
  }

  if (data.type === "driver_on_the_way" || data.type === "driver_assigned") {
    router.push({
      pathname: "/customer/track-ride",
      params: { bookingId: data.bookingId },
    });
    return true;
  }

  return false;
}

export async function routeCustomerLastNotificationResponse(): Promise<boolean> {
  return new Promise((resolve) => {
    InteractionManager.runAfterInteractions(() => {
      setTimeout(() => {
        void (async () => {
          try {
            const last = await Notifications.getLastNotificationResponseAsync();
            if (!last) {
              resolve(false);
              return;
            }
            resolve(await routeCustomerNotificationResponse(last));
          } catch {
            resolve(false);
          }
        })();
      }, 350);
    });
  });
}
