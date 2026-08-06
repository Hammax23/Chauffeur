/** US & Canada (+1 / NANP) phone helpers — keep in sync with apps/web/src/lib/phone-us-ca.ts */

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
