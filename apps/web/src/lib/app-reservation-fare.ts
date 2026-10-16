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
import { applyReferralCreditToPricing } from "@/lib/referrals";

function parseMeetGreetFlag(raw: unknown): boolean {
  return raw === true || raw === "true" || raw === 1 || raw === "1";
}

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
  /** Meet & Greet add-on (airport From pickups). */
  meetGreet?: unknown;
  /** Optional promo code (mobile checkout). */
  promoCode?: unknown;
  /** Required when applying a promo or referral credit. */
  customerId?: unknown;
  /** Apply one-time referral $20 credit (mutually exclusive with promoCode). */
  useReferralCredit?: unknown;
  /** Same-type vehicle units on one trip (1–5). */
  vehicleCount?: unknown;
  /**
   * Mixed fleets on one trip — each line is a tier + quantity.
   * When present (2+ lines or explicit), fare is the sum of each line.
   */
  fleetLines?: unknown;
};

export type { AppFareWithPromo };

type FleetLineIn = { vehicleId: string; quantity: number };

function normalizeFleetLinesInput(raw: unknown): FleetLineIn[] | null {
  if (!Array.isArray(raw) || raw.length === 0) return null;
  const merged = new Map<string, number>();
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const row = item as { vehicleId?: unknown; tierId?: unknown; quantity?: unknown };
    const id = String(row.vehicleId || row.tierId || "").trim();
    if (!id) continue;
    const q = Math.max(1, Math.min(5, Math.floor(Number(row.quantity) || 1)));
    merged.set(id, Math.min(5, (merged.get(id) || 0) + q));
  }
  const out: FleetLineIn[] = [];
  let total = 0;
  for (const [vehicleId, quantity] of merged) {
    if (total >= 5) break;
    const q = Math.min(quantity, 5 - total);
    out.push({ vehicleId, quantity: q });
    total += q;
  }
  return out.length > 0 ? out : null;
}

function sumReservationPricing(
  a: ReservationPricingResult,
  b: ReservationPricingResult
): ReservationPricingResult {
  const add = (x: number, y: number) => Math.round(((x || 0) + (y || 0)) * 100) / 100;
  return {
    ...a,
    rideFare: add(a.rideFare, b.rideFare),
    stopCharge: add(a.stopCharge, b.stopCharge),
    childSeatCharge: add(a.childSeatCharge, b.childSeatCharge),
    airportPickupFee: add(a.airportPickupFee, b.airportPickupFee),
    meetGreetCharge: add(a.meetGreetCharge, b.meetGreetCharge),
    bouquetCharge: add(a.bouquetCharge, b.bouquetCharge),
    subtotal: add(a.subtotal, b.subtotal),
    hst: add(a.hst, b.hst),
    gratuity: add(a.gratuity, b.gratuity),
    total: add(a.total, b.total),
  };
}

export async function resolveAppReservationFare(
  input: AppReservationFareInput
): Promise<{ pricing: AppFareWithPromo } | { error: string }> {
  const fleetLines = normalizeFleetLinesInput(input.fleetLines);
  // Mixed fleets: price each line, then apply promo once on the sum.
  if (fleetLines && fleetLines.length > 1) {
    let combined: ReservationPricingResult | null = null;
    for (let i = 0; i < fleetLines.length; i++) {
      const line = fleetLines[i];
      const part = await resolveAppReservationFare({
        ...input,
        fleetLines: undefined,
        vehicleId: line.vehicleId,
        vehicleCount: line.quantity,
        childSeats: i === 0 ? input.childSeats : 0,
        meetGreet: i === 0 ? input.meetGreet : false,
        promoCode: undefined,
        useReferralCredit: undefined,
      });
      if ("error" in part) return part;
      combined = combined
        ? sumReservationPricing(combined, part.pricing)
        : part.pricing;
    }
    if (!combined) return { error: "Unable to calculate fare" };

    const useReferral =
      input.useReferralCredit === true ||
      input.useReferralCredit === "true" ||
      input.useReferralCredit === 1 ||
      input.useReferralCredit === "1";
    const rawCode = normalizePromoCode(input.promoCode);
    const customerId =
      typeof input.customerId === "string" ? input.customerId.trim() : "";

    if (useReferral && rawCode) {
      return {
        error: "Use either a promo code or your referral credit, not both.",
      };
    }
    if (useReferral) {
      if (!customerId) {
        return { error: "Sign in to apply referral credit." };
      }
      const applied = await applyReferralCreditToPricing(combined, customerId, true);
      if ("error" in applied) return { error: applied.error };
      return {
        pricing: {
          ...applied.pricing,
          referralRewardId: applied.referralRewardId,
        },
      };
    }
    if (!rawCode) {
      return { pricing: applyDiscountToPricing(combined, 0, null, null) };
    }
    if (!customerId) {
      return { error: "Sign in to apply a promo code." };
    }
    const eligible = await findEligiblePromotion({
      code: rawCode,
      customerId,
      subtotal: combined.subtotal,
    });
    if (!eligible.ok) {
      return { error: eligible.message };
    }
    const discountAmount = computeDiscountAmount(
      eligible.promotion,
      combined.subtotal
    );
    return {
      pricing: applyDiscountToPricing(
        combined,
        discountAmount,
        eligible.promotion.code,
        eligible.promotion.id
      ),
    };
  }

  // Single fleet line → reuse classic vehicleId + vehicleCount path.
  if (fleetLines && fleetLines.length === 1) {
    input = {
      ...input,
      vehicleId: fleetLines[0].vehicleId,
      vehicleCount: fleetLines[0].quantity,
      fleetLines: undefined,
    };
  }

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
  const stopCount = (() => {
    if (typeof input.stops !== "string") return 0;
    const t = input.stops.trim();
    if (!t) return 0;
    if (t.includes("|")) {
      return t
        .split("|")
        .map((s) => s.trim())
        .filter((s) => s.length >= 3).length;
    }
    return t.length >= 3 ? 1 : 0;
  })();
  const pickupLocation =
    typeof input.pickupLocation === "string" ? input.pickupLocation : "";
  const gratuityPercent = (() => {
    const n = Number(input.gratuityPercent);
    return Number.isFinite(n) && n >= 0 ? n : APP_DEFAULT_GRATUITY_PERCENT;
  })();
  const childSeatCount = Number(input.childSeats) || 0;
  const meetGreet = parseMeetGreetFlag(input.meetGreet);
  const vehicleCount = (() => {
    const n = Math.floor(Number(input.vehicleCount) || 1);
    if (!Number.isFinite(n) || n < 1) return 1;
    return Math.min(5, n);
  })();

  let basePricing: ReservationPricingResult | null = null;

  if (bookingMode === "hourly") {
    if (hourlyRate <= 0) {
      return { error: "This vehicle is not available for hourly booking" };
    }
    const hours = Math.max(3, Math.floor(Number(input.hourlyDuration) || 3));
    basePricing = calculateAppHourlyFare({
      hours,
      hourlyRate,
      stopCount,
      childSeatCount,
      gratuityPercent,
      pickupLocation,
      meetGreet,
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
      stopCount,
      childSeatCount,
      gratuityPercent,
      pickupLocation,
      meetGreet,
    });

    if (!basePricing) {
      return { error: "Unable to calculate fare" };
    }
  }

  if (vehicleCount > 1 && basePricing) {
    const mul = (x: number) => Math.round((x || 0) * vehicleCount * 100) / 100;
    const rideFare = mul(basePricing.rideFare);
    const stopCharge = mul(basePricing.stopCharge);
    const airportPickupFee = mul(basePricing.airportPickupFee);
    const bouquetCharge = mul(basePricing.bouquetCharge);
    // Trip-level — child seats + Meet & Greet stay once (not × N cars).
    const childSeatCharge = Math.round((basePricing.childSeatCharge || 0) * 100) / 100;
    const meetGreetCharge = Math.round((basePricing.meetGreetCharge || 0) * 100) / 100;
    const subtotal =
      Math.round(
        (rideFare +
          stopCharge +
          childSeatCharge +
          airportPickupFee +
          meetGreetCharge +
          bouquetCharge) *
          100
      ) / 100;
    const tipPct = Number(basePricing.gratuityPercent) || 0;
    const gratuity = Math.round(subtotal * (tipPct / 100) * 100) / 100;
    const hst = Math.round(subtotal * 0.13 * 100) / 100;
    const total = Math.round((subtotal + hst + gratuity) * 100) / 100;
    basePricing = {
      ...basePricing,
      rideFare,
      stopCharge,
      childSeatCharge,
      airportPickupFee,
      meetGreetCharge,
      bouquetCharge,
      subtotal,
      hst,
      gratuity,
      total,
    };
  }

  const useReferral =
    input.useReferralCredit === true ||
    input.useReferralCredit === "true" ||
    input.useReferralCredit === 1 ||
    input.useReferralCredit === "1";
  const rawCode = normalizePromoCode(input.promoCode);
  const customerId =
    typeof input.customerId === "string" ? input.customerId.trim() : "";

  if (useReferral && rawCode) {
    return {
      error: "Use either a promo code or your referral credit, not both.",
    };
  }

  if (useReferral) {
    if (!customerId) {
      return { error: "Sign in to apply referral credit." };
    }
    const applied = await applyReferralCreditToPricing(basePricing, customerId, true);
    if ("error" in applied) return { error: applied.error };
    return {
      pricing: {
        ...applied.pricing,
        referralRewardId: applied.referralRewardId,
      },
    };
  }

  if (!rawCode) {
    return {
      pricing: applyDiscountToPricing(basePricing, 0, null, null),
    };
  }

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
