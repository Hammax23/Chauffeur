import { Expo, ExpoPushMessage, ExpoPushTicket } from "expo-server-sdk";
import prisma from "@/lib/prisma";

const expo = new Expo();

async function clearInvalidPushToken(pushToken: string) {
  try {
    await Promise.all([
      prisma.driver.updateMany({
        where: { pushToken },
        data: { pushToken: null },
      }),
      prisma.customer.updateMany({
        where: { pushToken },
        data: { pushToken: null },
      }),
    ]);
  } catch (error) {
    console.error("[push] failed to clear invalid token:", error);
  }
}

async function handleTickets(
  tickets: ExpoPushTicket[],
  tokensByIndex: string[]
) {
  for (let i = 0; i < tickets.length; i++) {
    const ticket = tickets[i];
    const token = tokensByIndex[i];
    if (!ticket || ticket.status !== "error") continue;

    const errCode =
      ticket.details && typeof ticket.details === "object" && "error" in ticket.details
        ? String((ticket.details as { error?: string }).error)
        : "";

    console.error(`[push] ticket error for ${token}:`, ticket.message, errCode);

    if (errCode === "DeviceNotRegistered" && token) {
      await clearInvalidPushToken(token);
    }
  }
}

function buildMessage(
  pushToken: string,
  title: string,
  body: string,
  data?: Record<string, unknown>
): ExpoPushMessage {
  const channelId =
    typeof data?.channelId === "string" && data.channelId
      ? data.channelId
      : "reservations";

  const bookingId =
    typeof data?.bookingId === "string" ? data.bookingId.trim() : "";
  const rideId = typeof data?.rideId === "string" ? data.rideId.trim() : "";
  const type = typeof data?.type === "string" ? data.type : "";

  // Collapse updates for the same entity so the tray doesn't stack duplicates
  const collapseId =
    (typeof data?.collapseId === "string" && data.collapseId) ||
    (bookingId ? `booking:${bookingId}` : "") ||
    (rideId ? `ride:${rideId}` : "") ||
    undefined;

  const eventId =
    (typeof data?.eventId === "string" && data.eventId) ||
    `${type || "push"}:${collapseId || "general"}:${Date.now()}`;

  // Live marketplace offers go stale fast; assignments stay longer for offline drivers
  const ttl =
    typeof data?.ttlSeconds === "number" && Number.isFinite(data.ttlSeconds)
      ? Math.max(60, Number(data.ttlSeconds))
      : type === "live_offer" || type === "concierge_offer"
        ? 60 * 60 * 2
        : 60 * 60 * 24;

  const { ttlSeconds: _ttlSeconds, collapseId: _collapseId, ...restData } =
    (data || {}) as Record<string, unknown>;

  return {
    to: pushToken,
    sound: "default",
    title,
    body,
    data: {
      ...restData,
      type,
      ...(bookingId ? { bookingId } : {}),
      ...(rideId ? { rideId } : {}),
      channelId,
      eventId,
      ...(collapseId ? { collapseId } : {}),
    },
    priority: "high",
    channelId,
    ttl,
    ...(collapseId
      ? {
          collapseId,
          // Android: replace previous notification for same tag
          tag: collapseId,
        }
      : {}),
    interruptionLevel: "time-sensitive",
    _contentAvailable: true,
  };
}

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

  const message = buildMessage(pushToken, title, body, data);

  try {
    const chunks = expo.chunkPushNotifications([message]);
    const tickets: ExpoPushTicket[] = [];
    const tokensByIndex: string[] = [];

    for (const chunk of chunks) {
      const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
      tickets.push(...ticketChunk);
      for (const msg of chunk) {
        tokensByIndex.push(typeof msg.to === "string" ? msg.to : String(msg.to));
      }
    }

    await handleTickets(tickets, tokensByIndex);
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
  const prepared = notifications.filter((n) => Expo.isExpoPushToken(n.pushToken));
  const messages: ExpoPushMessage[] = prepared.map((n) =>
    buildMessage(n.pushToken, n.title, n.body, n.data)
  );

  if (messages.length === 0) {
    return { success: false, error: "No valid push tokens" };
  }

  try {
    const chunks = expo.chunkPushNotifications(messages);
    const tickets: ExpoPushTicket[] = [];
    const tokensByIndex: string[] = [];

    for (const chunk of chunks) {
      const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
      tickets.push(...ticketChunk);
      for (const msg of chunk) {
        tokensByIndex.push(typeof msg.to === "string" ? msg.to : String(msg.to));
      }
    }

    await handleTickets(tickets, tokensByIndex);
    return { success: true, tickets };
  } catch (error) {
    console.error("Error sending bulk push notifications:", error);
    return { success: false, error: String(error) };
  }
}
