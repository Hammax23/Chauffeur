import { NextResponse } from "next/server";
import { getReservations } from "@/lib/data-store";

export async function GET() {
  try {
    const reservations = await getReservations();
    return NextResponse.json({ success: true, reservations });
  } catch (error: any) {
    console.error("Admin reservations error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch reservations" }, { status: 500 });
  }
}
