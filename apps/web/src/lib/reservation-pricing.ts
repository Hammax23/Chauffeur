import { fleetData, type FleetVehicle } from "@/data/fleet";

// Default charges (can be overridden by database values)
export const MEET_GREET_CHARGE = 95;
export const BOUQUET_CHARGE = 75;
export const STOP_CHARGE = 20;
export const CHILD_SEAT_CHARGE = 25;
export const HST_RATE = 0.13;

/** Allowed tip percents in the mobile app confirm step. */
export const APP_GRATUITY_PERCENTS = [20, 25] as const;
export const APP_DEFAULT_GRATUITY_PERCENT = 20;

/**
 * App distance booking fare (matches mobile create/confirm).
 * Server is source of truth — client totals are ignored on create.
 */
export function calculateAppDistanceFare(input: {
  distanceMeters: number;
  pricePerKm: number;
  hasStop: boolean;
  childSeatCount: number;
  gratuityPercent?: number;
}): ReservationPricingResult | null {
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
  if (!Number.isFinite(gratuityPercent) || !(APP_GRATUITY_PERCENTS as readonly number[]).includes(gratuityPercent)) {
    gratuityPercent = APP_DEFAULT_GRATUITY_PERCENT;
  }
  const gratuity = (subtotal * gratuityPercent) / 100;
  const total = subtotal + hst + gratuity;

  return {
    rideFare,
    stopCharge,
    childSeatCharge,
    meetGreetCharge: 0,
    bouquetCharge: 0,
    subtotal,
    hst,
    gratuity,
    gratuityPercent,
    total,
  };
}

// Distance-based pricing: Base price covers first X km, then extra per km after
export const BASE_DISTANCE_KM = 17;
export const EXTRA_KM_RATE = 3.2;

export interface ReservationPricingInput {
  vehicleId: string;
  bookingMode: "distance" | "hourly";
  distanceMeters?: number;
  hourlyDuration?: number;
  stopCount?: number;
  childSeatCount?: number;
  meetGreet?: boolean;
  bouquetFlowers?: boolean;
  gratuityPercent?: number;
}

export interface ReservationPricingResult {
  rideFare: number;
  stopCharge: number;
  childSeatCharge: number;
  meetGreetCharge: number;
  bouquetCharge: number;
  subtotal: number;
  hst: number;
  gratuity: number;
  gratuityPercent: number;
  total: number;
}

export interface VehiclePricing {
  id: string;
  price: number;      // hourlyRate
  pricePerKm: number;
}

export interface ChargesConfig {
  stop: number;
  childSeat: number;
  meetGreet: number;
  bouquet: number;
  hstRate: number;
  baseDistanceKm: number;
  extraKmRate: number;
}

const defaultCharges: ChargesConfig = {
  stop: STOP_CHARGE,
  childSeat: CHILD_SEAT_CHARGE,
  meetGreet: MEET_GREET_CHARGE,
  bouquet: BOUQUET_CHARGE,
  hstRate: HST_RATE,
  baseDistanceKm: BASE_DISTANCE_KM,
  extraKmRate: EXTRA_KM_RATE,
};

export function calculateReservationPricing(
  input: ReservationPricingInput,
  fleetSource?: VehiclePricing[],
  charges?: Partial<ChargesConfig>
): ReservationPricingResult | null {
  // Use provided fleet source or fall back to static data
  const fleet = fleetSource ?? fleetData.map(v => ({ id: v.id, price: v.price, pricePerKm: v.pricePerKm }));
  const vehicle = fleet.find((v) => v.id === input.vehicleId);
  if (!vehicle) return null;

  // Merge charges with defaults
  const c = { ...defaultCharges, ...charges };

  let rideFare = 0;
  if (input.bookingMode === "hourly") {
    const hours = input.hourlyDuration ?? 3;
    if (hours < 3) return null;
    rideFare = vehicle.price * hours;
  } else {
    // Distance-based pricing: Base price covers first X km, then extra $/km after
    const meters = input.distanceMeters ?? 0;
    if (meters <= 0) return null;
    const distanceKm = meters / 1000;
    const basePrice = vehicle.price; // Base price covers first c.baseDistanceKm
    const extraKm = Math.max(0, distanceKm - c.baseDistanceKm);
    const extraCharge = extraKm * c.extraKmRate;
    rideFare = basePrice + extraCharge;
  }

  const stopCharge = (input.stopCount ?? 0) * c.stop;
  const childSeatCharge = (input.childSeatCount ?? 0) * c.childSeat;
  const meetGreetCharge = input.meetGreet ? c.meetGreet : 0;
  const bouquetCharge = input.bouquetFlowers ? c.bouquet : 0;
  const subtotal = rideFare + stopCharge + childSeatCharge + meetGreetCharge + bouquetCharge;
  const hst = subtotal * c.hstRate;
  const gratuityPercent = input.gratuityPercent ?? 15;
  const gratuity = (subtotal * gratuityPercent) / 100;
  const total = subtotal + hst + gratuity;

  return {
    rideFare,
    stopCharge,
    childSeatCharge,
    meetGreetCharge,
    bouquetCharge,
    subtotal,
    hst,
    gratuity,
    gratuityPercent,
    total,
  };
}

export function reservationTotalCents(
  input: ReservationPricingInput,
  fleetSource?: VehiclePricing[],
  charges?: Partial<ChargesConfig>
): number | null {
  const pricing = calculateReservationPricing(input, fleetSource, charges);
  if (!pricing || pricing.total <= 0) return null;
  return Math.round(pricing.total * 100);
}
