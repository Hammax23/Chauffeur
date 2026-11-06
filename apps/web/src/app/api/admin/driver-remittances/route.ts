// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { markRemittanceRemitted, roundMoney } from "@/lib/driver-pay";

export async function GET(req: NextRequest) {
  const auth = await verifyAdminAuth(req);
  if (!auth.authenticated) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const url = new URL(req.url);
    const driverId = url.searchParams.get("driverId")?.trim() || undefined;
    const status = url.searchParams.get("status")?.trim().toUpperCase() || undefined;
    const q = url.searchParams.get("q")?.trim() || "";
    const limit = Math.min(200, Math.max(1, Number(url.searchParams.get("limit")) || 100));
    const cursor = url.searchParams.get("cursor") || undefined;

    const where: Record<string, unknown> = {};
    if (driverId) where.driverId = driverId;
    if (status && ["OWED", "REMITTED", "WAIVED"].includes(status)) where.status = status;
    if (q) {
      where.OR = [
        { bookingId: { contains: q, mode: "insensitive" } },
        { reference: { contains: q, mode: "insensitive" } },
        { driver: { name: { contains: q, mode: "insensitive" } } },
      ];
    }

    const rows = await prisma.driverRemittance.findMany({
      where,
      orderBy: [{ status: "asc" }, { completedAt: "desc" }],
      take: limit + 1,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      include: {
        driver: { select: { id: true, driverId: true, name: true, email: true, vehicle: true } },
        reservation: {
          select: { bookingId: true, serviceDate: true, serviceTime: true, pickupLocation: true, dropoffLocation: true, total: true, paymentStatus: true },
        },
      },
    });

    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;
    const nextCursor = hasMore ? page[page.length - 1].id : null;

    const [owedAgg, remittedAgg] = await Promise.all([
      prisma.driverRemittance.aggregate({
        where: { ...(driverId ? { driverId } : {}), status: "OWED" },
        _sum: { amountOwed: true },
        _count: true,
      }),
      prisma.driverRemittance.aggregate({
        where: { ...(driverId ? { driverId } : {}), status: "REMITTED" },
        _sum: { amountOwed: true },
        _count: true,
      }),
    ]);

    return NextResponse.json({
      success: true,
      remittances: page.map((r) => ({
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
        notes: r.notes,
        completedAt: r.completedAt.toISOString(),
        remittedAt: r.remittedAt ? r.remittedAt.toISOString() : null,
        waivedAt: r.waivedAt ? r.waivedAt.toISOString() : null,
        waivedReason: r.waivedReason,
        driver: r.driver,
        reservation: r.reservation,
      })),
      summary: {
        owed: { count: owedAgg._count, total: roundMoney(owedAgg._sum.amountOwed || 0) },
        remitted: { count: remittedAgg._count, total: roundMoney(remittedAgg._sum.amountOwed || 0) },
      },
      nextCursor,
    });
  } catch (error) {
    console.error("[driver-remittances GET]", error);
    return NextResponse.json({ success: false, error: "Failed to load remittances" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const auth = await verifyAdminAuth(req);
  if (!auth.authenticated) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const remittanceId = typeof body.remittanceId === "string" ? body.remittanceId.trim() : "";
    if (!remittanceId) {
      return NextResponse.json({ success: false, error: "remittanceId required" }, { status: 400 });
    }

    const result = await markRemittanceRemitted({
      remittanceId,
      action: body.action === "waive" ? "waive" : "remitted",
      method: typeof body.method === "string" ? body.method : undefined,
      reference: typeof body.reference === "string" ? body.reference : undefined,
      notes: typeof body.notes === "string" ? body.notes : undefined,
      waivedReason: typeof body.waivedReason === "string" ? body.waivedReason : undefined,
      actor: auth.actor || "admin",
    });

    if (!result.ok) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, status: result.status });
  } catch (error) {
    console.error("[driver-remittances PUT]", error);
    return NextResponse.json({ success: false, error: "Failed to update remittance" }, { status: 500 });
  }
}
