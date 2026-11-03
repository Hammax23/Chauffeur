export type RideConversationPref = "quiet" | "chat" | "none";
export type RideTemperaturePref = "cool" | "warm" | "none";

export const MAX_LUGGAGE_BAGS = 12;

export type RidePrefs = {
  conversation: RideConversationPref;
  temperature: RideTemperaturePref;
  helpWithLuggage: boolean;
  /** Bag count when travelling with luggage (0 when off). */
  luggageBagCount: number;
  /** Request cabin air freshener (Yes / No). */
  airFreshener: boolean;
};

/** SS / Uber defaults when sheet never opened. */
export const DEFAULT_RIDE_PREFS: RidePrefs = {
  conversation: "quiet",
  temperature: "none",
  helpWithLuggage: false,
  luggageBagCount: 0,
  airFreshener: false,
};

export function normalizeRidePrefs(
  input?: Partial<RidePrefs> | null,
  opts?: { maxBags?: number | null }
): RidePrefs {
  const capRaw = Number(opts?.maxBags);
  const cap =
    Number.isFinite(capRaw) && capRaw > 0
      ? Math.min(MAX_LUGGAGE_BAGS, Math.floor(capRaw))
      : MAX_LUGGAGE_BAGS;
  const rawCount = Math.floor(Number(input?.luggageBagCount) || 0);
  const count = Number.isFinite(rawCount)
    ? Math.max(0, Math.min(cap, rawCount))
    : 0;
  const help = input?.helpWithLuggage === true || count > 0;
  return {
    conversation:
      input?.conversation === "chat" || input?.conversation === "none"
        ? input.conversation
        : "quiet",
    temperature:
      input?.temperature === "cool" || input?.temperature === "warm"
        ? input.temperature
        : "none",
    helpWithLuggage: help,
    luggageBagCount: help ? Math.min(cap, Math.max(1, count || 1)) : 0,
    airFreshener: input?.airFreshener === true,
  };
}

/** True when bags exceed the selected vehicle / fleet luggage capacity. */
export function ridePrefsExceedLuggage(
  prefs: RidePrefs,
  maxBags: number
): boolean {
  if (!prefs.helpWithLuggage || prefs.luggageBagCount < 1) return false;
  if (!Number.isFinite(maxBags) || maxBags <= 0) return false;
  return prefs.luggageBagCount > maxBags;
}

export function conversationLabel(v: RideConversationPref): string {
  if (v === "chat") return "Happy to chat";
  if (v === "none") return "No preference";
  return "Quiet";
}

export function temperatureLabel(v: RideTemperaturePref): string {
  if (v === "cool") return "Cool";
  if (v === "warm") return "Warm";
  return "No preference";
}

function bagsLabel(prefs: RidePrefs): string | null {
  if (!prefs.helpWithLuggage || prefs.luggageBagCount < 1) return null;
  const n = prefs.luggageBagCount;
  return n === 1 ? "1 bag" : `${n} bags`;
}

/** Short subtitle for Confirm row. */
export function ridePrefsSummary(prefs: RidePrefs): string {
  const bits: string[] = [conversationLabel(prefs.conversation)];
  if (prefs.temperature !== "none") bits.push(temperatureLabel(prefs.temperature));
  const bags = bagsLabel(prefs);
  if (bags) bits.push(bags);
  if (prefs.airFreshener) bits.push("Air freshener");
  return bits.join(" · ");
}

/** Uber Review row subtitle — e.g. "Quiet preferred · 2 bags". */
export function ridePrefsReviewSummary(prefs: RidePrefs): string {
  const bits: string[] = [];
  if (prefs.conversation === "quiet") bits.push("Quiet preferred");
  else if (prefs.conversation === "chat") bits.push("Happy to chat");
  else bits.push("No conversation preference");
  if (prefs.temperature === "cool") bits.push("Cool cabin");
  if (prefs.temperature === "warm") bits.push("Warm cabin");
  const bags = bagsLabel(prefs);
  if (bags) bits.push(`Travelling with ${bags}`);
  if (prefs.airFreshener) bits.push("Air freshener requested");
  return bits.join(" · ");
}

/** Block appended into specialRequirements for chauffeur / admin notes. */
export function formatRidePrefsRequirements(prefs: RidePrefs): string {
  const bagsLine =
    prefs.helpWithLuggage && prefs.luggageBagCount > 0
      ? `Travelling with bags: Yes (${prefs.luggageBagCount} ${
          prefs.luggageBagCount === 1 ? "bag" : "bags"
        })`
      : "Travelling with bags: No";
  return [
    "Ride preferences:",
    `Conversation: ${conversationLabel(prefs.conversation)}`,
    `Temperature: ${temperatureLabel(prefs.temperature)}`,
    bagsLine,
    `Air freshener: ${prefs.airFreshener ? "Yes" : "No"}`,
  ].join("\n");
}

/** Remove a prior "Ride preferences:" block so the latest prefs always win. */
function stripRidePreferencesBlock(text: string): string {
  const lines = text.split(/\r?\n/);
  const out: string[] = [];
  let skipping = false;
  for (const line of lines) {
    const t = line.trim();
    if (/^Ride preferences:/i.test(t)) {
      skipping = true;
      continue;
    }
    if (skipping) {
      if (
        /^(Conversation|Temperature|Travelling with bags|Air freshener)\s*:/i.test(
          t
        )
      ) {
        continue;
      }
      skipping = false;
      if (!t) continue;
    }
    out.push(line);
  }
  return out.join("\n").trim();
}

export function mergeSpecialRequirements(
  existing: string | undefined,
  block: string
): string {
  const next = (block || "").trim();
  if (!next) return (existing || "").trim();
  const header = next.split("\n")[0]?.trim() || "";
  let base = (existing || "").trim();
  if (/^Ride preferences:/i.test(header)) {
    base = stripRidePreferencesBlock(base);
    return base ? `${base}\n${next}` : next;
  }
  if (!base) return next;
  if (header && base.includes(header)) return base;
  return `${base}\n${next}`;
}
