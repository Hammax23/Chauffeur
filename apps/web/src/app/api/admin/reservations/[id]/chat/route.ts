import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { listMessagesForBooking } from "@/lib/trip-chat";

/** Admin read-only transcript for a reservation chat (by bookingId). */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authenticated) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id: bookingId } = await params;
    const data = await listMessagesForBooking(bookingId);
    return NextResponse.json({ success: true, ...data });
  } catch (error) {
    if (error instanceof Error && error.message === "NOT_FOUND") {
      return NextResponse.json({ success: false, error: "Reservation not found" }, { status: 404 });
    }
    console.error("Admin chat GET error:", error);
    return NextResponse.json({ success: false, error: "Failed to load chat" }, { status: 500 });
  }
}
