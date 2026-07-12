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

export async function getOrCreateThread(reservationId: string, bookingId: string) {
  const existing = await prisma.chatThread.findUnique({ where: { bookingId } });
  if (existing) return existing;
  return prisma.chatThread.create({
    data: { reservationId, bookingId },
  });
}

export async function listMessagesForBooking(bookingId: string): Promise<{
  threadId: string | null;
  messages: ChatMessageDto[];
  canSend: boolean;
  status: string;
}> {
  const reservation = await prisma.reservation.findUnique({
    where: { bookingId },
    select: { id: true, status: true, chatThread: { select: { id: true } } },
  });
  if (!reservation) {
    throw new Error("NOT_FOUND");
  }

  const canSend = isChatOpen(reservation.status);
  if (!reservation.chatThread) {
    return { threadId: null, messages: [], canSend, status: reservation.status };
  }

  const messages = await prisma.chatMessage.findMany({
    where: { threadId: reservation.chatThread.id },
    orderBy: { createdAt: "asc" },
  });

  return {
    threadId: reservation.chatThread.id,
    messages: messages.map(serializeMessage),
    canSend,
    status: reservation.status,
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
    include: { assignedDriver: { select: { id: true, pushToken: true } } },
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

  // Notify the other party via Expo push when possible (driver token exists today).
  if (params.senderType === "CUSTOMER" && reservation.assignedDriver?.pushToken) {
    const preview = body.length > 80 ? `${body.slice(0, 77)}…` : body;
    void sendPushNotification(
      reservation.assignedDriver.pushToken,
      "New message",
      preview,
      { type: "chat", bookingId: reservation.bookingId }
    );
  }

  return dto;
}
