import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyDriverToken } from "@/lib/driver-auth";
import { publishDriverLocationEvent } from "@/lib/realtime-bus";
import {
  CUSTOMER_LOCATION_ELIGIBLE_STATUSES,
  isCustomerDriverLocationUnlocked,
} from "@/lib/customer-driver-location";

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

    // Fan out GPS only for bookings whose customer location window is open.
    try {
      const active = await prisma.reservation.findMany({
        where: {
          assignedDriverId: tokenData.id,
          status: { in: [...CUSTOMER_LOCATION_ELIGIBLE_STATUSES] },
        },
        select: {
          bookingId: true,
          status: true,
          serviceDate: true,
          serviceTime: true,
          driverResponse: true,
        },
        take: 5,
        orderBy: { statusUpdatedAt: "desc" },
      });

      for (const row of active) {
        if (
          !isCustomerDriverLocationUnlocked({
            status: row.status,
            serviceDate: row.serviceDate,
            serviceTime: row.serviceTime,
            driverResponse: row.driverResponse,
          })
        ) {
          continue;
        }
        publishDriverLocationEvent({
          bookingId: row.bookingId,
          latitude,
          longitude,
          accuracy,
          heading,
          speed,
        });
      }
    } catch (err) {
      console.error("[driver-location] SSE publish failed:", err);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Driver location update error:", error);
    return NextResponse.json({ success: false, error: "Failed to update location" }, { status: 500 });
  }
}
