import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/admin-auth";
import prisma from "@/lib/prisma";
import { fleetData } from "@/data/fleet";

// POST - Seed fleet from static data (one-time use)
export async function POST(request: NextRequest) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authenticated) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    let created = 0;
    let skipped = 0;

    for (const vehicle of fleetData) {
      const existing = await prisma.fleetVehicle.findUnique({
        where: { vehicleId: vehicle.id },
      });

      if (existing) {
        skipped++;
        continue;
      }

      await prisma.fleetVehicle.create({
        data: {
          vehicleId: vehicle.id,
          name: vehicle.name,
          dropdownName: vehicle.dropdownName,
          description: vehicle.description,
          image: vehicle.image,
          category: vehicle.category,
          seating: vehicle.seating,
          luggage: vehicle.luggage,
          hourlyRate: vehicle.price,
          pricePerKm: vehicle.pricePerKm,
          isActive: true,
          sortOrder: fleetData.indexOf(vehicle),
        },
      });
      created++;
    }

    // Seed default charges if they don't exist
    const defaultCharges = [
      { chargeKey: "stop", chargeName: "Extra Stop", amount: 20, isPercentage: false },
      { chargeKey: "childSeat", chargeName: "Child Seat", amount: 25, isPercentage: false },
      { chargeKey: "meetGreet", chargeName: "Meet & Greet", amount: 95, isPercentage: false },
      { chargeKey: "bouquet", chargeName: "Bouquet of Flowers", amount: 75, isPercentage: false },
      { chargeKey: "hst", chargeName: "HST", amount: 13, isPercentage: true },
      { chargeKey: "baseDistanceKm", chargeName: "Base Distance (KM)", amount: 17, isPercentage: false },
      { chargeKey: "extraKmRate", chargeName: "Extra KM Rate", amount: 3.2, isPercentage: false },
    ];

    let chargesCreated = 0;
    for (const charge of defaultCharges) {
      const existing = await prisma.reservationCharges.findUnique({
        where: { chargeKey: charge.chargeKey },
      });

      if (!existing) {
        await prisma.reservationCharges.create({ data: charge });
        chargesCreated++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Seeded ${created} vehicles (${skipped} already existed), ${chargesCreated} charges created`,
    });
  } catch (error: any) {
    console.error("[Fleet Seed] Error:", error?.message);
    return NextResponse.json({ success: false, error: error?.message || "Failed to seed fleet" }, { status: 500 });
  }
}
