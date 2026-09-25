import { validateAuthPhone } from "./phone-us-ca";

/**
 * True when the customer must complete phone OTP before using the app.
 * Accepts US/Canada (+1) and OTP test allow-list numbers (same rules as send/verify OTP).
 */
export function customerNeedsPhone(phone?: string | null): boolean {
  if (!phone || !String(phone).trim()) return true;
  return validateAuthPhone(phone) !== null;
}
