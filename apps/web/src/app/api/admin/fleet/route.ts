import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/admin-auth";
import prisma from "@/lib/prisma";

// GET - List all fleet vehicles
export async function GET(request: NextRequest) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authenticated) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const vehicles = await prisma.fleetVehicle.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });

    return NextResponse.json({ success: true, vehicles });
  } catch (error: any) {
    console.error("[Fleet GET] Error:", error?.message);
    return NextResponse.json({ success: false, error: "Failed to fetch fleet" }, { status: 500 });
  }
}

// POST - Create new fleet vehicle
export async function POST(request: NextRequest) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authenticated) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const {
      vehicleId,
      name,
      dropdownName,
      description,
      image,
      category,
      seating,
      luggage,
      hourlyRate,
      pricePerKm,
      isActive = true,
      sortOrder = 0,
    } = body;

    // Validation
    if (!vehicleId || !name || !dropdownName || !category) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
    }

    // Check if vehicleId already exists
    const existing = await prisma.fleetVehicle.findUnique({ where: { vehicleId } });
    if (existing) {
      return NextResponse.json({ success: false, error: "Vehicle ID already exists" }, { status: 400 });
    }

    const vehicle = await prisma.fleetVehicle.create({
      data: {
        vehicleId,
        name,
        dropdownName,
        description: description || "",
        image: image || "",
        category,
        seating: seating || "",
        luggage: luggage || "",
        hourlyRate: parseFloat(hourlyRate) || 0,
        pricePerKm: parseFloat(pricePerKm) || 0,
        isActive,
        sortOrder: parseInt(sortOrder) || 0,
      },
    });

    return NextResponse.json({ success: true, vehicle });
  } catch (error: any) {
    console.error("[Fleet POST] Error:", error?.message);
    return NextResponse.json({ success: false, error: "Failed to create vehicle" }, { status: 500 });
  }
}

// PUT - Update fleet vehicle
export async function PUT(request: NextRequest) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authenticated) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: "Vehicle ID required" }, { status: 400 });
    }

    // Parse numeric fields
    if (updateData.hourlyRate !== undefined) {
      updateData.hourlyRate = parseFloat(updateData.hourlyRate);
    }
    if (updateData.pricePerKm !== undefined) {
      updateData.pricePerKm = parseFloat(updateData.pricePerKm);
    }
    if (updateData.sortOrder !== undefined) {
      updateData.sortOrder = parseInt(updateData.sortOrder);
    }

    const vehicle = await prisma.fleetVehicle.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ success: true, vehicle });
  } catch (error: any) {
    console.error("[Fleet PUT] Error:", error?.message);
    return NextResponse.json({ success: false, error: "Failed to update vehicle" }, { status: 500 });
  }
}

// DELETE - Delete fleet vehicle
export async function DELETE(request: NextRequest) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authenticated) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, error: "Vehicle ID required" }, { status: 400 });
    }

    await prisma.fleetVehicle.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[Fleet DELETE] Error:", error?.message);
    return NextResponse.json({ success: false, error: "Failed to delete vehicle" }, { status: 500 });
  }
}
