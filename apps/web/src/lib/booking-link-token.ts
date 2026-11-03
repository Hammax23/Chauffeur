import "server-only";
import { createHmac, timingSafeEqual } from "crypto";

export type BookingLinkPurpose = "driver" | "track";

/**
 * Long-lived capability token for public /driver and /track pages.
 * Not a session JWT — HMAC of bookingId + purpose so links in email/SMS stay valid
 * without exposing an unauthenticated status API.
 */
function linkSecret(): string {
  const secret =
    process.env.BOOKING_LINK_SECRET?.trim() ||
    process.env.JWT_SECRET?.trim() ||
    "";
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("BOOKING_LINK_SECRET or JWT_SECRET is required");
    }
    return "dev-booking-link-secret";
  }
  return secret;
}

function hmac(bookingId: string, purpose: BookingLinkPurpose): string {
  return createHmac("sha256", linkSecret())
    .update(`${purpose}:${bookingId}`)
    .digest("base64url");
}

/** Compact URL-safe token for query `k=`. */
export function signBookingLinkToken(
  bookingId: string,
  purpose: BookingLinkPurpose
): string {
  const id = String(bookingId || "").trim();
  if (!id) throw new Error("bookingId required");
  return hmac(id, purpose);
}

export function verifyBookingLinkToken(
  bookingId: string,
  purpose: BookingLinkPurpose,
  token: string | null | undefined
): boolean {
  const id = String(bookingId || "").trim();
  const raw = String(token || "").trim();
  if (!id || !raw) return false;
  try {
    const expected = hmac(id, purpose);
    const a = Buffer.from(expected);
    const b = Buffer.from(raw);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export function siteBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || "https://sarjworldwide.ca").replace(
    /\/$/,
    ""
  );
}

export function buildDriverPageUrl(bookingId: string): string {
  const k = signBookingLinkToken(bookingId, "driver");
  return `${siteBaseUrl()}/driver/${encodeURIComponent(bookingId)}?k=${encodeURIComponent(k)}`;
}

export function buildTrackPageUrl(bookingId: string): string {
  const k = signBookingLinkToken(bookingId, "track");
  return `${siteBaseUrl()}/track/${encodeURIComponent(bookingId)}?k=${encodeURIComponent(k)}`;
}

/** Ensure a stored link includes a valid `k` for the purpose (upgrade legacy links). */
export function ensureSignedPublicLink(
  bookingId: string,
  purpose: BookingLinkPurpose,
  existing?: string | null
): string {
  const fresh =
    purpose === "driver" ? buildDriverPageUrl(bookingId) : buildTrackPageUrl(bookingId);
  const raw = (existing || "").trim();
  if (!raw) return fresh;
  try {
    const u = new URL(raw);
    const k = u.searchParams.get("k");
    if (k && verifyBookingLinkToken(bookingId, purpose, k)) {
      return raw;
    }
  } catch {
    /* fall through */
  }
  return fresh;
}
