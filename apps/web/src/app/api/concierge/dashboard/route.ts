import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyConciergeToken } from "@/lib/concierge-auth";

export async function GET(req: NextRequest) {
  const auth = await verifyConciergeToken(req);
  if (!auth) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const [activeRequests, completedTrips, pendingCommissions, ratings] = await Promise.all([
    prisma.conciergeRideRequest.count({
      where: {
        conciergeId: auth.id,
        status: { in: ["OPEN", "ASSIGNED", "ON_THE_WAY", "ARRIVED", "IN_TRIP"] },
      },
    }),
    prisma.conciergeRideRequest.count({
      where: { conciergeId: auth.id, status: "COMPLETED" },
    }),
    prisma.commissionConfirmation.count({
      where: {
        ride: { conciergeId: auth.id },
        OR: [{ conciergeClaim: "UNSET" }, { disputeOpen: true }],
      },
    }),
    prisma.conciergeRating.findMany({
      where: { toRole: "DRIVER", ride: { conciergeId: auth.id } },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  const commissionHistory = await prisma.commissionConfirmation.findMany({
    where: { ride: { conciergeId: auth.id }, conciergeClaim: { not: "UNSET" } },
    orderBy: { updatedAt: "desc" },
    take: 30,
    include: {
      ride: {
        select: {
          requestCode: true,
          hotelCommission: true,
          guestName: true,
          status: true,
          completedAt: true,
        },
      },
    },
  });

  return NextResponse.json({
    success: true,
    dashboard: {
      activeRequests,
      completedTrips,
      pendingCommissions,
      commissionHistory,
      driverRatings: ratings,
    },
  });
}
