import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret-key";

function getCustomerFromToken(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  try {
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; email: string; type: string };
    if (decoded.type !== "customer") return null;
    return decoded;
  } catch {
    return null;
  }
}

// GET - Get single reservation details
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const tokenData = getCustomerFromToken(req);
    if (!tokenData) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const reservation = await prisma.reservation.findFirst({
      where: { bookingId: id, customerId: tokenData.id },
      include: { assignedDriver: true },
    });

    if (!reservation) {
      return NextResponse.json({ success: false, error: "Reservation not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      reservation: {
        id: reservation.id,
        bookingId: reservation.bookingId,
        status: reservation.status,
        firstName: reservation.firstName,
        lastName: reservation.lastName,
        email: reservation.email,
        phone: reservation.phone,
        serviceType: reservation.serviceType,
        vehicle: reservation.vehicle,
        passengers: reservation.passengers,
        childSeats: reservation.childSeats,
        etr407: reservation.etr407,
        serviceDate: reservation.serviceDate,
        serviceTime: reservation.serviceTime,
        pickupLocation: reservation.pickupLocation,
        stops: reservation.stops || "",
        dropoffLocation: reservation.dropoffLocation,
        distance: reservation.distance || "",
        duration: reservation.duration || "",
        airline: reservation.airline || "",
        flightNumber: reservation.flightNumber || "",
        rideFare: reservation.rideFare,
        stopCharge: reservation.stopCharge,
        childSeatCharge: reservation.childSeatCharge,
        subtotal: reservation.subtotal,
        hst: reservation.hst,
        gratuity: reservation.gratuity,
        total: reservation.total,
        paymentStatus: reservation.paymentStatus || "PENDING",
        specialRequirements: reservation.specialRequirements || "",
        statusUpdatedAt: reservation.statusUpdatedAt?.toISOString() || null,
        completedAt: reservation.completedAt?.toISOString() || null,
        createdAt: reservation.createdAt.toISOString(),
        driver: reservation.assignedDriver
          ? {
              name: reservation.assignedDriver.name,
              phone: reservation.assignedDriver.phone,
              photo: reservation.assignedDriver.photo,
              vehicle: reservation.assignedDriver.vehicle,
              vehiclePlate: reservation.assignedDriver.vehiclePlate,
              rating: reservation.assignedDriver.rating,
            }
          : null,
      },
    });
  } catch (error) {
    console.error("Reservation fetch error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch reservation" }, { status: 500 });
  }
}

// DELETE - Cancel reservation (only if PENDING)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const tokenData = getCustomerFromToken(req);
    if (!tokenData) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const reservation = await prisma.reservation.findFirst({
      where: { bookingId: id, customerId: tokenData.id },
    });

    if (!reservation) {
      return NextResponse.json({ success: false, error: "Reservation not found" }, { status: 404 });
    }

    if (reservation.status !== "PENDING") {
      return NextResponse.json(
        { success: false, error: "Only pending reservations can be cancelled" },
        { status: 400 }
      );
    }

    await prisma.reservation.update({
      where: { id: reservation.id },
      data: { status: "CANCELLED" },
    });

    return NextResponse.json({ success: true, message: "Reservation cancelled successfully" });
  } catch (error) {
    console.error("Cancel reservation error:", error);
    return NextResponse.json({ success: false, error: "Failed to cancel reservation" }, { status: 500 });
  }
}
