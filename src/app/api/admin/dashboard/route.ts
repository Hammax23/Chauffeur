import { NextResponse } from "next/server";
import { getReservations, getDrivers } from "@/lib/data-store";

export async function GET() {
  try {
    const reservations = await getReservations();
    const drivers = await getDrivers();

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
    console.error("Dashboard error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch dashboard data" }, { status: 500 });
  }
}
