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

/** Soft-hide thread from customer + driver apps (admin still sees messages). */
export async function softHideThreadForParticipants(bookingId: string): Promise<void> {
  if (!bookingId) return;
  await prisma.chatThread.updateMany({
    where: { bookingId, hiddenFromParticipantsAt: null },
    data: { hiddenFromParticipantsAt: new Date() },
  });
}

/** Soft-hide all visible threads for a customer's non-admin-only chat (e.g. deactivate). */
export async function softHideThreadsForCustomer(customerId: string): Promise<number> {
  if (!customerId) return 0;
  const threads = await prisma.chatThread.findMany({
    where: {
      hiddenFromParticipantsAt: null,
      reservation: { customerId },
    },
    select: { id: true },
  });
  if (threads.length === 0) return 0;
  const result = await prisma.chatThread.updateMany({
    where: { id: { in: threads.map((t) => t.id) } },
    data: { hiddenFromParticipantsAt: new Date() },
  });
  return result.count;
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

export type ChatPeerDto = {
  name: string;
  photo: string | null;
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
  peer: ChatPeerDto | null;
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
      firstName: true,
      lastName: true,
      assignedDriver: { select: { name: true, photo: true } },
      customer: { select: { firstName: true, lastName: true, photo: true } },
      chatThread: {
        select: {
          id: true,
          hiddenFromParticipantsAt: true,
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

  const peer: ChatPeerDto | null =
    options?.viewerType === "CUSTOMER"
      ? reservation.assignedDriver
        ? {
            name: reservation.assignedDriver.name,
            photo: reservation.assignedDriver.photo ?? null,
          }
        : null
      : options?.viewerType === "DRIVER"
        ? (() => {
            const fromCustomer = reservation.customer
              ? `${reservation.customer.firstName} ${reservation.customer.lastName}`.trim()
              : "";
            const fromReservation = `${reservation.firstName || ""} ${reservation.lastName || ""}`.trim();
            const name = fromCustomer || fromReservation || "Customer";
            return {
              name,
              photo: reservation.customer?.photo ?? null,
            };
          })()
        : reservation.assignedDriver
          ? {
              name: reservation.assignedDriver.name,
              photo: reservation.assignedDriver.photo ?? null,
            }
          : null;

  const hiddenForParticipants = !!reservation.chatThread?.hiddenFromParticipantsAt;
  const participantViewer =
    options?.viewerType === "CUSTOMER" || options?.viewerType === "DRIVER";
  const historyLocked =
    options?.viewerType === "CUSTOMER" && isCustomerTripHistoryLocked(reservation.status);
  const hideTranscript = participantViewer && (hiddenForParticipants || historyLocked);

  const canSend =
    isChatOpen(reservation.status) && !hiddenForParticipants && !historyLocked;

  if (!reservation.chatThread) {
    return {
      threadId: null,
      messages: [],
      canSend,
      status: reservation.status,
      unreadCount: 0,
      peer,
    };
  }

  if (hideTranscript) {
    return {
      threadId: reservation.chatThread.id,
      messages: [],
      canSend: false,
      status: reservation.status,
      unreadCount: 0,
      peer,
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
    peer,
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
      chatThread: { select: { hiddenFromParticipantsAt: true } },
    },
  });
  if (!reservation) {
    throw new Error("NOT_FOUND");
  }
  if (!isChatOpen(reservation.status)) {
    throw new Error("CHAT_CLOSED");
  }
  if (reservation.chatThread?.hiddenFromParticipantsAt) {
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
  if (thread.hiddenFromParticipantsAt) {
    throw new Error("CHAT_CLOSED");
  }
  const message = await prisma.chatMessage.create({
    data: {
      threadId: thread.id,
      senderType: params.senderType,
      senderId: params.senderId,
      body,
    },
  });
  // Bump thread activity so inbox ordering stays fresh.
  await prisma.chatThread.update({
    where: { id: thread.id },
    data: { updatedAt: new Date() },
  });

  const dto = serializeMessage(message);
  publishChatMessage({
    bookingId: reservation.bookingId,
    message: dto,
  });

  const preview = previewBody(body);

  if (params.senderType === "CUSTOMER") {
    const guestName =
      [reservation.firstName, reservation.lastName].filter(Boolean).join(" ").trim() ||
      "Passenger";
    const driverToken = reservation.assignedDriver?.pushToken;
    if (!driverToken) {
      console.warn(
        `[chat] skip driver push — no pushToken bookingId=${reservation.bookingId}`
      );
    } else {
      void (async () => {
        try {
          const unread = await countUnreadForViewer({
            bookingId: reservation.bookingId,
            viewerType: "DRIVER",
          });
          const title =
            unread > 1
              ? `${guestName} · ${unread} messages`
              : `Message from ${guestName}`;
          await sendPushNotification(driverToken, title, preview, {
            type: "chat",
            bookingId: reservation.bookingId,
            messageId: message.id,
            name: guestName,
            channelId: "chat",
            collapseId: `chat:${reservation.bookingId}`,
            eventId: `chat:${message.id}`,
            screen: "driver/chat",
            badge: unread,
          });
        } catch (err) {
          console.error("[chat] driver push failed", err);
        }
      })();
    }
  }

  if (params.senderType === "DRIVER") {
    if (!reservation.customerId) {
      console.warn(
        `[chat] skip customer push — no customerId bookingId=${reservation.bookingId}`
      );
    } else {
      void (async () => {
        try {
          const customer = await prisma.customer.findUnique({
            where: { id: reservation.customerId! },
            select: { pushToken: true },
          });
          if (!customer?.pushToken) {
            console.warn(
              `[chat] skip customer push — no pushToken bookingId=${reservation.bookingId}`
            );
            return;
          }

          const chauffeurName =
            reservation.assignedDriver?.name?.trim() || "Your chauffeur";
          const unread = await countUnreadForViewer({
            bookingId: reservation.bookingId,
            viewerType: "CUSTOMER",
          });
          const title =
            unread > 1
              ? `${chauffeurName} · ${unread} messages`
              : `Message from ${chauffeurName}`;

          await sendPushNotification(customer.pushToken, title, preview, {
            type: "chat",
            bookingId: reservation.bookingId,
            messageId: message.id,
            name: chauffeurName,
            channelId: "chat",
            collapseId: `chat:${reservation.bookingId}`,
            eventId: `chat:${message.id}`,
            screen: "customer/chat",
            badge: unread,
          });
        } catch (err) {
          console.error("[chat] customer push failed", err);
        }
      })();
    }
  }

  return dto;
}

export type DriverChatThreadRow = {
  bookingId: string;
  status: string;
  canSend: boolean;
  unreadCount: number;
  peer: ChatPeerDto;
  lastMessage: {
    body: string;
    createdAt: string;
    senderType: ChatSenderType;
  } | null;
  serviceDate: string;
  serviceTime: string;
};

/**
 * Inbox list for an assigned driver.
 * Only active (chat-open) reservations — DONE/CANCELLED never appear,
 * even if soft-hide column was not yet migrated on a given DB.
 */
export async function listDriverChatThreads(driverId: string): Promise<{
  threads: DriverChatThreadRow[];
  totalUnread: number;
}> {
  const threads = await prisma.chatThread.findMany({
    where: {
      hiddenFromParticipantsAt: null,
      reservation: {
        assignedDriverId: driverId,
        status: { in: [...CHAT_OPEN_STATUSES] },
      },
      messages: { some: {} },
    },
    select: {
      bookingId: true,
      reservation: {
        select: {
          status: true,
          serviceDate: true,
          serviceTime: true,
          firstName: true,
          lastName: true,
          customer: { select: { firstName: true, lastName: true, photo: true } },
        },
      },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          body: true,
          createdAt: true,
          senderType: true,
        },
      },
      _count: {
        select: {
          messages: {
            where: {
              senderType: "CUSTOMER",
              readAt: null,
            },
          },
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  const rows: DriverChatThreadRow[] = threads.map((t) => {
    const r = t.reservation;
    const fromCustomer = r.customer
      ? `${r.customer.firstName} ${r.customer.lastName}`.trim()
      : "";
    const fromReservation = `${r.firstName || ""} ${r.lastName || ""}`.trim();
    const name = fromCustomer || fromReservation || "Customer";
    const last = t.messages[0] ?? null;
    return {
      bookingId: t.bookingId,
      status: r.status,
      canSend: isChatOpen(r.status),
      unreadCount: t._count.messages,
      peer: {
        name,
        photo: r.customer?.photo ?? null,
      },
      lastMessage: last
        ? {
            body: previewBody(last.body, 120),
            createdAt: last.createdAt.toISOString(),
            senderType: last.senderType as ChatSenderType,
          }
        : null,
      serviceDate: r.serviceDate,
      serviceTime: r.serviceTime,
    };
  });

  // Prefer active chats first, then by last activity (already roughly by updatedAt).
  rows.sort((a, b) => {
    const aOpen = isChatOpen(a.status) ? 1 : 0;
    const bOpen = isChatOpen(b.status) ? 1 : 0;
    if (aOpen !== bOpen) return bOpen - aOpen;
    const aTs = a.lastMessage?.createdAt ? Date.parse(a.lastMessage.createdAt) : 0;
    const bTs = b.lastMessage?.createdAt ? Date.parse(b.lastMessage.createdAt) : 0;
    return bTs - aTs;
  });

  const totalUnread = rows.reduce((sum, row) => sum + row.unreadCount, 0);
  return { threads: rows, totalUnread };
}
