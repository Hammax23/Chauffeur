import { PrismaClient } from "@prisma/client";
import { APP_FLEET_SEED } from "../src/data/app-fleet-seed";
import { fleetData } from "../src/data/fleet";

const prisma = new PrismaClient();

async function main() {
  const dbFleet = await prisma.fleetVehicle.findMany();
  const byVehicleId = new Map(dbFleet.map((v: any) => [v.vehicleId, v]));
  const staticById = new Map(fleetData.map((v: any) => [v.id, v]));
  let created = 0;
  let updated = 0;

  for (const seed of APP_FLEET_SEED) {
    const fromDb = byVehicleId.get(seed.imageFromVehicleId) as any;
    const fromStatic = staticById.get(seed.imageFromVehicleId) as any;
    const image = fromDb?.image || fromStatic?.image || "";
    const pricePerKm =
      seed.pricePerKm > 0
        ? seed.pricePerKm
        : (fromDb?.pricePerKm ?? fromStatic?.pricePerKm ?? 0);
    const hourlyRate =
      seed.hourlyRate > 0
        ? seed.hourlyRate
        : (fromDb?.hourlyRate ?? fromStatic?.price ?? 0);

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
          seating: seed.seating || existing.seating || "",
          luggage: seed.luggage || existing.luggage || "",
          showOnHome: seed.showOnHome,
          sortOrder: seed.sortOrder,
          isActive: true,
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
          seating: seed.seating || "",
          luggage: seed.luggage || "",
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

  console.log(JSON.stringify({ created, updated, titles: APP_FLEET_SEED.map((s) => s.title) }));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
