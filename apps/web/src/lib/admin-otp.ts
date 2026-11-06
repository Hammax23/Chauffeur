import { randomInt } from "crypto";
import jwt from "jsonwebtoken";
import { buildAdminOtpEmail, buildSeoPanelOtpEmail } from "@/lib/email-templates";
import { getAppJwtSecret } from "@/lib/app-jwt-secret";
import { getRedis, redisKey } from "@/lib/redis";
import { isEmailConfigured, sendTransactionalEmail } from "@/lib/email-delivery";

// OTP settings
const OTP_LENGTH = 6;
const OTP_EXPIRY_MINUTES = 15;
const MAX_OTP_ATTEMPTS = 3;
const ATTEMPT_TTL_MS = OTP_EXPIRY_MINUTES * 60 * 1000;

const attemptStore = new Map<string, number>();

interface OTPPayload {
  otp: string;
  /** Phase 2 — optional admin identity captured at send-otp so verify-otp can mint a per-admin JWT. */
  adminId?: string | null;
  email?: string | null;
  exp: number;
  iat: number;
}

async function getAttempts(sessionId: string): Promise<number> {
  const redis = getRedis();
  if (redis) {
    try {
      const n = await redis.get(redisKey("admin-otp-att", sessionId));
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
        redisKey("admin-otp-att", sessionId),
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
      await redis.del(redisKey("admin-otp-att", sessionId));
    } catch {
      /* ignore */
    }
  }
  attemptStore.delete(sessionId);
}

/**
 * Generate a random OTP code
 */
export function generateOTP(): string {
  const max = 10 ** OTP_LENGTH;
  return String(randomInt(0, max)).padStart(OTP_LENGTH, "0");
}

/**
 * Create a signed session token containing the OTP (and, Phase 2, the admin identity
 * resolved at send-otp time). This survives server restarts because everything is
 * encoded in the JWT itself.
 */
export function createOTPSession(
  code: string,
  actor?: { adminId?: string | null; email?: string | null }
): string {
  const payload: Record<string, unknown> = { otp: code };
  if (actor?.adminId) payload.adminId = actor.adminId;
  if (actor?.email) payload.email = String(actor.email).trim().toLowerCase();
  const token = jwt.sign(payload, getAppJwtSecret(), {
    expiresIn: `${OTP_EXPIRY_MINUTES}m`,
  });
  return token;
}

/**
 * Verify OTP code against the session token. On success returns the admin identity
 * captured at send-otp time (if any) so the caller can mint a per-admin JWT.
 */
export async function verifyOTP(
  sessionId: string,
  code: string
): Promise<{
  valid: boolean;
  error?: string;
  actor?: { adminId: string | null; email: string | null };
}> {
  const attempts = await getAttempts(sessionId);
  if (attempts >= MAX_OTP_ATTEMPTS) {
    await clearAttemptsStore(sessionId);
    return { valid: false, error: "Too many attempts. Please request a new code." };
  }

  try {
    const decoded = jwt.verify(sessionId, getAppJwtSecret()) as OTPPayload;

    if (decoded.otp !== code) {
      await setAttempts(sessionId, attempts + 1);
      const remaining = MAX_OTP_ATTEMPTS - attempts - 1;
      return { valid: false, error: `Invalid OTP. ${remaining} attempts remaining.` };
    }

    await clearAttemptsStore(sessionId);
    return {
      valid: true,
      actor: {
        adminId: decoded.adminId || null,
        email: decoded.email || null,
      },
    };
  } catch (error: any) {
    if (error.name === "TokenExpiredError") {
      return { valid: false, error: "OTP expired. Please request a new code." };
    }
    return { valid: false, error: "Invalid session. Please request a new code." };
  }
}

/**
 * Legacy functions for compatibility
 */
export function storeOTP(sessionId: string, code: string): void {
  // No longer needed - OTP is encoded in sessionId
}

export async function clearOTP(sessionId: string): Promise<void> {
  await clearAttemptsStore(sessionId);
}

export function generateSessionId(): string {
  // No longer needed - we use the JWT token as session ID
  return "";
}

/**
 * Send OTP email. Default recipient is `ADMIN_EMAIL` (legacy single-admin flow).
 * Phase 2: pass `options.to` to deliver the code to a specific AdminUser's inbox.
 */
export async function sendOTPEmail(
  otp: string,
  options?: { panel?: "admin" | "seo"; to?: string | null }
): Promise<{ success: boolean; error?: string }> {
  const panel = options?.panel ?? "admin";
  const recipient = (options?.to || process.env.ADMIN_EMAIL || "").trim();

  if (!recipient) {
    console.error("Admin email not configured");
    return { success: false, error: "Admin email not configured" };
  }

  if (!isEmailConfigured()) {
    console.error("Email provider not configured (RESEND_API_KEY or SMTP)");
    return { success: false, error: "Email not configured" };
  }

  try {
    const sent = await sendTransactionalEmail({
      to: recipient,
      subject:
        panel === "seo"
          ? "SEO Panel login verification — SARJ Worldwide"
          : "Admin login verification — SARJ Worldwide",
      html:
        panel === "seo"
          ? buildSeoPanelOtpEmail(otp, OTP_EXPIRY_MINUTES)
          : buildAdminOtpEmail(otp, OTP_EXPIRY_MINUTES),
      logLabel: panel === "seo" ? "seo-otp" : "admin-otp",
    });
    if (!sent) {
      return { success: false, error: "Failed to send email" };
    }
    return { success: true };
  } catch (error: any) {
    console.error("Failed to send OTP email:", error);
    return { success: false, error: error.message || "Failed to send email" };
  }
}

