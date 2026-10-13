export type RideConversationPref = "quiet" | "chat" | "none";
export type RideTemperaturePref = "cool" | "warm" | "none";

export type RidePrefs = {
  conversation: RideConversationPref;
  temperature: RideTemperaturePref;
  helpWithLuggage: boolean;
};

/** SS / Uber defaults when sheet never opened. */
export const DEFAULT_RIDE_PREFS: RidePrefs = {
  conversation: "quiet",
  temperature: "none",
  helpWithLuggage: false,
};

export function normalizeRidePrefs(input?: Partial<RidePrefs> | null): RidePrefs {
  return {
    conversation:
      input?.conversation === "chat" || input?.conversation === "none"
        ? input.conversation
        : "quiet",
    temperature:
      input?.temperature === "cool" || input?.temperature === "warm"
        ? input.temperature
        : "none",
    helpWithLuggage: input?.helpWithLuggage === true,
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

/** Short subtitle for Confirm row. */
export function ridePrefsSummary(prefs: RidePrefs): string {
  const bits: string[] = [conversationLabel(prefs.conversation)];
  if (prefs.temperature !== "none") bits.push(temperatureLabel(prefs.temperature));
  if (prefs.helpWithLuggage) bits.push("Luggage help");
  return bits.join(" · ");
}

/** Block appended into specialRequirements for chauffeur / admin notes. */
export function formatRidePrefsRequirements(prefs: RidePrefs): string {
  return [
    "Ride preferences:",
    `Conversation: ${conversationLabel(prefs.conversation)}`,
    `Temperature: ${temperatureLabel(prefs.temperature)}`,
    `Luggage help: ${prefs.helpWithLuggage ? "Yes" : "No"}`,
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
