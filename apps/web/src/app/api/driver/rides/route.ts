import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import jwt from "jsonwebtoken";
import { listOpenOffersForDriver } from "@/lib/live-auto";

const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret-key";

function getDriverFromToken(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  try {
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; email: string; type: string };
    if (decoded.type !== "driver") return null;
    return decoded;
  } catch {
    return null;
  }
}

function mapAssignedRide(r: {
  id: string;
  bookingId: string;
  status: string;
  driverOnTheWayAt: Date | null;
  driverStopPeriodsJson: string | null;
  completedAt: Date | null;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  serviceType: string;
  vehicle: string;
  passengers: number;
  childSeats: number;
  serviceDate: string;
  serviceTime: string;
  pickupLocation: string;
  stops: string | null;
  dropoffLocation: string;
  distance: string | null;
  duration: string | null;
  total: number;
  createdAt: Date;
}, liveOffer = false) {
  return {
    id: r.id,
    bookingId: r.bookingId,
    status: r.status,
    driverOnTheWayAt: r.driverOnTheWayAt?.toISOString() ?? null,
    driverStopPeriodsJson: r.driverStopPeriodsJson ?? null,
    completedAt: r.completedAt?.toISOString() ?? null,
    customerName: `${r.firstName} ${r.lastName}`,
    phone: r.phone,
    email: r.email,
    serviceType: r.serviceType,
    vehicle: r.vehicle,
    passengers: r.passengers,
    childSeats: r.childSeats,
    serviceDate: r.serviceDate,
    serviceTime: r.serviceTime,
    pickupLocation: r.pickupLocation,
    stops: r.stops || "",
    dropoffLocation: r.dropoffLocation,
    distance: r.distance || "",
    duration: r.duration || "",
    total: r.total,
    createdAt: r.createdAt.toISOString(),
    liveOffer,
  };
}

// GET - Get rides assigned to this driver (+ live open offers for requests tab)
export async function GET(req: NextRequest) {
  try {
    const tokenData = getDriverFromToken(req);
    if (!tokenData) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const tab = searchParams.get("tab") || "requests";

    let whereClause: Record<string, unknown> = { assignedDriverId: tokenData.id };

    if (tab === "requests") {
      whereClause.status = "PENDING";
    } else if (tab === "upcoming") {
      whereClause.status = { in: ["ACCEPTED", "ON THE WAY", "ARRIVED", "CIC", "STOP"] };
    } else if (tab === "completed") {
      whereClause.status = { in: ["DONE", "CANCELLED"] };
    }

    const reservations = await prisma.reservation.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      include: { customer: true },
    });

    const rides = reservations.map((r) => mapAssignedRide(r, false));

    if (tab === "requests") {
      const liveOffers = await listOpenOffersForDriver(tokenData.id);
      const assignedIds = new Set(rides.map((r) => r.bookingId));
      for (const offer of liveOffers) {
        if (assignedIds.has(offer.bookingId)) continue;
        rides.push({
          id: offer.bookingId,
          bookingId: offer.bookingId,
          status: offer.status,
          driverOnTheWayAt: null,
          driverStopPeriodsJson: null,
          completedAt: null,
          customerName: offer.customerName,
          phone: offer.phone,
          email: offer.email,
          serviceType: offer.serviceType,
          vehicle: offer.vehicle,
          passengers: offer.passengers,
          childSeats: offer.childSeats,
          serviceDate: offer.serviceDate,
          serviceTime: offer.serviceTime,
          pickupLocation: offer.pickupLocation,
          stops: offer.stops,
          dropoffLocation: offer.dropoffLocation,
          distance: offer.distance,
          duration: offer.duration,
          total: offer.total,
          createdAt: offer.createdAt,
          liveOffer: true,
        });
      }
      rides.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    return NextResponse.json({ success: true, rides });
  } catch (error) {
    console.error("Driver rides error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch rides" }, { status: 500 });
  }
}
