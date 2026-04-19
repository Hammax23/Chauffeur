import { NextRequest, NextResponse } from "next/server";
import { getReservations } from "@/lib/data-store";
import { verifyAdminAuth } from "@/lib/admin-auth";

export async function GET(request: NextRequest) {
  // Verify admin authentication
  const auth = await verifyAdminAuth(request);
  if (!auth.authenticated) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const reservations = await getReservations();
    return NextResponse.json({ success: true, reservations });
  } catch (error: any) {
    console.error("Admin reservations error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch reservations" }, { status: 500 });
  }
}
