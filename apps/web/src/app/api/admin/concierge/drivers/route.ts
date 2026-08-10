// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyAdminAuth } from "@/lib/admin-auth";

export async function GET(request: NextRequest) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authenticated) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const profiles = await prisma.conciergeDriverProfile.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      driver: {
        select: {
          id: true,
          driverId: true,
          name: true,
          email: true,
          phone: true,
          vehicle: true,
          vehiclePlate: true,
          rating: true,
          isActive: true,
        },
      },
    },
  });

  return NextResponse.json({ success: true, drivers: profiles });
}

export async function POST(request: NextRequest) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authenticated) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const driverId = String(body.driverId || "");
    if (!driverId) {
      return NextResponse.json({ success: false, error: "driverId required" }, { status: 400 });
    }

    const existing = await prisma.conciergeDriverProfile.findUnique({ where: { driverId } });
    if (existing) {
      return NextResponse.json({ success: false, error: "Driver already enrolled" }, { status: 400 });
    }

    const profile = await prisma.conciergeDriverProfile.create({
      data: {
        driverId,
        membershipStatus: body.membershipStatus === "EXPIRED" ? "EXPIRED" : "ACTIVE",
        membershipExpiresAt: body.membershipExpiresAt
          ? new Date(body.membershipExpiresAt)
          : null,
        vehicleClass: ["SEDAN", "SUV", "CADILLAC"].includes(body.vehicleClass)
          ? body.vehicleClass
          : "SEDAN",
        vehicleLabel: String(body.vehicleLabel || ""),
        availability: "OFFLINE",
      },
      include: {
        driver: {
          select: { id: true, driverId: true, name: true, email: true, phone: true },
        },
      },
    });

    return NextResponse.json({ success: true, driver: profile });
  } catch (e) {
    console.error("[admin concierge drivers POST]", e);
    return NextResponse.json({ success: false, error: "Failed to enroll driver" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authenticated) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const id = String(body.id || "");
    if (!id) {
      return NextResponse.json({ success: false, error: "Id required" }, { status: 400 });
    }

    const profile = await prisma.conciergeDriverProfile.update({
      where: { id },
      data: {
        ...(body.membershipStatus != null
          ? { membershipStatus: String(body.membershipStatus) }
          : {}),
        ...(body.membershipExpiresAt !== undefined
          ? {
              membershipExpiresAt: body.membershipExpiresAt
                ? new Date(body.membershipExpiresAt)
                : null,
            }
          : {}),
        ...(body.vehicleClass != null ? { vehicleClass: String(body.vehicleClass) } : {}),
        ...(body.vehicleLabel != null ? { vehicleLabel: String(body.vehicleLabel) } : {}),
        ...(body.availability != null && body.availability !== "BUSY"
          ? { availability: String(body.availability) }
          : {}),
        ...(body.referralEarnings != null
          ? { referralEarnings: Number(body.referralEarnings) || 0 }
          : {}),
      },
      include: {
        driver: {
          select: { id: true, driverId: true, name: true, email: true, phone: true },
        },
      },
    });

    return NextResponse.json({ success: true, driver: profile });
  } catch (e) {
    console.error("[admin concierge drivers PUT]", e);
    return NextResponse.json({ success: false, error: "Failed to update" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authenticated) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const id = new URL(request.url).searchParams.get("id");
  if (!id) {
    return NextResponse.json({ success: false, error: "Id required" }, { status: 400 });
  }

  const activeTrip = await prisma.conciergeRideRequest.findFirst({
    where: {
      assignedDriverId: id,
      status: { in: ["ASSIGNED", "ON_THE_WAY", "ARRIVED", "IN_TRIP"] },
    },
  });
  if (activeTrip) {
    return NextResponse.json(
      { success: false, error: "Driver has an active hotel trip — finish or cancel it first" },
      { status: 409 }
    );
  }

  await prisma.conciergeDriverProfile.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
