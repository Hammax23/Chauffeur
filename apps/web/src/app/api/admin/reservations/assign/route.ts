import { NextRequest, NextResponse } from "next/server";
import { assignDriverToReservation } from "@/lib/data-store";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { publishReservationFromDb } from "@/lib/realtime-bus";
import { revokeOffersForBooking } from "@/lib/live-auto";

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
      await revokeOffersForBooking(bookingId, driverId);
      const { notifyDriverOfManualAssignment } = await import("@/lib/live-auto");
      await notifyDriverOfManualAssignment(bookingId, driverId);
      await publishReservationFromDb(bookingId, "driver_assigned");
      const { notifyCustomerDriverAssigned } = await import("@/lib/customer-push");
      await notifyCustomerDriverAssigned(bookingId);
      const { notifyDriverReservationAssigned } = await import("@/lib/driver-push");
      await notifyDriverReservationAssigned(bookingId, driverId);
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

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Assign driver error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to assign driver" },
      { status: 500 }
    );
  }
}
