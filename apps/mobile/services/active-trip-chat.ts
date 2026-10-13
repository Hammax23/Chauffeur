/**
 * Tracks which trip chat thread is focused so foreground push banners
 * can be suppressed (WhatsApp-style) while SSE still delivers live.
 */
let activeBookingId: string | null = null;

export function setActiveTripChat(bookingId: string | null) {
  const next = typeof bookingId === "string" ? bookingId.trim() : "";
  activeBookingId = next || null;
}

export function getActiveTripChat(): string | null {
  return activeBookingId;
}

export function isActiveTripChat(bookingId: string | null | undefined): boolean {
  const id = typeof bookingId === "string" ? bookingId.trim() : "";
  return !!id && !!activeBookingId && id === activeBookingId;
}
