import { NextRequest, NextResponse } from "next/server";
import { getReservations, getDrivers } from "@/lib/data-store";
import { verifyAdminAuth } from "@/lib/admin-auth";

export async function GET(request: NextRequest) {
  // Verify admin authentication
  const auth = await verifyAdminAuth(request);
  if (!auth.authenticated) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    console.log("[Dashboard] DATABASE_URL exists:", !!process.env.DATABASE_URL);
    console.log("[Dashboard] DATABASE_URL:", process.env.DATABASE_URL?.substring(0, 30) + "...");
    console.log("[Dashboard] Fetching reservations...");
    const reservations = await getReservations();
    console.log("[Dashboard] Got reservations:", reservations.length);
    
    console.log("[Dashboard] Fetching drivers...");
    const drivers = await getDrivers();
    console.log("[Dashboard] Got drivers:", drivers.length);

    const today = new Date().toDateString();
    const todayReservations = reservations.filter(r => {
      try {
        return new Date(r.dateSubmitted).toDateString() === today;
      } catch {
        return false;
      }
    }).length;

    const stats = {
      totalReservations: reservations.length,
      pendingReservations: reservations.filter(r => r.status === "PENDING").length,
      activeTrips: reservations.filter(r => ["ON THE WAY", "ARRIVED", "CIC"].includes(r.status)).length,
      completedTrips: reservations.filter(r => r.status === "DONE").length,
      totalDrivers: drivers.length,
      availableDrivers: drivers.filter(d => d.status === "available").length,
      totalRevenue: reservations.reduce((sum, r) => sum + (r.total || 0), 0),
      todayReservations,
    };

    const recentReservations = reservations.slice(0, 10).map(r => ({
      bookingId: r.bookingId,
      firstName: r.firstName,
      lastName: r.lastName,
      status: r.status,
      serviceDate: r.serviceDate,
      vehicle: r.vehicle,
      total: r.total || 0,
    }));

    return NextResponse.json({ success: true, stats, recentReservations });
  } catch (error: any) {
    console.error("[Dashboard] ERROR:", error?.message || error);
    console.error("[Dashboard] Stack:", error?.stack);
    return NextResponse.json({ 
      success: false, 
      error: "Failed to fetch dashboard data",
      debug: process.env.NODE_ENV !== "production" ? error?.message : undefined
    }, { status: 500 });
  }
}
