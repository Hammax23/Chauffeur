import { fleetData } from "@/data/fleet";

export const MEET_GREET_CHARGE = 95;
export const BOUQUET_CHARGE = 75;
export const STOP_CHARGE = 20;
export const CHILD_SEAT_CHARGE = 25;
export const HST_RATE = 0.13;

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

export function calculateReservationPricing(
  input: ReservationPricingInput
): ReservationPricingResult | null {
  const vehicle = fleetData.find((v) => v.id === input.vehicleId);
  if (!vehicle) return null;

  let rideFare = 0;
  if (input.bookingMode === "hourly") {
    const hours = input.hourlyDuration ?? 3;
    if (hours < 3) return null;
    rideFare = vehicle.price * hours;
  } else {
    const meters = input.distanceMeters ?? 0;
    if (meters <= 0) return null;
    rideFare = (meters / 1000) * vehicle.pricePerKm;
  }

  const stopCharge = (input.stopCount ?? 0) * STOP_CHARGE;
  const childSeatCharge = (input.childSeatCount ?? 0) * CHILD_SEAT_CHARGE;
  const meetGreetCharge = input.meetGreet ? MEET_GREET_CHARGE : 0;
  const bouquetCharge = input.bouquetFlowers ? BOUQUET_CHARGE : 0;
  const subtotal = rideFare + stopCharge + childSeatCharge + meetGreetCharge + bouquetCharge;
  const hst = subtotal * HST_RATE;
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

export function reservationTotalCents(input: ReservationPricingInput): number | null {
  const pricing = calculateReservationPricing(input);
  if (!pricing || pricing.total <= 0) return null;
  return Math.round(pricing.total * 100);
}
