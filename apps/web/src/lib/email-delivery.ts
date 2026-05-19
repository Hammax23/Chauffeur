import nodemailer from "nodemailer";
import { Resend } from "resend";

const resendClient = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function getSmtpTransport(): nodemailer.Transporter | null {
  const host = process.env.SMTP_HOST?.trim();
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASSWORD;
  if (!host || !user || !pass) return null;
  return nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT) || 465,
    secure: true,
    auth: { user, pass },
    tls: { rejectUnauthorized: false },
  });
}

const RESEND_FROM = "SARJ Worldwide <no-reply@sarjworldwide.com>";

/**
 * Try Resend first, then SMTP (same pattern as driver registration / contact form).
 */
export async function sendTransactionalEmail(opts: {
  to: string;
  subject: string;
  html: string;
  /** Log prefix for failures */
  logLabel?: string;
}): Promise<boolean> {
  const { to, subject, html, logLabel = "transactional" } = opts;

  if (resendClient) {
    try {
      await resendClient.emails.send({
        from: RESEND_FROM,
        to,
        subject,
        html,
      });
      return true;
    } catch (e) {
      console.error(`[${logLabel}] Resend failed:`, e);
    }
  }

  const smtp = getSmtpTransport();
  if (smtp) {
    try {
      await smtp.sendMail({
        from: `"SARJ Worldwide" <${process.env.SMTP_USER}>`,
        to,
        subject,
        html,
      });
      return true;
    } catch (e) {
      console.error(`[${logLabel}] SMTP failed:`, e);
    }
  }

  console.warn(`[${logLabel}] Email not sent (no Resend key and no SMTP):`, { to });
  return false;
}
