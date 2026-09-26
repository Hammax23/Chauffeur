import * as Notifications from "expo-notifications";
import { InteractionManager } from "react-native";
import { router } from "expo-router";

function parseData(raw: Record<string, unknown> | undefined) {
  const data = raw || {};
  return {
    type: String(data.type || ""),
    bookingId: String(data.bookingId || "").trim(),
    name: typeof data.name === "string" ? data.name : "",
  };
}

/**
 * Open customer trip chat when a chat push is tapped.
 */
export async function routeCustomerNotificationResponse(
  response: Notifications.NotificationResponse
): Promise<boolean> {
  const data = parseData(
    response.notification.request.content.data as Record<string, unknown> | undefined
  );
  if (data.type !== "chat" || !data.bookingId) return false;

  router.push({
    pathname: "/customer/chat",
    params: {
      bookingId: data.bookingId,
      ...(data.name ? { name: data.name } : {}),
    },
  });
  return true;
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
