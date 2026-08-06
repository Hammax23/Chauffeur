import { validateUsCanadaPhone } from "./phone-us-ca";

/** True when the customer must complete Uber-style phone OTP before using the app. */
export function customerNeedsPhone(phone?: string | null): boolean {
  if (!phone || !String(phone).trim()) return true;
  return validateUsCanadaPhone(phone) !== null;
}
