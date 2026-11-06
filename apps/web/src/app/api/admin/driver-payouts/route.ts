// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyAdminAuth } from "@/lib/admin-auth";
import {
  cancelPayoutBatch,
  createPayoutBatch,
  markPayoutPaid,
  roundMoney,
} from "@/lib/driver-pay";

export async function GET(req: NextRequest) {
  const auth = await verifyAdminAuth(req);
  if (!auth.authenticated) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const url = new URL(req.url);
    const driverId = url.searchParams.get("driverId")?.trim() || undefined;
    const status = url.searchParams.get("status")?.trim().toUpperCase() || undefined;
    const limit = Math.min(200, Math.max(1, Number(url.searchParams.get("limit")) || 100));
    const cursor = url.searchParams.get("cursor") || undefined;

    const where: Record<string, unknown> = {};
    if (driverId) where.driverId = driverId;
    if (status && ["DRAFT", "PAID", "CANCELLED"].includes(status)) where.status = status;

    const rows = await prisma.driverPayout.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: limit + 1,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      include: {
        driver: { select: { id: true, driverId: true, name: true, email: true, vehicle: true } },
        earnings: {
          select: {
            id: true,
            bookingId: true,
            driverNet: true,
            commissionPct: true,
            platformFee: true,
            completedAt: true,
            needsReview: true,
            mode: true,
          },
          orderBy: { completedAt: "desc" },
        },
      },
    });

    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;
    const nextCursor = hasMore ? page[page.length - 1].id : null;

    const [draftAgg, paidAgg] = await Promise.all([
      prisma.driverPayout.aggregate({
        where: { ...(driverId ? { driverId } : {}), status: "DRAFT" },
        _sum: { amount: true },
        _count: true,
      }),
      prisma.driverPayout.aggregate({
        where: { ...(driverId ? { driverId } : {}), status: "PAID" },
        _sum: { amount: true },
        _count: true,
      }),
    ]);

    // Per-driver "ready to pay" preview so admin can one-click a batch.
    const readyRaw = await prisma.driverEarning.groupBy({
      by: ["driverId"],
      where: { status: "PENDING", payoutId: null, needsReview: false },
      _sum: { driverNet: true },
      _count: true,
    });
    const readyDriverIds = readyRaw.map((r) => r.driverId);
    const readyDrivers = readyDriverIds.length
      ? await prisma.driver.findMany({
          where: { id: { in: readyDriverIds } },
          select: { id: true, driverId: true, name: true, email: true, vehicle: true },
        })
      : [];
    const readyDriverMap = new Map(readyDrivers.map((d) => [d.id, d]));
    const ready = readyRaw.map((r) => ({
      driverId: r.driverId,
      driver: readyDriverMap.get(r.driverId) || null,
      count: r._count,
      total: roundMoney(r._sum.driverNet || 0),
    }));

    return NextResponse.json({
      success: true,
      payouts: page.map((p) => ({
        id: p.id,
        driverId: p.driverId,
        amount: p.amount,
        method: p.method,
        reference: p.reference,
        status: p.status,
        notes: p.notes,
        idempotencyKey: p.idempotencyKey,
        paidAt: p.paidAt ? p.paidAt.toISOString() : null,
        cancelledAt: p.cancelledAt ? p.cancelledAt.toISOString() : null,
        cancelledReason: p.cancelledReason,
        periodStart: p.periodStart ? p.periodStart.toISOString() : null,
        periodEnd: p.periodEnd ? p.periodEnd.toISOString() : null,
        createdAt: p.createdAt.toISOString(),
        driver: p.driver,
        earnings: p.earnings.map((e) => ({
          id: e.id,
          bookingId: e.bookingId,
          driverNet: e.driverNet,
          commissionPct: e.commissionPct,
          platformFee: e.platformFee,
          needsReview: e.needsReview,
          mode: e.mode,
          completedAt: e.completedAt.toISOString(),
        })),
      })),
      ready,
      summary: {
        draft: { count: draftAgg._count, total: roundMoney(draftAgg._sum.amount || 0) },
        paid: { count: paidAgg._count, total: roundMoney(paidAgg._sum.amount || 0) },
      },
      nextCursor,
    });
  } catch (error) {
    console.error("[driver-payouts GET]", error);
    return NextResponse.json({ success: false, error: "Failed to load payouts" }, { status: 500 });
  }
}

/** Create a DRAFT batch (action=create) OR mark paid (action=markPaid) OR cancel (action=cancel). */
export async function POST(req: NextRequest) {
  const auth = await verifyAdminAuth(req);
  if (!auth.authenticated) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const actor = auth.actor || "admin";
    const action = String(body.action || "create").toLowerCase();

    if (action === "markpaid" || action === "mark_paid") {
      const payoutId = typeof body.payoutId === "string" ? body.payoutId.trim() : "";
      if (!payoutId) {
        return NextResponse.json({ success: false, error: "payoutId required" }, { status: 400 });
      }
      const expectedAmount = Number(body.expectedAmount);
      if (!Number.isFinite(expectedAmount)) {
        return NextResponse.json(
          { success: false, error: "expectedAmount (numeric) required" },
          { status: 400 }
        );
      }
      const result = await markPayoutPaid({
        payoutId,
        expectedAmount,
        idempotencyKey: typeof body.idempotencyKey === "string" ? body.idempotencyKey : undefined,
        method: typeof body.method === "string" ? body.method : undefined,
        reference: typeof body.reference === "string" ? body.reference : undefined,
        notes: typeof body.notes === "string" ? body.notes : undefined,
        viaConnect: body.viaConnect === true,
        actor,
      });
      if (!result.ok) {
        const httpStatus =
          result.code === "AMOUNT_MISMATCH"
            ? 409
            : result.code === "ALREADY_PAID" || result.code === "DUPLICATE_KEY"
              ? 409
              : result.code === "NOT_FOUND"
                ? 404
                : 400;
        return NextResponse.json({ success: false, error: result.error, code: result.code }, { status: httpStatus });
      }
      return NextResponse.json({ success: true, ...result });
    }

    if (action === "cancel") {
      const payoutId = typeof body.payoutId === "string" ? body.payoutId.trim() : "";
      if (!payoutId) {
        return NextResponse.json({ success: false, error: "payoutId required" }, { status: 400 });
      }
      const result = await cancelPayoutBatch({
        payoutId,
        reason: typeof body.reason === "string" ? body.reason : undefined,
        actor,
      });
      if (!result.ok) {
        return NextResponse.json({ success: false, error: result.error }, { status: 400 });
      }
      return NextResponse.json({ success: true, restored: result.restored });
    }

    // Default: create batch.
    const driverId = typeof body.driverId === "string" ? body.driverId.trim() : "";
    if (!driverId) {
      return NextResponse.json({ success: false, error: "driverId required" }, { status: 400 });
    }

    const result = await createPayoutBatch({
      driverId,
      method: typeof body.method === "string" ? body.method : undefined,
      reference: typeof body.reference === "string" ? body.reference : undefined,
      notes: typeof body.notes === "string" ? body.notes : undefined,
      periodStart: body.periodStart ? new Date(body.periodStart) : null,
      periodEnd: body.periodEnd ? new Date(body.periodEnd) : null,
      earningIds: Array.isArray(body.earningIds) ? body.earningIds : undefined,
      actor,
    });

    if (!result.ok) {
      const httpStatus = result.code === "BATCH_CONTENTS_CHANGED" ? 409 : 400;
      return NextResponse.json(
        { success: false, error: result.error, code: result.code },
        { status: httpStatus }
      );
    }

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error("[driver-payouts POST]", error);
    return NextResponse.json({ success: false, error: "Failed to process payout" }, { status: 500 });
  }
}
