import { NextRequest, NextResponse } from "next/server";
import { getDrivers, addDriver } from "@/lib/data-store";

export async function GET() {
  try {
    const drivers = await getDrivers();
    return NextResponse.json({ success: true, drivers });
  } catch (error: any) {
    console.error("Get drivers error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch drivers" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, phone, email, vehicle, vehiclePlate, status } = body;

    if (!name || !phone || !email || !vehicle || !vehiclePlate) {
      return NextResponse.json({ success: false, error: "All fields are required" }, { status: 400 });
    }

    const newDriver = await addDriver({
      name,
      phone,
      email,
      vehicle,
      vehiclePlate,
      status: status || "available",
      rating: 5.0,
      totalTrips: 0,
    });

    return NextResponse.json({ success: true, driver: newDriver });
  } catch (error: any) {
    console.error("Add driver error:", error);
    return NextResponse.json({ success: false, error: "Failed to add driver" }, { status: 500 });
  }
}
