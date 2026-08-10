// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyAdminAuth } from "@/lib/admin-auth";

export async function GET(request: NextRequest) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authenticated) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const status = new URL(request.url).searchParams.get("status");
  const trips = await prisma.conciergeRideRequest.findMany({
    where: status ? { status } : undefined,
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      hotel: { select: { name: true } },
      concierge: { select: { name: true, email: true } },
      assignedDriverProfile: {
        include: { driver: { select: { name: true, phone: true } } },
      },
      commission: true,
    },
  });

  return NextResponse.json({ success: true, trips });
}
