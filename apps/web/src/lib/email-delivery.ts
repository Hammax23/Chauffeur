import nodemailer from "nodemailer";
import { Resend } from "resend";

function getResendClient(): Resend | null {
  const key = process.env.RESEND_API_KEY?.trim();
  return key ? new Resend(key) : null;
}

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** True when at least one outbound mail provider is configured. */
export function isEmailConfigured(): boolean {
  if (process.env.RESEND_API_KEY?.trim()) return true;
  const host = process.env.SMTP_HOST?.trim();
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASSWORD;
  return Boolean(host && user && pass);
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

function defaultFromAddress(): string {
  return (
    process.env.EMAIL_FROM?.trim() ||
    "SARJ Worldwide <no-reply@mail.sarjworldwide.ca>"
  );
}

function defaultReplyTo(): string | undefined {
  const reply =
    process.env.EMAIL_REPLY_TO?.trim() ||
    process.env.CONTACT_EMAIL?.trim() ||
    process.env.SMTP_USER?.trim();
  return reply || undefined;
}

export type EmailAttachment = {
  filename: string;
  content: string | Buffer;
  contentType?: string;
};

/**
 * Resend first (verified domain). SMTP only if Resend is unset, or
 * EMAIL_SMTP_FALLBACK=true (avoid Hostinger while mailbox is blocked).
 */
export async function sendTransactionalEmail(opts: {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
  attachments?: EmailAttachment[];
  /** Log prefix for failures */
  logLabel?: string;
}): Promise<boolean> {
  const { to, subject, html, logLabel = "transactional" } = opts;
  const from = defaultFromAddress();
  const replyTo = opts.replyTo?.trim() || defaultReplyTo();
  const resendClient = getResendClient();

  if (resendClient) {
    try {
      const attachments = opts.attachments?.map((a) => ({
        filename: a.filename,
        content:
          typeof a.content === "string"
            ? Buffer.from(a.content, "utf8")
            : a.content,
        contentType: a.contentType,
      }));

      const { error } = await resendClient.emails.send({
        from,
        to,
        subject,
        html,
        ...(replyTo ? { replyTo } : {}),
        ...(attachments?.length ? { attachments } : {}),
      });

      if (error) {
        console.error(`[${logLabel}] Resend API error:`, error);
      } else {
        return true;
      }
    } catch (e) {
      console.error(`[${logLabel}] Resend failed:`, e);
    }

    // Hostinger may be suspended / sender-blocked — do not auto-fallback unless opted in.
    if (process.env.EMAIL_SMTP_FALLBACK?.trim() !== "true") {
      console.warn(
        `[${logLabel}] Resend failed; SMTP fallback disabled (set EMAIL_SMTP_FALLBACK=true to enable).`
      );
      return false;
    }
  }

  const smtp = getSmtpTransport();
  if (smtp) {
    try {
      await smtp.sendMail({
        from,
        to,
        subject,
        html,
        ...(replyTo ? { replyTo } : {}),
        ...(opts.attachments?.length
          ? {
              attachments: opts.attachments.map((a) => ({
                filename: a.filename,
                content: a.content,
                contentType: a.contentType,
              })),
            }
          : {}),
      });
      return true;
    } catch (e) {
      console.error(`[${logLabel}] SMTP failed:`, e);
    }
  }

  console.warn(`[${logLabel}] Email not sent (no provider succeeded):`, { to });
  return false;
}
