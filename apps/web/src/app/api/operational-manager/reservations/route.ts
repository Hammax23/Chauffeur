import { NextRequest, NextResponse } from "next/server";
import { getReservations } from "@/lib/data-store";
import { verifyOperationalManagerAuth } from "@/lib/operational-manager-auth";

export async function GET(request: NextRequest) {
  const auth = await verifyOperationalManagerAuth(request);
  if (!auth.authenticated) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const reservations = await getReservations();
    return NextResponse.json({ success: true, reservations });
  } catch (e) {
    console.error("Operational manager reservations GET:", e);
    return NextResponse.json({ success: false, error: "Failed to fetch reservations" }, { status: 500 });
  }
}
