import { NextRequest, NextResponse } from "next/server";
import { getReservationById, updateReservationStatus } from "@/lib/data-store";

// Check if link is expired (5 minutes after completion)
function isLinkExpired(completedAt: Date | null): boolean {
  if (!completedAt) return false;
  const expiryTime = new Date(completedAt.getTime() + 5 * 60 * 1000); // 5 minutes
  return new Date() > expiryTime;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const bookingId = searchParams.get("bookingId");

    if (!bookingId) {
      return NextResponse.json({ success: false, error: "Missing bookingId" }, { status: 400 });
    }

    const reservation = await getReservationById(bookingId);
    
    if (!reservation) {
      return NextResponse.json({ success: false, error: "Booking not found" }, { status: 404 });
    }

    // Check if link has expired (5 min after DONE)
    if (isLinkExpired(reservation.completedAt)) {
      return NextResponse.json({ success: false, expired: true, error: "This link has expired" }, { status: 410 });
    }

    // Include assigned driver details if available
    const driverInfo = reservation.assignedDriver ? {
      chauffeurName: reservation.assignedDriver.name,
      chauffeurPhone: reservation.assignedDriver.phone,
      chauffeurVehicle: reservation.assignedDriver.vehicle,
      chauffeurPlate: reservation.assignedDriver.vehiclePlate,
      chauffeurPhoto: reservation.assignedDriver.photo,
    } : null;

    // Calculate if status can still be edited (5 minute window)
    const statusUpdatedAt = reservation.statusUpdatedAt;
    let canEditStatus = true;
    let editTimeRemaining = 0;
    
    if (statusUpdatedAt) {
      const fiveMinutesMs = 5 * 60 * 1000;
      const timeSinceUpdate = Date.now() - new Date(statusUpdatedAt).getTime();
      canEditStatus = timeSinceUpdate < fiveMinutesMs;
      editTimeRemaining = Math.max(0, Math.ceil((fiveMinutesMs - timeSinceUpdate) / 1000));
    }

    return NextResponse.json({
      success: true,
      status: reservation.status,
      firstName: reservation.firstName,
      lastName: reservation.lastName,
      phone: reservation.phone,
      vehicle: reservation.vehicle,
      serviceDate: reservation.serviceDate,
      serviceTime: reservation.serviceTime,
      pickupLocation: reservation.pickupLocation,
      dropoffLocation: reservation.dropoffLocation,
      statusUpdatedAt: statusUpdatedAt?.toISOString() || null,
      canEditStatus,
      editTimeRemaining,
      ...driverInfo,
    });
  } catch (error: any) {
    console.error("Driver status GET error:", error);
    return NextResponse.json({ success: false, error: "Failed to get status" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { bookingId, status } = body;

    if (!bookingId || !status) {
      return NextResponse.json({ success: false, error: "Missing bookingId or status" }, { status: 400 });
    }

    const validStatuses = ["PENDING", "ON THE WAY", "ARRIVED", "CIC", "DONE"];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ success: false, error: "Invalid status" }, { status: 400 });
    }

    const success = await updateReservationStatus(bookingId, status);
    
    if (!success) {
      return NextResponse.json({ success: false, error: "Booking not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Driver status POST error:", error);
    return NextResponse.json({ success: false, error: "Failed to update status" }, { status: 500 });
  }
}
