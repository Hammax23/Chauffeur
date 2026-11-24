import { NextRequest, NextResponse } from "next/server";
import { deleteReservation } from "@/lib/data-store";
import { verifyAdminAuth } from "@/lib/admin-auth";

const MAX_BULK = 100;

/** Admin / Billing Assistant: delete many reservations in one request. */
export async function POST(request: NextRequest) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authenticated) {
    return NextResponse.json(
      { success: false, error: "Unauthorized", code: auth.code },
      { status: auth.code === "FORBIDDEN_ROLE" ? 403 : 401 }
    );
  }

  try {
    const body = await request.json();
    const raw = Array.isArray(body?.bookingIds) ? body.bookingIds : [];
    const bookingIds = [
      ...new Set(
        raw
          .map((id: unknown) => String(id || "").trim())
          .filter((id: string) => id.length > 0)
      ),
    ].slice(0, MAX_BULK);

    if (!bookingIds.length) {
      return NextResponse.json(
        { success: false, error: "Select at least one reservation." },
        { status: 400 }
      );
    }

    const { revokeOffersForBooking } = await import("@/lib/live-auto");
    const deleted: string[] = [];
    const failed: string[] = [];

    for (const bookingId of bookingIds) {
      try {
        const ok = await deleteReservation(bookingId);
        if (!ok) {
          failed.push(bookingId);
          continue;
        }
        try {
          await revokeOffersForBooking(bookingId);
        } catch (err) {
          console.error("[bulk-delete] revokeOffers", bookingId, err);
        }
        try {
          const { softHideThreadForParticipants } = await import("@/lib/trip-chat");
          await softHideThreadForParticipants(bookingId);
        } catch (chatErr) {
          console.error("[bulk-delete] soft-hide chat", bookingId, chatErr);
        }
        deleted.push(bookingId);
      } catch (err) {
        console.error("[bulk-delete] failed", bookingId, err);
        failed.push(bookingId);
      }
    }

    return NextResponse.json({
      success: failed.length === 0,
      deleted,
      failed,
      deletedCount: deleted.length,
      failedCount: failed.length,
    });
  } catch (error) {
    console.error("Bulk delete reservations error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete reservations" },
      { status: 500 }
    );
  }
}
