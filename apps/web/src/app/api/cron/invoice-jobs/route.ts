import { timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { processInvoiceJobs } from "@/lib/invoice-engine";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET/POST /api/cron/invoice-jobs
 * Drain invoice outbox (EMAIL / QBO_SYNC / DROPBOX_SYNC) every 5–15 minutes.
 * Auth: Authorization: Bearer $CRON_SECRET
 * Query ?secret= is always rejected (leaks via logs / Referer).
 */
function authorize(req: NextRequest): boolean {
  const secret = (process.env.CRON_SECRET || "").trim();
  if (!secret) return false;
  if (req.nextUrl.searchParams.has("secret")) return false;

  const header = req.headers.get("authorization") || "";
  const expected = `Bearer ${secret}`;
  try {
    const a = Buffer.from(header);
    const b = Buffer.from(expected);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

async function run(req: NextRequest) {
  if (!authorize(req)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const summary = await processInvoiceJobs();
    return NextResponse.json({
      success: true,
      claimed: summary.claimed,
      done: summary.done,
      failed: summary.failed,
      at: new Date().toISOString(),
    });
  } catch (e) {
    console.error("[cron/invoice-jobs]", e);
    return NextResponse.json(
      { success: false, error: "Invoice job drain failed" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  return run(req);
}

export async function POST(req: NextRequest) {
  return run(req);
}
