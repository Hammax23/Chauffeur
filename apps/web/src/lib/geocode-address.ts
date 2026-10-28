/**
 * One-shot Google Geocoding for booking addresses (driver map fallback).
 * Never throws — callers treat null as "use address Navigate only".
 */

function resolveMapsKey(): string | undefined {
  const server = process.env.GOOGLE_MAPS_SERVER_KEY?.trim();
  if (server) return server;
  return process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() || undefined;
}

export type GeocodedPoint = { lat: number; lng: number };

const GEOCODE_TIMEOUT_MS = 3000;

export async function geocodeAddress(
  address: string | null | undefined
): Promise<GeocodedPoint | null> {
  const q = String(address || "").trim();
  if (q.length < 3 || q.length > 500) return null;
  // Hourly / vague placeholders — skip Google
  if (/^as directed$/i.test(q)) return null;

  const key = resolveMapsKey();
  if (!key) return null;

  const params = new URLSearchParams({
    address: q,
    key,
    language: "en",
  });
  const url = `https://maps.googleapis.com/maps/api/geocode/json?${params.toString()}`;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), GEOCODE_TIMEOUT_MS);
    const res = await fetch(url, {
      signal: controller.signal,
      next: { revalidate: 0 },
    });
    clearTimeout(timer);
    const data = (await res.json()) as {
      status: string;
      results?: Array<{
        geometry?: { location?: { lat: number; lng: number } };
      }>;
    };
    if (data.status !== "OK" || !data.results?.length) return null;
    const loc = data.results[0]?.geometry?.location;
    if (
      !loc ||
      typeof loc.lat !== "number" ||
      typeof loc.lng !== "number" ||
      !Number.isFinite(loc.lat) ||
      !Number.isFinite(loc.lng)
    ) {
      return null;
    }
    return { lat: loc.lat, lng: loc.lng };
  } catch {
    return null;
  }
}

/** Parse optional client-sent lat/lng; reject garbage. */
export function parseOptionalCoord(raw: unknown): number | null {
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  if (typeof raw === "string" && raw.trim()) {
    const n = Number(raw.trim());
    if (Number.isFinite(n)) return n;
  }
  return null;
}

export function isValidLatLng(
  lat: number | null,
  lng: number | null
): boolean {
  if (lat == null || lng == null) return false;
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}
