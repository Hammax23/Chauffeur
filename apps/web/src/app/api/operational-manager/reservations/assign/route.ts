import { NextRequest, NextResponse } from "next/server";
import { assignDriverToReservation } from "@/lib/data-store";
import { verifyOperationalManagerAuth } from "@/lib/operational-manager-auth";
import { sendPushNotification } from "@/lib/push-notifications";
import { publishReservationFromDb } from "@/lib/realtime-bus";
import prisma from "@/lib/prisma";

export async function POST(request: NextRequest) {
  const auth = await verifyOperationalManagerAuth(request);
  if (!auth.authenticated) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const bookingId = typeof body?.bookingId === "string" ? body.bookingId.trim() : "";
    const driverId = typeof body?.driverId === "string" ? body.driverId.trim() : "";

    if (!bookingId || !driverId) {
      return NextResponse.json(
        { success: false, error: "Missing bookingId or driverId" },
        { status: 400 }
      );
    }

    const result = await assignDriverToReservation(bookingId, driverId);

    if (result.ok) {
      await publishReservationFromDb(bookingId, "driver_assigned");
    }

    if (!result.ok) {
      if (result.reason === "busy") {
        return NextResponse.json(
          {
            success: false,
            error:
              "This driver is already assigned to another active reservation. Choose another driver, or mark the other booking as Done/Cancelled first.",
          },
          { status: 409 }
        );
      }
      return NextResponse.json({ success: false, error: "Failed to assign driver" }, { status: 500 });
    }

    try {
      const driver = await prisma.driver.findUnique({
        where: { id: driverId },
        select: { pushToken: true, name: true },
      });

      const reservation = await prisma.reservation.findUnique({
        where: { bookingId },
        select: {
          bookingId: true,
          pickupLocation: true,
          dropoffLocation: true,
          serviceDate: true,
          serviceTime: true,
        },
      });

      if (driver?.pushToken && reservation) {
        await sendPushNotification(
          driver.pushToken,
          "🚗 New Ride Request",
          `New ride from ${reservation.pickupLocation} on ${reservation.serviceDate}`,
          {
            type: "new_assignment",
            bookingId: reservation.bookingId,
            screen: "DriverDashboard",
          }
        );
      }
    } catch (notifError) {
      console.error("Failed to send push notification:", notifError);
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("Operational manager assign error:", e);
    return NextResponse.json({ success: false, error: "Failed to assign driver" }, { status: 500 });
  }
}
