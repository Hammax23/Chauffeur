import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  getActiveCustomerFromRequest,
  customerAuthFailurePayload,
} from "@/lib/customer-auth";
import { evaluateCustomerLocationSharing, CUSTOMER_LOCATION_LEAD_MINUTES } from "@/lib/customer-driver-location";

/**
 * Live chauffeur GPS for a booking owned by this customer.
 * Gated: accepted driver + (T-10min before pickup OR status ARRIVED/CIC/STOP).
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getActiveCustomerFromRequest(req);
    if (!auth.ok) {
      const fail = customerAuthFailurePayload(auth.reason);
      return NextResponse.json(fail.body, { status: fail.status });
    }

    const { id: bookingId } = await params;
    if (!bookingId) {
      return NextResponse.json({ success: false, error: "Missing booking id" }, { status: 400 });
    }

    const reservation = await prisma.reservation.findFirst({
      where: { bookingId, customerId: auth.customer.id },
      select: {
        status: true,
        driverResponse: true,
        serviceDate: true,
        serviceTime: true,
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

    const sharing = evaluateCustomerLocationSharing({
      status: reservation.status,
      serviceDate: reservation.serviceDate,
      serviceTime: reservation.serviceTime,
      driverResponse: reservation.driverResponse,
    });

    const driver = reservation.assignedDriver;
    const coordsReady =
      !!driver &&
      driver.lastLatitude != null &&
      driver.lastLongitude != null;

    if (!sharing.unlocked || !coordsReady) {
      return NextResponse.json({
        success: true,
        status: reservation.status,
        location: null,
        locationSharing: {
          unlocked: sharing.unlocked,
          unlockAt: sharing.unlockAt,
          serviceAt: sharing.serviceAt,
          reason: sharing.reason,
          leadMinutes: CUSTOMER_LOCATION_LEAD_MINUTES,
        },
      });
    }

    return NextResponse.json({
      success: true,
      status: reservation.status,
      location: {
        lat: driver!.lastLatitude,
        lng: driver!.lastLongitude,
        updatedAt: driver!.lastLocationUpdatedAt?.toISOString() ?? null,
        driverName: driver!.name,
      },
      locationSharing: {
        unlocked: true,
        unlockAt: sharing.unlockAt,
        serviceAt: sharing.serviceAt,
        reason: sharing.reason,
        leadMinutes: CUSTOMER_LOCATION_LEAD_MINUTES,
      },
    });
  } catch (error) {
    console.error("[customer driver-location]", error);
    return NextResponse.json({ success: false, error: "Failed to load location" }, { status: 500 });
  }
}
