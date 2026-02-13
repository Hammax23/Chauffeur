/**
 * Input Sanitization Utility
 * Prevents XSS attacks by escaping HTML entities in user inputs.
 */

const HTML_ESCAPE_MAP: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#x27;",
  "/": "&#x2F;",
  "`": "&#96;",
};

const HTML_ESCAPE_REGEX = /[&<>"'`/]/g;

/**
 * Escapes HTML special characters in a string to prevent XSS.
 */
export function escapeHtml(str: string): string {
  if (typeof str !== "string") return "";
  return str.replace(HTML_ESCAPE_REGEX, (char) => HTML_ESCAPE_MAP[char] || char);
}

/**
 * Sanitizes a single input value — trims whitespace and escapes HTML.
 */
export function sanitizeInput(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "number") return String(value);
  if (typeof value !== "string") return "";
  return escapeHtml(value.trim());
}

/**
 * Sanitizes an array of strings.
 */
export function sanitizeArray(arr: unknown): string[] {
  if (!Array.isArray(arr)) return [];
  return arr.map((item) => sanitizeInput(item)).filter((s) => s.length > 0);
}

/**
 * Sanitizes all string values in a flat object.
 */
export function sanitizeObject<T extends Record<string, unknown>>(obj: T): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === "string") {
      sanitized[key] = sanitizeInput(value);
    } else if (Array.isArray(value)) {
      sanitized[key] = sanitizeArray(value);
    } else if (typeof value === "number" || typeof value === "boolean") {
      sanitized[key] = value;
    } else {
      sanitized[key] = sanitizeInput(value);
    }
  }
  return sanitized;
}

/**
 * Validates email format.
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}
