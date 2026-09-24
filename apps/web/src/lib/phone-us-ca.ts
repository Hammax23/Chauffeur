/** US & Canada (+1 / NANP) + optional OTP test allow-list (E.164). */

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

/** Server: OTP_TEST_ALLOW_PHONES=+92300...,+1... */
export function getOtpTestAllowPhonesFromEnv(): string[] {
  return parseAllowList(process.env.OTP_TEST_ALLOW_PHONES);
}

export function isOtpTestAllowPhone(
  input: string,
  allowList: string[] = getOtpTestAllowPhonesFromEnv()
): boolean {
  const e164 = normalizeE164(input);
  if (!e164 || allowList.length === 0) return false;
  return allowList.includes(e164);
}

export function validateUsCanadaPhone(input: unknown): string | null {
  if (typeof input !== "string") {
    return "Please enter your phone number.";
  }
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
 * Auth / OTP phone: US/Canada, or numbers listed in OTP_TEST_ALLOW_PHONES.
 */
export function validateAuthPhone(
  input: unknown,
  allowList: string[] = getOtpTestAllowPhonesFromEnv()
): string | null {
  if (typeof input !== "string") {
    return "Please enter your phone number.";
  }
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

/** Common stored formats for DB lookup. */
export function phoneLookupVariants(input: string): string[] {
  const e164 = formatAuthPhoneE164(input) || normalizeE164(input);
  if (!e164) {
    const national = normalizeNanpNationalNumber(input);
    if (national.length !== 10) return [];
    const a = national.slice(0, 3);
    const b = national.slice(3, 6);
    const c = national.slice(6);
    return [
      `+1${national}`,
      `1${national}`,
      national,
      `(${a}) ${b}-${c}`,
      `${a}-${b}-${c}`,
      `${a}.${b}.${c}`,
      `${a} ${b} ${c}`,
    ];
  }

  const digits = e164.slice(1);
  const variants = new Set<string>([e164, digits]);
  if (e164.startsWith("+1") && digits.length === 11) {
    const national = digits.slice(1);
    const a = national.slice(0, 3);
    const b = national.slice(3, 6);
    const c = national.slice(6);
    variants.add(national);
    variants.add(`1${national}`);
    variants.add(`(${a}) ${b}-${c}`);
    variants.add(`${a}-${b}-${c}`);
  }
  if (e164.startsWith("+92") && digits.length === 12) {
    // 92300… → also 0300…
    variants.add(`0${digits.slice(2)}`);
  }
  return Array.from(variants);
}
