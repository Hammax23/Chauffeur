/** Shared with mobile app — keep in sync with apps/mobile/utils/password-policy.ts */
export const MIN_PASSWORD_LENGTH = 8;

export function validatePassword(password: unknown): string | null {
  if (typeof password !== "string" || password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  if (password.length > 128) {
    return "Password is too long.";
  }
  return null;
}
