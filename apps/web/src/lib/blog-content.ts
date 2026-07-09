import DOMPurify from "isomorphic-dompurify";

const ALLOWED_TAGS = [
  "p", "br", "strong", "em", "u", "s", "h2", "h3", "h4",
  "ul", "ol", "li", "blockquote", "a", "hr",
];

const ALLOWED_ATTR = ["href", "target", "rel"];

export function sanitizeBlogHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOW_DATA_ATTR: false,
  });
}

export function isHtmlContent(content: string, format?: string | null): boolean {
  if (format === "html") return true;
  if (format === "plain") return false;
  return /<\/?[a-z][\s\S]*>/i.test(content.trim());
}

export function renderBlogContent(content: string, format?: string | null): {
  type: "html" | "plain";
  html?: string;
  paragraphs?: string[];
} {
  if (isHtmlContent(content, format)) {
    return { type: "html", html: sanitizeBlogHtml(content) };
  }

  return {
    type: "plain",
    paragraphs: content.split("\n\n").filter((p) => p.trim()),
  };
}
