// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { roundMoney, writeAudit } from "@/lib/driver-pay";

/** Valid `DriverAdjustment.reason` tags. Matches schema comment. */
const REASONS = new Set([
  "BONUS",
  "DEDUCTION",
  "CLAWBACK",
  "OFF_PLATFORM_PAY",
  "CORRECTION",
  "OTHER",
]);

/**
 * GET /api/admin/driver-adjustments
 *   ?driverId=…   — scope to one driver
 *   ?limit=…      — default 100, max 500
 *   ?cursor=…     — id cursor for pagination
 * Returns rows + per-driver running totals.
 */
export async function GET(req: NextRequest) {
  const auth = await verifyAdminAuth(req);
  if (!auth.authenticated) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const url = new URL(req.url);
    const driverId = url.searchParams.get("driverId")?.trim() || undefined;
    const reason = url.searchParams.get("reason")?.trim().toUpperCase() || undefined;
    const q = url.searchParams.get("q")?.trim() || "";
    const limit = Math.min(500, Math.max(1, Number(url.searchParams.get("limit")) || 100));
    const cursor = url.searchParams.get("cursor") || undefined;

    const where: Record<string, unknown> = {};
    if (driverId) where.driverId = driverId;
    if (reason && REASONS.has(reason)) where.reason = reason;
    if (q) {
      where.OR = [
        { notes: { contains: q, mode: "insensitive" } },
        { driver: { name: { contains: q, mode: "insensitive" } } },
        { driver: { email: { contains: q, mode: "insensitive" } } },
        { driver: { driverId: { contains: q, mode: "insensitive" } } },
      ];
    }

    const rows = await prisma.driverAdjustment.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: limit + 1,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      include: {
        driver: {
          select: { id: true, driverId: true, name: true, email: true, vehicle: true },
        },
        payout: { select: { id: true, status: true, paidAt: true, amount: true } },
      },
    });

    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;
    const nextCursor = hasMore ? page[page.length - 1].id : null;

    // Lifetime totals per driver — one aggregate per driver matched in this list (bounded).
    const scopedDriverIds = Array.from(new Set(page.map((r) => r.driverId)));
    const totalsRaw = scopedDriverIds.length
      ? await prisma.driverAdjustment.groupBy({
          by: ["driverId"],
          where: { driverId: { in: scopedDriverIds } },
          _sum: { amount: true },
          _count: true,
        })
      : [];
    const totalsMap = new Map(
      totalsRaw.map((t) => [
        t.driverId,
        { count: t._count, total: roundMoney(t._sum.amount || 0) },
      ])
    );

    // Platform summary (optionally scoped to driverId).
    const scopedWhere = driverId ? { driverId } : {};
    const [posAgg, negAgg] = await Promise.all([
      prisma.driverAdjustment.aggregate({
        where: { ...scopedWhere, amount: { gt: 0 } },
        _sum: { amount: true },
        _count: true,
      }),
      prisma.driverAdjustment.aggregate({
        where: { ...scopedWhere, amount: { lt: 0 } },
        _sum: { amount: true },
        _count: true,
      }),
    ]);

    return NextResponse.json({
      success: true,
      adjustments: page.map((r) => ({
        id: r.id,
        driverId: r.driverId,
        amount: r.amount,
        reason: r.reason,
        notes: r.notes,
        earningId: r.earningId,
        payoutId: r.payoutId,
        createdAt: r.createdAt.toISOString(),
        driver: r.driver,
        payout: r.payout
          ? {
              id: r.payout.id,
              status: r.payout.status,
              amount: r.payout.amount,
              paidAt: r.payout.paidAt ? r.payout.paidAt.toISOString() : null,
            }
          : null,
      })),
      driverTotals: Array.from(totalsMap.entries()).map(([id, v]) => ({
        driverId: id,
        count: v.count,
        total: v.total,
      })),
      summary: {
        positive: { count: posAgg._count, total: roundMoney(posAgg._sum.amount || 0) },
        negative: { count: negAgg._count, total: roundMoney(negAgg._sum.amount || 0) },
        net: roundMoney((posAgg._sum.amount || 0) + (negAgg._sum.amount || 0)),
      },
      nextCursor,
    });
  } catch (error) {
    console.error("[admin driver-adjustments GET]", error);
    return NextResponse.json(
      { success: false, error: "Failed to load adjustments" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/driver-adjustments
 * Body: { driverId, amount (signed), reason, notes?, earningId?, payoutId? }
 *
 * Creates a one-off bonus / deduction / clawback. Positive amounts mean "pay driver
 * more on their next payout"; negative means "deduct". Writes a full audit entry.
 */
export async function POST(req: NextRequest) {
  const auth = await verifyAdminAuth(req);
  if (!auth.authenticated) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const driverId = typeof body.driverId === "string" ? body.driverId.trim() : "";
    const amount = Number(body.amount);
    const reasonRaw = typeof body.reason === "string" ? body.reason.trim().toUpperCase() : "";
    const notes = typeof body.notes === "string" ? body.notes.slice(0, 500) : null;
    const earningId = typeof body.earningId === "string" && body.earningId.trim() ? body.earningId.trim() : null;
    const payoutId = typeof body.payoutId === "string" && body.payoutId.trim() ? body.payoutId.trim() : null;

    if (!driverId) {
      return NextResponse.json({ success: false, error: "driverId required" }, { status: 400 });
    }
    if (!Number.isFinite(amount) || amount === 0) {
      return NextResponse.json(
        { success: false, error: "amount must be a non-zero number" },
        { status: 400 }
      );
    }
    if (Math.abs(amount) > 10000) {
      return NextResponse.json(
        { success: false, error: "amount is too large — split into multiple adjustments" },
        { status: 400 }
      );
    }
    if (!reasonRaw || !REASONS.has(reasonRaw)) {
      return NextResponse.json(
        {
          success: false,
          error: `reason must be one of: ${Array.from(REASONS).join(", ")}`,
        },
        { status: 400 }
      );
    }

    // Sanity — driver / earning / payout belong together.
    const driver = await prisma.driver.findUnique({
      where: { id: driverId },
      select: { id: true, name: true, email: true },
    });
    if (!driver) {
      return NextResponse.json({ success: false, error: "Driver not found" }, { status: 404 });
    }

    if (earningId) {
      const e = await prisma.driverEarning.findUnique({
        where: { id: earningId },
        select: { id: true, driverId: true },
      });
      if (!e || e.driverId !== driverId) {
        return NextResponse.json(
          { success: false, error: "earningId does not belong to this driver" },
          { status: 400 }
        );
      }
    }
    if (payoutId) {
      const p = await prisma.driverPayout.findUnique({
        where: { id: payoutId },
        select: { id: true, driverId: true, status: true },
      });
      if (!p || p.driverId !== driverId) {
        return NextResponse.json(
          { success: false, error: "payoutId does not belong to this driver" },
          { status: 400 }
        );
      }
    }

    const row = await prisma.driverAdjustment.create({
      data: {
        driverId,
        amount: roundMoney(amount),
        reason: reasonRaw,
        notes,
        earningId,
        payoutId,
      },
    });

    await writeAudit({
      action: "adjustment_created",
      entityType: "ADJUSTMENT",
      entityId: row.id,
      details: {
        driverId,
        amount: roundMoney(amount),
        reason: reasonRaw,
        earningId,
        payoutId,
      },
      actor: auth.actor || "admin",
    });

    return NextResponse.json({ success: true, adjustment: row });
  } catch (error) {
    console.error("[admin driver-adjustments POST]", error);
    return NextResponse.json(
      { success: false, error: "Failed to create adjustment" },
      { status: 500 }
    );
  }
}

/** DELETE  — only when not yet attached to a PAID payout. */
export async function DELETE(req: NextRequest) {
  const auth = await verifyAdminAuth(req);
  if (!auth.authenticated) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id")?.trim();
    if (!id) {
      return NextResponse.json({ success: false, error: "id required" }, { status: 400 });
    }

    const row = await prisma.driverAdjustment.findUnique({
      where: { id },
      include: { payout: { select: { status: true } } },
    });
    if (!row) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    if (row.payout && row.payout.status === "PAID") {
      return NextResponse.json(
        { success: false, error: "Cannot delete — already attached to a PAID payout. Create a reversal adjustment instead." },
        { status: 409 }
      );
    }

    await prisma.driverAdjustment.delete({ where: { id } });
    await writeAudit({
      action: "adjustment_deleted",
      entityType: "ADJUSTMENT",
      entityId: id,
      details: { driverId: row.driverId, amount: row.amount, reason: row.reason },
      actor: auth.actor || "admin",
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[admin driver-adjustments DELETE]", error);
    return NextResponse.json({ success: false, error: "Failed to delete" }, { status: 500 });
  }
}
