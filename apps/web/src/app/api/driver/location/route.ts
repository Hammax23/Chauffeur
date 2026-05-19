import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyDriverToken } from "@/lib/driver-auth";

export async function POST(request: NextRequest) {
  try {
    const tokenData = await verifyDriverToken(request);
    if (!tokenData) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const latitude = typeof body?.latitude === "number" ? body.latitude : null;
    const longitude = typeof body?.longitude === "number" ? body.longitude : null;

    if (latitude === null || longitude === null) {
      return NextResponse.json(
        { success: false, error: "latitude and longitude are required" },
        { status: 400 }
      );
    }

    const accuracy = typeof body?.accuracy === "number" ? body.accuracy : null;
    const heading = typeof body?.heading === "number" ? body.heading : null;
    const speed = typeof body?.speed === "number" ? body.speed : null;

    await prisma.driver.update({
      where: { id: tokenData.id },
      data: {
        lastLatitude: latitude,
        lastLongitude: longitude,
        lastLocationAccuracy: accuracy,
        lastLocationHeading: heading,
        lastLocationSpeed: speed,
        lastLocationUpdatedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Driver location update error:", error);
    return NextResponse.json({ success: false, error: "Failed to update location" }, { status: 500 });
  }
}

