import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/admin-auth";

function sanitizeFilename(name: string): string {
  const base = name.replace(/[/\\?%*:|"<>]/g, "").replace(/\s+/g, "_").slice(0, 180);
  return base || "document";
}

function extensionFromMime(contentType: string): string {
  const ct = contentType.toLowerCase().split(";")[0].trim();
  if (ct === "application/pdf") return ".pdf";
  if (ct === "image/jpeg" || ct === "image/jpg") return ".jpg";
  if (ct === "image/png") return ".png";
  if (ct === "image/webp") return ".webp";
  if (ct === "image/gif") return ".gif";
  return "";
}

/** Raw uploads often report octet-stream; driver PDFs use /raw/upload/ */
function guessExtensionFromPath(pathname: string): string {
  const lower = pathname.toLowerCase();
  if (lower.includes("/raw/upload/")) return ".pdf";
  if (lower.includes("/image/upload/")) return ".jpg";
  return ".bin";
}

function ensureExtension(name: string, contentType: string, pathname: string): string {
  if (/\.[a-zA-Z0-9]{2,8}$/.test(name)) return name;
  const fromMime = extensionFromMime(contentType);
  if (fromMime) return `${name}${fromMime}`;
  return `${name}${guessExtensionFromPath(pathname)}`;
}

function contentDispositionAttachment(filename: string): string {
  const ascii = filename.replace(/[^\x20-\x7E]/g, "_");
  const encoded = encodeURIComponent(filename);
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encoded}`;
}

function contentDispositionInline(filename: string): string {
  const ascii = filename.replace(/[^\x20-\x7E]/g, "_");
  const encoded = encodeURIComponent(filename);
  return `inline; filename="${ascii}"; filename*=UTF-8''${encoded}`;
}

export async function GET(request: NextRequest) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authenticated) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const urlParam = request.nextUrl.searchParams.get("url");
  const filenameParam = request.nextUrl.searchParams.get("filename") || "document";

  if (!urlParam?.trim()) {
    return NextResponse.json({ success: false, error: "Missing url" }, { status: 400 });
  }

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  if (!cloudName) {
    return NextResponse.json({ success: false, error: "CLOUDINARY_CLOUD_NAME not configured" }, { status: 503 });
  }

  let assetUrl: string;
  try {
    assetUrl = decodeURIComponent(urlParam.trim());
  } catch {
    return NextResponse.json({ success: false, error: "Invalid url encoding" }, { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(assetUrl);
  } catch {
    return NextResponse.json({ success: false, error: "Invalid URL" }, { status: 400 });
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    return NextResponse.json({ success: false, error: "Invalid protocol" }, { status: 400 });
  }

  if (parsed.hostname !== "res.cloudinary.com") {
    return NextResponse.json({ success: false, error: "Invalid host" }, { status: 400 });
  }

  const firstSegment = parsed.pathname.split("/").filter(Boolean)[0];
  if (firstSegment !== cloudName) {
    return NextResponse.json({ success: false, error: "URL does not belong to this project Cloudinary account" }, { status: 400 });
  }

  let upstream: Response;
  try {
    upstream = await fetch(assetUrl, {
      cache: "no-store",
      redirect: "follow",
      headers: { Accept: "*/*" },
    });
  } catch (e) {
    console.error("document-download fetch error:", e);
    return NextResponse.json({ success: false, error: "Failed to fetch file" }, { status: 502 });
  }

  if (!upstream.ok) {
    return NextResponse.json(
      { success: false, error: `Upstream error ${upstream.status}` },
      { status: 502 }
    );
  }

  let contentType =
    upstream.headers.get("content-type")?.split(";")[0].trim() || "application/octet-stream";

  let base = sanitizeFilename(decodeURIComponent(filenameParam));
  base = ensureExtension(base, contentType, parsed.pathname);

  const inline = request.nextUrl.searchParams.get("inline") === "1";
  // Raw PDFs often come as octet-stream; inline viewers need a concrete PDF type
  if (inline && contentType === "application/octet-stream" && base.toLowerCase().endsWith(".pdf")) {
    contentType = "application/pdf";
  }
  if (inline && contentType === "application/octet-stream" && parsed.pathname.toLowerCase().includes("/raw/upload/")) {
    contentType = "application/pdf";
    if (!base.toLowerCase().endsWith(".pdf")) {
      base = ensureExtension(base, "application/pdf", parsed.pathname);
    }
  }

  const headers = new Headers();
  headers.set("Content-Type", contentType);
  headers.set(
    "Content-Disposition",
    inline ? contentDispositionInline(base) : contentDispositionAttachment(base)
  );
  headers.set("Cache-Control", "private, no-store");

  const len = upstream.headers.get("content-length");
  if (len) headers.set("Content-Length", len);

  return new NextResponse(upstream.body, { status: 200, headers });
}
