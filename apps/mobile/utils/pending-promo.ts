import * as SecureStore from "expo-secure-store";

const PENDING_KEY = "sarj_pending_promo_code_v1";
const DISMISSED_KEY = "sarj_home_promo_dismissed_v1";

/** Code saved from Home banner → applied on Confirm. */
export async function setPendingPromoCode(code: string): Promise<void> {
  const c = String(code || "").trim().toUpperCase();
  if (!c) {
    await clearPendingPromoCode();
    return;
  }
  await SecureStore.setItemAsync(PENDING_KEY, c);
}

export async function getPendingPromoCode(): Promise<string | null> {
  try {
    const v = await SecureStore.getItemAsync(PENDING_KEY);
    return v?.trim() ? v.trim().toUpperCase() : null;
  } catch {
    return null;
  }
}

export async function clearPendingPromoCode(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(PENDING_KEY);
  } catch {
    /* ignore */
  }
}

/** promoId → updatedAt ISO that was dismissed (re-show if admin edits banner). */
type DismissedMap = Record<string, string>;

async function readDismissed(): Promise<DismissedMap> {
  try {
    const raw = await SecureStore.getItemAsync(DISMISSED_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as DismissedMap;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export async function isHomePromoDismissed(
  promoId: string,
  updatedAt?: string | null
): Promise<boolean> {
  const map = await readDismissed();
  const dismissedAt = map[promoId];
  if (!dismissedAt) return false;
  if (!updatedAt) return true;
  // Re-show if promo was edited after dismiss
  return dismissedAt >= updatedAt;
}

export async function dismissHomePromo(
  promoId: string,
  updatedAt?: string | null
): Promise<void> {
  const map = await readDismissed();
  map[promoId] = updatedAt || new Date().toISOString();
  await SecureStore.setItemAsync(DISMISSED_KEY, JSON.stringify(map));
}
