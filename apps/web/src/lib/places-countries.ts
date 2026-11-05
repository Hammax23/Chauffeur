/**
 * Multi-country Places / Maps targeting.
 *
 * Env (comma-separated ISO-3166 alpha-2, max 5 for Google Autocomplete):
 *   GOOGLE_PLACES_COUNTRIES=ca,pk,us
 *   NEXT_PUBLIC_GOOGLE_PLACES_COUNTRIES=ca,pk,us  (browser PlacesAutocomplete)
 *
 * Special: `all` / `*` / `worldwide` → no country filter (global search).
 * Default: Canada + Pakistan + US (SARJ home + PK testing + cross-border).
 */

const DEFAULT_COUNTRIES = ["ca", "pk", "us"] as const;

function parseCountryList(raw: string | undefined | null): string[] | "all" {
  const t = String(raw || "").trim().toLowerCase();
  if (!t) return [...DEFAULT_COUNTRIES];
  if (t === "all" || t === "*" || t === "worldwide") return "all";
  const codes = t
    .split(/[,|\s]+/)
    .map((c) => c.trim().toLowerCase())
    .filter((c) => /^[a-z]{2}$/.test(c))
    .slice(0, 5);
  return codes.length > 0 ? codes : [...DEFAULT_COUNTRIES];
}

function envCountries(): string[] | "all" {
  return parseCountryList(
    process.env.GOOGLE_PLACES_COUNTRIES ||
      process.env.NEXT_PUBLIC_GOOGLE_PLACES_COUNTRIES
  );
}

/** Country codes for Autocomplete, or null = unrestricted worldwide. */
export function getPlacesCountryCodes(): string[] | null {
  const parsed = envCountries();
  if (parsed === "all") return null;
  return parsed;
}

/** Legacy Places Autocomplete REST `components` value, or null to omit. */
export function getPlacesComponentsParam(): string | null {
  const codes = getPlacesCountryCodes();
  if (!codes || codes.length === 0) return null;
  return codes.map((c) => `country:${c}`).join("|");
}

/**
 * Soft Directions/Static Maps `region` bias.
 * Only when a *single* country is configured — with CA+PK+US, omitting region
 * lets Google resolve from the actual pickup/drop addresses (more accurate).
 */
export function getMapsRegionBias(): string | undefined {
  const codes = getPlacesCountryCodes();
  if (!codes || codes.length !== 1) return undefined;
  return codes[0];
}

/**
 * Soft Autocomplete location bias (not a hard restrict).
 * Without this, short typed queries (e.g. "King St") often miss local CA/PK
 * streets unless the user pastes a full Google-formatted address.
 *
 * Preference order for the caller:
 *  1) Device / user GPS (lat/lng query params)
 *  2) First configured country centroid below
 *  3) Toronto (SARJ primary market)
 */
const COUNTRY_AUTOCOMPLETE_BIAS: Record<
  string,
  { lat: number; lng: number; radiusMeters: number }
> = {
  ca: { lat: 43.6532, lng: -79.3832, radiusMeters: 650_000 }, // GTA → Ontario soft
  pk: { lat: 31.5204, lng: 74.3587, radiusMeters: 450_000 }, // Lahore / Punjab
  us: { lat: 40.7128, lng: -74.006, radiusMeters: 500_000 }, // NYC metro soft
};

export type PlacesLocationBias = {
  lat: number;
  lng: number;
  /** Meters — Google Autocomplete soft bias radius. */
  radiusMeters: number;
};

export function getDefaultPlacesLocationBias(): PlacesLocationBias {
  const codes = getPlacesCountryCodes();
  if (codes && codes.length > 0) {
    const hit = COUNTRY_AUTOCOMPLETE_BIAS[codes[0]];
    if (hit) return hit;
  }
  return COUNTRY_AUTOCOMPLETE_BIAS.ca;
}

/** Clamp / validate client-supplied bias; fall back to default. */
export function resolvePlacesLocationBias(opts?: {
  lat?: number | null;
  lng?: number | null;
  radiusMeters?: number | null;
}): PlacesLocationBias {
  const lat = opts?.lat;
  const lng = opts?.lng;
  if (
    typeof lat === "number" &&
    typeof lng === "number" &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  ) {
    const radius =
      typeof opts?.radiusMeters === "number" &&
      Number.isFinite(opts.radiusMeters) &&
      opts.radiusMeters >= 1_000 &&
      opts.radiusMeters <= 2_000_000
        ? Math.round(opts.radiusMeters)
        : 80_000;
    return { lat, lng, radiusMeters: radius };
  }
  return getDefaultPlacesLocationBias();
}
