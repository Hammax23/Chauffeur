import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import jwt from "jsonwebtoken";
import { getAppJwtSecret } from "@/lib/app-jwt-secret";
import { isMembershipActive } from "@/lib/concierge-rules";

function getDriverFromToken(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  try {
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, getAppJwtSecret()) as { id: string; email: string; type: string };
    if (decoded.type !== "driver") return null;
    return decoded;
  } catch {
    return null;
  }
}

// GET - Get driver profile
export async function GET(req: NextRequest) {
  try {
    const tokenData = getDriverFromToken(req);
    if (!tokenData) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const driver = await prisma.driver.findUnique({
      where: { id: tokenData.id },
      select: {
        id: true,
        driverId: true,
        name: true,
        email: true,
        phone: true,
        vehicle: true,
        vehiclePlate: true,
        vehicleCode: true,
        status: true,
        isActive: true,
        photo: true,
        rating: true,
        totalTrips: true,
        conciergeProfile: {
          select: {
            id: true,
            membershipStatus: true,
            membershipExpiresAt: true,
          },
        },
      },
    });

    if (!driver) {
      return NextResponse.json({ success: false, error: "Driver not found" }, { status: 404 });
    }

    const { conciergeProfile, ...rest } = driver;
    return NextResponse.json({
      success: true,
      driver: {
        ...rest,
        conciergeEnrolled: !!(
          conciergeProfile &&
          isMembershipActive(
            conciergeProfile.membershipStatus,
            conciergeProfile.membershipExpiresAt
          )
        ),
      },
    });
  } catch (error) {
    console.error("Driver profile error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch profile" }, { status: 500 });
  }
}
