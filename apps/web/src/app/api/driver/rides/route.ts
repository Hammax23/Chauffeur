import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import jwt from "jsonwebtoken";

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

// GET - Get rides assigned to this driver
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
      // New ride requests: assigned to driver but still PENDING
      whereClause.status = "PENDING";
    } else if (tab === "upcoming") {
      // Upcoming rides: accepted (ON THE WAY, ARRIVED, CIC)
      whereClause.status = { in: ["ON THE WAY", "ARRIVED", "CIC"] };
    } else if (tab === "completed") {
      whereClause.status = { in: ["DONE", "CANCELLED"] };
    }

    const reservations = await prisma.reservation.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      include: { customer: true },
    });

    const rides = reservations.map((r: typeof reservations[number]) => ({
      id: r.id,
      bookingId: r.bookingId,
      status: r.status,
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
    }));

    return NextResponse.json({ success: true, rides });
  } catch (error) {
    console.error("Driver rides error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch rides" }, { status: 500 });
  }
}
