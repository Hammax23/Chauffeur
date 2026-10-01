import { normalizeE164 } from "./phone-us-ca";

/**
 * True when the customer must complete phone OTP before using the app.
 *
 * Once a phone is already stored on the account (any valid E.164, including
 * OTP test allow-list numbers like +92…), do NOT force re-verification.
 * US/Canada / allow-list rules apply only when *sending* new OTPs — not when
 * deciding whether an existing profile is complete.
 */
export function customerNeedsPhone(phone?: string | null): boolean {
  const raw = String(phone || "").trim();
  if (!raw) return true;
  return normalizeE164(raw) === null;
}
