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

    await revokeOffersForBooking(bookingId, driverId);

    // Driver-facing notify first (SSE + push) — don't wait on customer push
    const { notifyDriverOfManualAssignment } = await import("@/lib/live-auto");
    const { notifyDriverReservationAssigned } = await import("@/lib/driver-push");
    await Promise.all([
      notifyDriverOfManualAssignment(bookingId, driverId),
      notifyDriverReservationAssigned(bookingId, driverId),
      publishReservationFromDb(bookingId, "driver_assigned"),
    ]);

    void import("@/lib/customer-push")
      .then(({ notifyCustomerDriverAssigned }) => notifyCustomerDriverAssigned(bookingId))
      .catch((err) => console.error("[assign] customer notify", err));

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("Assign driver error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to assign driver" },
      { status: 500 }
    );
  }
}
