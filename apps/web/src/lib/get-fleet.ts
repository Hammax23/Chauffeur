import { fleetData, type FleetVehicle, type FleetCategory } from "@/data/fleet";

/**
 * Public fleet list. Reads active vehicles from the database (managed via the
 * admin panel) and falls back to the static `fleetData` when the DB is empty
 * or unreachable.
 */
export async function getPublicFleet(): Promise<FleetVehicle[]> {
  const fromDb = await loadFleetFromDatabase();
  return fromDb ?? fleetData;
}

async function loadFleetFromDatabase(): Promise<FleetVehicle[] | null> {
  if (!process.env.DATABASE_URL?.trim()) return null;

  try {
    const { default: prisma } = await import("@/lib/prisma");
    const rows = await prisma.fleetVehicle.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });

    if (!rows.length) return null;

    return rows.map((row) => ({
      id: row.vehicleId,
      name: row.name,
      dropdownName: row.dropdownName,
      description: row.description,
      image: row.image,
      category: row.category as FleetCategory,
      seating: row.seating,
      luggage: row.luggage,
      price: row.hourlyRate,
      pricePerKm: row.pricePerKm,
    }));
  } catch {
    // DB offline or table missing — use static fleet.ts on public pages
    return null;
  }
}
