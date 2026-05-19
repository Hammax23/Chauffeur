import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function resolveMapsKey(): string | undefined {
  const server = process.env.GOOGLE_MAPS_SERVER_KEY?.trim();
  if (server) return server;
  return process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() || undefined;
}

function formatKm(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(meters < 10_000 ? 1 : 0)} km`;
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  if (h <= 0) return `${Math.max(1, m)} min`;
  if (m <= 0) return `${h} hr`;
  return `${h} hr ${m} min`;
}

interface LatLng { lat: number; lng: number }

interface DirectionsLeg {
  distance?: { value: number; text: string };
  duration?: { value: number; text: string };
  start_location?: LatLng;
  end_location?: LatLng;
}

/**
 * Driving distance/duration (pickup → optional waypoint → drop-off).
 * Uses Google Directions API server-side (same key strategy as /api/places/*).
 */
export async function POST(req: NextRequest) {
  const key = resolveMapsKey();
  if (!key) {
    return NextResponse.json(
      { success: false, error: "Maps API is not configured on the server." },
      { status: 503 }
    );
  }

  let body: { origin?: string; destination?: string; waypoint?: string | null; avoidTolls?: boolean };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const origin = (body.origin || "").trim();
  const destination = (body.destination || "").trim();
  const waypointRaw = typeof body.waypoint === "string" ? body.waypoint.trim() : "";
  const avoidTolls = Boolean(body.avoidTolls);

  if (origin.length < 3 || destination.length < 3) {
    return NextResponse.json({ success: false, error: "Origin and destination are required." }, { status: 400 });
  }
  if (origin.length > 2048 || destination.length > 2048 || waypointRaw.length > 2048) {
    return NextResponse.json({ success: false, error: "Address too long." }, { status: 400 });
  }

  const params = new URLSearchParams({
    origin,
    destination,
    key,
    mode: "driving",
    units: "metric",
    region: "ca",
    language: "en",
  });

  if (waypointRaw.length >= 3) {
    params.set("waypoints", waypointRaw);
  }

  if (avoidTolls) {
    params.set("avoid", "tolls");
  }

  const url = `https://maps.googleapis.com/maps/api/directions/json?${params.toString()}`;

  try {
    const res = await fetch(url, { next: { revalidate: 0 } });
    const data = (await res.json()) as {
      status: string;
      routes?: {
        legs: DirectionsLeg[];
        overview_polyline?: { points: string };
      }[];
      error_message?: string;
    };

    if (data.status === "ZERO_RESULTS") {
      return NextResponse.json({
        success: true,
        distanceText: "—",
        durationText: "—",
        distanceMeters: null,
        durationSeconds: null,
        polyline: null,
        points: [],
      });
    }

    if (data.status !== "OK" || !data.routes?.[0]?.legs?.length) {
      return NextResponse.json(
        {
          success: false,
          error: data.error_message || `Directions: ${data.status}`,
        },
        { status: 502 }
      );
    }

    const route = data.routes[0];
    const legs = route.legs;
    let meters = 0;
    let seconds = 0;
    for (const leg of legs) {
      meters += leg.distance?.value ?? 0;
      seconds += leg.duration?.value ?? 0;
    }

    // Build ordered list of key route points:
    //   • start of first leg     → A  (pickup)
    //   • end   of each leg      → B / C (stop / drop-off depending on count)
    const points: LatLng[] = [];
    const first = legs[0].start_location;
    if (first) points.push({ lat: first.lat, lng: first.lng });
    for (const leg of legs) {
      const end = leg.end_location;
      if (end) points.push({ lat: end.lat, lng: end.lng });
    }

    return NextResponse.json({
      success: true,
      distanceText: formatKm(meters),
      durationText: formatDuration(seconds),
      distanceMeters: meters,
      durationSeconds: seconds,
      polyline: route.overview_polyline?.points ?? null,
      points,
    });
  } catch {
    return NextResponse.json(
      { success: false, error: "Could not reach Google Directions." },
      { status: 502 }
    );
  }
}
