/** Shared password rules for customer register + reset (client + server must match). */
export const MIN_PASSWORD_LENGTH = 8;

export function validatePassword(password: string): string | null {
  if (!password || password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  if (password.length > 128) {
    return "Password is too long.";
  }
  return null;
}
