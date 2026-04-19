/**
 * Cloudflare Turnstile Server-Side Verification
 * Verifies the Turnstile token sent from the client.
 */

const TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

interface TurnstileVerifyResult {
  success: boolean;
  error?: string;
}

/**
 * Verify a Cloudflare Turnstile token on the server side.
 * @param token - The token received from the client-side widget
 * @param ip - Optional client IP for additional verification
 */
export async function verifyTurnstile(token: string, ip?: string): Promise<TurnstileVerifyResult> {
  const secretKey = process.env.TURNSTILE_SECRET_KEY;

  if (!secretKey) {
    console.warn("TURNSTILE_SECRET_KEY not configured — skipping verification");
    return { success: true };
  }

  if (!token) {
    return { success: false, error: "CAPTCHA verification required. Please complete the challenge." };
  }

  try {
    const body: Record<string, string> = {
      secret: secretKey,
      response: token,
    };
    if (ip) body.remoteip = ip;

    const res = await fetch(TURNSTILE_VERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await res.json();

    if (data.success) {
      return { success: true };
    }

    return {
      success: false,
      error: "CAPTCHA verification failed. Please try again.",
    };
  } catch (error) {
    console.error("Turnstile verification error:", error);
    return { success: false, error: "CAPTCHA verification service unavailable." };
  }
}
