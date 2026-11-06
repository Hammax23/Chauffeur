// @ts-nocheck
/**
 * Driver Pay — enterprise payroll library for SARJ Chauffeur.
 *
 * Canada chauffeur rules (locked to avoid future disputes):
 *   serviceBasis = (subtotal − discountAmount) + fareAdjustmentsTotal (HST excluded — company remits HST to CRA)
 *   driver keeps 100% of `gratuity`
 *   platformFee  = round(serviceBasis * pct / 100)
 *   driverNet    = round(serviceBasis − platformFee) + round(gratuity)
 *
 * Phase 2 adds `fareAdjustmentsTotal` into the basis. Only FareAdjustments the customer
 * actually paid (status = "PAID") are counted. We sum the pre-HST `amount` (not `total`)
 * because the HST portion belongs to CRA, not the driver — mirrors the booking basis rule.
 * NO_SHOW type adjustments (`amount = 0` audit rows) and WAIVED / FAILED / PENDING rows
 * are excluded.
 *
 * All DONE/NO_SHOW paths funnel through `onReservationCompleted` — exactly one ledger
 * row per reservation (DriverEarning or DriverRemittance), idempotent on reservationId
 * uniqueness (P2002 ⇒ treat as success). COD never looks like "company owes driver".
 */

import prisma from "@/lib/prisma";

// ─── Public money helpers ──────────────────────────────────────────────────

/** Half-up rounding to 2 decimals. Negative-safe. */
export function roundMoney(value: number): number {
  if (!Number.isFinite(value)) return 0;
  const sign = value < 0 ? -1 : 1;
  return (sign * Math.round(Math.abs(value) * 100)) / 100;
}

/** Resolve the commission % to charge this driver (per-driver override wins). */
export async function getEffectiveCommissionPercent(driverId: string): Promise<number> {
  const [driver, settings] = await Promise.all([
    prisma.driver.findUnique({
      where: { id: driverId },
      select: { commissionPctOverride: true },
    }),
    getOrCreatePaySettings(),
  ]);

  const override =
    driver && typeof driver.commissionPctOverride === "number"
      ? driver.commissionPctOverride
      : null;

  const pct =
    override != null && Number.isFinite(override) ? override : settings.defaultPlatformCommissionPercent;

  // Clamp 0–100 for safety.
  if (!Number.isFinite(pct)) return 20;
  return Math.max(0, Math.min(100, pct));
}

export type EarningSnapshot = {
  subtotal: number;
  discountAmount: number;
  gratuity: number;
  hst: number;
  /** Phase 2 — sum of PAID FareAdjustment.amount for this reservation (HST excluded). */
  fareAdjustmentsTotal: number;
  serviceBasis: number;
  commissionPct: number;
  platformFee: number;
  driverNet: number;
};

/**
 * Canada-correct basis snapshot.
 *   serviceBasis = max(0, (subtotal − discount) + fareAdjustmentsTotal)   // HST OUT
 *   platformFee  = round(serviceBasis * pct/100)
 *   driverNet    = round(serviceBasis − platformFee) + round(gratuity)
 *
 * Phase 2: pass `fareAdjustmentsTotal` — sum of PAID FareAdjustment.amount (pre-HST) for
 * the reservation. Caller must have already excluded WAIVED/FAILED/PENDING rows.
 */
export function computeEarningAmounts(opts: {
  subtotal: number;
  discountAmount?: number | null;
  gratuity?: number | null;
  hst?: number | null;
  fareAdjustmentsTotal?: number | null;
  commissionPct: number;
}): EarningSnapshot {
  const subtotal = roundMoney(Math.max(0, Number(opts.subtotal) || 0));
  const discountAmount = roundMoney(Math.max(0, Number(opts.discountAmount) || 0));
  const gratuity = roundMoney(Math.max(0, Number(opts.gratuity) || 0));
  const hst = roundMoney(Math.max(0, Number(opts.hst) || 0));
  const fareAdjustmentsTotal = roundMoney(
    Math.max(0, Number(opts.fareAdjustmentsTotal) || 0)
  );

  const serviceBasis = roundMoney(
    Math.max(0, subtotal - discountAmount) + fareAdjustmentsTotal
  );
  const pct = Math.max(0, Math.min(100, Number(opts.commissionPct) || 0));

  const platformFee = roundMoney((serviceBasis * pct) / 100);
  const driverNet = roundMoney(roundMoney(serviceBasis - platformFee) + roundMoney(gratuity));

  return {
    subtotal,
    discountAmount,
    gratuity,
    hst,
    fareAdjustmentsTotal,
    serviceBasis,
    commissionPct: pct,
    platformFee,
    driverNet,
  };
}

/**
 * Sum the pre-HST `amount` for every FareAdjustment on a reservation the customer has
 * actually paid. NO_SHOW audit rows (amount=0) and OTHER types with amount=0 contribute
 * nothing. Excludes WAIVED, PENDING, FAILED by only looking at PAID.
 *
 * We use `amount` (not `total`) because HST is CRA's, not the driver's — same rule as
 * the booking basis.
 */
export async function sumPaidFareAdjustmentsForReservation(
  reservationId: string
): Promise<number> {
  try {
    const agg = await prisma.fareAdjustment.aggregate({
      where: { reservationId, status: "PAID" },
      _sum: { amount: true },
    });
    return roundMoney(Math.max(0, Number(agg._sum.amount) || 0));
  } catch (err) {
    console.error("[driver-pay] sumPaidFareAdjustmentsForReservation failed", err);
    return 0;
  }
}

// ─── Settings (singleton) ──────────────────────────────────────────────────

export async function getOrCreatePaySettings() {
  const existing = await prisma.driverPaySettings.findUnique({ where: { id: "global" } });
  if (existing) return existing;
  return prisma.driverPaySettings.create({
    data: { id: "global", defaultPlatformCommissionPercent: 20, payoutCurrency: "CAD" },
  });
}

// ─── Audit ─────────────────────────────────────────────────────────────────

export async function writeAudit(opts: {
  action: string;
  entityType:
    | "EARNING"
    | "REMITTANCE"
    | "PAYOUT"
    | "SETTINGS"
    | "DRIVER"
    | "ADJUSTMENT"
    | "BACKFILL"
    | "CONNECT"
    | "TAX"
    | "ADMIN_USER";
  entityId?: string | null;
  details?: Record<string, unknown> | null;
  actor?: string | null;
}): Promise<void> {
  try {
    await prisma.driverPayAuditLog.create({
      data: {
        action: String(opts.action).slice(0, 120),
        entityType: opts.entityType,
        entityId: opts.entityId || null,
        details: opts.details ? (opts.details as any) : undefined,
        actor: opts.actor || "admin",
      },
    });
  } catch (err) {
    // Audit must never break the operation it describes.
    console.error("[driver-pay] writeAudit failed", err);
  }
}

// ─── Core completion hook ──────────────────────────────────────────────────

const REFUNDED_STATUSES = new Set(["REFUNDED", "PARTIALLY_REFUNDED"]);
const UNPAID_STATUSES = new Set(["PENDING", "CANCELLED", "CANCELED"]);

type PaymentStatusBucket =
  | "COD"
  | "PAID_CLEAR"
  | "AWAITING_CUSTOMER_PAYMENT"
  | "COMPED"
  | "CUSTOMER_REFUNDED";

function classifyPaymentStatus(paymentStatus: string | null | undefined): PaymentStatusBucket {
  const s = String(paymentStatus || "").toUpperCase().trim();
  if (s === "CASH_ON_DELIVERY") return "COD";
  if (REFUNDED_STATUSES.has(s)) return "CUSTOMER_REFUNDED";
  if (s === "PENDING") return "AWAITING_CUSTOMER_PAYMENT";
  if (s === "CANCELLED" || s === "CANCELED") return "COMPED";
  // PAID / CAPTURED / "" fall through as cleared.
  return "PAID_CLEAR";
}

/**
 * Called from every DONE / NO_SHOW path. Idempotent on reservationId uniqueness.
 * Returns the kind of ledger row written (or "none" if the booking is not eligible).
 */
export async function onReservationCompleted(opts: {
  reservationId: string;
  mode: "DONE" | "NO_SHOW";
  actor?: string;
}): Promise<{
  kind: "earning" | "remittance" | "none";
  status?: string;
  reason?: string;
  earningId?: string;
  remittanceId?: string;
}> {
  const reservation = await prisma.reservation.findUnique({
    where: { id: opts.reservationId },
  });
  if (!reservation) return { kind: "none", reason: "reservation_not_found" };

  const driverId = reservation.assignedDriverId;
  if (!driverId) {
    // No assigned driver (e.g. company-marked no-show before dispatch) — nothing to pay.
    return { kind: "none", reason: "no_assigned_driver" };
  }

  const completedAt = reservation.completedAt || new Date();
  const bucket = classifyPaymentStatus(reservation.paymentStatus);
  const commissionPct = await getEffectiveCommissionPercent(driverId);

  // Phase 2 — include PAID FareAdjustments (wait, stops, M&G, etc.) in the driver's basis.
  const fareAdjustmentsTotal = await sumPaidFareAdjustmentsForReservation(reservation.id);

  const snap = computeEarningAmounts({
    subtotal: reservation.subtotal,
    discountAmount: reservation.discountAmount,
    gratuity: reservation.gratuity,
    hst: reservation.hst,
    fareAdjustmentsTotal,
    commissionPct,
  });

  // COD → remittance (driver owes company), never a payout earning.
  if (bucket === "COD") {
    try {
      const row = await prisma.driverRemittance.create({
        data: {
          reservationId: reservation.id,
          bookingId: reservation.bookingId,
          driverId,
          status: snap.platformFee > 0 ? "OWED" : "WAIVED",
          subtotal: snap.subtotal,
          discountAmount: snap.discountAmount,
          gratuity: snap.gratuity,
          hst: snap.hst,
          serviceBasis: snap.serviceBasis,
          commissionPct: snap.commissionPct,
          amountOwed: snap.platformFee,
          completedAt,
          waivedAt: snap.platformFee > 0 ? null : new Date(),
          waivedReason: snap.platformFee > 0 ? null : "Zero-basis COD",
        },
      });
      await writeAudit({
        action: "remittance_created",
        entityType: "REMITTANCE",
        entityId: row.id,
        details: { mode: opts.mode, bookingId: reservation.bookingId, amountOwed: snap.platformFee },
        actor: opts.actor,
      });
      return { kind: "remittance", status: row.status, remittanceId: row.id };
    } catch (err: any) {
      if (err?.code === "P2002") {
        // Already created by a concurrent DONE write → idempotent success.
        const existing = await prisma.driverRemittance.findUnique({
          where: { reservationId: reservation.id },
        });
        return { kind: "remittance", status: existing?.status || "OWED", remittanceId: existing?.id };
      }
      throw err;
    }
  }

  // Zero-fare / comped (no basis, no tip) → VOID marker so admin can see why nothing was paid.
  const zeroFare = snap.serviceBasis <= 0 && snap.gratuity <= 0;

  let status: "PENDING" | "HELD" | "VOID";
  let holdReason: string | null = null;
  let notes: string | null = null;

  if (zeroFare) {
    status = "VOID";
    notes = "Zero-fare / comped";
  } else if (bucket === "AWAITING_CUSTOMER_PAYMENT") {
    status = "HELD";
    holdReason = "AWAITING_CUSTOMER_PAYMENT";
  } else if (bucket === "COMPED") {
    status = "HELD";
    holdReason = "COMPED";
  } else if (bucket === "CUSTOMER_REFUNDED") {
    status = "HELD";
    holdReason = "CUSTOMER_REFUNDED";
  } else {
    status = "PENDING";
  }

  try {
    const row = await prisma.driverEarning.create({
      data: {
        reservationId: reservation.id,
        bookingId: reservation.bookingId,
        driverId,
        mode: opts.mode,
        status,
        holdReason,
        notes,
        subtotal: snap.subtotal,
        discountAmount: snap.discountAmount,
        gratuity: snap.gratuity,
        hst: snap.hst,
        fareAdjustmentsTotal: snap.fareAdjustmentsTotal,
        serviceBasis: snap.serviceBasis,
        commissionPct: snap.commissionPct,
        platformFee: snap.platformFee,
        driverNet: snap.driverNet,
        completedAt,
      },
    });
    await writeAudit({
      action: "earning_created",
      entityType: "EARNING",
      entityId: row.id,
      details: {
        mode: opts.mode,
        status,
        bookingId: reservation.bookingId,
        paymentBucket: bucket,
        driverNet: snap.driverNet,
      },
      actor: opts.actor,
    });
    return { kind: "earning", status, earningId: row.id };
  } catch (err: any) {
    if (err?.code === "P2002") {
      const existing = await prisma.driverEarning.findUnique({
        where: { reservationId: reservation.id },
      });
      return { kind: "earning", status: existing?.status || status, earningId: existing?.id };
    }
    throw err;
  }
}

// ─── Reassignment rules ────────────────────────────────────────────────────

/**
 * Called from assignDriverToReservation when the booking is being reopened from a
 * terminal state (DONE/CANCELLED) so a new/different driver can run it.
 *
 *   - no earning yet                      → nothing to do
 *   - same driver reassigned to self      → no-op (don't void own earning)
 *   - earning PAID                        → NEVER void; flag REASSIGN_AFTER_PAID + review
 *   - unpaid earning (PENDING/HELD/VOID)  → mark REASSIGNED
 *   - remittance exists & OWED            → keep (COD cash was collected regardless)
 */
export async function voidEarningOnReassignment(opts: {
  reservationId: string;
  newDriverId: string | null;
  actor?: string;
}): Promise<{ action: "noop" | "voided" | "review_flagged" | "self_reassign" }> {
  const earning = await prisma.driverEarning.findUnique({
    where: { reservationId: opts.reservationId },
  });
  if (!earning) return { action: "noop" };

  if (opts.newDriverId && earning.driverId === opts.newDriverId) {
    return { action: "self_reassign" };
  }

  if (earning.status === "PAID") {
    await prisma.driverEarning.update({
      where: { id: earning.id },
      data: {
        needsReview: true,
        reviewReason: "REASSIGN_AFTER_PAID",
        reviewNotes:
          `Reassigned to ${opts.newDriverId || "unknown"} after payout already paid. ` +
          "Clawback only via DriverAdjustment — do NOT void PAID earnings.",
      },
    });
    await writeAudit({
      action: "earning_flagged_reassign_after_paid",
      entityType: "EARNING",
      entityId: earning.id,
      details: {
        previousDriverId: earning.driverId,
        newDriverId: opts.newDriverId,
        payoutId: earning.payoutId,
      },
      actor: opts.actor,
    });
    return { action: "review_flagged" };
  }

  // Unpaid — safe to mark reassigned (frees reservationId? No, reservationId remains unique;
  // if the new driver completes DONE again we would hit P2002. To keep the ledger one-row-per-
  // reservation, we actually re-point the existing row to the new driver + reset money so the
  // next DONE hook can rewrite via upsert pattern).
  await prisma.driverEarning.update({
    where: { id: earning.id },
    data: {
      status: "REASSIGNED",
      payoutId: null,
      notes: [earning.notes || "", `Reassigned → ${opts.newDriverId || "unassigned"}`]
        .filter(Boolean)
        .join("\n"),
    },
  });
  await writeAudit({
    action: "earning_reassigned",
    entityType: "EARNING",
    entityId: earning.id,
    details: {
      previousDriverId: earning.driverId,
      newDriverId: opts.newDriverId,
    },
    actor: opts.actor,
  });

  // Because reservationId is unique, we must also delete the row so the next DONE
  // for the new driver can create a fresh ledger entry.
  await prisma.driverEarning.delete({ where: { id: earning.id } });
  return { action: "voided" };
}

// ─── Refund review queue ───────────────────────────────────────────────────

/**
 * Admin / ops refunds the customer AFTER a DONE earning exists.
 * Do NOT silently clawback — flag earning + remittance for admin review.
 */
export async function flagEarningsForRefundReview(opts: {
  reservationId: string;
  reason?: string;
  actor?: string;
}): Promise<{ flagged: number }> {
  let flagged = 0;

  const earning = await prisma.driverEarning.findUnique({
    where: { reservationId: opts.reservationId },
  });
  if (earning && !earning.needsReview) {
    await prisma.driverEarning.update({
      where: { id: earning.id },
      data: {
        needsReview: true,
        reviewReason: "RESERVATION_REFUNDED",
        reviewNotes: opts.reason || "Customer booking was refunded after earning was created.",
      },
    });
    await writeAudit({
      action: "earning_flagged_refund",
      entityType: "EARNING",
      entityId: earning.id,
      details: { reason: opts.reason || null },
      actor: opts.actor,
    });
    flagged += 1;
  }

  const remit = await prisma.driverRemittance.findUnique({
    where: { reservationId: opts.reservationId },
  });
  if (remit && remit.status === "OWED") {
    await prisma.driverRemittance.update({
      where: { id: remit.id },
      data: {
        notes: [remit.notes || "", `Refund review: ${opts.reason || "Customer refunded"}`]
          .filter(Boolean)
          .join("\n"),
      },
    });
    await writeAudit({
      action: "remittance_flagged_refund",
      entityType: "REMITTANCE",
      entityId: remit.id,
      details: { reason: opts.reason || null },
      actor: opts.actor,
    });
    flagged += 1;
  }

  return { flagged };
}

// ─── Admin earning edit / release / void ───────────────────────────────────

export type AdminEarningPatch = {
  action?: "edit" | "void" | "release" | "clearReview" | "refreshAdjustments";
  commissionPct?: number;
  driverNet?: number;
  platformFee?: number;
  notes?: string;
  reviewNotes?: string;
  reason?: string;
  releaseTo?: "PENDING" | "VOID";
};

export async function updateEarningAdmin(
  earningId: string,
  patch: AdminEarningPatch,
  actor: string = "admin"
): Promise<
  | { ok: true; earning: Awaited<ReturnType<typeof prisma.driverEarning.findUnique>> }
  | { ok: false; error: string }
> {
  const current = await prisma.driverEarning.findUnique({ where: { id: earningId } });
  if (!current) return { ok: false, error: "Earning not found" };

  const action = patch.action || "edit";

  if (current.status === "PAID" && action !== "clearReview") {
    return { ok: false, error: "Cannot modify a PAID earning. Use an adjustment instead." };
  }

  if (action === "void") {
    if (current.payoutId) {
      return { ok: false, error: "Earning is attached to a DRAFT payout — cancel the batch first." };
    }
    const row = await prisma.driverEarning.update({
      where: { id: earningId },
      data: {
        status: "VOID",
        notes: [current.notes || "", `Voided: ${patch.reason || "no reason"}`]
          .filter(Boolean)
          .join("\n"),
      },
    });
    await writeAudit({
      action: "earning_voided",
      entityType: "EARNING",
      entityId: earningId,
      details: { reason: patch.reason || null },
      actor,
    });
    return { ok: true, earning: row };
  }

  if (action === "release") {
    if (current.status !== "HELD") {
      return { ok: false, error: `Can only release HELD earnings (current: ${current.status}).` };
    }
    const next = patch.releaseTo === "VOID" ? "VOID" : "PENDING";
    const row = await prisma.driverEarning.update({
      where: { id: earningId },
      data: {
        status: next,
        holdReason: null,
        notes: [current.notes || "", `Released ${current.holdReason || ""} → ${next}`]
          .filter(Boolean)
          .join("\n"),
      },
    });
    await writeAudit({
      action: "earning_released",
      entityType: "EARNING",
      entityId: earningId,
      details: { from: current.status, to: next, prevHold: current.holdReason },
      actor,
    });
    return { ok: true, earning: row };
  }

  if (action === "refreshAdjustments") {
    // Phase 2 — admin button to re-pull the current PAID FareAdjustment total into
    // this earning's basis without changing commission % (safe on unpaid rows only).
    if (current.payoutId) {
      return { ok: false, error: "Earning is attached to a payout — cancel the batch first." };
    }
    const fareAdjustmentsTotal = await sumPaidFareAdjustmentsForReservation(current.reservationId);
    const snap = computeEarningAmounts({
      subtotal: current.subtotal,
      discountAmount: current.discountAmount,
      gratuity: current.gratuity,
      hst: current.hst,
      fareAdjustmentsTotal,
      commissionPct: current.commissionPct,
    });
    const row = await prisma.driverEarning.update({
      where: { id: earningId },
      data: {
        fareAdjustmentsTotal: snap.fareAdjustmentsTotal,
        serviceBasis: snap.serviceBasis,
        platformFee: snap.platformFee,
        driverNet: snap.driverNet,
      },
    });
    await writeAudit({
      action: "earning_adjustments_refreshed",
      entityType: "EARNING",
      entityId: earningId,
      details: {
        before: {
          fareAdjustmentsTotal: current.fareAdjustmentsTotal,
          serviceBasis: current.serviceBasis,
          driverNet: current.driverNet,
        },
        after: {
          fareAdjustmentsTotal: snap.fareAdjustmentsTotal,
          serviceBasis: snap.serviceBasis,
          driverNet: snap.driverNet,
        },
      },
      actor,
    });
    return { ok: true, earning: row };
  }

  if (action === "clearReview") {
    const row = await prisma.driverEarning.update({
      where: { id: earningId },
      data: {
        needsReview: false,
        reviewNotes:
          [current.reviewNotes || "", `Review cleared: ${patch.reviewNotes || patch.reason || "no note"}`]
            .filter(Boolean)
            .join("\n") || null,
      },
    });
    await writeAudit({
      action: "earning_review_cleared",
      entityType: "EARNING",
      entityId: earningId,
      details: { notes: patch.reviewNotes || patch.reason || null },
      actor,
    });
    return { ok: true, earning: row };
  }

  // Edit — recompute money if commissionPct provided; otherwise honor explicit driverNet/platformFee.
  if (current.payoutId) {
    return { ok: false, error: "Earning is attached to a payout — cancel the batch first." };
  }

  const data: Record<string, unknown> = {};
  if (typeof patch.commissionPct === "number") {
    const pct = Math.max(0, Math.min(100, patch.commissionPct));
    const platformFee = roundMoney((current.serviceBasis * pct) / 100);
    const driverNet = roundMoney(
      roundMoney(current.serviceBasis - platformFee) + roundMoney(current.gratuity)
    );
    data.commissionPct = pct;
    data.platformFee = platformFee;
    data.driverNet = driverNet;
  } else {
    if (typeof patch.platformFee === "number") {
      data.platformFee = roundMoney(patch.platformFee);
    }
    if (typeof patch.driverNet === "number") {
      data.driverNet = roundMoney(patch.driverNet);
    }
  }

  if (typeof patch.notes === "string") {
    data.notes = patch.notes.slice(0, 500);
  }

  if (Object.keys(data).length === 0) {
    return { ok: false, error: "No changes provided." };
  }

  const row = await prisma.driverEarning.update({ where: { id: earningId }, data });
  await writeAudit({
    action: "earning_edited",
    entityType: "EARNING",
    entityId: earningId,
    details: { before: { commissionPct: current.commissionPct, platformFee: current.platformFee, driverNet: current.driverNet }, after: data },
    actor,
  });
  return { ok: true, earning: row };
}

// ─── Payout batches ────────────────────────────────────────────────────────

export async function createPayoutBatch(opts: {
  driverId: string;
  method?: string;
  reference?: string;
  notes?: string;
  periodStart?: Date | null;
  periodEnd?: Date | null;
  /** Optional whitelist of earning ids to attach. Default: all PENDING + unpaid for the driver. */
  earningIds?: string[];
  actor?: string;
}): Promise<
  | { ok: true; payoutId: string; amount: number; earningCount: number }
  | { ok: false; error: string; code?: string }
> {
  const method = (opts.method || "INTERAC").toUpperCase();
  if (!["INTERAC", "EFT", "CHEQUE", "OTHER"].includes(method)) {
    return { ok: false, error: `Unsupported method: ${method}` };
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const where = {
        driverId: opts.driverId,
        status: "PENDING" as const,
        payoutId: null,
        ...(opts.earningIds && opts.earningIds.length > 0 ? { id: { in: opts.earningIds } } : {}),
      };

      const candidates = await tx.driverEarning.findMany({
        where,
        select: { id: true, driverNet: true, needsReview: true },
      });

      // Reject if the admin passed specific ids and some are missing / already paid / different driver.
      if (opts.earningIds && opts.earningIds.length > 0 && candidates.length !== opts.earningIds.length) {
        throw Object.assign(new Error("BATCH_CONTENTS_CHANGED"), { code: "BATCH_CONTENTS_CHANGED" });
      }

      if (candidates.length === 0) {
        throw Object.assign(new Error("NO_ELIGIBLE_EARNINGS"), { code: "NO_ELIGIBLE_EARNINGS" });
      }

      // Skip rows flagged needsReview — admin must clear them first.
      const payable = candidates.filter((c) => !c.needsReview);
      if (payable.length === 0) {
        throw Object.assign(new Error("ALL_FLAGGED_FOR_REVIEW"), { code: "ALL_FLAGGED_FOR_REVIEW" });
      }

      const amount = roundMoney(payable.reduce((s, r) => s + (r.driverNet || 0), 0));

      const payout = await tx.driverPayout.create({
        data: {
          driverId: opts.driverId,
          amount,
          method,
          reference: opts.reference?.slice(0, 120) || null,
          notes: opts.notes?.slice(0, 500) || null,
          status: "DRAFT",
          periodStart: opts.periodStart || null,
          periodEnd: opts.periodEnd || null,
        },
      });

      const attachRes = await tx.driverEarning.updateMany({
        where: {
          id: { in: payable.map((r) => r.id) },
          status: "PENDING",
          payoutId: null,
        },
        data: { payoutId: payout.id },
      });

      if (attachRes.count !== payable.length) {
        throw Object.assign(new Error("BATCH_CONTENTS_CHANGED"), { code: "BATCH_CONTENTS_CHANGED" });
      }

      return { payoutId: payout.id, amount, earningCount: payable.length };
    });

    await writeAudit({
      action: "payout_created",
      entityType: "PAYOUT",
      entityId: result.payoutId,
      details: {
        driverId: opts.driverId,
        amount: result.amount,
        earningCount: result.earningCount,
        method,
      },
      actor: opts.actor,
    });

    return { ok: true, ...result };
  } catch (err: any) {
    const code = err?.code || "FAILED";
    const msg =
      code === "BATCH_CONTENTS_CHANGED"
        ? "Some earnings changed while the batch was being created. Reload and try again."
        : code === "NO_ELIGIBLE_EARNINGS"
          ? "No unpaid PENDING earnings to batch for this driver."
          : code === "ALL_FLAGGED_FOR_REVIEW"
            ? "All candidate earnings are flagged for review — clear the queue first."
            : err?.message || "Failed to create batch";
    return { ok: false, error: msg, code };
  }
}

export async function cancelPayoutBatch(opts: {
  payoutId: string;
  reason?: string;
  actor?: string;
}): Promise<{ ok: true; restored: number } | { ok: false; error: string }> {
  try {
    const restored = await prisma.$transaction(async (tx) => {
      const payout = await tx.driverPayout.findUnique({ where: { id: opts.payoutId } });
      if (!payout) throw new Error("Payout not found");
      if (payout.status !== "DRAFT") {
        throw new Error(`Only DRAFT batches can be cancelled (current: ${payout.status}).`);
      }

      const detach = await tx.driverEarning.updateMany({
        where: { payoutId: payout.id },
        data: { payoutId: null, status: "PENDING" },
      });

      await tx.driverPayout.update({
        where: { id: payout.id },
        data: {
          status: "CANCELLED",
          cancelledAt: new Date(),
          cancelledReason: opts.reason?.slice(0, 500) || null,
        },
      });

      return detach.count;
    });

    await writeAudit({
      action: "payout_cancelled",
      entityType: "PAYOUT",
      entityId: opts.payoutId,
      details: { restored, reason: opts.reason || null },
      actor: opts.actor,
    });
    return { ok: true, restored };
  } catch (err: any) {
    return { ok: false, error: err?.message || "Failed to cancel batch" };
  }
}

export async function markPayoutPaid(opts: {
  payoutId: string;
  expectedAmount: number;
  idempotencyKey?: string;
  method?: string;
  reference?: string;
  notes?: string;
  /** Phase 2 — when true AND driver is Connect-ENABLED + STRIPE_CONNECT_ENABLED=true, route via Stripe Transfer. */
  viaConnect?: boolean;
  actor?: string;
}): Promise<
  | { ok: true; amount: number; earningCount: number; stripeTransferId?: string | null }
  | { ok: false; error: string; code?: string }
> {
  const idemKey = opts.idempotencyKey?.slice(0, 120) || null;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const payout = await tx.driverPayout.findUnique({
        where: { id: opts.payoutId },
        include: { earnings: { select: { id: true, driverNet: true, status: true } } },
      });
      if (!payout) throw Object.assign(new Error("Payout not found"), { code: "NOT_FOUND" });

      // Idempotency: if an earlier call already stored this key and PAID, return success.
      if (payout.status === "PAID") {
        if (idemKey && payout.idempotencyKey === idemKey) {
          return { amount: payout.amount, earningCount: payout.earnings.length };
        }
        throw Object.assign(new Error("Payout already marked PAID."), { code: "ALREADY_PAID" });
      }
      if (payout.status !== "DRAFT") {
        throw Object.assign(new Error(`Cannot mark ${payout.status} payout as PAID.`), {
          code: "INVALID_STATUS",
        });
      }

      // Re-sum nets at this instant — reject if someone edited an attached earning.
      const freshAmount = roundMoney(payout.earnings.reduce((s, r) => s + (r.driverNet || 0), 0));
      if (Math.abs(freshAmount - roundMoney(opts.expectedAmount)) > 0.009) {
        throw Object.assign(
          new Error(
            `Amount mismatch — batch now totals $${freshAmount.toFixed(2)} (expected $${opts.expectedAmount.toFixed(
              2
            )}).`
          ),
          { code: "AMOUNT_MISMATCH" }
        );
      }

      // Idempotency key uniqueness up front to avoid P2002 race.
      if (idemKey) {
        const existing = await tx.driverPayout.findUnique({ where: { idempotencyKey: idemKey } });
        if (existing && existing.id !== payout.id) {
          throw Object.assign(new Error("Duplicate idempotency key."), { code: "DUPLICATE_KEY" });
        }
      }

      await tx.driverEarning.updateMany({
        where: { payoutId: payout.id, status: "PENDING" },
        data: { status: "PAID" },
      });

      await tx.driverPayout.update({
        where: { id: payout.id },
        data: {
          status: "PAID",
          paidAt: new Date(),
          idempotencyKey: idemKey,
          method: opts.method ? opts.method.toUpperCase().slice(0, 32) : payout.method,
          reference: opts.reference ? opts.reference.slice(0, 120) : payout.reference,
          notes: opts.notes ? opts.notes.slice(0, 500) : payout.notes,
          amount: freshAmount,
        },
      });

      return {
        amount: freshAmount,
        earningCount: payout.earnings.length,
        driverId: payout.driverId,
      };
    });

    // Phase 2 — optional Connect Transfer path.
    // Runs AFTER the local flip (so the admin ledger is authoritative). If the transfer
    // fails we flag the payout for review but keep status PAID (the local ledger does
    // not lie — admin can still reconcile manually). Rationale: Mark Paid is the admin
    // asserting cash has left their books; the Connect Transfer is just automation.
    let stripeTransferId: string | null = null;
    if (opts.viaConnect) {
      const { createConnectTransferForPayout, isStripeConnectEnabled } = await import(
        "@/lib/stripe-connect"
      );
      if (isStripeConnectEnabled()) {
        const transfer = await createConnectTransferForPayout({
          payoutId: opts.payoutId,
          driverId: result.driverId,
          amountCad: result.amount,
          idempotencyKey: idemKey || `payout-transfer:${opts.payoutId}`,
          actor: opts.actor,
        });
        if (transfer.ok) {
          stripeTransferId = transfer.transferId;
          await prisma.driverPayout.update({
            where: { id: opts.payoutId },
            data: { stripeTransferId: transfer.transferId },
          });
        } else {
          await prisma.driverPayout.update({
            where: { id: opts.payoutId },
            data: {
              notes: [`[Connect ${transfer.code || "ERR"}] ${transfer.error}`, opts.notes || ""]
                .filter(Boolean)
                .join("\n")
                .slice(0, 500),
            },
          });
          await writeAudit({
            action: "payout_connect_transfer_failed",
            entityType: "PAYOUT",
            entityId: opts.payoutId,
            details: { error: transfer.error, code: transfer.code },
            actor: opts.actor,
          });
        }
      }
    }

    await writeAudit({
      action: "payout_marked_paid",
      entityType: "PAYOUT",
      entityId: opts.payoutId,
      details: {
        amount: result.amount,
        earningCount: result.earningCount,
        method: opts.method || null,
        stripeTransferId,
      },
      actor: opts.actor,
    });
    return {
      ok: true,
      amount: result.amount,
      earningCount: result.earningCount,
      stripeTransferId,
    };
  } catch (err: any) {
    return { ok: false, error: err?.message || "Failed to mark paid", code: err?.code };
  }
}

export async function markRemittanceRemitted(opts: {
  remittanceId: string;
  action?: "remitted" | "waive";
  method?: string;
  reference?: string;
  notes?: string;
  waivedReason?: string;
  actor?: string;
}): Promise<
  | { ok: true; status: string }
  | { ok: false; error: string }
> {
  const remit = await prisma.driverRemittance.findUnique({ where: { id: opts.remittanceId } });
  if (!remit) return { ok: false, error: "Remittance not found" };
  if (remit.status === "REMITTED" || remit.status === "WAIVED") {
    return { ok: false, error: `Remittance is already ${remit.status}.` };
  }

  const action = opts.action || "remitted";

  if (action === "waive") {
    const row = await prisma.driverRemittance.update({
      where: { id: opts.remittanceId },
      data: {
        status: "WAIVED",
        waivedAt: new Date(),
        waivedReason: opts.waivedReason?.slice(0, 500) || "Admin waived",
        notes: opts.notes?.slice(0, 500) || remit.notes,
      },
    });
    await writeAudit({
      action: "remittance_waived",
      entityType: "REMITTANCE",
      entityId: opts.remittanceId,
      details: { reason: opts.waivedReason || null },
      actor: opts.actor,
    });
    return { ok: true, status: row.status };
  }

  const method = (opts.method || "INTERAC").toUpperCase();
  if (!["INTERAC", "EFT", "CHEQUE", "CASH", "OTHER"].includes(method)) {
    return { ok: false, error: `Unsupported remittance method: ${method}` };
  }

  const row = await prisma.driverRemittance.update({
    where: { id: opts.remittanceId },
    data: {
      status: "REMITTED",
      method,
      reference: opts.reference?.slice(0, 120) || null,
      notes: opts.notes?.slice(0, 500) || remit.notes,
      remittedAt: new Date(),
    },
  });
  await writeAudit({
    action: "remittance_remitted",
    entityType: "REMITTANCE",
    entityId: opts.remittanceId,
    details: { method, amountOwed: row.amountOwed, reference: opts.reference || null },
    actor: opts.actor,
  });
  return { ok: true, status: row.status };
}

// ─── Backfill ──────────────────────────────────────────────────────────────

/**
 * Walk existing DONE/NO_SHOW reservations, write earnings/remittances for any missing
 * rows, exclude COD-less records already covered, chunked to avoid DB lock-up.
 *
 * `dryRun` returns what would be created without writing.
 */
export async function backfillEarnings(opts: {
  dryRun?: boolean;
  chunkSize?: number;
  since?: Date | null;
  actor?: string;
} = {}): Promise<{
  scanned: number;
  createdEarnings: number;
  createdRemittances: number;
  skipped: number;
  errors: number;
  dryRun: boolean;
}> {
  const chunk = Math.max(10, Math.min(500, opts.chunkSize || 100));
  const dryRun = !!opts.dryRun;
  const stats = { scanned: 0, createdEarnings: 0, createdRemittances: 0, skipped: 0, errors: 0, dryRun };

  const whereBase: any = {
    assignedDriverId: { not: null },
    status: { in: ["DONE", "NO_SHOW"] },
    ...(opts.since ? { completedAt: { gte: opts.since } } : {}),
  };

  let cursor: string | undefined = undefined;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const batch = await prisma.reservation.findMany({
      where: whereBase,
      orderBy: { id: "asc" },
      take: chunk,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      select: {
        id: true,
        bookingId: true,
        assignedDriverId: true,
        status: true,
        completedAt: true,
        createdAt: true,
        subtotal: true,
        discountAmount: true,
        gratuity: true,
        hst: true,
        paymentStatus: true,
      },
    });

    if (batch.length === 0) break;
    cursor = batch[batch.length - 1]?.id;

    for (const r of batch) {
      stats.scanned += 1;
      try {
        // Skip existing coverage.
        const [eExists, rExists] = await Promise.all([
          prisma.driverEarning.findUnique({ where: { reservationId: r.id }, select: { id: true } }),
          prisma.driverRemittance.findUnique({ where: { reservationId: r.id }, select: { id: true } }),
        ]);
        if (eExists || rExists) {
          stats.skipped += 1;
          continue;
        }

        const bucket = classifyPaymentStatus(r.paymentStatus);
        if (bucket === "COD") {
          // Phase 1 backfill: we count COD as to-be-created remittance (plan allows this via same hook).
          if (dryRun) {
            stats.createdRemittances += 1;
            continue;
          }
          const result = await onReservationCompleted({
            reservationId: r.id,
            mode: r.status === "NO_SHOW" ? "NO_SHOW" : "DONE",
            actor: opts.actor,
          });
          if (result.kind === "remittance") stats.createdRemittances += 1;
          else if (result.kind === "earning") stats.createdEarnings += 1;
          else stats.skipped += 1;
        } else {
          if (dryRun) {
            stats.createdEarnings += 1;
            continue;
          }
          const result = await onReservationCompleted({
            reservationId: r.id,
            mode: r.status === "NO_SHOW" ? "NO_SHOW" : "DONE",
            actor: opts.actor,
          });
          if (result.kind === "earning") stats.createdEarnings += 1;
          else if (result.kind === "remittance") stats.createdRemittances += 1;
          else stats.skipped += 1;
        }
      } catch (err) {
        stats.errors += 1;
        console.error("[driver-pay] backfill row failed", r.id, err);
      }
    }

    if (batch.length < chunk) break;
  }

  await writeAudit({
    action: dryRun ? "backfill_dry_run" : "backfill_run",
    entityType: "BACKFILL",
    details: stats,
    actor: opts.actor,
  });

  return stats;
}
