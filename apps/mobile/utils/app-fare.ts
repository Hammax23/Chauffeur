/** Shared with web `reservation-pricing` app distance fare — keep in sync. */
export const STOP_CHARGE = 20;
export const CHILD_SEAT_CHARGE = 25;
/** GTAA pre-arranged airport pickup fee (sedans / vans / SUVs). */
export const AIRPORT_PICKUP_FEE = 17.25;
export const HST_RATE = 0.13;
export const APP_GRATUITY_PERCENTS = [18, 20, 25, 30] as const;
export const APP_DEFAULT_GRATUITY_PERCENT = 20;
export const BASE_DISTANCE_KM = 17;
export const EXTRA_KM_RATE = 3.2;

export type AppDistancePricing = {
  baseDistanceKm: number;
  extraKmRate: number;
};

export type AppFareResult = {
  rideFare: number;
  stopCharge: number;
  childSeatCharge: number;
  airportPickupFee: number;
  subtotal: number;
  hst: number;
  gratuity: number;
  gratuityPercent: number;
  total: number;
  km: number;
};

/** Detect airport pickup from address / IATA code (any airport). */
export function isAirportPickupLocation(location?: string | null): boolean {
  if (!location?.trim()) return false;
  const t = location.trim().toLowerCase();
  if (/\b(yyz|ytz|yhm|yul|yow|yvr|yyc|yeg|yqb|yxu|ywg)\b/.test(t)) return true;
  if (/\bairport\b/.test(t)) return true;
  if (/\bpearson\b/.test(t)) return true;
  if (/\bbilly\s+bishop\b/.test(t)) return true;
  if (/\btrudeau\b/.test(t)) return true;
  if (/\bint(?:ernational)?\.?\s+airport\b/.test(t)) return true;
  return false;
}

/**
 * Same as website Fleet Pricing:
 * hourlyRate = base for first baseDistanceKm, then extraKmRate per extra km.
 * Legacy fallback: km × pricePerKm when hourlyRate is missing.
 */
export function calculateAppDistanceFare(input: {
  distanceMeters: number;
  hourlyRate?: number;
  pricePerKm?: number;
  baseDistanceKm?: number;
  extraKmRate?: number;
  hasStop: boolean;
  childSeatCount: number;
  gratuityPercent?: number;
  airportPickup?: boolean;
  pickupLocation?: string;
}): AppFareResult | null {
  const meters = Number(input.distanceMeters) || 0;
  if (meters <= 0) return null;

  const km = meters / 1000;
  const basePrice = Number(input.hourlyRate) || 0;
  const baseDistanceKm = Number(input.baseDistanceKm) || BASE_DISTANCE_KM;
  const extraKmRate = Number(input.extraKmRate) || EXTRA_KM_RATE;

  let rideFare = 0;
  if (basePrice > 0) {
    rideFare = basePrice + Math.max(0, km - baseDistanceKm) * extraKmRate;
  } else {
    const pricePerKm = Number(input.pricePerKm) || 0;
    if (pricePerKm <= 0) return null;
    rideFare = km * pricePerKm;
  }

  const stopCharge = input.hasStop ? STOP_CHARGE : 0;
  const childSeatCount = Math.max(0, Math.floor(Number(input.childSeatCount) || 0));
  const childSeatCharge = childSeatCount * CHILD_SEAT_CHARGE;
  const airportPickupFee =
    input.airportPickup === true || isAirportPickupLocation(input.pickupLocation)
      ? AIRPORT_PICKUP_FEE
      : 0;
  const subtotal = rideFare + stopCharge + childSeatCharge + airportPickupFee;
  const hst = subtotal * HST_RATE;

  let gratuityPercent = Number(input.gratuityPercent);
  if (
    !Number.isFinite(gratuityPercent) ||
    !(APP_GRATUITY_PERCENTS as readonly number[]).includes(gratuityPercent)
  ) {
    gratuityPercent = APP_DEFAULT_GRATUITY_PERCENT;
  }
  const gratuity = (subtotal * gratuityPercent) / 100;
  const total = subtotal + hst + gratuity;

  return {
    rideFare,
    stopCharge,
    childSeatCharge,
    airportPickupFee,
    subtotal,
    hst,
    gratuity,
    gratuityPercent,
    total,
    km,
  };
}

/** Parse "3 maximum, 3 comfortable" / "4" → max passengers. */
export function parseMaxPassengers(seating: string | undefined | null): number | null {
  if (!seating?.trim()) return null;
  const nums = seating.match(/\d+/g)?.map((n) => parseInt(n, 10)).filter((n) => n > 0);
  if (!nums?.length) return null;
  return Math.max(...nums);
}
