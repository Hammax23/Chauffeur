// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { updateEarningAdmin, roundMoney } from "@/lib/driver-pay";

/** America/Toronto week range (Mon 00:00 → next Mon 00:00) around now. */
function torontoWeekRange(): { start: Date; end: Date } {
  // Approximation safe for display: use UTC-5/UTC-4 adjusted ISO by Intl.
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
  // Local midnight in Toronto → approximate as UTC midnight minus offset of 4 or 5 hrs.
  // For aggregate display granularity this is accurate enough; audits always store absolute UTC.
  const localMidnight = new Date(Date.UTC(yyyy, mm - 1, dd, 4, 0, 0)); // 00:00 EDT (UTC-4) as safe proxy
  const start = new Date(localMidnight.getTime() - daysFromMonday * 86_400_000);
  const end = new Date(start.getTime() + 7 * 86_400_000);
  return { start, end };
}

export async function GET(req: NextRequest) {
  const auth = await verifyAdminAuth(req);
  if (!auth.authenticated) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const url = new URL(req.url);
    const driverId = url.searchParams.get("driverId")?.trim() || undefined;
    const status = url.searchParams.get("status")?.trim().toUpperCase() || undefined;
    const needsReview = url.searchParams.get("needsReview") === "1";
    const mode = url.searchParams.get("mode")?.trim().toUpperCase() || undefined;
    const q = url.searchParams.get("q")?.trim() || "";
    const limit = Math.min(200, Math.max(1, Number(url.searchParams.get("limit")) || 50));
    const cursor = url.searchParams.get("cursor") || undefined;
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");
    const includeRemittances = url.searchParams.get("includeRemittances") !== "0";

    const where: Record<string, unknown> = {};
    if (driverId) where.driverId = driverId;
    if (status && ["PENDING", "PAID", "VOID", "REASSIGNED", "HELD"].includes(status)) where.status = status;
    if (needsReview) where.needsReview = true;
    if (mode && ["DONE", "NO_SHOW"].includes(mode)) where.mode = mode;
    if (q) {
      where.OR = [
        { bookingId: { contains: q, mode: "insensitive" } },
        { notes: { contains: q, mode: "insensitive" } },
        { driver: { name: { contains: q, mode: "insensitive" } } },
        { driver: { email: { contains: q, mode: "insensitive" } } },
        { driver: { driverId: { contains: q, mode: "insensitive" } } },
      ];
    }
    const dateFilter: Record<string, Date> = {};
    if (from) {
      const d = new Date(from);
      if (!isNaN(d.getTime())) dateFilter.gte = d;
    }
    if (to) {
      const d = new Date(to);
      if (!isNaN(d.getTime())) dateFilter.lte = d;
    }
    if (Object.keys(dateFilter).length > 0) where.completedAt = dateFilter;

    const earnings = await prisma.driverEarning.findMany({
      where,
      orderBy: [{ completedAt: "desc" }, { id: "desc" }],
      take: limit + 1,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      include: {
        driver: {
          select: { id: true, driverId: true, name: true, email: true, vehicle: true, vehiclePlate: true },
        },
        reservation: {
          select: {
            bookingId: true,
            serviceDate: true,
            serviceTime: true,
            pickupLocation: true,
            dropoffLocation: true,
            paymentStatus: true,
            customerHistoryHiddenAt: true,
            total: true,
          },
        },
        payout: { select: { id: true, status: true, method: true, paidAt: true } },
      },
    });

    const hasMore = earnings.length > limit;
    const page = hasMore ? earnings.slice(0, limit) : earnings;
    const nextCursor = hasMore ? page[page.length - 1].id : null;

    // Remittances alongside earnings for "Collect remittances" tab.
    let remittances: any[] = [];
    if (includeRemittances) {
      const remitWhere: Record<string, unknown> = {};
      if (driverId) remitWhere.driverId = driverId;
      remittances = await prisma.driverRemittance.findMany({
        where: remitWhere,
        orderBy: [{ status: "asc" }, { completedAt: "desc" }],
        take: 200,
        include: {
          driver: { select: { id: true, driverId: true, name: true, vehicle: true } },
          reservation: {
            select: { bookingId: true, serviceDate: true, serviceTime: true, pickupLocation: true, total: true },
          },
        },
      });
    }

    // Summary cards (platform-wide + per-driver scope if provided).
    const summaryWhere: Record<string, unknown> = driverId ? { driverId } : {};
    const [pendingAgg, paidAgg, heldAgg, reviewCount, remittanceOwedAgg] = await Promise.all([
      prisma.driverEarning.aggregate({
        where: { ...summaryWhere, status: "PENDING" },
        _sum: { driverNet: true },
        _count: true,
      }),
      prisma.driverEarning.aggregate({
        where: { ...summaryWhere, status: "PAID" },
        _sum: { driverNet: true },
        _count: true,
      }),
      prisma.driverEarning.aggregate({
        where: { ...summaryWhere, status: "HELD" },
        _sum: { driverNet: true },
        _count: true,
      }),
      prisma.driverEarning.count({ where: { ...summaryWhere, needsReview: true } }),
      prisma.driverRemittance.aggregate({
        where: { ...summaryWhere, status: "OWED" },
        _sum: { amountOwed: true },
        _count: true,
      }),
    ]);

    const week = torontoWeekRange();
    const weekAgg = await prisma.driverEarning.aggregate({
      where: {
        ...summaryWhere,
        completedAt: { gte: week.start, lt: week.end },
        status: { in: ["PENDING", "PAID"] },
      },
      _sum: { driverNet: true },
      _count: true,
    });

    return NextResponse.json({
      success: true,
      earnings: page.map((e) => ({
        id: e.id,
        bookingId: e.bookingId,
        driverId: e.driverId,
        mode: e.mode,
        status: e.status,
        holdReason: e.holdReason,
        needsReview: e.needsReview,
        reviewReason: e.reviewReason,
        reviewNotes: e.reviewNotes,
        subtotal: e.subtotal,
        discountAmount: e.discountAmount,
        gratuity: e.gratuity,
        hst: e.hst,
        /** Phase 2 — PAID FareAdjustment total folded into basis (wait, M&G, stops…). */
        fareAdjustmentsTotal: e.fareAdjustmentsTotal || 0,
        serviceBasis: e.serviceBasis,
        commissionPct: e.commissionPct,
        platformFee: e.platformFee,
        driverNet: e.driverNet,
        notes: e.notes,
        payoutId: e.payoutId,
        completedAt: e.completedAt.toISOString(),
        createdAt: e.createdAt.toISOString(),
        driver: e.driver,
        reservation: {
          bookingId: e.reservation?.bookingId || e.bookingId,
          serviceDate: e.reservation?.serviceDate || "",
          serviceTime: e.reservation?.serviceTime || "",
          pickupLocation: e.reservation?.pickupLocation || "",
          dropoffLocation: e.reservation?.dropoffLocation || "",
          paymentStatus: e.reservation?.paymentStatus || null,
          total: e.reservation?.total || 0,
        },
        payout: e.payout
          ? {
              id: e.payout.id,
              status: e.payout.status,
              method: e.payout.method,
              paidAt: e.payout.paidAt ? e.payout.paidAt.toISOString() : null,
            }
          : null,
      })),
      remittances: remittances.map((r) => ({
        id: r.id,
        bookingId: r.bookingId,
        driverId: r.driverId,
        status: r.status,
        subtotal: r.subtotal,
        discountAmount: r.discountAmount,
        gratuity: r.gratuity,
        hst: r.hst,
        serviceBasis: r.serviceBasis,
        commissionPct: r.commissionPct,
        amountOwed: r.amountOwed,
        method: r.method,
        reference: r.reference,
        completedAt: r.completedAt.toISOString(),
        remittedAt: r.remittedAt ? r.remittedAt.toISOString() : null,
        driver: r.driver,
        reservation: {
          bookingId: r.reservation?.bookingId || r.bookingId,
          serviceDate: r.reservation?.serviceDate || "",
          serviceTime: r.reservation?.serviceTime || "",
          pickupLocation: r.reservation?.pickupLocation || "",
          total: r.reservation?.total || 0,
        },
      })),
      summary: {
        pending: { count: pendingAgg._count, total: roundMoney(pendingAgg._sum.driverNet || 0) },
        paid: { count: paidAgg._count, total: roundMoney(paidAgg._sum.driverNet || 0) },
        held: { count: heldAgg._count, total: roundMoney(heldAgg._sum.driverNet || 0) },
        needsReview: { count: reviewCount },
        remittanceOwed: {
          count: remittanceOwedAgg._count,
          total: roundMoney(remittanceOwedAgg._sum.amountOwed || 0),
        },
        thisWeek: {
          count: weekAgg._count,
          total: roundMoney(weekAgg._sum.driverNet || 0),
          rangeStart: week.start.toISOString(),
          rangeEnd: week.end.toISOString(),
          tz: "America/Toronto",
        },
      },
      nextCursor,
    });
  } catch (error) {
    console.error("[driver-earnings GET]", error);
    return NextResponse.json({ success: false, error: "Failed to load earnings" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const auth = await verifyAdminAuth(req);
  if (!auth.authenticated) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const earningId = typeof body.earningId === "string" ? body.earningId.trim() : "";
    if (!earningId) {
      return NextResponse.json({ success: false, error: "earningId required" }, { status: 400 });
    }

    const result = await updateEarningAdmin(earningId, body, auth.actor || "admin");
    if (!result.ok) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, earning: result.earning });
  } catch (error) {
    console.error("[driver-earnings PUT]", error);
    return NextResponse.json({ success: false, error: "Failed to update earning" }, { status: 500 });
  }
}
