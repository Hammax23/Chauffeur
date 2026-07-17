import DOMPurify from "isomorphic-dompurify";

// Body content injected from SEO panel must be strictly sanitized.
// This is intentionally more permissive than blog sanitization to allow internal linking and images with alt text.
const ALLOWED_TAGS = [
  "p",
  "br",
  "strong",
  "em",
  "u",
  "s",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "ul",
  "ol",
  "li",
  "blockquote",
  "a",
  "hr",
  "img",
  "span",
];

const ALLOWED_ATTR = [
  "href",
  "target",
  "rel",
  "src",
  "alt",
  "title",
  "width",
  "height",
  "loading",
];

export function sanitizeSeoPageBodyHtml(html: string): string {
  const sanitized = DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOW_DATA_ATTR: false,
  });

  // Basic hardening: ensure any target=_blank links have safe rel.
  // DOMPurify prevents javascript: URLs, but rel is still best-practice.
  return sanitized.replace(
    /<a\b([^>]*\btarget=(?:"_blank"|'_blank')[^>]*)>/gi,
    (full, attrs: string) => {
      if (/\brel=/.test(attrs)) return full;
      return `<a${attrs} rel="noopener noreferrer">`;
    }
  );
}

/**
 * Header/body SEO scripts must remain executable (no HTML entity escaping).
 * Strip event handlers, dangerous URL schemes, and non-snippet tags.
 * Scripts are admin-authored from the SEO panel only.
 */
export function sanitizeSeoScripts(raw: string): string {
  if (!raw?.trim()) return "";

  let s = raw.trim().slice(0, 100_000);
  // Drop interactive / navigational vectors that shouldn't live in script slots
  s = s.replace(/<\/?(iframe|object|embed|form|img|svg|math)\b[^>]*>/gi, "");
  s = s.replace(/\son\w+\s*=\s*(['"]).*?\1/gi, "");
  s = s.replace(/\son\w+\s*=\s*[^\s>]+/gi, "");
  s = s.replace(
    /\s(href|src)\s*=\s*(['"])\s*(javascript|data|vbscript):[^'"]*\2/gi,
    ' $1=""'
  );
  return s.trim();
}

