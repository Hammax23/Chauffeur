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
    const {
      name,
      phone,
      email,
      vehicle,
      vehiclePlate,
      vehicleCode,
      status,
      photo,
      password,
      backgroundCheckUrl,
      commercialInsuranceUrl,
      driverLicenceUrl,
      proofOfWorkEligibilityUrl,
      municipalTaxiLimoLicenceUrl,
      vehicleInsuranceUrl,
      vehicleRegistrationUrl,
    } = body;

    if (!name || !phone || !email || !vehicle || !vehiclePlate || !password) {
      return NextResponse.json({ success: false, error: "All fields including password are required" }, { status: 400 });
    }

    // Hash the admin-provided password
    const hashedPassword = await bcrypt.hash(password, 12);

    const urlOrNull = (v: unknown): string | null => {
      if (typeof v !== "string") return null;
      const t = v.trim();
      return t.length ? t : null;
    };

    const newDriver = await addDriver({
      name,
      phone,
      email,
      password: hashedPassword,
      vehicle,
      vehiclePlate,
      vehicleCode: vehicleCode || null,
      status: status || "available",
      photo: urlOrNull(photo),
      backgroundCheckUrl: urlOrNull(backgroundCheckUrl),
      commercialInsuranceUrl: urlOrNull(commercialInsuranceUrl),
      driverLicenceUrl: urlOrNull(driverLicenceUrl),
      proofOfWorkEligibilityUrl: urlOrNull(proofOfWorkEligibilityUrl),
      municipalTaxiLimoLicenceUrl: urlOrNull(municipalTaxiLimoLicenceUrl),
      vehicleInsuranceUrl: urlOrNull(vehicleInsuranceUrl),
      vehicleRegistrationUrl: urlOrNull(vehicleRegistrationUrl),
      rating: 5.0,
      totalTrips: 0,
    });

    // Return the plain password so admin can share it with the driver
    return NextResponse.json({
      success: true,
      driver: newDriver,
      credentials: {
        email,
        password: password,
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
