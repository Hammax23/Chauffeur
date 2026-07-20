import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import jwt from "jsonwebtoken";
import { publishReservationFromDb } from "@/lib/realtime-bus";
import { claimLiveOffer, declineLiveOffer } from "@/lib/live-auto";

const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret-key";

type StopPeriod = { start: string; end?: string };

function parseStopPeriods(json: string | null | undefined): StopPeriod[] {
  if (!json) return [];
  try {
    const p = JSON.parse(json) as unknown;
    return Array.isArray(p) ? p : [];
  } catch {
    return [];
  }
}

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

async function findRideForDriver(bookingId: string, driverId: string) {
  const assigned = await prisma.reservation.findFirst({
    where: { bookingId, assignedDriverId: driverId },
  });
  if (assigned) return assigned;

  const openOffer = await prisma.rideOffer.findFirst({
    where: { bookingId, driverId, status: "OPEN" },
  });
  if (!openOffer) return null;

  return prisma.reservation.findFirst({
    where: { bookingId, status: "PENDING", assignedDriverId: null },
  });
}

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
    const reservation = await findRideForDriver(bookingId, tokenData.id);

    if (!reservation) {
      return NextResponse.json({ success: false, error: "Ride not found" }, { status: 404 });
    }

    const liveOffer =
      !reservation.assignedDriverId &&
      !!(await prisma.rideOffer.findFirst({
        where: { bookingId, driverId: tokenData.id, status: "OPEN" },
      }));

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
        driverOnTheWayAt: reservation.driverOnTheWayAt?.toISOString() ?? null,
        driverStopPeriodsJson: reservation.driverStopPeriodsJson ?? null,
        completedAt: reservation.completedAt?.toISOString() ?? null,
        liveOffer,
      },
    });
  } catch (error) {
    console.error("Driver ride detail error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch ride" }, { status: 500 });
  }
}

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
    const { status, action } = body;

    // Reject / decline (preferred over DELETE — some networks block DELETE)
    if (action === "reject" || status === "REJECTED") {
      const result = await declineLiveOffer(bookingId, tokenData.id);
      if (!result.ok) {
        return NextResponse.json(
          { success: false, error: "Ride not found or already unavailable" },
          { status: 404 }
        );
      }
      return NextResponse.json({ success: true, message: "Ride rejected" });
    }

    const validStatuses = ["ACCEPTED", "ON THE WAY", "ARRIVED", "CIC", "STOP", "DONE"];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { success: false, error: `Invalid status. Must be one of: ${validStatuses.join(", ")}` },
        { status: 400 }
      );
    }

    if (status === "ACCEPTED") {
      const claim = await claimLiveOffer(bookingId, tokenData.id);
      if (!claim.ok) {
        if (claim.reason === "taken") {
          return NextResponse.json(
            { success: false, error: "This ride was just accepted by another driver." },
            { status: 409 }
          );
        }
        if (claim.reason === "busy") {
          return NextResponse.json(
            { success: false, error: "You already have an active ride." },
            { status: 409 }
          );
        }
        return NextResponse.json({ success: false, error: "Ride not found" }, { status: 404 });
      }
      return NextResponse.json({ success: true, message: "Status updated to ACCEPTED" });
    }

    const reservation = await prisma.reservation.findFirst({
      where: { bookingId, assignedDriverId: tokenData.id },
    });

    if (!reservation) {
      return NextResponse.json({ success: false, error: "Ride not found" }, { status: 404 });
    }

    const now = new Date();
    const updateData: Record<string, unknown> = {
      status,
      statusUpdatedAt: now,
      driverResponse: "ACCEPTED",
      driverRespondedAt: now,
    };

    const periods = parseStopPeriods(reservation.driverStopPeriodsJson);

    if (status === "ON THE WAY" && !reservation.driverOnTheWayAt) {
      updateData.driverOnTheWayAt = now;
    }

    if (status === "STOP") {
      if (reservation.status !== "CIC") {
        return NextResponse.json(
          { success: false, error: "Stop is only available after Customer In Car" },
          { status: 400 }
        );
      }
      const open = periods.find((x) => !x.end);
      if (open) {
        return NextResponse.json(
          { success: false, error: "Already at a stop — tap Continue first" },
          { status: 400 }
        );
      }
      periods.push({ start: now.toISOString() });
      updateData.driverStopPeriodsJson = JSON.stringify(periods);
    }

    if (status === "CIC" && reservation.status === "STOP") {
      const last = periods[periods.length - 1];
      if (!last || last.end) {
        return NextResponse.json(
          { success: false, error: "No active stop to continue from" },
          { status: 400 }
        );
      }
      last.end = now.toISOString();
      updateData.driverStopPeriodsJson = JSON.stringify(periods);
    }

    if (status === "DONE") {
      const doneAt = now;
      updateData.completedAt = doneAt;
      const last = periods[periods.length - 1];
      if (last && !last.end) {
        last.end = doneAt.toISOString();
        updateData.driverStopPeriodsJson = JSON.stringify(periods);
      }
      await prisma.driver.update({
        where: { id: tokenData.id },
        data: { totalTrips: { increment: 1 } },
      });
    }

    await prisma.reservation.update({
      where: { id: reservation.id },
      data: updateData,
    });

    await publishReservationFromDb(bookingId, "status_changed");

    return NextResponse.json({ success: true, message: `Status updated to ${status}` });
  } catch (error) {
    console.error("Update ride status error:", error);
    return NextResponse.json({ success: false, error: "Failed to update status" }, { status: 500 });
  }
}

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
    const result = await declineLiveOffer(bookingId, tokenData.id);
    if (!result.ok) {
      return NextResponse.json({ success: false, error: "Ride not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Ride rejected" });
  } catch (error) {
    console.error("Reject ride error:", error);
    return NextResponse.json({ success: false, error: "Failed to reject ride" }, { status: 500 });
  }
}
