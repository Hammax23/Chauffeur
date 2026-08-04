import { fleetData } from "@/data/fleet";

// Default charges (can be overridden by database values)
export const MEET_GREET_CHARGE = 95;
export const BOUQUET_CHARGE = 75;
export const STOP_CHARGE = 20;
export const CHILD_SEAT_CHARGE = 25;
/** GTAA pre-arranged airport pickup fee (sedans / vans / SUVs). */
export const AIRPORT_PICKUP_FEE = 17.25;
export const HST_RATE = 0.13;

/** Allowed tip percents (web + app confirm step). */
export const APP_GRATUITY_PERCENTS = [15, 20, 25] as const;
/** 0 = no tip selected yet. */
export const APP_DEFAULT_GRATUITY_PERCENT = 0;

// Distance-based pricing: Base price covers first X km, then extra per km after
export const BASE_DISTANCE_KM = 17;
export const EXTRA_KM_RATE = 3.2;

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
  /** When true, GTAA airport pickup fee is added. Prefer passing pickupLocation instead. */
  airportPickup?: boolean;
  pickupLocation?: string;
}

export interface ReservationPricingResult {
  rideFare: number;
  stopCharge: number;
  childSeatCharge: number;
  meetGreetCharge: number;
  bouquetCharge: number;
  airportPickupFee: number;
  subtotal: number;
  hst: number;
  gratuity: number;
  gratuityPercent: number;
  total: number;
}

/**
 * App distance booking fare — same model as website Fleet Pricing:
 * `hourlyRate` input here is treated as distance base price for first `baseDistanceKm`,
 * then `extraKmRate` per extra km. (Mobile app fleet still maps rates this way.)
 * Falls back to legacy `km × pricePerKm` when base is missing.
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
}): ReservationPricingResult | null {
  const meters = Number(input.distanceMeters) || 0;
  if (meters <= 0) return null;

  const km = meters / 1000;
  const basePrice = Number(input.hourlyRate) || 0;
  const baseDistanceKm = Number(input.baseDistanceKm) || BASE_DISTANCE_KM;
  const extraKmRate = Number(input.extraKmRate) || EXTRA_KM_RATE;

  let rideFare = 0;
  if (basePrice > 0) {
    const extraKm = Math.max(0, km - baseDistanceKm);
    rideFare = basePrice + extraKm * extraKmRate;
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
  if (!Number.isFinite(gratuityPercent) || gratuityPercent < 0) {
    gratuityPercent = 0;
  } else if (
    gratuityPercent > 0 &&
    !(APP_GRATUITY_PERCENTS as readonly number[]).includes(gratuityPercent)
  ) {
    gratuityPercent = APP_DEFAULT_GRATUITY_PERCENT;
  } else {
    gratuityPercent = Math.round(gratuityPercent);
  }
  const gratuity = (subtotal * gratuityPercent) / 100;
  const total = subtotal + hst + gratuity;

  return {
    rideFare,
    stopCharge,
    childSeatCharge,
    meetGreetCharge: 0,
    bouquetCharge: 0,
    airportPickupFee,
    subtotal,
    hst,
    gratuity,
    gratuityPercent,
    total,
  };
}

export interface VehiclePricing {
  id: string;
  /** Hourly booking: $/hour */
  hourlyRate: number;
  /** Distance booking: flat fare covering first baseDistanceKm */
  basePrice: number;
  pricePerKm: number;
  /** Per-vehicle: km covered by base price (falls back to global charges) */
  baseDistanceKm?: number;
  /** Per-vehicle: $/km after base distance (falls back to global charges) */
  extraKmRate?: number;
}

export interface ChargesConfig {
  stop: number;
  childSeat: number;
  meetGreet: number;
  bouquet: number;
  hstRate: number;
  baseDistanceKm: number;
  extraKmRate: number;
  airportPickup?: number;
}

const defaultCharges: ChargesConfig = {
  stop: STOP_CHARGE,
  childSeat: CHILD_SEAT_CHARGE,
  meetGreet: MEET_GREET_CHARGE,
  bouquet: BOUQUET_CHARGE,
  hstRate: HST_RATE,
  baseDistanceKm: BASE_DISTANCE_KM,
  extraKmRate: EXTRA_KM_RATE,
  airportPickup: AIRPORT_PICKUP_FEE,
};

export function calculateReservationPricing(
  input: ReservationPricingInput,
  fleetSource?: VehiclePricing[],
  charges?: Partial<ChargesConfig>
): ReservationPricingResult | null {
  const fleet =
    fleetSource ??
    fleetData.map((v) => ({
      id: v.id,
      hourlyRate: v.price,
      basePrice: v.basePrice ?? v.price,
      pricePerKm: v.pricePerKm,
    }));
  const vehicle = fleet.find((v) => v.id === input.vehicleId);
  if (!vehicle) return null;

  const c = { ...defaultCharges, ...charges };
  const hourlyRate = Number(vehicle.hourlyRate) || 0;
  const basePrice = Number(vehicle.basePrice) > 0 ? Number(vehicle.basePrice) : hourlyRate;

  let rideFare = 0;
  if (input.bookingMode === "hourly") {
    const hours = input.hourlyDuration ?? 3;
    if (hours < 3) return null;
    if (hourlyRate <= 0) return null;
    rideFare = hourlyRate * hours;
  } else {
    const meters = input.distanceMeters ?? 0;
    if (meters <= 0) return null;
    if (basePrice <= 0) return null;
    const distanceKm = meters / 1000;
    const baseKm =
      Number(vehicle.baseDistanceKm) > 0 ? Number(vehicle.baseDistanceKm) : c.baseDistanceKm;
    const extraRate =
      Number(vehicle.extraKmRate) > 0
        ? Number(vehicle.extraKmRate)
        : Number(vehicle.pricePerKm) > 0
          ? Number(vehicle.pricePerKm)
          : c.extraKmRate;
    const extraKm = Math.max(0, distanceKm - baseKm);
    rideFare = basePrice + extraKm * extraRate;
  }

  const stopCharge = (input.stopCount ?? 0) * c.stop;
  const childSeatCharge = (input.childSeatCount ?? 0) * c.childSeat;
  const meetGreetCharge = input.meetGreet ? c.meetGreet : 0;
  const bouquetCharge = input.bouquetFlowers ? c.bouquet : 0;
  const applyAirport =
    input.airportPickup === true || isAirportPickupLocation(input.pickupLocation);
  const airportPickupFee = applyAirport ? (c.airportPickup ?? AIRPORT_PICKUP_FEE) : 0;
  const subtotal =
    rideFare + stopCharge + childSeatCharge + meetGreetCharge + bouquetCharge + airportPickupFee;
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
    airportPickupFee,
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
