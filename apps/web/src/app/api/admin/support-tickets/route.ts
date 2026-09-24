import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyAdminAuth } from "@/lib/admin-auth";

export async function GET(request: NextRequest) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authenticated) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status")?.trim().toUpperCase() || "";
    const q = searchParams.get("q")?.trim() || "";

    const where: Record<string, unknown> = {};
    if (status && status !== "ALL") {
      where.status = status;
    }
    if (q) {
      where.OR = [
        { ticketId: { contains: q, mode: "insensitive" } },
        { type: { contains: q, mode: "insensitive" } },
        { subject: { contains: q, mode: "insensitive" } },
        { message: { contains: q, mode: "insensitive" } },
        { customer: { email: { contains: q, mode: "insensitive" } } },
        { customer: { firstName: { contains: q, mode: "insensitive" } } },
        { customer: { lastName: { contains: q, mode: "insensitive" } } },
        { customer: { phone: { contains: q, mode: "insensitive" } } },
      ];
    }

    const [tickets, counts] = await Promise.all([
      prisma.supportTicket.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: 200,
        include: {
          customer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
            },
          },
        },
      }),
      prisma.supportTicket.groupBy({
        by: ["status"],
        _count: { _all: true },
      }),
    ]);

    const summary = {
      total: counts.reduce((n, c) => n + c._count._all, 0),
      new: counts.find((c) => c.status === "NEW")?._count._all || 0,
      inProgress: counts.find((c) => c.status === "IN_PROGRESS")?._count._all || 0,
      resolved: counts.find((c) => c.status === "RESOLVED")?._count._all || 0,
      closed: counts.find((c) => c.status === "CLOSED")?._count._all || 0,
    };

    return NextResponse.json({ success: true, tickets, summary });
  } catch (error) {
    console.error("[admin/support-tickets]", error);
    return NextResponse.json(
      { success: false, error: "Failed to load support tickets" },
      { status: 500 }
    );
  }
}
