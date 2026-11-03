import "server-only";
import { createHash, randomInt } from "crypto";
import { sendSms } from "@/lib/twilio-sms";
import { getRedis, redisKey } from "@/lib/redis";

/** Digits in the SMS code (keep UI in sync). */
export const PHONE_OTP_LENGTH = 6;

/** Dev-only fallback when Twilio is missing AND OTP_ALLOW_STATIC_FALLBACK=true (never in production). */
export const STATIC_PHONE_OTP = "000000";

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

function memoryStore(): Map<string, OtpEntry> {
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
  if (process.env.NODE_ENV === "production") return false;
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

function otpRedisKey(phoneE164: string): string {
  return redisKey("phone-otp", phoneE164);
}

async function readEntry(phoneE164: string): Promise<OtpEntry | null> {
  const redis = getRedis();
  if (redis) {
    try {
      const raw = await redis.get(otpRedisKey(phoneE164));
      if (raw) return JSON.parse(raw) as OtpEntry;
    } catch (err) {
      console.warn("[phone-otp] redis get failed:", err);
    }
  }
  return memoryStore().get(phoneE164) || null;
}

async function writeEntry(phoneE164: string, entry: OtpEntry): Promise<void> {
  const ttlMs = Math.max(1_000, entry.expiresAt - Date.now());
  const redis = getRedis();
  if (redis) {
    try {
      await redis.set(otpRedisKey(phoneE164), JSON.stringify(entry), "PX", ttlMs);
      return;
    } catch (err) {
      console.warn("[phone-otp] redis set failed:", err);
    }
  }
  memoryStore().set(phoneE164, entry);
}

async function deleteEntry(phoneE164: string): Promise<void> {
  const redis = getRedis();
  if (redis) {
    try {
      await redis.del(otpRedisKey(phoneE164));
    } catch (err) {
      console.warn("[phone-otp] redis del failed:", err);
    }
  }
  memoryStore().delete(phoneE164);
}

/** Lua: atomic verify — increment attempts or delete on success / expiry / max attempts. */
const CONSUME_LUA = `
local raw = redis.call('GET', KEYS[1])
if not raw then return 0 end
local entry = cjson.decode(raw)
local now = tonumber(ARGV[1])
local maxAttempts = tonumber(ARGV[2])
local expectedHash = ARGV[3]
if now > tonumber(entry.expiresAt) then
  redis.call('DEL', KEYS[1])
  return 0
end
entry.attempts = (tonumber(entry.attempts) or 0) + 1
if entry.hash == expectedHash then
  redis.call('DEL', KEYS[1])
  return 1
end
if entry.attempts >= maxAttempts then
  redis.call('DEL', KEYS[1])
  return 0
end
local ttl = tonumber(entry.expiresAt) - now
if ttl < 1000 then ttl = 1000 end
redis.call('SET', KEYS[1], cjson.encode(entry), 'PX', ttl)
return 0
`;

export async function savePhoneOtp(phoneE164: string, code: string): Promise<void> {
  await writeEntry(phoneE164, {
    hash: hashOtp(phoneE164, code),
    expiresAt: Date.now() + OTP_TTL_MS,
    attempts: 0,
    lastSentAt: Date.now(),
  });
}

export async function consumePhoneOtp(phoneE164: string, code: string): Promise<boolean> {
  if (allowStaticOtpFallback() && code === STATIC_PHONE_OTP) {
    return true;
  }

  const expected = hashOtp(phoneE164, code);
  const redis = getRedis();
  if (redis) {
    try {
      const result = await redis.eval(
        CONSUME_LUA,
        1,
        otpRedisKey(phoneE164),
        String(Date.now()),
        String(MAX_VERIFY_ATTEMPTS),
        expected
      );
      return Number(result) === 1;
    } catch (err) {
      console.warn("[phone-otp] redis consume failed, memory fallback:", err);
    }
  }

  const entry = memoryStore().get(phoneE164);
  if (!entry) return false;
  if (Date.now() > entry.expiresAt) {
    memoryStore().delete(phoneE164);
    return false;
  }
  if (entry.attempts >= MAX_VERIFY_ATTEMPTS) {
    memoryStore().delete(phoneE164);
    return false;
  }
  entry.attempts += 1;
  const ok = entry.hash === expected;
  if (ok) {
    memoryStore().delete(phoneE164);
    return true;
  }
  if (entry.attempts >= MAX_VERIFY_ATTEMPTS) {
    memoryStore().delete(phoneE164);
  }
  return false;
}

export async function issueAndSmsPhoneOtp(phoneE164: string): Promise<{
  ok: boolean;
  error?: string;
  usedStatic?: boolean;
  cooldownSeconds?: number;
}> {
  const existing = await readEntry(phoneE164);
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
  await savePhoneOtp(phoneE164, code);

  const body = `Your SARJ verification code is ${code}. It expires in 10 minutes.`;
  const sms = await sendSms(phoneE164, body);
  if (sms.ok) {
    return { ok: true };
  }

  if (allowStaticOtpFallback()) {
    await savePhoneOtp(phoneE164, STATIC_PHONE_OTP);
    console.warn(
      "[phone-otp] Twilio send failed; static OTP fallback enabled:",
      sms.error
    );
    return { ok: true, usedStatic: true };
  }

  await deleteEntry(phoneE164);
  console.error("[phone-otp] Twilio send failed:", sms.error);
  return { ok: false, error: publicSmsError(sms.error) };
}
