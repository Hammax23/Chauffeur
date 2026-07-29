import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyAdminAuth } from "@/lib/admin-auth";

export async function GET(request: NextRequest) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authenticated) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const [
    activeDrivers,
    onlineDrivers,
    activeHotels,
    totalTrips,
    completed,
    openDisputes,
  ] = await Promise.all([
    prisma.conciergeDriverProfile.count(),
    prisma.conciergeDriverProfile.count({ where: { availability: "ONLINE" } }),
    prisma.hotel.count({ where: { isActive: true } }),
    prisma.conciergeRideRequest.count(),
    prisma.conciergeRideRequest.findMany({
      where: { status: "COMPLETED" },
      select: { fare: true, platformFee: true },
    }),
    prisma.commissionConfirmation.count({ where: { disputeOpen: true } }),
  ]);

  const totalRevenue = completed.reduce((s, r) => s + r.fare, 0);
  const platformRevenue = completed.reduce((s, r) => s + r.platformFee, 0);

  const recentTrips = await prisma.conciergeRideRequest.findMany({
    orderBy: { createdAt: "desc" },
    take: 10,
    include: {
      hotel: { select: { name: true } },
      concierge: { select: { name: true } },
      assignedDriverProfile: {
        include: { driver: { select: { name: true } } },
      },
    },
  });

  return NextResponse.json({
    success: true,
    stats: {
      activeDrivers,
      onlineDrivers,
      activeHotels,
      totalTrips,
      totalRevenue,
      platformRevenue,
      outstandingCommissionDisputes: openDisputes,
    },
    recentTrips,
  });
}
