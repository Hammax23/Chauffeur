import prisma from "@/lib/prisma";
import { fleetData } from "@/data/fleet";
import type { VehiclePricing, ChargesConfig } from "@/lib/reservation-pricing";
import { STOP_CHARGE, CHILD_SEAT_CHARGE, MEET_GREET_CHARGE, BOUQUET_CHARGE, HST_RATE, BASE_DISTANCE_KM, EXTRA_KM_RATE } from "@/lib/reservation-pricing";

export interface PricingConfig {
  fleet: VehiclePricing[];
  charges: ChargesConfig;
}

/**
 * Fetches fleet pricing and charges from database.
 * Falls back to static data if database is unavailable.
 */
export async function getPricingConfig(): Promise<PricingConfig> {
  let fleet: VehiclePricing[] = [];
  let charges: ChargesConfig = {
    stop: STOP_CHARGE,
    childSeat: CHILD_SEAT_CHARGE,
    meetGreet: MEET_GREET_CHARGE,
    bouquet: BOUQUET_CHARGE,
    hstRate: HST_RATE,
    baseDistanceKm: BASE_DISTANCE_KM,
    extraKmRate: EXTRA_KM_RATE,
  };

  try {
    // Fetch fleet from database
    const dbVehicles = await prisma.fleetVehicle.findMany({
      where: { isActive: true },
      select: { vehicleId: true, hourlyRate: true, pricePerKm: true },
    });

    if (dbVehicles.length > 0) {
      fleet = dbVehicles.map((v) => ({
        id: v.vehicleId,
        price: v.hourlyRate,
        pricePerKm: v.pricePerKm,
      }));
    }

    // Fetch charges from database
    const dbCharges = await prisma.reservationCharges.findMany({
      where: { isActive: true },
    });

    for (const c of dbCharges) {
      switch (c.chargeKey) {
        case "stop":
          charges.stop = c.amount;
          break;
        case "childSeat":
          charges.childSeat = c.amount;
          break;
        case "meetGreet":
          charges.meetGreet = c.amount;
          break;
        case "bouquet":
          charges.bouquet = c.amount;
          break;
        case "hst":
          charges.hstRate = c.isPercentage ? c.amount / 100 : c.amount;
          break;
        case "baseDistanceKm":
          charges.baseDistanceKm = c.amount;
          break;
        case "extraKmRate":
          charges.extraKmRate = c.amount;
          break;
      }
    }
  } catch (error) {
    // Database not available - use static data
    console.log("[PricingConfig] Using static data (DB unavailable)");
  }

  // Fall back to static fleet if database is empty
  if (fleet.length === 0) {
    fleet = fleetData.map((v) => ({
      id: v.id,
      price: v.price,
      pricePerKm: v.pricePerKm,
    }));
  }

  return { fleet, charges };
}
