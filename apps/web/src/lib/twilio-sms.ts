import "server-only";
import twilio from "twilio";

function getTwilioConfig() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const authToken = process.env.TWILIO_AUTH_TOKEN?.trim();
  const from = process.env.TWILIO_PHONE_NUMBER?.trim();
  if (!accountSid || !authToken || !from) return null;
  return { accountSid, authToken, from };
}

/** Normalize to E.164 — defaults bare 10-digit numbers to +1 (CA/US). */
export function toE164Phone(raw?: string | null): string | null {
  if (!raw?.trim()) return null;
  const trimmed = raw.trim();
  if (trimmed.startsWith("+")) {
    const digits = trimmed.slice(1).replace(/\D/g, "");
    return digits.length >= 10 ? `+${digits}` : null;
  }
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (digits.length >= 10) return `+${digits}`;
  return null;
}

export async function sendSms(toRaw: string, body: string): Promise<{ ok: boolean; error?: string }> {
  const config = getTwilioConfig();
  if (!config) {
    console.warn("[twilio-sms] Missing TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_PHONE_NUMBER");
    return { ok: false, error: "Twilio not configured" };
  }

  const to = toE164Phone(toRaw);
  if (!to) {
    return { ok: false, error: "Invalid phone number" };
  }

  try {
    const client = twilio(config.accountSid, config.authToken);
    await client.messages.create({
      from: config.from,
      to,
      body,
    });
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Twilio send failed";
    console.error("[twilio-sms]", message);
    return { ok: false, error: message };
  }
}
