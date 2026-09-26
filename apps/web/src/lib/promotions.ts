import prisma from "@/lib/prisma";
import { HST_RATE, type ReservationPricingResult } from "@/lib/reservation-pricing";

export type PromotionType = "PERCENT" | "FIXED";

export type PromotionRecord = {
  id: string;
  code: string;
  type: string;
  value: number;
  isActive: boolean;
  startsAt: Date | null;
  endsAt: Date | null;
  maxRedemptions: number | null;
  redeemedCount: number;
  maxPerCustomer: number | null;
  minSubtotal: number | null;
  label: string | null;
};

export type AppFareWithPromo = ReservationPricingResult & {
  discountAmount: number;
  promoCode: string | null;
  promotionId: string | null;
  /** When discount came from referral credit. */
  referralRewardId?: string | null;
};

export function normalizePromoCode(input: unknown): string {
  return String(input || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");
}

export function roundMoney(n: number): number {
  return Math.round((Number(n) || 0) * 100) / 100;
}

/** Compute raw discount from promo + subtotal (not yet capped beyond subtotal). */
export function computeDiscountAmount(
  promo: Pick<PromotionRecord, "type" | "value">,
  subtotal: number
): number {
  const sub = Math.max(0, Number(subtotal) || 0);
  if (sub <= 0) return 0;
  const value = Math.max(0, Number(promo.value) || 0);
  if (promo.type === "PERCENT") {
    const pct = Math.min(100, value);
    return roundMoney(Math.min(sub, (sub * pct) / 100));
  }
  // FIXED
  return roundMoney(Math.min(sub, value));
}

export function applyDiscountToPricing(
  pricing: ReservationPricingResult,
  discountAmount: number,
  promoCode: string | null,
  promotionId: string | null
): AppFareWithPromo {
  const discount = roundMoney(Math.min(Math.max(0, discountAmount), pricing.subtotal));
  const taxable = roundMoney(Math.max(0, pricing.subtotal - discount));
  const hst = roundMoney(taxable * HST_RATE);
  // Gratuity stays on original (pre-discount) subtotal
  const total = roundMoney(taxable + hst + pricing.gratuity);
  return {
    ...pricing,
    hst,
    total,
    discountAmount: discount,
    promoCode: discount > 0 ? promoCode : null,
    promotionId: discount > 0 ? promotionId : null,
    referralRewardId: null,
  };
}

export type PromoEligibilityError =
  | "NOT_FOUND"
  | "INACTIVE"
  | "NOT_STARTED"
  | "EXPIRED"
  | "MAX_REDEMPTIONS"
  | "MAX_PER_CUSTOMER"
  | "MIN_SUBTOTAL"
  | "INVALID";

const ELIGIBILITY_MESSAGES: Record<PromoEligibilityError, string> = {
  NOT_FOUND: "This promo code is not valid.",
  INACTIVE: "This promo code is no longer active.",
  NOT_STARTED: "This promo code is not active yet.",
  EXPIRED: "This promo code has expired.",
  MAX_REDEMPTIONS: "This promo code has reached its usage limit.",
  MAX_PER_CUSTOMER: "You have already used this promo code.",
  MIN_SUBTOTAL: "This booking does not meet the minimum amount for this promo.",
  INVALID: "This promo code is not valid.",
};

export function promoErrorMessage(code: PromoEligibilityError): string {
  return ELIGIBILITY_MESSAGES[code];
}

/**
 * Load promotion by code and check schedule / global / per-customer limits.
 * Does not redeem — call recordPromotionRedemption after booking succeeds.
 */
export async function findEligiblePromotion(opts: {
  code: string;
  customerId: string;
  subtotal: number;
}): Promise<
  | { ok: true; promotion: PromotionRecord }
  | { ok: false; error: PromoEligibilityError; message: string }
> {
  const code = normalizePromoCode(opts.code);
  if (!code) {
    return { ok: false, error: "INVALID", message: promoErrorMessage("INVALID") };
  }

  const promo = await prisma.promotion.findUnique({ where: { code } });
  if (!promo) {
    return { ok: false, error: "NOT_FOUND", message: promoErrorMessage("NOT_FOUND") };
  }

  if (!promo.isActive) {
    return { ok: false, error: "INACTIVE", message: promoErrorMessage("INACTIVE") };
  }

  const now = new Date();
  if (promo.startsAt && promo.startsAt > now) {
    return { ok: false, error: "NOT_STARTED", message: promoErrorMessage("NOT_STARTED") };
  }
  if (promo.endsAt && promo.endsAt < now) {
    return { ok: false, error: "EXPIRED", message: promoErrorMessage("EXPIRED") };
  }

  if (
    promo.maxRedemptions != null &&
    promo.maxRedemptions >= 0 &&
    promo.redeemedCount >= promo.maxRedemptions
  ) {
    return {
      ok: false,
      error: "MAX_REDEMPTIONS",
      message: promoErrorMessage("MAX_REDEMPTIONS"),
    };
  }

  if (promo.minSubtotal != null && opts.subtotal < promo.minSubtotal) {
    return {
      ok: false,
      error: "MIN_SUBTOTAL",
      message: `This promo requires a minimum subtotal of $${promo.minSubtotal.toFixed(2)}.`,
    };
  }

  if (promo.maxPerCustomer != null && promo.maxPerCustomer > 0) {
    const used = await prisma.promotionRedemption.count({
      where: { promotionId: promo.id, customerId: opts.customerId },
    });
    if (used >= promo.maxPerCustomer) {
      return {
        ok: false,
        error: "MAX_PER_CUSTOMER",
        message: promoErrorMessage("MAX_PER_CUSTOMER"),
      };
    }
  }

  if (promo.type !== "PERCENT" && promo.type !== "FIXED") {
    return { ok: false, error: "INVALID", message: promoErrorMessage("INVALID") };
  }
  if (!Number.isFinite(promo.value) || promo.value <= 0) {
    return { ok: false, error: "INVALID", message: promoErrorMessage("INVALID") };
  }

  return { ok: true, promotion: promo };
}

/** Active, in-window promos marked showInApp (for Home banner / Confirm hint). */
export async function listActiveAppBannerPromotions(limit = 5): Promise<
  {
    id: string;
    code: string;
    type: string;
    value: number;
    bannerTitle: string;
    bannerMessage: string | null;
    endsAt: string | null;
    updatedAt: string;
  }[]
> {
  const now = new Date();
  let rows: Awaited<ReturnType<typeof prisma.promotion.findMany>>;
  try {
    rows = await prisma.promotion.findMany({
      where: {
        isActive: true,
        showInApp: true,
        AND: [
          { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
          { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
        ],
      },
      orderBy: [{ endsAt: "asc" }, { createdAt: "desc" }],
      take: Math.max(1, Math.min(10, limit)),
    });
  } catch (err) {
    // Schema/client not migrated yet — fail soft so Home does not 500.
    console.error("[promotions] listActiveAppBannerPromotions", err);
    return [];
  }

  return rows
    .filter((p) => {
      if (p.maxRedemptions != null && p.redeemedCount >= p.maxRedemptions) return false;
      if (p.type !== "PERCENT" && p.type !== "FIXED") return false;
      if (!Number.isFinite(p.value) || p.value <= 0) return false;
      return true;
    })
    .map((p) => {
      const fallbackTitle =
        p.type === "PERCENT"
          ? `${p.value}% off your ride`
          : `$${Number(p.value).toFixed(0)} off your ride`;
      return {
        id: p.id,
        code: p.code,
        type: p.type,
        value: p.value,
        bannerTitle: (p.bannerTitle || "").trim() || fallbackTitle,
        bannerMessage: (p.bannerMessage || "").trim() || null,
        endsAt: p.endsAt?.toISOString() ?? null,
        updatedAt: p.updatedAt.toISOString(),
      };
    });
}

/** Persist redemption + bump redeemedCount after reservation create. */
export async function recordPromotionRedemption(opts: {
  promotionId: string;
  customerId: string;
  reservationId: string;
}): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const promo = await tx.promotion.findUnique({
      where: { id: opts.promotionId },
    });
    if (!promo || !promo.isActive) {
      throw new Error("Promo code is no longer available.");
    }
    if (
      promo.maxRedemptions != null &&
      promo.maxRedemptions >= 0 &&
      promo.redeemedCount >= promo.maxRedemptions
    ) {
      throw new Error(promoErrorMessage("MAX_REDEMPTIONS"));
    }
    if (promo.maxPerCustomer != null && promo.maxPerCustomer > 0) {
      const used = await tx.promotionRedemption.count({
        where: {
          promotionId: opts.promotionId,
          customerId: opts.customerId,
        },
      });
      if (used >= promo.maxPerCustomer) {
        throw new Error(promoErrorMessage("MAX_PER_CUSTOMER"));
      }
    }

    await tx.promotionRedemption.create({
      data: {
        promotionId: opts.promotionId,
        customerId: opts.customerId,
        reservationId: opts.reservationId,
      },
    });
    await tx.promotion.update({
      where: { id: opts.promotionId },
      data: { redeemedCount: { increment: 1 } },
    });
  });
}
