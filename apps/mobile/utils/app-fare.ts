/** Shared with web `reservation-pricing` app distance fare — keep in sync. */
export const STOP_CHARGE = 20;
export const CHILD_SEAT_CHARGE = 25;
export const HST_RATE = 0.13;
export const APP_GRATUITY_PERCENTS = [20, 25] as const;
export const APP_DEFAULT_GRATUITY_PERCENT = 20;

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

export function calculateAppDistanceFare(input: {
  distanceMeters: number;
  pricePerKm: number;
  hasStop: boolean;
  childSeatCount: number;
  gratuityPercent?: number;
}): AppFareResult | null {
  const meters = Number(input.distanceMeters) || 0;
  const pricePerKm = Number(input.pricePerKm) || 0;
  if (meters <= 0 || pricePerKm <= 0) return null;

  const km = meters / 1000;
  const rideFare = km * pricePerKm;
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
