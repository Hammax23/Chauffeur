import { NextRequest, NextResponse } from "next/server";
import { processInvoiceJobs } from "@/lib/invoice-engine";

/**
 * Process pending invoice outbox jobs (email / QB / Dropbox).
 * Secure with CRON_SECRET header: Authorization: Bearer <CRON_SECRET>
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();
  const auth = req.headers.get("authorization") || "";
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    await processInvoiceJobs();
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("[cron invoice-jobs]", e);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  return GET(req);
}
