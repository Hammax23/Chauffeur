// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import prisma from "@/lib/prisma";
import { getAppJwtSecret } from "@/lib/app-jwt-secret";
import { roundMoney } from "@/lib/driver-pay";

function getDriverFromToken(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  try {
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, getAppJwtSecret()) as {
      id: string;
      email: string;
      type: string;
    };
    if (decoded.type !== "driver") return null;
    return decoded;
  } catch {
    return null;
  }
}

/** America/Toronto week range (Mon 00:00 → next Mon 00:00) around now. */
function torontoWeekRange(): { start: Date; end: Date } {
  const now = new Date();
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Toronto",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  });
  const parts = fmt.formatToParts(now).reduce((a, p) => {
    if (p.type !== "literal") a[p.type] = p.value;
    return a;
  }, {} as Record<string, string>);
  const yyyy = Number(parts.year);
  const mm = Number(parts.month);
  const dd = Number(parts.day);
  const weekday = parts.weekday || "Mon";
  const dayIdx = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }[weekday as keyof any] ?? 1;
  const daysFromMonday = (dayIdx + 6) % 7;
  const localMidnight = new Date(Date.UTC(yyyy, mm - 1, dd, 4, 0, 0));
  const start = new Date(localMidnight.getTime() - daysFromMonday * 86_400_000);
  const end = new Date(start.getTime() + 7 * 86_400_000);
  return { start, end };
}

export async function GET(req: NextRequest) {
  try {
    const tokenData = getDriverFromToken(req);
    if (!tokenData) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit")) || 50));
    const cursor = url.searchParams.get("cursor") || undefined;
    const summaryOnly = url.searchParams.get("summaryOnly") === "1";

    const where = { driverId: tokenData.id };

    const [pendingAgg, paidAgg, heldAgg, remitOwedAgg, lifetimeAgg, adjPosAgg, adjNegAgg] =
      await Promise.all([
        prisma.driverEarning.aggregate({
          where: { ...where, status: "PENDING" },
          _sum: { driverNet: true },
          _count: true,
        }),
        prisma.driverEarning.aggregate({
          where: { ...where, status: "PAID" },
          _sum: { driverNet: true },
          _count: true,
        }),
        prisma.driverEarning.aggregate({
          where: { ...where, status: "HELD" },
          _sum: { driverNet: true },
          _count: true,
        }),
        prisma.driverRemittance.aggregate({
          where: { ...where, status: "OWED" },
          _sum: { amountOwed: true },
          _count: true,
        }),
        prisma.driverEarning.aggregate({
          where: { ...where, status: { in: ["PENDING", "PAID"] } },
          _sum: { driverNet: true },
        }),
        // Phase 2 — surface lifetime adjustments (bonuses + deductions) on driver summary.
        prisma.driverAdjustment.aggregate({
          where: { ...where, amount: { gt: 0 } },
          _sum: { amount: true },
          _count: true,
        }),
        prisma.driverAdjustment.aggregate({
          where: { ...where, amount: { lt: 0 } },
          _sum: { amount: true },
          _count: true,
        }),
      ]);

    const week = torontoWeekRange();
    const weekAgg = await prisma.driverEarning.aggregate({
      where: {
        ...where,
        completedAt: { gte: week.start, lt: week.end },
        status: { in: ["PENDING", "PAID"] },
      },
      _sum: { driverNet: true },
      _count: true,
    });

    const adjustmentsPositive = roundMoney(adjPosAgg._sum.amount || 0);
    const adjustmentsNegative = roundMoney(adjNegAgg._sum.amount || 0);
    const adjustmentsNet = roundMoney(adjustmentsPositive + adjustmentsNegative);

    const summary = {
      pending: { count: pendingAgg._count, total: roundMoney(pendingAgg._sum.driverNet || 0) },
      paid: { count: paidAgg._count, total: roundMoney(paidAgg._sum.driverNet || 0) },
      held: { count: heldAgg._count, total: roundMoney(heldAgg._sum.driverNet || 0) },
      remittanceOwed: {
        count: remitOwedAgg._count,
        total: roundMoney(remitOwedAgg._sum.amountOwed || 0),
      },
      lifetime: { total: roundMoney(lifetimeAgg._sum.driverNet || 0) },
      /** Phase 2 — lifetime bonuses / deductions applied by admin. */
      adjustments: {
        positiveCount: adjPosAgg._count,
        positiveTotal: adjustmentsPositive,
        negativeCount: adjNegAgg._count,
        negativeTotal: adjustmentsNegative,
        net: adjustmentsNet,
      },
      thisWeek: {
        count: weekAgg._count,
        total: roundMoney(weekAgg._sum.driverNet || 0),
        rangeStart: week.start.toISOString(),
        rangeEnd: week.end.toISOString(),
        tz: "America/Toronto",
      },
    };

    if (summaryOnly) {
      return NextResponse.json({ success: true, summary, earnings: [], remittances: [], nextCursor: null });
    }

    const rows = await prisma.driverEarning.findMany({
      where,
      orderBy: [{ completedAt: "desc" }, { id: "desc" }],
      take: limit + 1,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      include: {
        reservation: {
          select: {
            bookingId: true,
            serviceDate: true,
            serviceTime: true,
            pickupLocation: true,
            dropoffLocation: true,
          },
        },
      },
    });

    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;
    const nextCursor = hasMore ? page[page.length - 1].id : null;

    const remittances = await prisma.driverRemittance.findMany({
      where: { ...where, status: "OWED" },
      orderBy: [{ completedAt: "desc" }],
      take: 50,
      include: {
        reservation: {
          select: { bookingId: true, serviceDate: true, serviceTime: true, pickupLocation: true },
        },
      },
    });

    return NextResponse.json({
      success: true,
      summary,
      earnings: page.map((e) => ({
        id: e.id,
        bookingId: e.bookingId,
        mode: e.mode,
        status: e.status,
        holdReason: e.holdReason,
        commissionPct: e.commissionPct,
        platformFee: e.platformFee,
        gratuity: e.gratuity,
        driverNet: e.driverNet,
        serviceBasis: e.serviceBasis,
        completedAt: e.completedAt.toISOString(),
        reservation: e.reservation
          ? {
              bookingId: e.reservation.bookingId,
              serviceDate: e.reservation.serviceDate,
              serviceTime: e.reservation.serviceTime,
              pickupLocation: e.reservation.pickupLocation,
              dropoffLocation: e.reservation.dropoffLocation,
            }
          : null,
      })),
      remittances: remittances.map((r) => ({
        id: r.id,
        bookingId: r.bookingId,
        status: r.status,
        amountOwed: r.amountOwed,
        commissionPct: r.commissionPct,
        serviceBasis: r.serviceBasis,
        completedAt: r.completedAt.toISOString(),
        reservation: r.reservation
          ? {
              bookingId: r.reservation.bookingId,
              serviceDate: r.reservation.serviceDate,
              serviceTime: r.reservation.serviceTime,
              pickupLocation: r.reservation.pickupLocation,
            }
          : null,
      })),
      nextCursor,
    });
  } catch (error) {
    console.error("[driver earnings GET]", error);
    return NextResponse.json({ success: false, error: "Failed to load earnings" }, { status: 500 });
  }
}
