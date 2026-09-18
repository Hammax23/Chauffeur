import * as SecureStore from "expo-secure-store";

const PROMPT_KEY_PREFIX = "sarj_review_prompted_";

/** One-time track-ride prompt flag per booking. */
export async function markReviewPrompted(bookingId: string) {
  try {
    await SecureStore.setItemAsync(`${PROMPT_KEY_PREFIX}${bookingId}`, "1");
  } catch {
    /* ignore */
  }
}

export async function wasReviewPrompted(bookingId: string): Promise<boolean> {
  try {
    return (await SecureStore.getItemAsync(`${PROMPT_KEY_PREFIX}${bookingId}`)) === "1";
  } catch {
    return false;
  }
}
