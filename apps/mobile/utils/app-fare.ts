/** Shared with web `reservation-pricing` app distance fare — keep in sync. */
export const STOP_CHARGE = 20;
export const CHILD_SEAT_CHARGE = 25;
export const HST_RATE = 0.13;
export const APP_GRATUITY_PERCENTS = [20, 25] as const;
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
  subtotal: number;
  hst: number;
  gratuity: number;
  gratuityPercent: number;
  total: number;
  km: number;
};

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
  const subtotal = rideFare + stopCharge + childSeatCharge;
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
