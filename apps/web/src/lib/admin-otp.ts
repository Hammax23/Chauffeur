import nodemailer from "nodemailer";
import jwt from "jsonwebtoken";
import { buildAdminOtpEmail, buildSeoPanelOtpEmail } from "@/lib/email-templates";

// OTP settings
const OTP_LENGTH = 6;
const OTP_EXPIRY_MINUTES = 15;
const MAX_OTP_ATTEMPTS = 3;

// JWT secret for OTP tokens
const OTP_SECRET = process.env.JWT_SECRET || "otp-fallback-secret-key";

// Track attempts (this can reset on server restart, but that's fine for security)
const attemptStore = new Map<string, number>();

interface OTPPayload {
  otp: string;
  exp: number;
  iat: number;
}

/**
 * Generate a random OTP code
 */
export function generateOTP(): string {
  const digits = "0123456789";
  let otp = "";
  for (let i = 0; i < OTP_LENGTH; i++) {
    otp += digits[Math.floor(Math.random() * digits.length)];
  }
  return otp;
}

/**
 * Create a signed session token containing the OTP
 * This survives server restarts because the OTP is encoded in the token itself
 */
export function createOTPSession(code: string): string {
  const token = jwt.sign(
    { otp: code },
    OTP_SECRET,
    { expiresIn: `${OTP_EXPIRY_MINUTES}m` }
  );
  return token;
}

/**
 * Verify OTP code against the session token
 */
export function verifyOTP(sessionId: string, code: string): { valid: boolean; error?: string } {
  // Check attempts
  const attempts = attemptStore.get(sessionId) || 0;
  if (attempts >= MAX_OTP_ATTEMPTS) {
    attemptStore.delete(sessionId);
    return { valid: false, error: "Too many attempts. Please request a new code." };
  }

  try {
    // Decode and verify the session token
    const decoded = jwt.verify(sessionId, OTP_SECRET) as OTPPayload;

    if (decoded.otp !== code) {
      attemptStore.set(sessionId, attempts + 1);
      const remaining = MAX_OTP_ATTEMPTS - attempts - 1;
      return { valid: false, error: `Invalid OTP. ${remaining} attempts remaining.` };
    }

    // Valid OTP - clear attempts
    attemptStore.delete(sessionId);
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

export function clearOTP(sessionId: string): void {
  attemptStore.delete(sessionId);
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

