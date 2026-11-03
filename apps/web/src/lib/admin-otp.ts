import { randomInt } from "crypto";
import nodemailer from "nodemailer";
import jwt from "jsonwebtoken";
import { buildAdminOtpEmail, buildSeoPanelOtpEmail } from "@/lib/email-templates";
import { getAppJwtSecret } from "@/lib/app-jwt-secret";
import { getRedis, redisKey } from "@/lib/redis";

// OTP settings
const OTP_LENGTH = 6;
const OTP_EXPIRY_MINUTES = 15;
const MAX_OTP_ATTEMPTS = 3;
const ATTEMPT_TTL_MS = OTP_EXPIRY_MINUTES * 60 * 1000;

const attemptStore = new Map<string, number>();

interface OTPPayload {
  otp: string;
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
 * Create a signed session token containing the OTP
 * This survives server restarts because the OTP is encoded in the token itself
 */
export function createOTPSession(code: string): string {
  const token = jwt.sign(
    { otp: code },
    getAppJwtSecret(),
    { expiresIn: `${OTP_EXPIRY_MINUTES}m` }
  );
  return token;
}

/**
 * Verify OTP code against the session token
 */
export async function verifyOTP(
  sessionId: string,
  code: string
): Promise<{ valid: boolean; error?: string }> {
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
    return { valid: true };
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
 * Send OTP email to admin (ADMIN_EMAIL). Used for admin and SEO panel login.
 */
export async function sendOTPEmail(
  otp: string,
  options?: { panel?: "admin" | "seo" }
): Promise<{ success: boolean; error?: string }> {
  const adminEmail = process.env.ADMIN_EMAIL;
  const panel = options?.panel ?? "admin";

  if (!adminEmail) {
    console.error("Admin email not configured");
    return { success: false, error: "Admin email not configured" };
  }

  // Use same SMTP config as other emails in the system
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = Number(process.env.SMTP_PORT) || 465;
  const smtpUser = process.env.SMTP_USER;
  const smtpPassword = process.env.SMTP_PASSWORD;

  if (!smtpHost || !smtpUser || !smtpPassword) {
    console.error("SMTP credentials not configured");
    return { success: false, error: "SMTP not configured" };
  }

  try {
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: true,
      auth: {
        user: smtpUser,
        pass: smtpPassword,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });

    await transporter.sendMail({
      from: `"SARJ Worldwide Security" <${smtpUser}>`,
      to: adminEmail,
      subject:
        panel === "seo"
          ? "SEO Panel login verification — SARJ Worldwide"
          : "Admin login verification — SARJ Worldwide",
      html:
        panel === "seo"
          ? buildSeoPanelOtpEmail(otp, OTP_EXPIRY_MINUTES)
          : buildAdminOtpEmail(otp, OTP_EXPIRY_MINUTES),
    });

    return { success: true };
  } catch (error: any) {
    console.error("Failed to send OTP email:", error);
    return { success: false, error: error.message || "Failed to send email" };
  }
}

