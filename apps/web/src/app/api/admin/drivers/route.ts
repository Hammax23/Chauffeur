import { NextRequest, NextResponse } from "next/server";
import { getDrivers, addDriver } from "@/lib/data-store";
import { verifyAdminAuth } from "@/lib/admin-auth";
import bcrypt from "bcryptjs";
import crypto from "crypto";

export async function GET(request: NextRequest) {
  // Verify admin authentication
  const auth = await verifyAdminAuth(request);
  if (!auth.authenticated) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const drivers = await getDrivers();
    return NextResponse.json({ success: true, drivers });
  } catch (error: any) {
    console.error("Get drivers error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch drivers" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  // Verify admin authentication
  const auth = await verifyAdminAuth(request);
  if (!auth.authenticated) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { name, phone, email, vehicle, vehiclePlate, vehicleCode, status, photo, password } = body;

    if (!name || !phone || !email || !vehicle || !vehiclePlate) {
      return NextResponse.json({ success: false, error: "All fields are required" }, { status: 400 });
    }

    // Generate a random password if admin doesn't provide one
    const plainPassword = password || crypto.randomBytes(6).toString("hex");
    const hashedPassword = await bcrypt.hash(plainPassword, 12);

    const newDriver = await addDriver({
      name,
      phone,
      email,
      password: hashedPassword,
      vehicle,
      vehiclePlate,
      vehicleCode: vehicleCode || null,
      status: status || "available",
      photo: photo || null,
      rating: 5.0,
      totalTrips: 0,
    });

    // Return the plain password so admin can share it with the driver
    return NextResponse.json({
      success: true,
      driver: newDriver,
      credentials: {
        email,
        password: plainPassword,
      },
    });
  } catch (error: any) {
    console.error("Add driver error:", error);
    
    // Handle duplicate email error
    if (error?.code === "P2002" && error?.meta?.target?.includes("email")) {
      return NextResponse.json({ success: false, error: "A driver with this email already exists" }, { status: 400 });
    }
    
    return NextResponse.json({ success: false, error: "Failed to add driver" }, { status: 500 });
  }
}
