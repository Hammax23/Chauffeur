import "server-only";

import type { ChatMessageDto } from "@/lib/trip-chat";
import { publishCrossBus, subscribeCrossBus } from "@/lib/cross-process-bus";

export type ChatEvent = {
  type: "message";
  bookingId: string;
  serverTime: string;
  message: ChatMessageDto;
};

type Listener = (event: ChatEvent) => void;

const channel = (bookingId: string) => `chat:${bookingId}`;

export function subscribeChat(bookingId: string, listener: Listener): () => void {
  return subscribeCrossBus("chat", channel(bookingId), (payload) => {
    listener(payload as ChatEvent);
  });
}

export function publishChatMessage(params: {
  bookingId: string;
  message: ChatMessageDto;
}): void {
  const event: ChatEvent = {
    type: "message",
    bookingId: params.bookingId,
    serverTime: new Date().toISOString(),
    message: params.message,
  };
  publishCrossBus("chat", channel(params.bookingId), event);
}
