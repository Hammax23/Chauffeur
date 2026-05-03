import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret-key";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: "Email and password are required" },
        { status: 400 }
      );
    }

    const driver = await prisma.driver.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!driver) {
      return NextResponse.json(
        { success: false, error: "Invalid email or password" },
        { status: 401 }
      );
    }

    const isValidPassword = await bcrypt.compare(password, driver.password);
    if (!isValidPassword) {
      return NextResponse.json(
        { success: false, error: "Invalid email or password" },
        { status: 401 }
      );
    }

    const token = jwt.sign(
      { id: driver.id, email: driver.email, type: "driver" },
      JWT_SECRET,
      { expiresIn: "30d" }
    );

    return NextResponse.json({
      success: true,
      message: "Login successful",
      token,
      driver: {
        id: driver.id,
        driverId: driver.driverId,
        name: driver.name,
        email: driver.email,
        phone: driver.phone,
        vehicle: driver.vehicle,
        vehiclePlate: driver.vehiclePlate,
        vehicleCode: driver.vehicleCode,
        status: driver.status,
        isActive: driver.isActive,
        photo: driver.photo,
        rating: driver.rating,
        totalTrips: driver.totalTrips,
      },
    });
  } catch (error) {
    console.error("Driver login error:", error);
    return NextResponse.json(
      { success: false, error: "Login failed" },
      { status: 500 }
    );
  }
}
