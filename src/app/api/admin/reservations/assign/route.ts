import { NextRequest, NextResponse } from "next/server";
import { assignDriverToReservation } from "@/lib/data-store";

export async function POST(request: NextRequest) {
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

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Assign driver error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to assign driver" },
      { status: 500 }
    );
  }
}
