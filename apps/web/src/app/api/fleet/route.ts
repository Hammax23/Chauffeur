import { NextRequest, NextResponse } from "next/server";
import { type FleetVehicle } from "@/data/fleet";
import { getPublicFleet } from "@/lib/get-fleet";

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
    const fleet = await getPublicFleet();

    const vehicles: (FleetVehicle & { imageUrl: string })[] = fleet.map((v) => ({
      ...v,
      imageUrl: v.image.startsWith("http")
        ? v.image
        : `${base}${v.image.startsWith("/") ? "" : "/"}${v.image}`,
    }));

    return NextResponse.json({ success: true, vehicles });
  } catch (e) {
    console.error("Fleet GET:", e);
    return NextResponse.json({ success: false, error: "Failed to load fleet" }, { status: 500 });
  }
}
