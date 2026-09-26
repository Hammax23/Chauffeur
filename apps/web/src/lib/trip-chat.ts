import prisma from "@/lib/prisma";
import { sendPushNotification } from "@/lib/push-notifications";
import { publishChatMessage } from "@/lib/chat-bus";

/** Statuses where Driver ↔ Customer may send new messages (Upcoming rides). */
export const CHAT_OPEN_STATUSES = [
  "ACCEPTED",
  "ON THE WAY",
  "ARRIVED",
  "CIC",
  "STOP",
] as const;

/** Completed / cancelled — customer history is view-only (no phone, no chat). */
export function isCustomerTripHistoryLocked(status: string): boolean {
  return status === "DONE" || status === "CANCELLED" || status === "CANCELED";
}

const DEFAULT_MESSAGE_LIMIT = 200;
const MAX_MESSAGE_LIMIT = 500;

export type ChatSenderType = "CUSTOMER" | "DRIVER" | "ADMIN";

export type ChatMessageDto = {
  id: string;
  senderType: ChatSenderType;
  senderId: string;
  body: string;
  createdAt: string;
  readAt: string | null;
};

export function isChatOpen(status: string): boolean {
  return (CHAT_OPEN_STATUSES as readonly string[]).includes(status);
}

export function serializeMessage(m: {
  id: string;
  senderType: string;
  senderId: string;
  body: string;
  createdAt: Date;
  readAt: Date | null;
}): ChatMessageDto {
  return {
    id: m.id,
    senderType: m.senderType as ChatSenderType,
    senderId: m.senderId,
    body: m.body,
    createdAt: m.createdAt.toISOString(),
    readAt: m.readAt?.toISOString() ?? null,
  };
}

function previewBody(body: string, max = 100): string {
  const t = body.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

export async function getOrCreateThread(reservationId: string, bookingId: string) {
  return prisma.chatThread.upsert({
    where: { bookingId },
    create: { reservationId, bookingId },
    update: {},
  });
}

/** Mark peer messages as read when the viewer opens the thread. */
export async function markChatReadForViewer(opts: {
  bookingId: string;
  viewerType: "CUSTOMER" | "DRIVER";
}): Promise<number> {
  const thread = await prisma.chatThread.findUnique({
    where: { bookingId: opts.bookingId },
    select: { id: true },
  });
  if (!thread) return 0;

  const peerType = opts.viewerType === "CUSTOMER" ? "DRIVER" : "CUSTOMER";
  const result = await prisma.chatMessage.updateMany({
    where: {
      threadId: thread.id,
      senderType: peerType,
      readAt: null,
    },
    data: { readAt: new Date() },
  });
  return result.count;
}

export async function countUnreadForViewer(opts: {
  bookingId: string;
  viewerType: "CUSTOMER" | "DRIVER";
}): Promise<number> {
  const thread = await prisma.chatThread.findUnique({
    where: { bookingId: opts.bookingId },
    select: { id: true },
  });
  if (!thread) return 0;
  const peerType = opts.viewerType === "CUSTOMER" ? "DRIVER" : "CUSTOMER";
  return prisma.chatMessage.count({
    where: {
      threadId: thread.id,
      senderType: peerType,
      readAt: null,
    },
  });
}

export async function listMessagesForBooking(
  bookingId: string,
  options?: {
    since?: string;
    limit?: number;
    viewerType?: "CUSTOMER" | "DRIVER";
    markRead?: boolean;
  }
): Promise<{
  threadId: string | null;
  messages: ChatMessageDto[];
  canSend: boolean;
  status: string;
  unreadCount: number;
}> {
  const limit = Math.min(options?.limit ?? DEFAULT_MESSAGE_LIMIT, MAX_MESSAGE_LIMIT);
  let sinceDate: Date | undefined;
  if (options?.since) {
    const parsed = new Date(options.since);
    if (!Number.isNaN(parsed.getTime())) {
      sinceDate = parsed;
    }
  }

  if (options?.markRead && options.viewerType) {
    await markChatReadForViewer({
      bookingId,
      viewerType: options.viewerType,
    });
  }

  const reservation = await prisma.reservation.findUnique({
    where: { bookingId },
    select: {
      id: true,
      status: true,
      chatThread: {
        select: {
          id: true,
          messages: {
            where: sinceDate ? { createdAt: { gt: sinceDate } } : undefined,
            orderBy: sinceDate ? { createdAt: "asc" } : { createdAt: "desc" },
            take: sinceDate ? undefined : limit,
            select: {
              id: true,
              senderType: true,
              senderId: true,
              body: true,
              createdAt: true,
              readAt: true,
            },
          },
        },
      },
    },
  });

  if (!reservation) {
    throw new Error("NOT_FOUND");
  }

  const canSend = isChatOpen(reservation.status);
  if (!reservation.chatThread) {
    return {
      threadId: null,
      messages: [],
      canSend,
      status: reservation.status,
      unreadCount: 0,
    };
  }

  const raw = reservation.chatThread.messages;
  const ordered = sinceDate ? raw : [...raw].reverse();
  const messages = ordered.map(serializeMessage);

  let unreadCount = 0;
  if (options?.viewerType) {
    unreadCount = await countUnreadForViewer({
      bookingId,
      viewerType: options.viewerType,
    });
  }

  return {
    threadId: reservation.chatThread.id,
    messages,
    canSend,
    status: reservation.status,
    unreadCount,
  };
}

export async function postChatMessage(params: {
  bookingId: string;
  senderType: "CUSTOMER" | "DRIVER";
  senderId: string;
  body: string;
}): Promise<ChatMessageDto> {
  const body = params.body.trim();
  if (!body) {
    throw new Error("EMPTY_BODY");
  }
  if (body.length > 2000) {
    throw new Error("BODY_TOO_LONG");
  }

  const reservation = await prisma.reservation.findUnique({
    where: { bookingId: params.bookingId },
    select: {
      id: true,
      bookingId: true,
      status: true,
      customerId: true,
      assignedDriverId: true,
      firstName: true,
      lastName: true,
      assignedDriver: {
        select: { id: true, pushToken: true, name: true },
      },
    },
  });
  if (!reservation) {
    throw new Error("NOT_FOUND");
  }
  if (!isChatOpen(reservation.status)) {
    throw new Error("CHAT_CLOSED");
  }

  if (params.senderType === "DRIVER") {
    if (reservation.assignedDriverId !== params.senderId) {
      throw new Error("FORBIDDEN");
    }
  } else if (reservation.customerId !== params.senderId) {
    throw new Error("FORBIDDEN");
  }

  const thread = await getOrCreateThread(reservation.id, reservation.bookingId);
  const message = await prisma.chatMessage.create({
    data: {
      threadId: thread.id,
      senderType: params.senderType,
      senderId: params.senderId,
      body,
    },
  });

  const dto = serializeMessage(message);
  publishChatMessage({
    bookingId: reservation.bookingId,
    message: dto,
  });

  const preview = previewBody(body);

  if (params.senderType === "CUSTOMER" && reservation.assignedDriver?.pushToken) {
    const guestName =
      [reservation.firstName, reservation.lastName].filter(Boolean).join(" ").trim() ||
      "Passenger";
    void sendPushNotification(
      reservation.assignedDriver.pushToken,
      `Message from ${guestName}`,
      preview,
      {
        type: "chat",
        bookingId: reservation.bookingId,
        messageId: message.id,
        channelId: "chat",
        collapseId: `chat:${reservation.bookingId}`,
        eventId: `chat:${message.id}`,
        screen: "driver/chat",
      }
    ).catch((err) => console.error("[chat] driver push failed", err));
  }

  if (params.senderType === "DRIVER" && reservation.customerId) {
    void (async () => {
      try {
        const customer = await prisma.customer.findUnique({
          where: { id: reservation.customerId! },
          select: { pushToken: true },
        });
        if (!customer?.pushToken) return;

        const chauffeurName =
          reservation.assignedDriver?.name?.trim() || "Your chauffeur";

        await sendPushNotification(
          customer.pushToken,
          `Message from ${chauffeurName}`,
          preview,
          {
            type: "chat",
            bookingId: reservation.bookingId,
            messageId: message.id,
            channelId: "chat",
            collapseId: `chat:${reservation.bookingId}`,
            eventId: `chat:${message.id}`,
            screen: "customer/chat",
          }
        );
      } catch (err) {
        console.error("[chat] customer push failed", err);
      }
    })();
  }

  return dto;
}
