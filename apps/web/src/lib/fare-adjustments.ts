import prisma from "@/lib/prisma";
import { HST_RATE } from "@/lib/reservation-pricing";
import { chargeCustomerOffSession } from "@/lib/off-session-charge";
import { sendPushNotification } from "@/lib/push-notifications";
import {
  computeMgWaitCharge,
  MG_FREE_WAIT_MINUTES,
  MG_WAIT_RATE_PER_HOUR,
  reservationHasMeetGreet,
  resolveMgWaitClockStart,
} from "@/lib/mg-policy";

export const PICKUP_WAIT_FREE_MINUTES = 20;
export const PICKUP_WAIT_RATE_PER_MINUTE = 1; // CAD

export {
  MG_FREE_WAIT_MINUTES,
  MG_WAIT_RATE_PER_HOUR,
  computeMgWaitCharge,
  reservationHasMeetGreet,
  resolveMgWaitClockStart,
};

export function computePickupWaitCharge(opts: {
  arrivedAt: Date;
  endedAt: Date;
}): { billableMinutes: number; amount: number; hst: number; total: number } {
  const ms = opts.endedAt.getTime() - opts.arrivedAt.getTime();
  const waitedMinutes = Math.max(0, Math.floor(ms / 60000));
  const billableMinutes = Math.max(0, waitedMinutes - PICKUP_WAIT_FREE_MINUTES);
  const amount = billableMinutes * PICKUP_WAIT_RATE_PER_MINUTE;
  const hst = Math.round(amount * HST_RATE * 100) / 100;
  const total = Math.round((amount + hst) * 100) / 100;
  return { billableMinutes, amount, hst, total };
}

export async function recomputeCustomerOutstanding(customerId: string): Promise<number> {
  const agg = await prisma.fareAdjustment.aggregate({
    where: { customerId, status: { in: ["PENDING", "FAILED"] } },
    _sum: { total: true },
  });
  const balance = Math.round((agg._sum.total || 0) * 100) / 100;
  await prisma.customer.update({
    where: { id: customerId },
    data: { outstandingBalance: balance },
  });
  return balance;
}

async function notifyCustomerCharge(
  customerId: string | null | undefined,
  title: string,
  body: string,
  data: Record<string, string>
) {
  if (!customerId) return;
  try {
    const c = await prisma.customer.findUnique({
      where: { id: customerId },
      select: { pushToken: true },
    });
    if (!c?.pushToken) return;
    await sendPushNotification(c.pushToken, title, body, data);
  } catch (e) {
    console.error("[fare-adjustments] push failed", e);
  }
}

/**
 * Create + attempt to charge a fare adjustment (idempotent by key).
 */
export async function createAndChargeFareAdjustment(opts: {
  reservationId: string;
  bookingId: string;
  customerId?: string | null;
  stripeCustomerId?: string | null;
  preferredPaymentMethodId?: string | null;
  type: string;
  description: string;
  amount: number;
  idempotencyKey: string;
}): Promise<{
  adjustmentId: string;
  status: string;
  total: number;
  charged: boolean;
}> {
  const amount = Math.round(opts.amount * 100) / 100;
  const hst = Math.round(amount * HST_RATE * 100) / 100;
  const total = Math.round((amount + hst) * 100) / 100;

  const existing = await prisma.fareAdjustment.findUnique({
    where: { idempotencyKey: opts.idempotencyKey },
  });
  if (existing) {
    return {
      adjustmentId: existing.id,
      status: existing.status,
      total: existing.total,
      charged: existing.status === "PAID",
    };
  }

  if (total < 0.5) {
    const row = await prisma.fareAdjustment.create({
      data: {
        reservationId: opts.reservationId,
        bookingId: opts.bookingId,
        customerId: opts.customerId || null,
        type: opts.type,
        description: opts.description,
        amount: 0,
        hst: 0,
        total: 0,
        status: "WAIVED",
        idempotencyKey: opts.idempotencyKey,
      },
    });
    return { adjustmentId: row.id, status: "WAIVED", total: 0, charged: false };
  }

  const row = await prisma.fareAdjustment.create({
    data: {
      reservationId: opts.reservationId,
      bookingId: opts.bookingId,
      customerId: opts.customerId || null,
      type: opts.type,
      description: opts.description,
      amount,
      hst,
      total,
      status: "PENDING",
      idempotencyKey: opts.idempotencyKey,
    },
  });

  if (!opts.stripeCustomerId || !opts.customerId) {
    await prisma.fareAdjustment.update({
      where: { id: row.id },
      data: { status: "FAILED", failureMessage: "No Stripe customer on file" },
    });
    if (opts.customerId) await recomputeCustomerOutstanding(opts.customerId);
    await notifyCustomerCharge(
      opts.customerId,
      "Payment needed",
      `Outstanding $${total.toFixed(2)} on booking ${opts.bookingId}. Update your card in the app.`,
      { type: "fare_unpaid", bookingId: opts.bookingId }
    );
    return { adjustmentId: row.id, status: "FAILED", total, charged: false };
  }

  const charge = await chargeCustomerOffSession({
    stripeCustomerId: opts.stripeCustomerId,
    amountCad: total,
    description: opts.description,
    preferredPaymentMethodId: opts.preferredPaymentMethodId,
    idempotencyKey: opts.idempotencyKey,
    metadata: {
      bookingId: opts.bookingId,
      adjustmentId: row.id,
      type: opts.type,
    },
  });

  if (charge.ok) {
    await prisma.fareAdjustment.update({
      where: { id: row.id },
      data: {
        status: "PAID",
        stripePaymentIntentId: charge.paymentIntentId,
        stripePaymentMethodId: charge.paymentMethodId,
        failureMessage: null,
      },
    });
    await recomputeCustomerOutstanding(opts.customerId);
    await notifyCustomerCharge(
      opts.customerId,
      "Extra charge",
      `${opts.description}: $${total.toFixed(2)} CAD charged to your card.`,
      { type: "fare_charged", bookingId: opts.bookingId }
    );
    return { adjustmentId: row.id, status: "PAID", total, charged: true };
  }

  await prisma.fareAdjustment.update({
    where: { id: row.id },
    data: { status: "FAILED", failureMessage: charge.message },
  });
  await recomputeCustomerOutstanding(opts.customerId);
  await notifyCustomerCharge(
    opts.customerId,
    "Payment failed",
    `We could not charge $${total.toFixed(2)} (${opts.description}). Please update your card or pay in the app.`,
    { type: "fare_unpaid", bookingId: opts.bookingId }
  );
  return { adjustmentId: row.id, status: "FAILED", total, charged: false };
}

/** When trip leaves ARRIVED (e.g. CIC), bill wait over 20 minutes. */
export async function billPickupWaitIfNeeded(reservation: {
  id: string;
  bookingId: string;
  customerId: string | null;
  stripeCustomerId: string | null;
  stripePaymentMethodId: string | null;
  driverArrivedAt: Date | null;
  waitMinutesBilled: number;
  status: string;
}): Promise<void> {
  if (!reservation.driverArrivedAt) return;
  if (reservation.waitMinutesBilled > 0) return;

  const endedAt = new Date();
  const { billableMinutes, amount, total } = computePickupWaitCharge({
    arrivedAt: reservation.driverArrivedAt,
    endedAt,
  });

  await prisma.reservation.update({
    where: { id: reservation.id },
    data: {
      waitMinutesBilled: billableMinutes,
      waitChargeAmount: total,
    },
  });

  if (billableMinutes <= 0 || amount <= 0) return;

  await createAndChargeFareAdjustment({
    reservationId: reservation.id,
    bookingId: reservation.bookingId,
    customerId: reservation.customerId,
    stripeCustomerId: reservation.stripeCustomerId,
    preferredPaymentMethodId: reservation.stripePaymentMethodId,
    type: "WAIT",
    description: `Pickup wait ${billableMinutes} min beyond free ${PICKUP_WAIT_FREE_MINUTES} min ($${PICKUP_WAIT_RATE_PER_MINUTE}/min)`,
    amount,
    idempotencyKey: `wait:${reservation.bookingId}`,
  });
}

/**
 * Meet & Greet extra wait: 60 min free after landing (or scheduled pickup), then $110/hr + HST.
 * Idempotent per booking. Skip if not M&G or already billed.
 */
export async function billMgWaitIfNeeded(
  reservation: {
    id: string;
    bookingId: string;
    customerId: string | null;
    stripeCustomerId: string | null;
    stripePaymentMethodId: string | null;
    specialRequirements: string | null;
    serviceDate: string;
    serviceTime: string;
    actualLandingAt: Date | null;
    mgWaitMinutesBilled: number;
  },
  opts?: { endedAt?: Date; force?: boolean }
): Promise<{ billed: boolean; billableMinutes: number; total: number } | null> {
  if (!opts?.force && !reservationHasMeetGreet(reservation)) {
    return null;
  }
  if (reservation.mgWaitMinutesBilled > 0) {
    return { billed: false, billableMinutes: reservation.mgWaitMinutesBilled, total: 0 };
  }

  const startedAt = resolveMgWaitClockStart({
    actualLandingAt: reservation.actualLandingAt,
    serviceDate: reservation.serviceDate,
    serviceTime: reservation.serviceTime,
  });
  if (!startedAt) return null;

  const endedAt = opts?.endedAt ?? new Date();
  const { billableMinutes, amount, total } = computeMgWaitCharge({
    startedAt,
    endedAt,
  });

  await prisma.reservation.update({
    where: { id: reservation.id },
    data: {
      mgWaitMinutesBilled: billableMinutes,
      mgWaitChargeAmount: total,
    },
  });

  if (billableMinutes <= 0 || amount <= 0) {
    return { billed: false, billableMinutes: 0, total: 0 };
  }

  await createAndChargeFareAdjustment({
    reservationId: reservation.id,
    bookingId: reservation.bookingId,
    customerId: reservation.customerId,
    stripeCustomerId: reservation.stripeCustomerId,
    preferredPaymentMethodId: reservation.stripePaymentMethodId,
    type: "MG_WAIT",
    description: `Meet & Greet extra wait ${billableMinutes} min beyond free ${MG_FREE_WAIT_MINUTES} min ($${MG_WAIT_RATE_PER_HOUR}/hr)`,
    amount,
    idempotencyKey: `mg_wait:${reservation.bookingId}`,
  });

  return { billed: true, billableMinutes, total };
}

/**
 * Ops marks no-show: retain prepaid fare (no refund). Audit line + status NO_SHOW.
 */
export async function markReservationNoShow(opts: {
  bookingId: string;
  markedBy: string;
  notes?: string;
}): Promise<{
  ok: boolean;
  error?: string;
  bookingId?: string;
  status?: string;
}> {
  const reservation = await prisma.reservation.findUnique({
    where: { bookingId: opts.bookingId },
  });
  if (!reservation) return { ok: false, error: "Reservation not found" };

  if (reservation.noShowMarkedAt || reservation.status === "NO_SHOW") {
    return { ok: true, bookingId: reservation.bookingId, status: "NO_SHOW" };
  }

  const pay = String(reservation.paymentStatus || "").toUpperCase();
  if (pay === "REFUNDED" || pay === "PARTIALLY_REFUNDED") {
    return {
      ok: false,
      error: "Cannot mark no-show after a refund has been issued",
    };
  }

  const now = new Date();
  const notes = String(opts.notes || "").trim().slice(0, 500);

  await prisma.reservation.update({
    where: { id: reservation.id },
    data: {
      status: "NO_SHOW",
      statusUpdatedAt: now,
      completedAt: reservation.completedAt || now,
      noShowMarkedAt: now,
      noShowMarkedBy: opts.markedBy.slice(0, 120),
      noShowNotes: notes || null,
    },
  });

  // Audit only — prepaid fare already kept; no second charge.
  await createAndChargeFareAdjustment({
    reservationId: reservation.id,
    bookingId: reservation.bookingId,
    customerId: reservation.customerId,
    stripeCustomerId: null,
    preferredPaymentMethodId: null,
    type: "NO_SHOW",
    description: notes
      ? `No-show — prepaid fare retained (${notes})`
      : "No-show — prepaid fare retained (100%)",
    amount: 0,
    idempotencyKey: `no_show:${reservation.bookingId}`,
  });

  await notifyCustomerCharge(
    reservation.customerId,
    "Trip marked no-show",
    `Booking ${reservation.bookingId} was marked no-show. Prepaid fare is retained per policy.`,
    { type: "no_show", bookingId: reservation.bookingId }
  );

  return { ok: true, bookingId: reservation.bookingId, status: "NO_SHOW" };
}
