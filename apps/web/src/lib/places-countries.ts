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
