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
    // Background/killed: OS shows the system notification from FCM/APNs.
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
    description: 'New ride assignments and available reservations',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 120, 250],
    lightColor: '#D4A04A',
    sound: 'default',
    enableVibrate: true,
    showBadge: true,
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
  });

  await Notifications.setNotificationChannelAsync('default', {
    name: 'General',
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#C9A063',
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

  return typeof rawProjectId === 'string' &&
    rawProjectId.trim().length > 0 &&
    !rawProjectId.includes('REPLACE') &&
    isUuid(rawProjectId.trim())
    ? rawProjectId.trim()
    : undefined;
}

export async function registerForPushNotificationsAsync() {
  await ensureNotificationChannels();

  if (!Device.isDevice) {
    console.log('Must use physical device for Push Notifications');
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
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

  if (finalStatus !== 'granted') {
    console.log('Failed to get push token for push notification!');
    return null;
  }

  // Android 13+: ensure notifications are not blocked at OS level after grant
  if (Platform.OS === 'android') {
    await ensureNotificationChannels();
  }

  const projectId = resolveProjectId();
  if (!projectId) {
    if (__DEV__) {
      console.warn(
        '[Push] Missing EAS projectId. Add EAS_PROJECT_ID to apps/mobile/.env (see app.config.js). Push tokens disabled until then.'
      );
    }
    return null;
  }

  try {
    const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    return token;
  } catch (e) {
    if (__DEV__) {
      console.warn('[Push] getExpoPushTokenAsync failed:', e);
    }
    return null;
  }
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

/**
 * Keep the server token in sync when Expo/FCM rotates the device token
 * (required for closed-app delivery after OS updates / reinstalls).
 */
export function subscribeDriverPushTokenRefresh(
  getAuthToken: () => Promise<string | null>
): () => void {
  const sub = Notifications.addPushTokenListener(async () => {
    try {
      const auth = await getAuthToken();
      if (!auth) return;
      await registerDriverPushToken(auth);
    } catch {
      // ignore
    }
  });
  return () => sub.remove();
}
