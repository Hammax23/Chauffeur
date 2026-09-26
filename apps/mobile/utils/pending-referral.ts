import * as SecureStore from "expo-secure-store";

const PENDING_REFERRAL_KEY = "sarj_pending_referral_code_v1";

export function normalizeReferralCodeClient(input: string): string {
  return String(input || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, "");
}

export async function setPendingReferralCode(code: string): Promise<void> {
  const c = normalizeReferralCodeClient(code);
  if (!c) {
    await clearPendingReferralCode();
    return;
  }
  await SecureStore.setItemAsync(PENDING_REFERRAL_KEY, c);
}

export async function getPendingReferralCode(): Promise<string | null> {
  try {
    const v = await SecureStore.getItemAsync(PENDING_REFERRAL_KEY);
    return v ? normalizeReferralCodeClient(v) || null : null;
  } catch {
    return null;
  }
}

export async function clearPendingReferralCode(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(PENDING_REFERRAL_KEY);
  } catch {
    /* ignore */
  }
}

/** Parse sarjworldwide://referral?code=XXX or https://sarjworldwide.ca/r/XXX */
export function extractReferralCodeFromUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const u = url.trim();
    const pathMatch = u.match(/\/r\/([A-Za-z0-9-]+)/i);
    if (pathMatch?.[1]) return normalizeReferralCodeClient(pathMatch[1]);
    const qIndex = u.indexOf("?");
    if (qIndex >= 0) {
      const qs = u.slice(qIndex + 1);
      const params = new URLSearchParams(qs);
      const code = params.get("code") || params.get("referralCode");
      if (code) return normalizeReferralCodeClient(code);
    }
  } catch {
    /* ignore */
  }
  return null;
}
