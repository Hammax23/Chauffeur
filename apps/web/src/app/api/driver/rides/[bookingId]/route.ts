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

// GET - Get single ride details for driver
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  try {
    const tokenData = getDriverFromToken(req);
    if (!tokenData) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { bookingId } = await params;

    const reservation = await prisma.reservation.findFirst({
      where: { bookingId, assignedDriverId: tokenData.id },
    });

    if (!reservation) {
      return NextResponse.json({ success: false, error: "Ride not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      ride: {
        id: reservation.id,
        bookingId: reservation.bookingId,
        status: reservation.status,
        customerName: `${reservation.firstName} ${reservation.lastName}`,
        phone: reservation.phone,
        email: reservation.email,
        serviceType: reservation.serviceType,
        vehicle: reservation.vehicle,
        passengers: reservation.passengers,
        childSeats: reservation.childSeats,
        serviceDate: reservation.serviceDate,
        serviceTime: reservation.serviceTime,
        pickupLocation: reservation.pickupLocation,
        stops: reservation.stops || "",
        dropoffLocation: reservation.dropoffLocation,
        distance: reservation.distance || "",
        duration: reservation.duration || "",
        total: reservation.total,
        createdAt: reservation.createdAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("Driver ride detail error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch ride" }, { status: 500 });
  }
}

// PATCH - Update ride status (driver controls: ON THE WAY -> ARRIVED -> CIC -> DONE)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  try {
    const tokenData = getDriverFromToken(req);
    if (!tokenData) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { bookingId } = await params;
    const body = await req.json();
    const { status } = body;

    const validStatuses = ["ON THE WAY", "ARRIVED", "CIC", "DONE"];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { success: false, error: `Invalid status. Must be one of: ${validStatuses.join(", ")}` },
        { status: 400 }
      );
    }

    const reservation = await prisma.reservation.findFirst({
      where: { bookingId, assignedDriverId: tokenData.id },
    });

    if (!reservation) {
      return NextResponse.json({ success: false, error: "Ride not found" }, { status: 404 });
    }

    const updateData: { status: string; statusUpdatedAt: Date; completedAt?: Date } = {
      status,
      statusUpdatedAt: new Date(),
    };

    if (status === "DONE") {
      updateData.completedAt = new Date();
      // Increment driver's total trips
      await prisma.driver.update({
        where: { id: tokenData.id },
        data: { totalTrips: { increment: 1 } },
      });
    }

    await prisma.reservation.update({
      where: { id: reservation.id },
      data: updateData,
    });

    return NextResponse.json({ success: true, message: `Status updated to ${status}` });
  } catch (error) {
    console.error("Update ride status error:", error);
    return NextResponse.json({ success: false, error: "Failed to update status" }, { status: 500 });
  }
}

// DELETE - Reject/cancel a ride request (only PENDING rides)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  try {
    const tokenData = getDriverFromToken(req);
    if (!tokenData) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { bookingId } = await params;

    const reservation = await prisma.reservation.findFirst({
      where: { bookingId, assignedDriverId: tokenData.id },
    });

    if (!reservation) {
      return NextResponse.json({ success: false, error: "Ride not found" }, { status: 404 });
    }

    // Unassign driver from reservation (go back to unassigned PENDING)
    await prisma.reservation.update({
      where: { id: reservation.id },
      data: { assignedDriverId: null },
    });

    return NextResponse.json({ success: true, message: "Ride rejected" });
  } catch (error) {
    console.error("Reject ride error:", error);
    return NextResponse.json({ success: false, error: "Failed to reject ride" }, { status: 500 });
  }
}
