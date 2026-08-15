import prisma from "@/lib/prisma";
import {
  APP_DEFAULT_GRATUITY_PERCENT,
  calculateAppDistanceFare,
  type ReservationPricingResult,
} from "@/lib/reservation-pricing";

export type AppReservationFareInput = {
  vehicleId?: unknown;
  vehicle?: unknown;
  distanceMeters?: unknown;
  stops?: unknown;
  childSeats?: unknown;
  gratuityPercent?: unknown;
  pickupLocation?: unknown;
};

export async function resolveAppReservationFare(
  input: AppReservationFareInput
): Promise<{ pricing: ReservationPricingResult } | { error: string }> {
  const meters = Number(input.distanceMeters) || 0;
  if (meters <= 0) {
    return { error: "Valid trip distance is required" };
  }

  const vehicleId = typeof input.vehicleId === "string" ? input.vehicleId.trim() : "";
  const vehicleTitle = typeof input.vehicle === "string" ? input.vehicle.trim() : "";

  let hourlyRate = 0;
  let pricePerKm = 0;
  let vehicleBaseKm = 0;
  let vehicleExtraRate = 0;

  // AppFleetVehicle only stores pricePerKm + hourlyRate.
  // baseDistanceKm / extraKmRate come from ReservationCharges (global).
  if (vehicleId) {
    const fleetRow = await prisma.appFleetVehicle.findFirst({
      where: {
        OR: [{ tierId: vehicleId }, { id: vehicleId }],
        isActive: true,
      },
      select: {
        pricePerKm: true,
        hourlyRate: true,
      },
    });
    if (fleetRow) {
      hourlyRate = fleetRow.hourlyRate || 0;
      pricePerKm = fleetRow.pricePerKm || 0;
    }
  }

  if (hourlyRate <= 0 && pricePerKm <= 0 && vehicleTitle) {
    const byTitle = await prisma.appFleetVehicle.findFirst({
      where: { title: vehicleTitle, isActive: true },
      select: {
        pricePerKm: true,
        hourlyRate: true,
      },
    });
    if (byTitle) {
      hourlyRate = byTitle.hourlyRate || 0;
      pricePerKm = byTitle.pricePerKm || 0;
    }
  }

  if (hourlyRate <= 0 && pricePerKm <= 0) {
    return { error: "Could not resolve vehicle pricing" };
  }

  const { getPricingConfig } = await import("@/lib/get-pricing-config");
  const { charges } = await getPricingConfig();
  vehicleBaseKm = charges.baseDistanceKm;
  vehicleExtraRate =
    pricePerKm > 0 ? pricePerKm : charges.extraKmRate;
  const hasStop = typeof input.stops === "string" && input.stops.trim().length >= 3;
  const pickupLocation =
    typeof input.pickupLocation === "string" ? input.pickupLocation : "";

  const pricing = calculateAppDistanceFare({
    distanceMeters: meters,
    hourlyRate,
    pricePerKm,
    baseDistanceKm: vehicleBaseKm,
    extraKmRate: vehicleExtraRate,
    hasStop,
    childSeatCount: Number(input.childSeats) || 0,
    gratuityPercent: (() => {
      const n = Number(input.gratuityPercent);
      return Number.isFinite(n) && n >= 0 ? n : APP_DEFAULT_GRATUITY_PERCENT;
    })(),
    pickupLocation,
  });

  if (!pricing) {
    return { error: "Unable to calculate fare" };
  }

  return { pricing };
}

export function fareTotalCents(total: number): number {
  return Math.round(total * 100);
}
