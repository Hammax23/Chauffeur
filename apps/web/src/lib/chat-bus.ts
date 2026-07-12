import { EventEmitter } from "node:events";
import type { ChatMessageDto } from "@/lib/trip-chat";

export type ChatEvent = {
  type: "message";
  bookingId: string;
  serverTime: string;
  message: ChatMessageDto;
};

type Listener = (event: ChatEvent) => void;

declare global {
  // eslint-disable-next-line no-var
  var __sarjChatBus: EventEmitter | undefined;
}

const emitter: EventEmitter =
  globalThis.__sarjChatBus ??
  (globalThis.__sarjChatBus = (() => {
    const e = new EventEmitter();
    e.setMaxListeners(0);
    return e;
  })());

const channel = (bookingId: string) => `chat:${bookingId}`;

export function subscribeChat(bookingId: string, listener: Listener): () => void {
  emitter.on(channel(bookingId), listener);
  return () => emitter.off(channel(bookingId), listener);
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
  emitter.emit(channel(params.bookingId), event);
}
