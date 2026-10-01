import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/admin-auth";
import prisma from "@/lib/prisma";
import { APP_FLEET_SEED } from "@/data/app-fleet-seed";
import { fleetData } from "@/data/fleet";

/**
 * Seed / sync AppFleetVehicle from default app tiers.
 * - Creates missing tiers
 * - Updates title/subtitle/copy/sort for existing tierIds (keeps rates/images if already set)
 * - Deactivates tiers no longer in the seed list
 */
export async function POST(request: NextRequest) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authenticated) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const dbFleet = await prisma.fleetVehicle.findMany();
    const byVehicleId = new Map(dbFleet.map((v: any) => [v.vehicleId, v]));
    const staticById = new Map(fleetData.map((v: any) => [v.id, v]));

    let created = 0;
    let updated = 0;
    let deactivated = 0;

    const seedTier = new Set(APP_FLEET_SEED.map((s) => s.tierId));

    for (const seed of APP_FLEET_SEED) {
      const fromDb = byVehicleId.get(seed.imageFromVehicleId) as any;
      const fromStatic = staticById.get(seed.imageFromVehicleId) as any;

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

      if (existing) {
        await prisma.appFleetVehicle.update({
          where: { id: existing.id },
          data: {
            title: seed.title,
            subtitle: seed.subtitle,
            description: seed.description,
            group: seed.group,
            category: seed.category,
            // Always sync seating from seed so capacity UI stays Uber-style (person + number).
            seating: seed.seating || existing.seating || fromDb?.seating || fromStatic?.seating || "",
            luggage: seed.luggage || existing.luggage || fromDb?.luggage || fromStatic?.luggage || "",
            showOnHome: seed.showOnHome,
            sortOrder: seed.sortOrder,
            isActive: true,
            // Keep admin rates/images unless empty
            image: existing.image?.trim() ? existing.image : image,
            pricePerKm: existing.pricePerKm > 0 ? existing.pricePerKm : pricePerKm,
            hourlyRate: existing.hourlyRate > 0 ? existing.hourlyRate : hourlyRate,
          },
        });
        updated += 1;
      } else {
        await prisma.appFleetVehicle.create({
          data: {
            tierId: seed.tierId,
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
          },
        });
        created += 1;
      }
    }

    const obsolete = await prisma.appFleetVehicle.findMany({
      where: { tierId: { notIn: [...seedTier] }, isActive: true },
      select: { id: true },
    });
    if (obsolete.length > 0) {
      await prisma.appFleetVehicle.updateMany({
        where: { id: { in: obsolete.map((r) => r.id) } },
        data: { isActive: false, showOnHome: false },
      });
      deactivated = obsolete.length;
    }

    return NextResponse.json({
      success: true,
      created,
      updated,
      deactivated,
      message: `Synced app fleet: ${created} created, ${updated} updated, ${deactivated} deactivated.`,
    });
  } catch (error) {
    console.error("[AppFleet seed]", error);
    return NextResponse.json({ success: false, error: "Failed to seed app fleet" }, { status: 500 });
  }
}
