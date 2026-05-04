import { Expo, ExpoPushMessage } from "expo-server-sdk";

const expo = new Expo();

export async function sendPushNotification(
  pushToken: string,
  title: string,
  body: string,
  data?: Record<string, any>
) {
  if (!Expo.isExpoPushToken(pushToken)) {
    console.error(`Push token ${pushToken} is not a valid Expo push token`);
    return { success: false, error: "Invalid push token" };
  }

  const message: ExpoPushMessage = {
    to: pushToken,
    sound: "default",
    title,
    body,
    data: data || {},
    priority: "high",
  };

  try {
    const chunks = expo.chunkPushNotifications([message]);
    const tickets = [];

    for (const chunk of chunks) {
      const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
      tickets.push(...ticketChunk);
    }

    return { success: true, tickets };
  } catch (error) {
    console.error("Error sending push notification:", error);
    return { success: false, error: String(error) };
  }
}

export async function sendBulkPushNotifications(
  notifications: Array<{
    pushToken: string;
    title: string;
    body: string;
    data?: Record<string, any>;
  }>
) {
  const messages: ExpoPushMessage[] = notifications
    .filter((n) => Expo.isExpoPushToken(n.pushToken))
    .map((n) => ({
      to: n.pushToken,
      sound: "default",
      title: n.title,
      body: n.body,
      data: n.data || {},
      priority: "high",
    }));

  if (messages.length === 0) {
    return { success: false, error: "No valid push tokens" };
  }

  try {
    const chunks = expo.chunkPushNotifications(messages);
    const tickets = [];

    for (const chunk of chunks) {
      const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
      tickets.push(...ticketChunk);
    }

    return { success: true, tickets };
  } catch (error) {
    console.error("Error sending bulk push notifications:", error);
    return { success: false, error: String(error) };
  }
}
