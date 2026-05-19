import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyAdminAuth } from "@/lib/admin-auth";

export async function GET(request: NextRequest) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authenticated) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const drivers = await prisma.driver.findMany({
      orderBy: [{ lastLocationUpdatedAt: "desc" }, { createdAt: "desc" }],
      select: {
        id: true,
        driverId: true,
        name: true,
        email: true,
        phone: true,
        vehicle: true,
        vehiclePlate: true,
        status: true,
        isActive: true,
        photo: true,
        lastLatitude: true,
        lastLongitude: true,
        lastLocationAccuracy: true,
        lastLocationHeading: true,
        lastLocationSpeed: true,
        lastLocationUpdatedAt: true,
      },
    });

    return NextResponse.json({ success: true, drivers });
  } catch (error: unknown) {
    console.error("Get driver locations error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch driver locations" }, { status: 500 });
  }
}

