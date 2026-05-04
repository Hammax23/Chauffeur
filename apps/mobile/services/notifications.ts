import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { API_BASE_URL } from './api';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
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
    
    token = (await Notifications.getExpoPushTokenAsync({
      projectId: 'your-project-id', // Add your Expo project ID here
    })).data;
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
    console.error('Error registering push token:', error);
    return false;
  }
}
