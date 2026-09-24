import "server-only";
import { createHash, randomInt } from "crypto";
import { sendSms } from "@/lib/twilio-sms";

/** Digits in the SMS code (keep UI in sync). */
export const PHONE_OTP_LENGTH = 4;

/** Dev-only fallback when Twilio is missing AND OTP_ALLOW_STATIC_FALLBACK=true. */
export const STATIC_PHONE_OTP = "1234";

const OTP_TTL_MS = 10 * 60 * 1000;
const RESEND_COOLDOWN_MS = 30 * 1000;
const MAX_VERIFY_ATTEMPTS = 5;

type OtpEntry = {
  hash: string;
  expiresAt: number;
  attempts: number;
  lastSentAt: number;
};

const globalStore = globalThis as typeof globalThis & {
  __sarjPhoneOtpStore?: Map<string, OtpEntry>;
};

function store(): Map<string, OtpEntry> {
  if (!globalStore.__sarjPhoneOtpStore) {
    globalStore.__sarjPhoneOtpStore = new Map();
  }
  return globalStore.__sarjPhoneOtpStore;
}

function hashOtp(phoneE164: string, code: string): string {
  return createHash("sha256").update(`${phoneE164}:${code}`).digest("hex");
}

function generateCode(): string {
  const max = 10 ** PHONE_OTP_LENGTH;
  const n = randomInt(0, max);
  return String(n).padStart(PHONE_OTP_LENGTH, "0");
}

export function allowStaticOtpFallback(): boolean {
  return process.env.OTP_ALLOW_STATIC_FALLBACK === "true";
}

function publicSmsError(raw?: string): string {
  const msg = String(raw || "").toLowerCase();
  if (!msg || msg.includes("not configured")) {
    return "SMS is temporarily unavailable. Please try again shortly.";
  }
  if (msg.includes("permission") || msg.includes("geo") || msg.includes("country")) {
    return "Unable to send SMS to this country. Please contact support.";
  }
  if (msg.includes("invalid") && msg.includes("phone")) {
    return "Enter a valid phone number.";
  }
  if (msg.includes("unsubscribed") || msg.includes("blacklist")) {
    return "This number cannot receive SMS right now.";
  }
  return "Unable to send verification code. Please try again.";
}

export function savePhoneOtp(phoneE164: string, code: string): void {
  store().set(phoneE164, {
    hash: hashOtp(phoneE164, code),
    expiresAt: Date.now() + OTP_TTL_MS,
    attempts: 0,
    lastSentAt: Date.now(),
  });
}

export function consumePhoneOtp(phoneE164: string, code: string): boolean {
  if (allowStaticOtpFallback() && code === STATIC_PHONE_OTP) {
    return true;
  }
  const entry = store().get(phoneE164);
  if (!entry) return false;
  if (Date.now() > entry.expiresAt) {
    store().delete(phoneE164);
    return false;
  }
  if (entry.attempts >= MAX_VERIFY_ATTEMPTS) {
    store().delete(phoneE164);
    return false;
  }
  entry.attempts += 1;
  const ok = entry.hash === hashOtp(phoneE164, code);
  if (ok) {
    store().delete(phoneE164);
    return true;
  }
  if (entry.attempts >= MAX_VERIFY_ATTEMPTS) {
    store().delete(phoneE164);
  }
  return false;
}

export async function issueAndSmsPhoneOtp(phoneE164: string): Promise<{
  ok: boolean;
  error?: string;
  usedStatic?: boolean;
  cooldownSeconds?: number;
}> {
  const existing = store().get(phoneE164);
  if (existing) {
    const waitMs = RESEND_COOLDOWN_MS - (Date.now() - existing.lastSentAt);
    if (waitMs > 0) {
      return {
        ok: false,
        error: `Please wait ${Math.ceil(waitMs / 1000)}s before requesting another code.`,
        cooldownSeconds: Math.ceil(waitMs / 1000),
      };
    }
  }

  const code = generateCode();
  savePhoneOtp(phoneE164, code);

  const body = `Your SARJ verification code is ${code}. It expires in 10 minutes.`;
  const sms = await sendSms(phoneE164, body);
  if (sms.ok) {
    return { ok: true };
  }

  // Local/dev escape hatch only — never on production unless explicitly enabled
  if (allowStaticOtpFallback()) {
    savePhoneOtp(phoneE164, STATIC_PHONE_OTP);
    console.warn(
      "[phone-otp] Twilio send failed; static OTP fallback enabled:",
      sms.error
    );
    return { ok: true, usedStatic: true };
  }

  store().delete(phoneE164);
  console.error("[phone-otp] Twilio send failed:", sms.error);
  return { ok: false, error: publicSmsError(sms.error) };
}
