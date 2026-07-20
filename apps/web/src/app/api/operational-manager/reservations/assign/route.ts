import { NextRequest, NextResponse } from "next/server";
import { assignDriverToReservation } from "@/lib/data-store";
import { verifyOperationalManagerAuth } from "@/lib/operational-manager-auth";
import { publishReservationFromDb } from "@/lib/realtime-bus";

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

    const { revokeOffersForBooking, notifyDriverOfManualAssignment } = await import("@/lib/live-auto");
    await revokeOffersForBooking(bookingId, driverId);

    const { notifyDriverReservationAssigned } = await import("@/lib/driver-push");
    await Promise.all([
      notifyDriverOfManualAssignment(bookingId, driverId),
      publishReservationFromDb(bookingId, "driver_assigned"),
    ]);
    void notifyDriverReservationAssigned(bookingId, driverId).catch((err) =>
      console.error("[ops-assign] driver push", err)
    );

    void import("@/lib/customer-push")
      .then(({ notifyCustomerDriverAssigned }) => notifyCustomerDriverAssigned(bookingId))
      .catch((err) => console.error("[ops-assign] customer notify", err));

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("Operational manager assign error:", e);
    return NextResponse.json({ success: false, error: "Failed to assign driver" }, { status: 500 });
  }
}
