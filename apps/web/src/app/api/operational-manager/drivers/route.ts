import { NextRequest, NextResponse } from "next/server";
import { getDrivers } from "@/lib/data-store";
import { verifyOperationalManagerAuth } from "@/lib/operational-manager-auth";

/** Minimal driver fields for assignment dropdown (no sensitive URLs bulk). */
export async function GET(request: NextRequest) {
  const auth = await verifyOperationalManagerAuth(request);
  if (!auth.authenticated) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const drivers = await getDrivers();
    const slim = drivers.map((d) => ({
      id: d.id,
      driverId: d.driverId,
      name: d.name,
      phone: d.phone,
      vehicle: d.vehicle,
      vehiclePlate: d.vehiclePlate,
      status: d.status,
      isActive: d.isActive,
    }));
    return NextResponse.json({ success: true, drivers: slim });
  } catch (e) {
    console.error("Operational manager drivers GET:", e);
    return NextResponse.json({ success: false, error: "Failed to fetch drivers" }, { status: 500 });
  }
}
