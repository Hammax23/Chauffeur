import "server-only";
import { getMapsRegionBias } from "@/lib/places-countries";

function resolveMapsKey(): string | undefined {
  const server = process.env.GOOGLE_MAPS_SERVER_KEY?.trim();
  if (server) return server;
  return process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() || undefined;
}

/**
 * Server-side Google Directions distance (meters). Used so clients cannot
 * underpay by sending a fake distanceMeters.
 */
export async function serverDrivingDistanceMeters(params: {
  origin: string;
  destination: string;
  waypoints?: string[];
}): Promise<{ meters: number } | { error: string }> {
  const origin = String(params.origin || "").trim();
  const destination = String(params.destination || "").trim();
  if (origin.length < 3 || destination.length < 3) {
    return { error: "Pickup and drop-off are required to price this trip." };
  }
  if (origin.length > 2048 || destination.length > 2048) {
    return { error: "Address too long." };
  }

  const key = resolveMapsKey();
  if (!key) {
    return { error: "Maps pricing is temporarily unavailable." };
  }

  const waypointList = (params.waypoints || [])
    .map((w) => String(w || "").trim())
    .filter((w) => w.length >= 3)
    .slice(0, 8);

  const qs = new URLSearchParams({
    origin,
    destination,
    key,
    mode: "driving",
    units: "metric",
    language: "en",
  });
  const regionBias = getMapsRegionBias();
  if (regionBias) qs.set("region", regionBias);
  if (waypointList.length > 0) {
    qs.set("waypoints", waypointList.join("|"));
  }

  try {
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/directions/json?${qs.toString()}`,
      { next: { revalidate: 0 } }
    );
    const data = (await res.json()) as {
      status: string;
      routes?: { legs?: { distance?: { value?: number } }[] }[];
      error_message?: string;
    };

    if (data.status !== "OK" || !data.routes?.[0]?.legs?.length) {
      return {
        error: data.error_message || "Unable to calculate trip distance.",
      };
    }

    let meters = 0;
    for (const leg of data.routes[0].legs) {
      meters += leg.distance?.value ?? 0;
    }
    if (meters <= 0) {
      return { error: "Unable to calculate trip distance." };
    }
    return { meters };
  } catch (err) {
    console.error("[driving-distance]", err);
    return { error: "Unable to calculate trip distance." };
  }
}

/** Allow small client/server drift (GPS vs address) — reject large under-reporting. */
export function distanceAcceptable(
  clientMeters: number,
  serverMeters: number,
  maxUnderReportRatio = 0.12
): boolean {
  if (!Number.isFinite(clientMeters) || clientMeters <= 0) return false;
  if (!Number.isFinite(serverMeters) || serverMeters <= 0) return false;
  // Client claiming much shorter than server → reject
  if (clientMeters < serverMeters * (1 - maxUnderReportRatio)) return false;
  return true;
}
