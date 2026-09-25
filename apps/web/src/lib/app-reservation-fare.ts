import prisma from "@/lib/prisma";
import {
  APP_DEFAULT_GRATUITY_PERCENT,
  calculateAppDistanceFare,
  calculateAppHourlyFare,
  type ReservationPricingResult,
} from "@/lib/reservation-pricing";
import {
  applyDiscountToPricing,
  computeDiscountAmount,
  findEligiblePromotion,
  normalizePromoCode,
  type AppFareWithPromo,
} from "@/lib/promotions";

export type AppReservationFareInput = {
  vehicleId?: unknown;
  vehicle?: unknown;
  distanceMeters?: unknown;
  stops?: unknown;
  childSeats?: unknown;
  gratuityPercent?: unknown;
  pickupLocation?: unknown;
  bookingMode?: unknown;
  hourlyDuration?: unknown;
  /** Optional promo code (mobile checkout). */
  promoCode?: unknown;
  /** Required when applying a promo (eligibility / per-customer limits). */
  customerId?: unknown;
};

export type { AppFareWithPromo };

export async function resolveAppReservationFare(
  input: AppReservationFareInput
): Promise<{ pricing: AppFareWithPromo } | { error: string }> {
  const bookingMode =
    String(input.bookingMode || "distance").toLowerCase() === "hourly"
      ? "hourly"
      : "distance";

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
  vehicleExtraRate = pricePerKm > 0 ? pricePerKm : charges.extraKmRate;
  const hasStop = typeof input.stops === "string" && input.stops.trim().length >= 3;
  const pickupLocation =
    typeof input.pickupLocation === "string" ? input.pickupLocation : "";
  const gratuityPercent = (() => {
    const n = Number(input.gratuityPercent);
    return Number.isFinite(n) && n >= 0 ? n : APP_DEFAULT_GRATUITY_PERCENT;
  })();
  const childSeatCount = Number(input.childSeats) || 0;

  let basePricing: ReservationPricingResult | null = null;

  if (bookingMode === "hourly") {
    if (hourlyRate <= 0) {
      return { error: "This vehicle is not available for hourly booking" };
    }
    const hours = Math.max(3, Math.floor(Number(input.hourlyDuration) || 3));
    basePricing = calculateAppHourlyFare({
      hours,
      hourlyRate,
      hasStop,
      childSeatCount,
      gratuityPercent,
      pickupLocation,
    });
    if (!basePricing) {
      return { error: "Unable to calculate hourly fare" };
    }
  } else {
    const meters = Number(input.distanceMeters) || 0;
    if (meters <= 0) {
      return { error: "Valid trip distance is required" };
    }

    basePricing = calculateAppDistanceFare({
      distanceMeters: meters,
      hourlyRate,
      pricePerKm,
      baseDistanceKm: vehicleBaseKm,
      extraKmRate: vehicleExtraRate,
      hasStop,
      childSeatCount,
      gratuityPercent,
      pickupLocation,
    });

    if (!basePricing) {
      return { error: "Unable to calculate fare" };
    }
  }

  const rawCode = normalizePromoCode(input.promoCode);
  if (!rawCode) {
    return {
      pricing: applyDiscountToPricing(basePricing, 0, null, null),
    };
  }

  const customerId =
    typeof input.customerId === "string" ? input.customerId.trim() : "";
  if (!customerId) {
    return { error: "Sign in to apply a promo code." };
  }

  const eligible = await findEligiblePromotion({
    code: rawCode,
    customerId,
    subtotal: basePricing.subtotal,
  });
  if (!eligible.ok) {
    return { error: eligible.message };
  }

  const discountAmount = computeDiscountAmount(
    eligible.promotion,
    basePricing.subtotal
  );
  return {
    pricing: applyDiscountToPricing(
      basePricing,
      discountAmount,
      eligible.promotion.code,
      eligible.promotion.id
    ),
  };
}

export function fareTotalCents(total: number): number {
  return Math.round(total * 100);
}
