import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCustomerFromRequest } from "@/lib/customer-auth";

/**
 * Live chauffeur location for an in-progress booking owned by this customer.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const tokenData = getCustomerFromRequest(req);
    if (!tokenData) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id: bookingId } = await params;
    if (!bookingId) {
      return NextResponse.json({ success: false, error: "Missing booking id" }, { status: 400 });
    }

    const reservation = await prisma.reservation.findFirst({
      where: { bookingId, customerId: tokenData.id },
      select: {
        status: true,
        assignedDriver: {
          select: {
            name: true,
            lastLatitude: true,
            lastLongitude: true,
            lastLocationUpdatedAt: true,
          },
        },
      },
    });

    if (!reservation) {
      return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    }

    const driver = reservation.assignedDriver;
    if (
      !driver ||
      driver.lastLatitude == null ||
      driver.lastLongitude == null
    ) {
      return NextResponse.json({
        success: true,
        location: null,
        status: reservation.status,
      });
    }

    return NextResponse.json({
      success: true,
      status: reservation.status,
      location: {
        lat: driver.lastLatitude,
        lng: driver.lastLongitude,
        updatedAt: driver.lastLocationUpdatedAt?.toISOString() ?? null,
        driverName: driver.name,
      },
    });
  } catch (error) {
    console.error("[customer driver-location]", error);
    return NextResponse.json({ success: false, error: "Failed to load location" }, { status: 500 });
  }
}
