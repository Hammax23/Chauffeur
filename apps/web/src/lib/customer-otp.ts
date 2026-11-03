import crypto from "crypto";
import jwt from "jsonwebtoken";
import { sendTransactionalEmail } from "@/lib/email-delivery";
import { buildCustomerPasswordResetOtpEmail } from "@/lib/email-templates";
import { getAppJwtSecret } from "@/lib/app-jwt-secret";
import { getRedis, redisKey } from "@/lib/redis";

const OTP_LENGTH = 6;
const OTP_EXPIRY_MINUTES = 1;
const RESET_TOKEN_EXPIRY_MINUTES = 15;
const MAX_OTP_ATTEMPTS = 3;
const ATTEMPT_TTL_MS = OTP_EXPIRY_MINUTES * 60 * 1000;

const attemptStore = new Map<string, number>();

async function getAttempts(sessionId: string): Promise<number> {
  const redis = getRedis();
  if (redis) {
    try {
      const n = await redis.get(redisKey("cust-otp-att", sessionId));
      if (n != null) return Number(n) || 0;
    } catch {
      /* memory */
    }
  }
  return attemptStore.get(sessionId) || 0;
}

async function setAttempts(sessionId: string, count: number): Promise<void> {
  const redis = getRedis();
  if (redis) {
    try {
      await redis.set(
        redisKey("cust-otp-att", sessionId),
        String(count),
        "PX",
        ATTEMPT_TTL_MS
      );
      return;
    } catch {
      /* memory */
    }
  }
  attemptStore.set(sessionId, count);
}

async function clearAttemptsStore(sessionId: string): Promise<void> {
  const redis = getRedis();
  if (redis) {
    try {
      await redis.del(redisKey("cust-otp-att", sessionId));
    } catch {
      /* ignore */
    }
  }
  attemptStore.delete(sessionId);
}

export type PasswordResetOtpPayload = {
  /** SHA-256 hash of OTP — never store plaintext in the JWT */
  otpHash: string;
  purpose: "password-reset";
  email: string;
  customerId: string | null;
};

export type PasswordResetOkPayload = {
  purpose: "password-reset-ok";
  email: string;
  customerId: string;
};

function hashOtp(code: string): string {
  return crypto.createHash("sha256").update(code.trim()).digest("hex");
}

export function generateCustomerOTP(): string {
  const max = 10 ** OTP_LENGTH;
  return String(crypto.randomInt(0, max)).padStart(OTP_LENGTH, "0");
}

export function createPasswordResetOtpSession(params: {
  otp: string;
  email: string;
  customerId: string | null;
}): string {
  return jwt.sign(
    {
      otpHash: hashOtp(params.otp),
      purpose: "password-reset",
      email: params.email,
      customerId: params.customerId,
    } satisfies PasswordResetOtpPayload,
    getAppJwtSecret(),
    { expiresIn: `${OTP_EXPIRY_MINUTES}m` }
  );
}

export async function verifyPasswordResetOtp(
  sessionId: string,
  code: string
): Promise<
  { valid: true; email: string; customerId: string } | { valid: false; error: string }
> {
  const attempts = await getAttempts(sessionId);
  if (attempts >= MAX_OTP_ATTEMPTS) {
    await clearAttemptsStore(sessionId);
    return { valid: false, error: "Too many attempts. Please request a new code." };
  }

  try {
    const decoded = jwt.verify(sessionId, getAppJwtSecret()) as PasswordResetOtpPayload & {
      otp?: string;
    };

    if (decoded.purpose !== "password-reset") {
      return { valid: false, error: "Invalid session. Please request a new code." };
    }

    const expectedHash = decoded.otpHash || (decoded.otp ? hashOtp(decoded.otp) : "");
    if (!expectedHash || expectedHash !== hashOtp(code)) {
      await setAttempts(sessionId, attempts + 1);
      const remaining = MAX_OTP_ATTEMPTS - attempts - 1;
      return {
        valid: false,
        error: remaining > 0
          ? `Invalid code. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.`
          : "Too many attempts. Please request a new code.",
      };
    }

    if (!decoded.customerId) {
      // Opaque failure for non-existent accounts (anti-enumeration)
      return { valid: false, error: "Invalid code. Please try again." };
    }

    await clearAttemptsStore(sessionId);
    return {
      valid: true,
      email: decoded.email,
      customerId: decoded.customerId,
    };
  } catch (error: unknown) {
    const name = error && typeof error === "object" && "name" in error ? String((error as { name: string }).name) : "";
    if (name === "TokenExpiredError") {
      return { valid: false, error: "Code expired. Please request a new one." };
    }
    return { valid: false, error: "Invalid session. Please request a new code." };
  }
}

export function createPasswordResetToken(params: {
  email: string;
  customerId: string;
}): string {
  return jwt.sign(
    {
      purpose: "password-reset-ok",
      email: params.email,
      customerId: params.customerId,
    } satisfies PasswordResetOkPayload,
    getAppJwtSecret(),
    { expiresIn: `${RESET_TOKEN_EXPIRY_MINUTES}m` }
  );
}

export function verifyPasswordResetToken(
  resetToken: string
): { valid: true; email: string; customerId: string } | { valid: false; error: string } {
  try {
    const decoded = jwt.verify(resetToken, getAppJwtSecret()) as PasswordResetOkPayload;
    if (decoded.purpose !== "password-reset-ok" || !decoded.customerId || !decoded.email) {
      return { valid: false, error: "Reset session expired. Please start again." };
    }
    return {
      valid: true,
      email: decoded.email,
      customerId: decoded.customerId,
    };
  } catch {
    return { valid: false, error: "Reset session expired. Please start again." };
  }
}

export async function clearPasswordResetOtpAttempts(sessionId: string): Promise<void> {
  await clearAttemptsStore(sessionId);
}

export async function sendCustomerPasswordResetOtpEmail(
  to: string,
  otp: string
): Promise<boolean> {
  return sendTransactionalEmail({
    to,
    subject: "Password reset code — SARJ Worldwide",
    html: buildCustomerPasswordResetOtpEmail(otp, OTP_EXPIRY_MINUTES),
    logLabel: "customer-password-reset-otp",
  });
}

export { OTP_EXPIRY_MINUTES, OTP_LENGTH };
