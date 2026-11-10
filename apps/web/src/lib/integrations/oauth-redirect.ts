import type { NextRequest } from "next/server";

/**
 * Build a browser-safe origin for OAuth return redirects.
 * Next can see host as 0.0.0.0 when bound with -H 0.0.0.0 — browsers reject that.
 */
export function oauthPublicOrigin(req: NextRequest): string {
  const hostHeader = (
    req.headers.get("x-forwarded-host") ||
    req.headers.get("host") ||
    ""
  ).trim();

  const host = hostHeader.split(",")[0]?.trim() || "";
  const protoHeader = (
    req.headers.get("x-forwarded-proto") || ""
  )
    .split(",")[0]
    ?.trim();

  const isLocalHost =
    !host ||
    host.startsWith("0.0.0.0") ||
    host.startsWith("127.0.0.1") ||
    host.startsWith("localhost");

  if (isLocalHost || process.env.NODE_ENV !== "production") {
    // Prefer real browser host if it was localhost; never redirect to 0.0.0.0
    if (host.startsWith("localhost") || host.startsWith("127.0.0.1")) {
      return `${protoHeader || "http"}://${host}`;
    }
    return "http://localhost:3000";
  }

  const site = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "");
  if (site) return site;

  return `${protoHeader || "https"}://${host}`;
}

export function oauthRedirect(req: NextRequest, pathWithQuery: string): URL {
  const base = oauthPublicOrigin(req);
  return new URL(pathWithQuery, base.endsWith("/") ? base : `${base}/`);
}
