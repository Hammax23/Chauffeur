import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/admin-auth";
import prisma from "@/lib/prisma";
import { APP_FLEET_SEED } from "@/data/app-fleet-seed";
import { fleetData } from "@/data/fleet";

/**
 * Seed AppFleetVehicle from default app tiers.
 * Copies image + rates from website FleetVehicle / static fleet when available.
 */
export async function POST(request: NextRequest) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authenticated) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const dbFleet = await prisma.fleetVehicle.findMany();
    const byVehicleId = new Map(dbFleet.map((v) => [v.vehicleId, v]));
    const staticById = new Map(fleetData.map((v) => [v.id, v]));

    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (const seed of APP_FLEET_SEED) {
      const fromDb = byVehicleId.get(seed.imageFromVehicleId);
      const fromStatic = staticById.get(seed.imageFromVehicleId);

      const image = fromDb?.image || fromStatic?.image || "";
      const pricePerKm =
        seed.pricePerKm > 0
          ? seed.pricePerKm
          : fromDb?.pricePerKm ?? fromStatic?.pricePerKm ?? 0;
      const hourlyRate =
        seed.hourlyRate > 0
          ? seed.hourlyRate
          : fromDb?.hourlyRate ?? fromStatic?.price ?? 0;

      const existing = await prisma.appFleetVehicle.findUnique({
        where: { tierId: seed.tierId },
      });

      const payload = {
        title: seed.title,
        subtitle: seed.subtitle,
        description: seed.description,
        image,
        group: seed.group,
        category: seed.category,
        seating: seed.seating || fromDb?.seating || fromStatic?.seating || "",
        luggage: seed.luggage || fromDb?.luggage || fromStatic?.luggage || "",
        pricePerKm,
        hourlyRate,
        showOnHome: seed.showOnHome,
        isActive: true,
        sortOrder: seed.sortOrder,
      };

      if (existing) {
        // Only fill missing image/rates if empty — don't overwrite admin edits by default
        const patch: Record<string, unknown> = {};
        if (!existing.image && image) patch.image = image;
        if (existing.pricePerKm <= 0 && pricePerKm > 0) patch.pricePerKm = pricePerKm;
        if (existing.hourlyRate <= 0 && hourlyRate > 0) patch.hourlyRate = hourlyRate;
        if (Object.keys(patch).length === 0) {
          skipped += 1;
          continue;
        }
        await prisma.appFleetVehicle.update({
          where: { id: existing.id },
          data: patch,
        });
        updated += 1;
      } else {
        await prisma.appFleetVehicle.create({
          data: { tierId: seed.tierId, ...payload },
        });
        created += 1;
      }
    }

    return NextResponse.json({
      success: true,
      created,
      updated,
      skipped,
      message: `Seeded app fleet: ${created} created, ${updated} updated, ${skipped} unchanged.`,
    });
  } catch (error) {
    console.error("[AppFleet seed]", error);
    return NextResponse.json({ success: false, error: "Failed to seed app fleet" }, { status: 500 });
  }
}
