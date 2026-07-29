import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyDriverToken } from "@/lib/driver-auth";

export async function GET(req: NextRequest) {
  const auth = await verifyDriverToken(req);
  if (!auth) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const profile = await prisma.conciergeDriverProfile.findUnique({
    where: { driverId: auth.id },
  });

  if (!profile) {
    return NextResponse.json({
      success: true,
      enrolled: false,
      earnings: {
        completedTrips: 0,
        grossFare: 0,
        platformFees: 0,
        netEarnings: 0,
        hotelCommissions: 0,
        referralEarnings: 0,
      },
    });
  }

  const completed = await prisma.conciergeRideRequest.findMany({
    where: { assignedDriverId: profile.id, status: "COMPLETED" },
    select: { fare: true, platformFee: true, hotelCommission: true },
  });

  const grossFare = completed.reduce((s, r) => s + r.fare, 0);
  const platformFees = completed.reduce((s, r) => s + r.platformFee, 0);
  const hotelCommissions = completed.reduce((s, r) => s + r.hotelCommission, 0);

  return NextResponse.json({
    success: true,
    enrolled: true,
    profile: {
      membershipStatus: profile.membershipStatus,
      membershipExpiresAt: profile.membershipExpiresAt,
      availability: profile.availability,
      vehicleClass: profile.vehicleClass,
      referralEarnings: profile.referralEarnings,
    },
    earnings: {
      completedTrips: completed.length,
      grossFare,
      platformFees,
      netEarnings: grossFare - platformFees,
      hotelCommissions,
      referralEarnings: profile.referralEarnings,
    },
  });
}
