import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { API_BASE_URL } from './api';
import Constants from 'expo-constants';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function registerForPushNotificationsAsync() {
  let token;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#C9A063',
    });
  }

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
      ((Constants.expoConfig?.extra as any)?.eas?.projectId as string | undefined) ??
      ((Constants.expoConfig?.extra as any)?.EAS_PROJECT_ID as string | undefined);

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

    // Must pass a valid UUID when the native manifest does not include projectId (Expo Go / dev).
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

export async function registerPushToken(authToken: string) {
  try {
    const pushToken = await registerForPushNotificationsAsync();
    
    if (!pushToken) {
      console.log('No push token available');
      return false;
    }

    const response = await fetch(`${API_BASE_URL}/driver/push-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify({ pushToken }),
    });

    const data = await response.json();
    
    if (data.success) {
      console.log('Push token registered successfully');
      return true;
    } else {
      console.error('Failed to register push token:', data.error);
      return false;
    }
  } catch (error) {
    if (__DEV__) {
      console.warn('Push token registration skipped or failed:', error);
    }
    return false;
  }
}
