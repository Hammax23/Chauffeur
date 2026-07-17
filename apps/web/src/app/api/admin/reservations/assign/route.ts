import { NextRequest, NextResponse } from "next/server";
import { assignDriverToReservation } from "@/lib/data-store";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { sendPushNotification } from "@/lib/push-notifications";
import { publishReservationFromDb } from "@/lib/realtime-bus";
import { revokeOffersForBooking } from "@/lib/live-auto";
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

    const result = await assignDriverToReservation(bookingId, driverId);

    if (result.ok) {
      // Live Auto: pull the ride off every other driver's offer list instantly
      await revokeOffersForBooking(bookingId, driverId);
      const { notifyDriverOfManualAssignment } = await import("@/lib/live-auto");
      await notifyDriverOfManualAssignment(bookingId, driverId);
      await publishReservationFromDb(bookingId, "driver_assigned");
    }

    if (!result.ok) {
      if (result.reason === "busy") {
        return NextResponse.json(
          {
            success: false,
            error:
              "This driver is already assigned to another active reservation. Finish or cancel that booking first, or pick another driver.",
          },
          { status: 409 }
        );
      }
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
