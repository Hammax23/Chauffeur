/** App multi-stop helpers. Stored as `"addr1 | addr2"` on the reservation. */

export const MAX_APP_STOPS = 5;
export const STOP_DELIMITER = " | ";

export function parseAppStops(raw?: string | null): string[] {
  if (!raw?.trim()) return [];
  const t = raw.trim();
  if (t.includes("|")) {
    return t
      .split("|")
      .map((s) => s.trim())
      .filter((s) => s.length >= 3);
  }
  return t.length >= 3 ? [t] : [];
}

export function joinAppStops(stops: string[]): string {
  return stops
    .map((s) => s.trim())
    .filter((s) => s.length >= 3)
    .join(STOP_DELIMITER);
}

export function countAppStops(raw?: string | null): number {
  return parseAppStops(raw).length;
}

export function activeStopAddresses(stops: string[]): string[] {
  return stops.map((s) => s.trim()).filter((s) => s.length >= 3);
}
