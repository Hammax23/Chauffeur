import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { API_BASE_URL } from './api';
import Constants from 'expo-constants';

Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const type = notification.request.content.data?.type;
    const isRideAlert = type === 'new_assignment' || type === 'live_offer';
    // Foreground: custom in-app banner handles ride alerts (avoid double banner).
    // Background/killed: system tray still shows the push.
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
  if (Platform.OS !== 'android') return;

  await Notifications.setNotificationChannelAsync('reservations', {
    name: 'Reservations',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 120, 250],
    lightColor: '#D4A04A',
    sound: 'default',
    enableVibrate: true,
    showBadge: true,
  });

  await Notifications.setNotificationChannelAsync('default', {
    name: 'General',
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#C9A063',
  });
}

export async function registerForPushNotificationsAsync() {
  let token;

  await ensureNotificationChannels();

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      console.log('Failed to get push token for push notification!');
      return null;
    }
    
    const rawProjectId =
      Constants.easConfig?.projectId ??
      ((Constants.expoConfig?.extra as Record<string, unknown>)?.eas as { projectId?: string } | undefined)?.projectId ??
      ((Constants.expoConfig?.extra as Record<string, unknown>)?.EAS_PROJECT_ID as string | undefined);

    const isUuid = (value: string | undefined) =>
      !!value &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

    const projectId =
      typeof rawProjectId === "string" &&
      rawProjectId.trim().length > 0 &&
      !rawProjectId.includes("REPLACE") &&
      isUuid(rawProjectId.trim())
        ? rawProjectId.trim()
        : undefined;

    if (!projectId) {
      if (__DEV__) {
        console.warn(
          "[Push] Missing EAS projectId. Add EAS_PROJECT_ID to apps/mobile/.env (see app.config.js). Push tokens disabled until then."
        );
      }
      return null;
    }

    try {
      token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    } catch (e) {
      if (__DEV__) {
        console.warn("[Push] getExpoPushTokenAsync failed:", e);
      }
      return null;
    }
  } else {
    console.log('Must use physical device for Push Notifications');
  }

  return token;
}

async function postPushToken(path: string, authToken: string) {
  const pushToken = await registerForPushNotificationsAsync();
  if (!pushToken) return false;

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
    },
    body: JSON.stringify({ pushToken }),
  });

  const data = await response.json();
  return !!data.success;
}

/** @deprecated Prefer registerDriverPushToken */
export async function registerPushToken(authToken: string) {
  return registerDriverPushToken(authToken);
}

export async function registerDriverPushToken(authToken: string) {
  try {
    return await postPushToken('/driver/push-token', authToken);
  } catch (error) {
    if (__DEV__) console.warn('Driver push registration failed:', error);
    return false;
  }
}

export async function registerCustomerPushToken(authToken: string) {
  try {
    return await postPushToken('/customer/push-token', authToken);
  } catch (error) {
    if (__DEV__) console.warn('Customer push registration failed:', error);
    return false;
  }
}
