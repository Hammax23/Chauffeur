import "server-only";
import prisma from "@/lib/prisma";
import {
  ensureStandardInvoiceForReservation,
  ensureSupplementInvoiceForAdjustment,
  issueCreditNoteForRefund,
} from "@/lib/invoice-engine";

/** Fire-and-forget safe wrapper — never blocks booking/payment success path. */
export function triggerStandardInvoiceByReservationId(
  reservationId: string,
  actor = "system"
): void {
  void ensureStandardInvoiceForReservation(reservationId, { actor }).catch((e) =>
    console.error("[invoice-hooks] standard invoice", reservationId, e)
  );
}

export function triggerStandardInvoiceByBookingId(
  bookingId: string,
  actor = "system"
): void {
  void (async () => {
    const r = await prisma.reservation.findUnique({
      where: { bookingId },
      select: { id: true, paymentStatus: true },
    });
    if (!r) return;
    if (String(r.paymentStatus || "").toUpperCase() !== "PAID") return;
    await ensureStandardInvoiceForReservation(r.id, { actor });
  })().catch((e) => console.error("[invoice-hooks] by booking", bookingId, e));
}

export function triggerSupplementInvoiceForAdjustment(
  fareAdjustmentId: string,
  actor = "system"
): void {
  void ensureSupplementInvoiceForAdjustment(fareAdjustmentId, { actor }).catch((e) =>
    console.error("[invoice-hooks] supplement", fareAdjustmentId, e)
  );
}

export function triggerCreditNoteForRefund(opts: {
  bookingId?: string;
  reservationId?: string;
  refundAmount: number;
  stripeRefundId?: string | null;
  actor?: string;
}): void {
  void (async () => {
    let reservationId = opts.reservationId;
    if (!reservationId && opts.bookingId) {
      const r = await prisma.reservation.findUnique({
        where: { bookingId: opts.bookingId },
        select: { id: true },
      });
      reservationId = r?.id;
    }
    if (!reservationId) return;
    await issueCreditNoteForRefund({
      reservationId,
      refundAmount: opts.refundAmount,
      stripeRefundId: opts.stripeRefundId,
      actor: opts.actor || "stripe-webhook",
    });
  })().catch((e) => console.error("[invoice-hooks] credit note", e));
}
