import * as SecureStore from "expo-secure-store";

/**
 * Password-reset flow secrets must NOT live in Expo Router URL params
 * (navigation state / logs). Hold them briefly in SecureStore instead.
 */

const RESET_SESSION_KEY = "sarj_reset_otp_session";
const RESET_EMAIL_KEY = "sarj_reset_email";
const RESET_EMAIL_MASKED_KEY = "sarj_reset_email_masked";
const RESET_TOKEN_KEY = "sarj_reset_password_token";

export async function savePasswordResetOtpSession(params: {
  sessionId: string;
  email: string;
  emailMasked: string;
}): Promise<void> {
  await SecureStore.setItemAsync(RESET_SESSION_KEY, params.sessionId);
  await SecureStore.setItemAsync(RESET_EMAIL_KEY, params.email);
  await SecureStore.setItemAsync(RESET_EMAIL_MASKED_KEY, params.emailMasked);
}

export async function loadPasswordResetOtpSession(): Promise<{
  sessionId: string;
  email: string;
  emailMasked: string;
} | null> {
  try {
    const sessionId = await SecureStore.getItemAsync(RESET_SESSION_KEY);
    const email = await SecureStore.getItemAsync(RESET_EMAIL_KEY);
    const emailMasked = await SecureStore.getItemAsync(RESET_EMAIL_MASKED_KEY);
    if (!sessionId || !email) return null;
    return { sessionId, email, emailMasked: emailMasked || email };
  } catch {
    return null;
  }
}

export async function updatePasswordResetOtpSessionId(sessionId: string): Promise<void> {
  await SecureStore.setItemAsync(RESET_SESSION_KEY, sessionId);
}

export async function clearPasswordResetOtpSession(): Promise<void> {
  await SecureStore.deleteItemAsync(RESET_SESSION_KEY);
  await SecureStore.deleteItemAsync(RESET_EMAIL_KEY);
  await SecureStore.deleteItemAsync(RESET_EMAIL_MASKED_KEY);
}

export async function savePasswordResetToken(resetToken: string): Promise<void> {
  await SecureStore.setItemAsync(RESET_TOKEN_KEY, resetToken);
  // OTP session no longer needed once verified
  await clearPasswordResetOtpSession();
}

export async function loadPasswordResetToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(RESET_TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function clearPasswordResetToken(): Promise<void> {
  await SecureStore.deleteItemAsync(RESET_TOKEN_KEY);
}

export async function clearAllPasswordResetState(): Promise<void> {
  await clearPasswordResetOtpSession();
  await clearPasswordResetToken();
}
