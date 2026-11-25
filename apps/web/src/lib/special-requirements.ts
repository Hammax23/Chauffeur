/**
 * App / website bookings stash internal meta into `specialRequirements`
 * (booking mode, transfer type, pax counts, stripe id…). Strip those for
 * admin forms + invoice notes — keep real guest requests / M&G / bouquet / etc.
 */
const INTERNAL_META_LINE =
  /^(Booking mode|Transfer type|Adults|Children|Duration \(hours\)|Return|Stripe payment)\s*:/i;

export function humanSpecialRequirements(raw?: string | null): string {
  const text = String(raw || "").trim();
  if (!text) return "";
  return text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !INTERNAL_META_LINE.test(line))
    .join("\n")
    .trim();
}
