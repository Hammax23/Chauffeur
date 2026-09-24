import { NextRequest, NextResponse } from "next/server";
import { getReservations, getDrivers } from "@/lib/data-store";
import { verifyAdminAuth } from "@/lib/admin-auth";
import prisma from "@/lib/prisma";

const TZ = "America/Toronto";

function dayKeyInTz(d: Date, timeZone = TZ): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

function shortLabel(isoDay: string): string {
  const d = new Date(`${isoDay}T12:00:00`);
  return d.toLocaleDateString("en-CA", { month: "short", day: "numeric", timeZone: TZ });
}

function parseSubmitted(r: { dateSubmitted?: string }): Date | null {
  if (!r.dateSubmitted) return null;
  const d = new Date(r.dateSubmitted);
  return Number.isNaN(d.getTime()) ? null : d;
}

function shiftDays(from: Date, days: number): Date {
  const d = new Date(from.getTime());
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

export async function GET(request: NextRequest) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authenticated) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const [reservations, drivers, supportOpen, customersCount] = await Promise.all([
      getReservations(),
      getDrivers(),
      prisma.supportTicket
        .count({ where: { status: { in: ["NEW", "IN_PROGRESS"] } } })
        .catch(() => 0),
      prisma.customer.count().catch(() => 0),
    ]);

    const now = new Date();
    const todayKey = dayKeyInTz(now);
    const yesterdayKey = dayKeyInTz(shiftDays(now, -1));
    const days = 14;
    const seriesMap = new Map<string, { bookings: number; revenue: number }>();

    for (let i = days - 1; i >= 0; i--) {
      const key = dayKeyInTz(shiftDays(now, -i));
      seriesMap.set(key, { bookings: 0, revenue: 0 });
    }

    let todayReservations = 0;
    let yesterdayReservations = 0;
    let weekRevenue = 0;
    let prevWeekRevenue = 0;

    const weekAgo = shiftDays(now, -7);
    const twoWeeksAgo = shiftDays(now, -14);

    let unassignedPending = 0;

    for (const r of reservations) {
      const status = r.status || "PENDING";
      const assigned =
        (r as { assignedDriverId?: string | null; assignedDriver?: { id?: string } | null })
          .assignedDriverId ||
        (r as { assignedDriver?: { id?: string } | null }).assignedDriver?.id;
      if (status === "PENDING" && !assigned) unassignedPending += 1;

      const submitted = parseSubmitted(r);
      const total = Number(r.total) || 0;
      if (!submitted) continue;
      const key = dayKeyInTz(submitted);
      const bucket = seriesMap.get(key);
      if (bucket) {
        bucket.bookings += 1;
        bucket.revenue += total;
      }
      if (key === todayKey) todayReservations += 1;
      if (key === yesterdayKey) yesterdayReservations += 1;
      if (submitted >= weekAgo) weekRevenue += total;
      else if (submitted >= twoWeeksAgo) prevWeekRevenue += total;
    }

    const bookingsSeries = Array.from(seriesMap.entries()).map(([date, v]) => ({
      date,
      label: shortLabel(date),
      bookings: v.bookings,
      revenue: Math.round(v.revenue * 100) / 100,
    }));

    const statusCounts: Record<string, number> = {};
    for (const r of reservations) {
      const s = r.status || "PENDING";
      statusCounts[s] = (statusCounts[s] || 0) + 1;
    }

    const statusBreakdown = Object.entries(statusCounts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    const driverBreakdown = [
      {
        name: "Available",
        value: drivers.filter((d) => d.status === "available").length,
        fill: "#22c55e",
      },
      {
        name: "On trip",
        value: drivers.filter((d) => d.status === "on_trip").length,
        fill: "#C9A063",
      },
      {
        name: "Offline",
        value: drivers.filter((d) => d.status === "offline").length,
        fill: "#94a3b8",
      },
    ];

    const activeStatuses = new Set(["ON THE WAY", "ARRIVED", "CIC", "ACCEPTED", "STOP"]);
    const stats = {
      totalReservations: reservations.length,
      pendingReservations: reservations.filter((r) => r.status === "PENDING").length,
      unassignedPending,
      activeTrips: reservations.filter((r) => activeStatuses.has(r.status || "")).length,
      completedTrips: reservations.filter((r) => r.status === "DONE").length,
      totalDrivers: drivers.length,
      availableDrivers: drivers.filter((d) => d.status === "available").length,
      totalRevenue: reservations.reduce((sum, r) => sum + (r.total || 0), 0),
      todayReservations,
      yesterdayReservations,
      weekRevenue: Math.round(weekRevenue * 100) / 100,
      prevWeekRevenue: Math.round(prevWeekRevenue * 100) / 100,
      openSupportTickets: supportOpen,
      appCustomers: customersCount,
    };

    const recentReservations = reservations.slice(0, 8).map((r) => ({
      bookingId: r.bookingId,
      firstName: r.firstName,
      lastName: r.lastName,
      status: r.status,
      serviceDate: r.serviceDate,
      vehicle: r.vehicle,
      total: r.total || 0,
      pickupLocation: r.pickupLocation,
    }));

    return NextResponse.json({
      success: true,
      stats,
      recentReservations,
      charts: {
        bookingsSeries,
        statusBreakdown,
        driverBreakdown,
      },
      timezone: TZ,
      generatedAt: now.toISOString(),
    });
  } catch (error: unknown) {
    const err = error as { message?: string; stack?: string };
    console.error("[Dashboard] ERROR:", err?.message || error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch dashboard data",
        actualError: err?.message || String(error),
        dbUrl: process.env.DATABASE_URL ? "SET" : "NOT SET",
      },
      { status: 500 }
    );
  }
}
