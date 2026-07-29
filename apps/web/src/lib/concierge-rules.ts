/** Hotel Concierge — vehicle request eligibility rules */

export type VehicleClass = "SEDAN" | "SUV" | "CADILLAC";

export type VehicleRequestRule = "SEDAN" | "SEDAN_ONLY" | "SUV" | "CADILLAC_ONLY";

export const VEHICLE_REQUEST_RULES: { value: VehicleRequestRule; label: string; accepts: string }[] = [
  { value: "SEDAN", label: "Sedan (any eligible)", accepts: "Sedan, SUV, Cadillac" },
  { value: "SEDAN_ONLY", label: "Sedan Only", accepts: "Sedan only" },
  { value: "SUV", label: "SUV", accepts: "SUV, Yukon, Suburban, Escalade" },
  { value: "CADILLAC_ONLY", label: "Cadillac Only", accepts: "Cadillac only" },
];

export const VEHICLE_CLASSES: { value: VehicleClass; label: string }[] = [
  { value: "SEDAN", label: "Sedan" },
  { value: "SUV", label: "SUV" },
  { value: "CADILLAC", label: "Cadillac" },
];

/** Which driver vehicleClass values may accept a given request rule. */
export function classesForRule(rule: VehicleRequestRule): VehicleClass[] {
  switch (rule) {
    case "SEDAN":
      return ["SEDAN", "SUV", "CADILLAC"];
    case "SEDAN_ONLY":
      return ["SEDAN"];
    case "SUV":
      return ["SUV", "CADILLAC"];
    case "CADILLAC_ONLY":
      return ["CADILLAC"];
    default:
      return [];
  }
}

export function canDriverAcceptRule(
  driverClass: string,
  rule: string,
  vehicleLabel?: string | null
): boolean {
  const allowed = classesForRule(rule as VehicleRequestRule);
  if (!allowed.includes(driverClass as VehicleClass)) return false;

  // SUV rule: any SUV class or Cadillac Escalade-style labels under CADILLAC/SUV
  if (rule === "SUV") {
    const label = (vehicleLabel || "").toLowerCase();
    if (driverClass === "CADILLAC") {
      return /escalade|cadillac/.test(label) || label.length === 0;
    }
    return true;
  }
  return true;
}

export function isMembershipActive(
  status: string,
  expiresAt?: Date | string | null
): boolean {
  if (status !== "ACTIVE") return false;
  if (!expiresAt) return true;
  const exp = typeof expiresAt === "string" ? new Date(expiresAt) : expiresAt;
  return exp.getTime() > Date.now();
}

export const PLATFORM_FEE_PERCENT = 5;

export function computePlatformFee(fare: number, paymentMethod: string): number {
  if (paymentMethod !== "APP") return 0;
  return Math.round(fare * (PLATFORM_FEE_PERCENT / 100) * 100) / 100;
}

export function computeHotelCommission(fare: number, commissionPercent: number): number {
  return Math.round(fare * (commissionPercent / 100) * 100) / 100;
}

export function syncCommissionMatch(driverClaim: string, conciergeClaim: string): {
  matched: boolean;
  disputeOpen: boolean;
} {
  if (driverClaim === "UNSET" || conciergeClaim === "UNSET") {
    return { matched: false, disputeOpen: false };
  }
  const paidPair = driverClaim === "PAID" && conciergeClaim === "RECEIVED";
  const unpaidPair = driverClaim === "NOT_PAID" && conciergeClaim === "NOT_RECEIVED";
  const matched = paidPair || unpaidPair;
  return { matched, disputeOpen: !matched };
}

export function makeRequestCode(): string {
  return `HC-${Date.now().toString(36).toUpperCase()}${Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, "0")}`;
}
