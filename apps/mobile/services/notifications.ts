import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";
import { API_BASE_URL } from "./api";
import Constants from "expo-constants";

Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const type = notification.request.content.data?.type;
    const isRideAlert = type === "new_assignment" || type === "live_offer";
    return {
      shouldShowAlert: !isRideAlert,
      shouldShowBanner: !isRideAlert,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    };
  },
});

async function ensureNotificationChannels() {
  if (Platform.OS !== "android") return;

  await Notifications.setNotificationChannelAsync("reservations", {
    name: "Reservations",
    description: "New ride assignments and available reservations",
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 120, 250],
    lightColor: "#D4A04A",
    sound: "default",
    enableVibrate: true,
    showBadge: true,
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
  });

  await Notifications.setNotificationChannelAsync("default", {
    name: "General",
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: "#C9A063",
  });
}

function resolveProjectId(): string | undefined {
  const rawProjectId =
    Constants.easConfig?.projectId ??
    ((Constants.expoConfig?.extra as Record<string, unknown>)?.eas as { projectId?: string } | undefined)
      ?.projectId ??
    ((Constants.expoConfig?.extra as Record<string, unknown>)?.EAS_PROJECT_ID as string | undefined);

  const isUuid = (value: string | undefined) =>
    !!value &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

  return typeof rawProjectId === "string" &&
    rawProjectId.trim().length > 0 &&
    !rawProjectId.includes("REPLACE") &&
    isUuid(rawProjectId.trim())
    ? rawProjectId.trim()
    : undefined;
}

/**
 * Expo fires `addPushTokenListener` when `getExpoPushTokenAsync` / device token
 * APIs run. Calling those APIs *inside* the listener (or while handling it)
 * creates an infinite register loop. Suppress + cache breaks that cycle.
 */
let suppressPushTokenListener = 0;
let cachedExpoPushToken: string | null = null;
let lastPostedDriverToken: string | null = null;
let lastPostedCustomerToken: string | null = null;
let driverRegisterInFlight: Promise<boolean> | null = null;
let customerRegisterInFlight: Promise<boolean> | null = null;

export async function registerForPushNotificationsAsync(options?: {
  /** Force a fresh Expo token (e.g. after native device token rotation). */
  forceRefresh?: boolean;
}): Promise<string | null> {
  if (cachedExpoPushToken && !options?.forceRefresh) {
    return cachedExpoPushToken;
  }

  await ensureNotificationChannels();

  if (!Device.isDevice) {
    console.log("Must use physical device for Push Notifications");
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowBadge: true,
        allowSound: true,
        allowDisplayInCarPlay: false,
        allowCriticalAlerts: false,
        provideAppNotificationSettings: false,
        allowProvisional: false,
      },
    });
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    console.log("Failed to get push token for push notification!");
    return null;
  }

  if (Platform.OS === "android") {
    await ensureNotificationChannels();
  }

  const projectId = resolveProjectId();
  if (!projectId) {
    if (__DEV__) {
      console.warn(
        "[Push] Missing EAS projectId. Add EAS_PROJECT_ID to apps/mobile/.env (see app.config.js). Push tokens disabled until then."
      );
    }
    return null;
  }

  suppressPushTokenListener += 1;
  try {
    const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    cachedExpoPushToken = token;
    return token;
  } catch (e) {
    if (__DEV__) {
      console.warn("[Push] getExpoPushTokenAsync failed:", e);
    }
    return null;
  } finally {
    suppressPushTokenListener -= 1;
  }
}

async function postPushToken(
  path: string,
  authToken: string,
  kind: "driver" | "customer"
): Promise<boolean> {
  const pushToken = await registerForPushNotificationsAsync();
  if (!pushToken) return false;

  const lastPosted = kind === "driver" ? lastPostedDriverToken : lastPostedCustomerToken;
  if (lastPosted === pushToken) {
    return true;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${authToken}`,
    },
    body: JSON.stringify({ pushToken }),
  });

  let data: { success?: boolean } = {};
  try {
    data = (await response.json()) as { success?: boolean };
  } catch {
    return false;
  }

  if (response.ok && data.success) {
    if (kind === "driver") lastPostedDriverToken = pushToken;
    else lastPostedCustomerToken = pushToken;
    return true;
  }
  return false;
}

/** @deprecated Prefer registerDriverPushToken */
export async function registerPushToken(authToken: string) {
  return registerDriverPushToken(authToken);
}

export async function registerDriverPushToken(authToken: string) {
  if (driverRegisterInFlight) return driverRegisterInFlight;

  driverRegisterInFlight = (async () => {
    try {
      return await postPushToken("/driver/push-token", authToken, "driver");
    } catch (error) {
      if (__DEV__) console.warn("Driver push registration failed:", error);
      return false;
    } finally {
      driverRegisterInFlight = null;
    }
  })();

  return driverRegisterInFlight;
}

export async function registerCustomerPushToken(authToken: string) {
  if (customerRegisterInFlight) return customerRegisterInFlight;

  customerRegisterInFlight = (async () => {
    try {
      return await postPushToken("/customer/push-token", authToken, "customer");
    } catch (error) {
      if (__DEV__) console.warn("Customer push registration failed:", error);
      return false;
    } finally {
      customerRegisterInFlight = null;
    }
  })();

  return customerRegisterInFlight;
}

/**
 * Native device-token rotation only. Ignored while we ourselves call
 * getExpoPushTokenAsync (that path re-emits this listener).
 */
export function subscribeDriverPushTokenRefresh(
  getAuthToken: () => Promise<string | null>
): () => void {
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  const sub = Notifications.addPushTokenListener(() => {
    if (suppressPushTokenListener > 0) return;

    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      debounceTimer = null;
      void (async () => {
        try {
          // Native token changed — drop cached Expo token and re-sync once
          cachedExpoPushToken = null;
          lastPostedDriverToken = null;
          const auth = await getAuthToken();
          if (!auth) return;
          await registerDriverPushToken(auth);
        } catch {
          // ignore
        }
      })();
    }, 1500);
  });

  return () => {
    if (debounceTimer) clearTimeout(debounceTimer);
    sub.remove();
  };
}

/** Clear local caches on logout so the next login re-posts. */
export function resetPushTokenRegistrationCache() {
  cachedExpoPushToken = null;
  lastPostedDriverToken = null;
  lastPostedCustomerToken = null;
}
