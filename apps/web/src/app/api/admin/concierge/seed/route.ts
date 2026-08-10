// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyAdminAuth } from "@/lib/admin-auth";
import bcrypt from "bcryptjs";

/** Seed demo hotel + concierge for QA */
export async function POST(request: NextRequest) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authenticated) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    let hotel = await prisma.hotel.findFirst({ where: { name: "Demo Grand Hotel" } });
    if (!hotel) {
      hotel = await prisma.hotel.create({
        data: {
          name: "Demo Grand Hotel",
          address: "123 Front St W",
          city: "Toronto",
          phone: "+1 (416) 555-0100",
          email: "concierge@demogrand.example",
          commissionPercent: 10,
          isActive: true,
        },
      });
    }

    const email = "concierge@demo.sarj";
    let staff = await prisma.concierge.findUnique({ where: { email } });
    if (!staff) {
      staff = await prisma.concierge.create({
        data: {
          hotelId: hotel.id,
          name: "Demo Concierge",
          email,
          phone: "+1 (416) 555-0101",
          password: await bcrypt.hash("demo1234", 10),
          isActive: true,
        },
      });
    }

    // Enroll first active driver if any
    const driver = await prisma.driver.findFirst({ orderBy: { createdAt: "asc" } });
    let profile = null;
    if (driver) {
      profile = await prisma.conciergeDriverProfile.upsert({
        where: { driverId: driver.id },
        create: {
          driverId: driver.id,
          membershipStatus: "ACTIVE",
          membershipExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          vehicleClass: "SEDAN",
          vehicleLabel: driver.vehicle || "Sedan",
          availability: "OFFLINE",
        },
        update: {},
      });
    }

    return NextResponse.json({
      success: true,
      message: "Demo data ready",
      hotel,
      conciergeLogin: { email, password: "demo1234" },
      driverEnrolled: !!profile,
    });
  } catch (e) {
    console.error("[concierge seed]", e);
    return NextResponse.json({ success: false, error: "Seed failed" }, { status: 500 });
  }
}
