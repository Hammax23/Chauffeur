import prisma from "@/lib/prisma";
import { applyDiscountToPricing, type AppFareWithPromo } from "@/lib/promotions";
import type { ReservationPricingResult } from "@/lib/reservation-pricing";

export const REFERRAL_QUALIFY_COUNT = Math.max(
  1,
  Math.floor(Number(process.env.REFERRAL_QUALIFY_COUNT) || 2)
);
export const REFERRAL_REWARD_USD = Math.max(
  1,
  Number(process.env.REFERRAL_REWARD_USD) || 20
);
/** Soft anti-abuse: max PENDING attributions a referrer can open per UTC day. */
export const REFERRAL_MAX_PENDING_PER_DAY = Math.max(
  1,
  Math.floor(Number(process.env.REFERRAL_MAX_PENDING_PER_DAY) || 10)
);

export const REFERRAL_PROMO_LABEL = "REFERRAL";

export function normalizeReferralCode(input: unknown): string {
  return String(input || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, "");
}

function randomReferralSuffix(length = 6): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < length; i++) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}

/** Ensure customer has a unique share code; returns it. */
export async function ensureCustomerReferralCode(customerId: string): Promise<string> {
  const existing = await prisma.customer.findUnique({
    where: { id: customerId },
    select: { referralCode: true },
  });
  if (existing?.referralCode) return existing.referralCode;

  for (let attempt = 0; attempt < 8; attempt++) {
    const code = `SARJ-${randomReferralSuffix(6)}`;
    try {
      const updated = await prisma.customer.update({
        where: { id: customerId },
        data: { referralCode: code },
        select: { referralCode: true },
      });
      if (updated.referralCode) return updated.referralCode;
    } catch {
      // unique collision — retry
    }
  }
  throw new Error("Could not allocate referral code");
}

export type AttributeReferralResult =
  | { ok: true }
  | { ok: false; error: string };

/**
 * Link a new/existing referee to a referrer code (once).
 * Requires verified phone on referee; app registration source preferred.
 */
export async function attributeReferral(opts: {
  refereeId: string;
  referralCode: string;
}): Promise<AttributeReferralResult> {
  const code = normalizeReferralCode(opts.referralCode);
  if (!code) return { ok: false, error: "Enter a valid referral code." };

  const referee = await prisma.customer.findUnique({
    where: { id: opts.refereeId },
    select: {
      id: true,
      phone: true,
      email: true,
      referredByCustomerId: true,
      registrationSource: true,
      referralAttributionAsReferee: { select: { id: true } },
    },
  });
  if (!referee) return { ok: false, error: "Account not found." };
  if (!referee.phone?.trim()) {
    return { ok: false, error: "Verify your phone before using a referral code." };
  }
  if (referee.referredByCustomerId || referee.referralAttributionAsReferee) {
    return { ok: false, error: "A referral is already linked to this account." };
  }

  const referrer = await prisma.customer.findFirst({
    where: { referralCode: code },
    select: {
      id: true,
      phone: true,
      email: true,
      accountStatus: true,
      deactivatedAt: true,
    },
  });
  if (!referrer) return { ok: false, error: "This referral code is not valid." };
  if (referrer.id === referee.id) {
    return { ok: false, error: "You cannot use your own referral code." };
  }
  if (
    String(referrer.accountStatus || "ACTIVE").toUpperCase() !== "ACTIVE" ||
    referrer.deactivatedAt
  ) {
    return { ok: false, error: "This referral code is not valid." };
  }

  // Same phone / email as referrer
  if (
    referrer.phone &&
    referee.phone &&
    referrer.phone.replace(/\D/g, "") === referee.phone.replace(/\D/g, "")
  ) {
    return { ok: false, error: "You cannot refer yourself." };
  }
  if (
    referrer.email &&
    referee.email &&
    referrer.email.toLowerCase() === referee.email.toLowerCase()
  ) {
    return { ok: false, error: "You cannot refer yourself." };
  }

  // Referrer should have verified phone
  if (!referrer.phone?.trim()) {
    return { ok: false, error: "This referral code is not active yet." };
  }

  const startOfUtcDay = new Date();
  startOfUtcDay.setUTCHours(0, 0, 0, 0);
  const pendingToday = await prisma.referralAttribution.count({
    where: {
      referrerId: referrer.id,
      status: "PENDING",
      createdAt: { gte: startOfUtcDay },
    },
  });
  if (pendingToday >= REFERRAL_MAX_PENDING_PER_DAY) {
    return {
      ok: false,
      error: "This invite code has reached today’s limit. Try again tomorrow.",
    };
  }

  try {
    await prisma.$transaction([
      prisma.customer.update({
        where: { id: referee.id },
        data: { referredByCustomerId: referrer.id },
      }),
      prisma.referralAttribution.create({
        data: {
          referrerId: referrer.id,
          refereeId: referee.id,
          codeUsed: code,
          status: "PENDING",
        },
      }),
    ]);
  } catch (e) {
    console.error("[referral] attribute failed", e);
    return { ok: false, error: "Could not apply referral code." };
  }

  return { ok: true };
}

/** After a referee trip becomes DONE + paid, qualify attribution and maybe issue reward. */
export async function maybeQualifyReferralOnTripDone(opts: {
  reservationId: string;
  bookingId: string;
  customerId: string | null | undefined;
  paymentStatus: string | null | undefined;
}): Promise<void> {
  const customerId = opts.customerId?.trim();
  if (!customerId) return;

  const paid = String(opts.paymentStatus || "").toUpperCase() === "PAID";
  // Allow unpaid test mode only when APP allows PENDING bookings — still require DONE;
  // enterprise authenticity: prefer PAID. If not paid, skip qualify.
  if (!paid) return;

  const attribution = await prisma.referralAttribution.findUnique({
    where: { refereeId: customerId },
  });
  if (!attribution || attribution.status !== "PENDING") return;

  // First completed paid trip for this referee?
  const priorDone = await prisma.reservation.count({
    where: {
      customerId,
      status: "DONE",
      paymentStatus: "PAID",
      id: { not: opts.reservationId },
    },
  });
  if (priorDone > 0) {
    // Already had a completed trip before attribution qualify window — reject gaming
    await prisma.referralAttribution.update({
      where: { id: attribution.id },
      data: {
        status: "REJECTED",
        adminNote: "Referee already had a prior completed paid trip.",
      },
    });
    return;
  }

  await prisma.referralAttribution.update({
    where: { id: attribution.id },
    data: {
      status: "QUALIFIED",
      qualifiedAt: new Date(),
      refereeFirstBookingId: opts.bookingId,
    },
  });

  await maybeIssueReferralReward(attribution.referrerId);
}

export async function maybeIssueReferralReward(referrerId: string): Promise<void> {
  const existing = await prisma.referralReward.findUnique({
    where: { customerId: referrerId },
  });
  if (existing) return;

  const qualified = await prisma.referralAttribution.count({
    where: { referrerId, status: "QUALIFIED" },
  });
  if (qualified < REFERRAL_QUALIFY_COUNT) return;

  try {
    await prisma.referralReward.create({
      data: {
        customerId: referrerId,
        amount: REFERRAL_REWARD_USD,
        status: "AVAILABLE",
      },
    });
  } catch {
    // unique race — ignore
  }
}

export async function getAvailableReferralReward(customerId: string) {
  return prisma.referralReward.findFirst({
    where: { customerId, status: "AVAILABLE" },
  });
}

export async function applyReferralCreditToPricing(
  pricing: ReservationPricingResult,
  customerId: string,
  useReferralCredit: boolean
): Promise<{ pricing: AppFareWithPromo; referralRewardId: string | null } | { error: string }> {
  if (!useReferralCredit) {
    return {
      pricing: applyDiscountToPricing(pricing, 0, null, null),
      referralRewardId: null,
    };
  }

  const reward = await getAvailableReferralReward(customerId);
  if (!reward) {
    return { error: "No referral credit available." };
  }

  const discounted = applyDiscountToPricing(
    pricing,
    reward.amount,
    REFERRAL_PROMO_LABEL,
    null
  );

  return {
    pricing: {
      ...discounted,
      promotionId: null,
      promoCode: REFERRAL_PROMO_LABEL,
      referralRewardId: reward.id,
    },
    referralRewardId: reward.id,
  };
}

export async function markReferralRewardRedeemed(opts: {
  rewardId: string;
  reservationId: string;
}): Promise<void> {
  await prisma.referralReward.updateMany({
    where: { id: opts.rewardId, status: "AVAILABLE" },
    data: {
      status: "REDEEMED",
      redeemedReservationId: opts.reservationId,
      redeemedAt: new Date(),
    },
  });
}

export async function getReferralProgress(customerId: string) {
  const code = await ensureCustomerReferralCode(customerId);
  const [qualified, pending, reward] = await Promise.all([
    prisma.referralAttribution.count({
      where: { referrerId: customerId, status: "QUALIFIED" },
    }),
    prisma.referralAttribution.count({
      where: { referrerId: customerId, status: "PENDING" },
    }),
    prisma.referralReward.findUnique({ where: { customerId } }),
  ]);

  return {
    referralCode: code,
    qualifyNeeded: REFERRAL_QUALIFY_COUNT,
    qualifiedCount: qualified,
    pendingCount: pending,
    rewardAmount: REFERRAL_REWARD_USD,
    rewardStatus: reward?.status ?? null,
    rewardAvailable: reward?.status === "AVAILABLE",
    shareUrl: `https://sarjworldwide.ca/r/${code}`,
    deepLink: `sarjworldwide://referral?code=${code}`,
  };
}
