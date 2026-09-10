import { NextRequest, NextResponse } from "next/server";
import {
  assignDriverToReservation,
  type AssignmentChannel,
} from "@/lib/data-store";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { publishReservationFromDb } from "@/lib/realtime-bus";
import { revokeOffersForBooking } from "@/lib/live-auto";

function parseChannel(raw: unknown): AssignmentChannel {
  return raw === "web" ? "web" : "app";
}

export async function POST(request: NextRequest) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authenticated) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { bookingId, driverId } = body;
    const channel = parseChannel(body?.channel);

    if (!bookingId || !driverId) {
      return NextResponse.json(
        { success: false, error: "Missing bookingId or driverId" },
        { status: 400 }
      );
    }

    const result = await assignDriverToReservation(bookingId, driverId, { channel });

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

    try {
      await revokeOffersForBooking(bookingId, driverId);
    } catch (err) {
      console.error("[assign] revokeOffersForBooking", err);
    }

    try {
      await publishReservationFromDb(bookingId, "driver_assigned");

      if (channel === "web") {
        void import("@/lib/web-dispatch")
          .then(({ notifyWebDispatchAssignment }) =>
            notifyWebDispatchAssignment(bookingId, driverId)
          )
          .catch((err) => console.error("[assign] web-dispatch", err));
      } else {
        const { notifyDriverOfManualAssignment } = await import("@/lib/live-auto");
        const { notifyDriverReservationAssigned } = await import("@/lib/driver-push");
        await notifyDriverOfManualAssignment(bookingId, driverId);
        void notifyDriverReservationAssigned(bookingId, driverId).catch((err) =>
          console.error("[assign] driver push", err)
        );
        void import("@/lib/driver-sms")
          .then(({ notifyDriverAssignmentSms }) => notifyDriverAssignmentSms(bookingId, driverId))
          .catch((err) => console.error("[assign] driver sms", err));
        void import("@/lib/customer-push")
          .then(({ notifyCustomerDriverAssigned }) => notifyCustomerDriverAssigned(bookingId))
          .catch((err) => console.error("[assign] customer notify", err));
      }
    } catch (err) {
      console.error("[assign] post-assign notify", err);
    }

    return NextResponse.json({ success: true, channel });
  } catch (error: unknown) {
    console.error("Assign driver error:", error);
    const detail =
      error instanceof Error && process.env.NODE_ENV === "development"
        ? error.message.slice(0, 240)
        : "Failed to assign driver";
    return NextResponse.json({ success: false, error: detail }, { status: 500 });
  }
}
