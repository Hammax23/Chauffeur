import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { parsePickupDateTime } from "@/lib/cancel-policy";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Reminder window: 45–75 minutes before scheduled pickup. */
const WINDOW_MIN_MS = 45 * 60 * 1000;
const WINDOW_MAX_MS = 75 * 60 * 1000;

const ACTIVE = ["PENDING", "ACCEPTED", "ON THE WAY", "ARRIVED"] as const;

function authorize(req: NextRequest): boolean {
  const secret = (process.env.CRON_SECRET || "").trim();
  if (!secret) return false;
  // Bearer only — never accept ?secret= (leaks via logs / Referer).
  const header = req.headers.get("authorization") || "";
  return header === `Bearer ${secret}`;
}

/**
 * GET/POST /api/cron/pre-trip-reminders
 * Call every ~10–15 minutes (Vercel Cron, Railway cron, or system timer).
 * Auth: Authorization: Bearer $CRON_SECRET (query ?secret= is rejected)
 *
 * Idempotency: Reservation.preTripReminderSentAt (set inside notify helper).
 */
async function run(req: NextRequest) {
  if (!authorize(req)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const now = Date.now();
  const candidates = await prisma.reservation.findMany({
    where: {
      customerId: { not: null },
      status: { in: [...ACTIVE] },
    },
    select: {
      bookingId: true,
      serviceDate: true,
      serviceTime: true,
    },
    take: 500,
    orderBy: { createdAt: "desc" },
  });

  const due: string[] = [];
  for (const row of candidates) {
    const pickup = parsePickupDateTime(row.serviceDate, row.serviceTime);
    if (!pickup) continue;
    const delta = pickup.getTime() - now;
    if (delta >= WINDOW_MIN_MS && delta <= WINDOW_MAX_MS) {
      due.push(row.bookingId);
    }
  }

  let sent = 0;
  const { notifyCustomerPreTripReminder } = await import("@/lib/customer-push");
  for (const bookingId of due) {
    try {
      await notifyCustomerPreTripReminder(bookingId);
      sent += 1;
    } catch (err) {
      console.error("[cron/pre-trip-reminders]", bookingId, err);
    }
  }

  return NextResponse.json({
    success: true,
    scanned: candidates.length,
    due: due.length,
    attempted: sent,
  });
}

export async function GET(req: NextRequest) {
  return run(req);
}

export async function POST(req: NextRequest) {
  return run(req);
}
