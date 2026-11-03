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

export async function POST(_req: NextRequest) {
  // Temporarily disabled (requested by admin). Keep route so frontend doesn't crash if it calls it.
  // When re-enabling: rate-limit with await checkRateLimit from @/lib/rate-limit.
  return NextResponse.json(
    { success: false, error: "OCR temporarily disabled" },
    { status: 410 }
  );
}

