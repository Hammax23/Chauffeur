import { NextRequest, NextResponse } from "next/server";
import { fleetData, type FleetVehicle } from "@/data/fleet";
import prisma from "@/lib/prisma";

function siteOrigin(request: NextRequest): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, "");
  if (fromEnv) return fromEnv;
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto") || "http";
  if (host) return `${proto}://${host}`;
  return "https://sarjworldwide.ca";
}

/** Public fleet list for mobile app + clients. Uses database if available, falls back to static data. */
export async function GET(request: NextRequest) {
  try {
    const base = siteOrigin(request);

    // Try to fetch from database first
    let dbVehicles: any[] = [];
    try {
      dbVehicles = await prisma.fleetVehicle.findMany({
        where: { isActive: true },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      });
    } catch {
      // Database not available or table doesn't exist yet - use static data
    }

    // If database has vehicles, use them; otherwise fallback to static
    const sourceVehicles = dbVehicles.length > 0 ? dbVehicles : fleetData;

    const vehicles: (FleetVehicle & { imageUrl: string })[] = sourceVehicles.map((v: any) => ({
      id: v.vehicleId || v.id,
      name: v.name,
      dropdownName: v.dropdownName,
      description: v.description,
      image: v.image,
      category: v.category,
      seating: v.seating,
      luggage: v.luggage,
      price: v.hourlyRate ?? v.price,
      pricePerKm: v.pricePerKm,
      imageUrl: v.image.startsWith("http") ? v.image : `${base}${v.image.startsWith("/") ? "" : "/"}${v.image}`,
    }));

    return NextResponse.json({ success: true, vehicles, source: dbVehicles.length > 0 ? "database" : "static" });
  } catch (e) {
    console.error("Fleet GET:", e);
    return NextResponse.json({ success: false, error: "Failed to load fleet" }, { status: 500 });
  }
}
