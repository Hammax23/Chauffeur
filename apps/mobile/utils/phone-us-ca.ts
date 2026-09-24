/** US & Canada (+1 / NANP) + optional OTP test allow-list — keep in sync with apps/web/src/lib/phone-us-ca.ts */

export function digitsOnly(input: string): string {
  return String(input || "").replace(/\D/g, "");
}

/** National 10 digits; strips a leading country `1` if pasted. */
export function normalizeNanpNationalNumber(input: string): string {
  let d = digitsOnly(input);
  if (d.length === 11 && d.startsWith("1")) {
    d = d.slice(1);
  }
  return d.slice(0, 10);
}

/** NANP: area + exchange cannot start with 0 or 1. */
function isValidNanpNational(national: string): boolean {
  return /^[2-9]\d{2}[2-9]\d{6}$/.test(national);
}

/** Normalize any phone-ish string to E.164 when possible. */
export function normalizeE164(input: string): string | null {
  const trimmed = String(input || "").trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("+")) {
    const d = digitsOnly(trimmed);
    return d.length >= 10 ? `+${d}` : null;
  }
  const d = digitsOnly(trimmed);
  if (d.length === 10 && isValidNanpNational(d)) return `+1${d}`;
  if (d.length === 11 && d.startsWith("1") && isValidNanpNational(d.slice(1))) {
    return `+${d}`;
  }
  // Pakistan without +: 03XXXXXXXXX → +92…
  if (d.length === 11 && d.startsWith("03")) return `+92${d.slice(1)}`;
  if (d.length === 12 && d.startsWith("92")) return `+${d}`;
  if (d.length >= 10 && d.length <= 15) return `+${d}`;
  return null;
}

function parseAllowList(raw: string | undefined): string[] {
  return String(raw || "")
    .split(/[,;\s]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => normalizeE164(s))
    .filter((s): s is string => !!s);
}

/** Client: EXPO_PUBLIC_OTP_TEST_ALLOW_PHONES=+92300... */
export function getOtpTestAllowPhonesFromEnv(): string[] {
  return parseAllowList(process.env.EXPO_PUBLIC_OTP_TEST_ALLOW_PHONES);
}

export function isOtpTestAllowPhone(
  input: string,
  allowList: string[] = getOtpTestAllowPhonesFromEnv()
): boolean {
  const e164 = normalizeE164(input);
  if (!e164 || allowList.length === 0) return false;
  return allowList.includes(e164);
}

export function validateUsCanadaPhone(input: string): string | null {
  const national = normalizeNanpNationalNumber(input);
  if (!national) {
    return "Please enter your phone number.";
  }
  if (national.length < 10) {
    return "Enter a valid 10-digit US or Canada phone number.";
  }
  if (!isValidNanpNational(national)) {
    return "Enter a valid US or Canada (+1) phone number.";
  }
  return null;
}

/** Returns E.164 `+1XXXXXXXXXX` or null if invalid. */
export function formatUsCanadaE164(input: string): string | null {
  const national = normalizeNanpNationalNumber(input);
  if (!isValidNanpNational(national)) return null;
  return `+1${national}`;
}

/**
 * Auth / OTP phone: US/Canada, or numbers listed in EXPO_PUBLIC_OTP_TEST_ALLOW_PHONES.
 */
export function validateAuthPhone(
  input: string,
  allowList: string[] = getOtpTestAllowPhonesFromEnv()
): string | null {
  if (isOtpTestAllowPhone(input, allowList)) return null;
  return validateUsCanadaPhone(input);
}

export function formatAuthPhoneE164(
  input: string,
  allowList: string[] = getOtpTestAllowPhonesFromEnv()
): string | null {
  if (isOtpTestAllowPhone(input, allowList)) {
    return normalizeE164(input);
  }
  return formatUsCanadaE164(input);
}

/** Normalize typed input for the auth phone field (NANP national or allow-list E.164 digits). */
export function normalizeAuthPhoneInput(input: string): string {
  const trimmed = String(input || "").trim();
  if (!trimmed) return "";

  // Pasted E.164 allow-list number
  if (trimmed.startsWith("+") || trimmed.startsWith("00")) {
    const e164 = normalizeE164(trimmed.startsWith("00") ? `+${trimmed.slice(2)}` : trimmed);
    if (e164 && isOtpTestAllowPhone(e164)) return e164;
  }

  const d = digitsOnly(trimmed);

  // Pakistan local 03XXXXXXXXX or 92XXXXXXXXXX while typing allow-list
  if (d.startsWith("03") || d.startsWith("92")) {
    const e164 = normalizeE164(d);
    if (e164 && isOtpTestAllowPhone(e164)) return e164;
    // Still typing — keep digits (cap 15)
    return d.slice(0, 15);
  }

  // Default: US/Canada national
  return normalizeNanpNationalNumber(d);
}

export function formatAuthPhoneDisplay(input: string): string {
  const e164 = formatAuthPhoneE164(input) || normalizeE164(input);
  if (!e164) return input;
  if (e164.startsWith("+1") && e164.length === 12) {
    const n = e164.slice(2);
    return `+1 (${n.slice(0, 3)}) ${n.slice(3, 6)}-${n.slice(6)}`;
  }
  return e164;
}

export function authPhoneCountryMeta(input: string): {
  flag: string;
  dial: string;
  isIntlTest: boolean;
} {
  if (isOtpTestAllowPhone(input)) {
    const e164 = normalizeE164(input) || "";
    if (e164.startsWith("+92")) {
      return { flag: "🇵🇰", dial: "+92", isIntlTest: true };
    }
    return { flag: "🌐", dial: e164.slice(0, 3) || "+", isIntlTest: true };
  }
  return { flag: "🇨🇦", dial: "+1", isIntlTest: false };
}

/** True when the field has enough digits to attempt availability / send OTP. */
export function isAuthPhoneReady(input: string): boolean {
  if (isOtpTestAllowPhone(input)) return true;
  return normalizeNanpNationalNumber(input).length === 10;
}
