import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { getAppJwtSecret } from "@/lib/app-jwt-secret";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { isMembershipActive } from "@/lib/concierge-rules";

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const rl = await checkRateLimit(`driver-login:${ip}`, {
      maxRequests: 10,
      windowMs: 15 * 60 * 1000,
    });
    if (!rl.success) {
      return NextResponse.json(
        {
          success: false,
          error: `Too many login attempts. Try again in ${rl.resetIn} seconds.`,
        },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: "Email and password are required" },
        { status: 400 }
      );
    }

    const emailKey = String(email).trim().toLowerCase();
    const emailRl = await checkRateLimit(`driver-login-email:${emailKey}`, {
      maxRequests: 8,
      windowMs: 15 * 60 * 1000,
    });
    if (!emailRl.success) {
      return NextResponse.json(
        {
          success: false,
          error: `Too many login attempts. Try again in ${emailRl.resetIn} seconds.`,
        },
        { status: 429 }
      );
    }

    const driver = await prisma.driver.findUnique({
      where: { email: emailKey },
      include: {
        conciergeProfile: {
          select: {
            id: true,
            membershipStatus: true,
            membershipExpiresAt: true,
          },
        },
      },
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
      getAppJwtSecret(),
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
        conciergeEnrolled: !!(
          driver.conciergeProfile &&
          isMembershipActive(
            driver.conciergeProfile.membershipStatus,
            driver.conciergeProfile.membershipExpiresAt
          )
        ),
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
