import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { APP_FLEET_SEED } from "@/data/app-fleet-seed";
import { fleetData } from "@/data/fleet";

function siteOrigin(request: NextRequest): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, "");
  if (fromEnv) return fromEnv;
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto") || "http";
  if (host) return `${proto}://${host}`;
  return "https://sarjworldwide.ca";
}

function absolutizeImage(image: string, base: string): string {
  if (!image) return "";
  if (image.startsWith("http")) return image;
  return `${base}${image.startsWith("/") ? "" : "/"}${image}`;
}

function staticFallback(base: string) {
  const staticById = new Map(fleetData.map((v) => [v.id, v]));
  return APP_FLEET_SEED.map((seed) => {
    const rep = staticById.get(seed.imageFromVehicleId);
    const pricePerKm = seed.pricePerKm > 0 ? seed.pricePerKm : rep?.pricePerKm ?? 0;
    const hourlyRate = seed.hourlyRate > 0 ? seed.hourlyRate : rep?.price ?? 0;
    const image = rep?.image || "";
    return {
      id: seed.tierId,
      tierId: seed.tierId,
      title: seed.title,
      subtitle: seed.subtitle,
      description: seed.description,
      image,
      imageUrl: absolutizeImage(image, base),
      group: seed.group,
      category: seed.category,
      seating: seed.seating || rep?.seating || "",
      luggage: seed.luggage || rep?.luggage || "",
      pricePerKm,
      hourlyRate,
      price: hourlyRate,
      showOnHome: seed.showOnHome,
      sortOrder: seed.sortOrder,
    };
  }).filter((v) => v.imageUrl && v.pricePerKm > 0);
}

/** Public app fleet list for mobile reservation + home preview. */
export async function GET(request: NextRequest) {
  try {
    const base = siteOrigin(request);
    const homeOnly = request.nextUrl.searchParams.get("home") === "1";

    const rows = await prisma.appFleetVehicle.findMany({
      where: {
        isActive: true,
        ...(homeOnly ? { showOnHome: true } : {}),
      },
      orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
    });

    if (rows.length === 0) {
      return NextResponse.json({ success: true, vehicles: staticFallback(base), source: "static" });
    }

    const vehicles = rows
      .map((v) => ({
        id: v.tierId,
        tierId: v.tierId,
        title: v.title,
        subtitle: v.subtitle,
        description: v.description,
        image: v.image,
        imageUrl: absolutizeImage(v.image, base),
        group: v.group,
        category: v.category,
        seating: v.seating,
        luggage: v.luggage,
        pricePerKm: v.pricePerKm,
        hourlyRate: v.hourlyRate,
        price: v.hourlyRate,
        showOnHome: v.showOnHome,
        sortOrder: v.sortOrder,
      }))
      .filter((v) => v.imageUrl && v.pricePerKm > 0);

    return NextResponse.json({ success: true, vehicles, source: "db" });
  } catch (error) {
    console.error("[AppFleet public GET]", error);
    const base = siteOrigin(request);
    return NextResponse.json({
      success: true,
      vehicles: staticFallback(base),
      source: "static",
    });
  }
}
