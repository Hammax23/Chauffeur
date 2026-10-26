import { isAirportPickupLocation } from "./app-fare";

export type AirportPlaceContext = {
  iata?: string;
  terminal?: string;
  /** Short display label for the picker context block. */
  label: string;
};

const IATA_RE =
  /(^|[^a-z])(yyz|ytz|yhm|yul|yow|yvr|yyc|yeg|yqb|yxu|ywg)([^a-z]|$)/i;

const TERMINAL_RE = /\bterminal\s*([1-3]|[a-z0-9]+)\b/i;

const SHORT_NAMES: { test: RegExp; label: string; iata?: string }[] = [
  { test: /\bpearson\b|\byyz\b/i, label: "Toronto Pearson", iata: "YYZ" },
  { test: /\bbilly\s+bishop\b|\bytz\b/i, label: "Billy Bishop", iata: "YTZ" },
  { test: /\btrudeau\b|\byul\b/i, label: "Montréal-Trudeau", iata: "YUL" },
  { test: /\byvr\b|\bvancouver\s+int/i, label: "Vancouver Intl", iata: "YVR" },
  { test: /\byyc\b|\bcalgary\s+int/i, label: "Calgary Intl", iata: "YYC" },
  { test: /\byeg\b|\bedmonton\s+int/i, label: "Edmonton Intl", iata: "YEG" },
  { test: /\byow\b|\bottawa/i, label: "Ottawa Intl", iata: "YOW" },
  { test: /\byhm\b|\bhamilton/i, label: "John C. Munro Hamilton", iata: "YHM" },
];

/**
 * Parse terminal / IATA / short label from a Google place address + description
 * for Uber-style airline picker context (e.g. "Terminal 3" / "YYZ").
 */
export function parseAirportContext(
  address?: string | null,
  description?: string | null
): AirportPlaceContext {
  const hay = [address, description].filter(Boolean).join(" · ").trim();
  if (!hay) return { label: "Airport" };

  let iata: string | undefined;
  const iataMatch = hay.match(IATA_RE);
  if (iataMatch?.[2]) iata = iataMatch[2].toUpperCase();

  let terminal: string | undefined;
  const termMatch = hay.match(TERMINAL_RE);
  if (termMatch) {
    const raw = (termMatch[1] || "").trim();
    terminal = raw ? `Terminal ${raw.replace(/^terminal\s*/i, "")}` : "Terminal";
  }

  let label = "Airport";
  for (const row of SHORT_NAMES) {
    if (row.test.test(hay)) {
      label = row.label;
      if (!iata && row.iata) iata = row.iata;
      break;
    }
  }
  if (label === "Airport" && description?.trim()) {
    const d = description.trim();
    label = d.length > 42 ? `${d.slice(0, 40)}…` : d;
  } else if (label === "Airport" && address?.trim()) {
    const a = address.trim();
    label = a.length > 42 ? `${a.slice(0, 40)}…` : a;
  }

  return { iata, terminal, label };
}

/** True if address or description looks like an airport place. */
export function isAirportPlace(
  address?: string | null,
  description?: string | null
): boolean {
  return (
    isAirportPickupLocation(address) ||
    isAirportPickupLocation(description) ||
    !!(description && IATA_RE.test(description))
  );
}
