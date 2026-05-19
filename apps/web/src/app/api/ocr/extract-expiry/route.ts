import { NextRequest, NextResponse } from "next/server";

/**
 * OCR expiry extraction (best-effort).
 *
 * Enterprise note: This endpoint is intentionally provider-agnostic.
 * Configure OCR via env `OCRSPACE_API_KEY` (OCR.Space Image/PDF URL parsing).
 *
 * Security: restrict URL hosts to known asset providers to avoid SSRF.
 */

const OCRSPACE_API_KEY = process.env.OCRSPACE_API_KEY || "";
const ALLOWED_HOSTS = new Set(["res.cloudinary.com"]);

// Very small in-memory rate limit (edge-safe enough for single instance dev)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000;
const MAX_REQUESTS = 30;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(ip);
  if (!record || now > record.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }
  if (record.count >= MAX_REQUESTS) return false;
  record.count++;
  return true;
}

function parseCandidateDates(text: string): Date[] {
  const t = text.replace(/\s+/g, " ");

  const out: Date[] = [];

  // YYYY-MM-DD or YYYY/MM/DD
  for (const m of t.matchAll(/\b(20\d{2})[-\/](\d{1,2})[-\/](\d{1,2})\b/g)) {
    const y = Number(m[1]);
    const mo = Number(m[2]);
    const d = Number(m[3]);
    const dt = new Date(Date.UTC(y, mo - 1, d));
    if (!Number.isNaN(dt.getTime())) out.push(dt);
  }

  // DD/MM/YYYY or MM/DD/YYYY (ambiguous; we record both when possible)
  for (const m of t.matchAll(/\b(\d{1,2})[-\/](\d{1,2})[-\/](20\d{2})\b/g)) {
    const a = Number(m[1]);
    const b = Number(m[2]);
    const y = Number(m[3]);
    // interpret as DD/MM
    const dt1 = new Date(Date.UTC(y, b - 1, a));
    if (!Number.isNaN(dt1.getTime())) out.push(dt1);
    // interpret as MM/DD
    const dt2 = new Date(Date.UTC(y, a - 1, b));
    if (!Number.isNaN(dt2.getTime())) out.push(dt2);
  }

  // DD MMM YYYY / MMM DD YYYY
  const months: Record<string, number> = {
    jan: 1,
    feb: 2,
    mar: 3,
    apr: 4,
    may: 5,
    jun: 6,
    jul: 7,
    aug: 8,
    sep: 9,
    sept: 9,
    oct: 10,
    nov: 11,
    dec: 12,
  };

  for (const m of t.matchAll(/\b(\d{1,2})\s*(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\s*(20\d{2})\b/gi)) {
    const d = Number(m[1]);
    const mo = months[m[2].toLowerCase()] || 0;
    const y = Number(m[3]);
    if (mo) {
      const dt = new Date(Date.UTC(y, mo - 1, d));
      if (!Number.isNaN(dt.getTime())) out.push(dt);
    }
  }

  for (const m of t.matchAll(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\s*(\d{1,2})[, ]\s*(20\d{2})\b/gi)) {
    const mo = months[m[1].toLowerCase()] || 0;
    const d = Number(m[2]);
    const y = Number(m[3]);
    if (mo) {
      const dt = new Date(Date.UTC(y, mo - 1, d));
      if (!Number.isNaN(dt.getTime())) out.push(dt);
    }
  }

  return out;
}

function chooseExpiryDate(text: string): { date: Date | null; confidence: number | null } {
  const dates = parseCandidateDates(text);
  if (!dates.length) return { date: null, confidence: null };

  // heuristic: expiry tends to be the latest date present
  const sorted = dates
    .filter((d) => d.getUTCFullYear() >= 2020 && d.getUTCFullYear() <= 2100)
    .sort((a, b) => b.getTime() - a.getTime());

  if (!sorted.length) return { date: null, confidence: null };

  return { date: sorted[0], confidence: 0.55 };
}

function assertAllowedUrl(raw: string): URL | null {
  try {
    const u = new URL(raw);
    if (u.protocol !== "https:" && u.protocol !== "http:") return null;
    if (!ALLOWED_HOSTS.has(u.hostname)) return null;
    return u;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  // Temporarily disabled (requested by admin). Keep route so frontend doesn't crash if it calls it.
  return NextResponse.json(
    { success: false, error: "OCR temporarily disabled" },
    { status: 410 }
  );

  const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ success: false, error: "Too many requests" }, { status: 429 });
  }

  try {
    const body = await req.json();
    const urlRaw = typeof body?.url === "string" ? body.url.trim() : "";
    const allowedUrl = assertAllowedUrl(urlRaw);
    if (!allowedUrl) {
      return NextResponse.json({ success: false, error: "Invalid or disallowed URL" }, { status: 400 });
    }
    const assetUrl = allowedUrl as URL;

    if (!OCRSPACE_API_KEY) {
      return NextResponse.json(
        { success: false, error: "OCR is not configured (missing OCRSPACE_API_KEY)" },
        { status: 501 }
      );
    }

    const ocrUrl = new URL("https://api.ocr.space/parse/imageurl");
    ocrUrl.searchParams.set("apikey", OCRSPACE_API_KEY);
    ocrUrl.searchParams.set("url", assetUrl.toString());
    ocrUrl.searchParams.set("OCREngine", "2");
    ocrUrl.searchParams.set("isOverlayRequired", "false");

    const r = await fetch(ocrUrl.toString(), { method: "GET" });
    const data = (await r.json()) as any;

    if (!r.ok || data?.IsErroredOnProcessing) {
      return NextResponse.json(
        { success: false, error: data?.ErrorMessage?.[0] || "OCR failed" },
        { status: 502 }
      );
    }

    const parsedText: string =
      data?.ParsedResults?.map((x: any) => x?.ParsedText).filter(Boolean).join("\n") || "";

    const pick = chooseExpiryDate(parsedText);
    return NextResponse.json({
      success: true,
      extractedExpiryDate: pick.date?.toISOString().slice(0, 10) ?? null,
      confidence: pick.confidence,
      rawTextPreview: parsedText.slice(0, 500),
    });
  } catch (e: any) {
    console.error("OCR extract-expiry error:", e);
    return NextResponse.json({ success: false, error: "Failed to extract expiry" }, { status: 500 });
  }
}

