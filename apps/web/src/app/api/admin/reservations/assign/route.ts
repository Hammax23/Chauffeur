import { NextRequest, NextResponse } from "next/server";
import { assignDriverToReservation } from "@/lib/data-store";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { sendPushNotification } from "@/lib/push-notifications";
import prisma from "@/lib/prisma";

export async function POST(request: NextRequest) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authenticated) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { bookingId, driverId } = body;

    if (!bookingId || !driverId) {
      return NextResponse.json(
        { success: false, error: "Missing bookingId or driverId" },
        { status: 400 }
      );
    }

    const success = await assignDriverToReservation(bookingId, driverId);

    if (!success) {
      return NextResponse.json(
        { success: false, error: "Failed to assign driver" },
        { status: 500 }
      );
    }

    // Send push notification to driver
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
      // Don't fail the assignment if notification fails
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Assign driver error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to assign driver" },
      { status: 500 }
    );
  }
}
