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
 * Sanitizes a URL without HTML-escaping `&` (which would break query strings).
 * Accepts absolute http(s) URLs or site-relative paths starting with `/`.
 */
export function sanitizeUrl(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value !== "string") return "";
  const trimmed = value.trim().slice(0, 2048);
  if (!trimmed) return "";
  if (/^javascript:/i.test(trimmed) || /^data:/i.test(trimmed) || /^vbscript:/i.test(trimmed)) {
    return "";
  }
  if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith("/")) {
    return trimmed;
  }
  return "";
}

/**
 * Plain text trim without HTML entity escaping (for fields that must stay literal).
 */
export function sanitizePlainText(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "number") return String(value);
  if (typeof value !== "string") return "";
  return value.trim().slice(0, 10_000);
}

/**
 * Validates email format.
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}
