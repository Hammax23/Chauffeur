import { API_BASE_URL } from "./api";

export interface PlacePrediction {
  placeId: string;
  description: string;
  mainText: string;
  secondaryText: string;
  types: string[];
}

export type PlaceAutocompleteOptions = {
  /** Google Places Autocomplete `types` — currently only `airport` is supported server-side. */
  types?: "airport";
  /** When true, omit Canada-only `components` filter (Uber-style airport search). */
  worldwide?: boolean;
};

export async function fetchPlacePredictions(
  input: string,
  sessionToken: string,
  signal?: AbortSignal,
  options?: PlaceAutocompleteOptions
): Promise<PlacePrediction[]> {
  const q = input.trim();
  if (q.length < 2) return [];

  const params = new URLSearchParams({ input: q, session: sessionToken });
  if (options?.types === "airport") {
    params.set("types", "airport");
  }
  if (options?.worldwide) {
    params.set("worldwide", "1");
  }
  const res = await fetch(`${API_BASE_URL}/places/autocomplete?${params}`, {
    method: "GET",
    headers: { Accept: "application/json" },
    signal,
  });
  const data = (await res.json()) as {
    success?: boolean;
    predictions?: PlacePrediction[];
    error?: string;
  };
  if (!res.ok || !data.success) {
    throw new Error(data.error || "Address lookup failed");
  }
  return data.predictions ?? [];
}

export async function fetchPlaceFormattedAddress(
  placeId: string,
  sessionToken: string,
  signal?: AbortSignal
): Promise<{
  formattedAddress: string;
  name?: string;
  location?: { lat: number; lng: number } | null;
}> {
  const params = new URLSearchParams({ placeId, session: sessionToken });
  const res = await fetch(`${API_BASE_URL}/places/details?${params}`, {
    method: "GET",
    headers: { Accept: "application/json" },
    signal,
  });
  const data = (await res.json()) as {
    success?: boolean;
    formattedAddress?: string;
    name?: string;
    location?: { lat: number; lng: number } | null;
    error?: string;
  };
  if (!res.ok || !data.success || !data.formattedAddress) {
    throw new Error(data.error || "Could not resolve address");
  }
  return {
    formattedAddress: data.formattedAddress,
    name: data.name,
    location: data.location ?? null,
  };
}

export interface DirectionsLatLng {
  lat: number;
  lng: number;
}

export interface DirectionsSummary {
  distanceText: string;
  durationText: string;
  distanceMeters: number | null;
  durationSeconds: number | null;
  /** Encoded overview polyline string for drawing on a static map. */
  polyline: string | null;
  /** Ordered key route points — A (pickup), B (stop or drop-off), C (drop-off when stop present). */
  points: DirectionsLatLng[];
  /** URL to a static map image rendered by our /api/places/staticmap proxy. */
  mapImageUrl: string | null;
  /** URL to an interactive Google Map page (HTML) for embedding in a WebView. */
  mapEmbedUrl: string | null;
}

/**
 * Build labelled markers for the staticmap proxy (A = pickup … last = drop-off).
 */
function buildMarkerSegments(points: DirectionsLatLng[]): string[] {
  if (points.length < 2) return [];
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const segments: string[] = [];
  for (let i = 0; i < points.length && i < alphabet.length; i++) {
    segments.push(`${alphabet[i]}:${points[i].lat.toFixed(6)},${points[i].lng.toFixed(6)}`);
  }
  return segments;
}

export async function fetchDirectionsSummary(
  params: {
    origin: string;
    destination: string;
    /** @deprecated prefer waypoints[] */
    waypoint?: string;
    /** Intermediate stops in order (pickup → stops → drop-off). */
    waypoints?: string[];
    /** When true, request a route that avoids toll roads (e.g. no 407 ETR). */
    avoidTolls: boolean;
    /** Optional preferred static map size — clamped server-side. */
    mapWidth?: number;
    mapHeight?: number;
    /**
     * When "hero", static map insets the route so floating chrome / chips
     * don’t cover A/B pins (create-reservation top map plane).
     */
    mapPad?: "hero";
  },
  signal?: AbortSignal
): Promise<DirectionsSummary> {
  const waypoints = (params.waypoints || [])
    .map((w) => w.trim())
    .filter((w) => w.length >= 3);
  if (waypoints.length === 0 && params.waypoint?.trim()) {
    waypoints.push(params.waypoint.trim());
  }

  const res = await fetch(`${API_BASE_URL}/places/directions`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      origin: params.origin.trim(),
      destination: params.destination.trim(),
      waypoints: waypoints.length > 0 ? waypoints : undefined,
      avoidTolls: params.avoidTolls,
    }),
    signal,
  });
  const data = (await res.json()) as
    | (Omit<DirectionsSummary, "mapImageUrl"> & { success: true })
    | { success: false; error?: string };

  if (!res.ok || data.success !== true) {
    throw new Error(
      data.success === false ? data.error || "Route could not be calculated" : "Route could not be calculated"
    );
  }

  const polyline = data.polyline ?? null;
  const points = Array.isArray(data.points) ? data.points : [];

  let mapImageUrl: string | null = null;
  let mapEmbedUrl: string | null = null;
  const markers = buildMarkerSegments(points);
  if (polyline && markers.length >= 2) {
    const staticParams = new URLSearchParams({
      polyline,
      markers: markers.join(";"),
      w: String(params.mapWidth ?? 800),
      h: String(params.mapHeight ?? 440),
      // Bust CDN/browser cache when map padding/style changes.
      v: "uber3",
    });
    if (params.mapPad === "hero") {
      staticParams.set("pad", "hero");
    }
    mapImageUrl = `${API_BASE_URL}/places/staticmap?${staticParams.toString()}`;

    const embedParams = new URLSearchParams({
      polyline,
      markers: markers.join(";"),
    });
    mapEmbedUrl = `${API_BASE_URL}/places/map-embed?${embedParams.toString()}`;
  }

  return {
    distanceText: data.distanceText,
    durationText: data.durationText,
    distanceMeters: data.distanceMeters ?? null,
    durationSeconds: data.durationSeconds ?? null,
    polyline,
    points,
    mapImageUrl,
    mapEmbedUrl,
  };
}
