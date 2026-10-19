export type RideConversationPref = "quiet" | "chat" | "none";
export type RideTemperaturePref = "cool" | "warm" | "none";

export const MAX_LUGGAGE_BAGS = 12;

export type RidePrefs = {
  conversation: RideConversationPref;
  temperature: RideTemperaturePref;
  helpWithLuggage: boolean;
  /** Bag count when travelling with luggage (0 when off). */
  luggageBagCount: number;
};

/** SS / Uber defaults when sheet never opened. */
export const DEFAULT_RIDE_PREFS: RidePrefs = {
  conversation: "quiet",
  temperature: "none",
  helpWithLuggage: false,
  luggageBagCount: 0,
};

export function normalizeRidePrefs(input?: Partial<RidePrefs> | null): RidePrefs {
  const rawCount = Math.floor(Number(input?.luggageBagCount) || 0);
  const count = Number.isFinite(rawCount) ? Math.max(0, Math.min(MAX_LUGGAGE_BAGS, rawCount)) : 0;
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
    luggageBagCount: help ? Math.max(1, count || 1) : 0,
  };
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
  ].join("\n");
}

export function mergeSpecialRequirements(
  existing: string | undefined,
  block: string
): string {
  const base = (existing || "").trim();
  const next = (block || "").trim();
  if (!next) return base;
  if (!base) return next;
  const header = next.split("\n")[0]?.trim();
  if (header && base.includes(header)) return base;
  return `${base}\n${next}`;
}
