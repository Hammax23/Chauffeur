import nodemailer from "nodemailer";
import jwt from "jsonwebtoken";

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
 * Send OTP email to admin
 */
export async function sendOTPEmail(otp: string): Promise<{ success: boolean; error?: string }> {
  const adminEmail = process.env.ADMIN_EMAIL;

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
      subject: "🔐 Admin Login Verification Code",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; background-color: #1C1C1E; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #1C1C1E; padding: 40px 20px;">
            <tr>
              <td align="center">
                <table width="100%" max-width="500" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #2C2C2E 0%, #1C1C1E 100%); border-radius: 16px; border: 1px solid rgba(201, 160, 99, 0.3); overflow: hidden;">
                  <!-- Header -->
                  <tr>
                    <td style="padding: 30px 40px; text-align: center; border-bottom: 1px solid rgba(255,255,255,0.1);">
                      <h1 style="margin: 0; color: #C9A063; font-size: 24px; font-weight: 600;">SARJ Worldwide</h1>
                      <p style="margin: 8px 0 0 0; color: #888; font-size: 14px;">Admin Panel Security</p>
                    </td>
                  </tr>
                  
                  <!-- Content -->
                  <tr>
                    <td style="padding: 40px;">
                      <p style="margin: 0 0 20px 0; color: #fff; font-size: 16px; line-height: 1.6;">
                        A login attempt was made to your admin panel. Use the verification code below to complete your login:
                      </p>
                      
                      <!-- OTP Box -->
                      <div style="background: rgba(201, 160, 99, 0.1); border: 2px solid #C9A063; border-radius: 12px; padding: 25px; text-align: center; margin: 25px 0;">
                        <p style="margin: 0 0 10px 0; color: #888; font-size: 12px; text-transform: uppercase; letter-spacing: 2px;">Verification Code</p>
                        <p style="margin: 0; color: #C9A063; font-size: 36px; font-weight: 700; letter-spacing: 8px;">${otp}</p>
                      </div>
                      
                      <p style="margin: 20px 0 0 0; color: #888; font-size: 14px; line-height: 1.6;">
                        ⏱️ This code expires in <strong style="color: #fff;">${OTP_EXPIRY_MINUTES} minutes</strong>
                      </p>
                      
                      <p style="margin: 15px 0 0 0; color: #888; font-size: 14px; line-height: 1.6;">
                        🔒 If you didn't request this code, please ignore this email and ensure your password is secure.
                      </p>
                    </td>
                  </tr>
                  
                  <!-- Footer -->
                  <tr>
                    <td style="padding: 20px 40px; background: rgba(0,0,0,0.2); border-top: 1px solid rgba(255,255,255,0.1);">
                      <p style="margin: 0; color: #666; font-size: 12px; text-align: center;">
                        © ${new Date().getFullYear()} SARJ Worldwide Chauffeur Services
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
    });

    return { success: true };
  } catch (error: any) {
    console.error("Failed to send OTP email:", error);
    return { success: false, error: error.message || "Failed to send email" };
  }
}

