import prisma from "@/lib/prisma";
import {
  extractStripePaymentIntentId,
  getCancelMoneyDecision,
} from "@/lib/cancel-policy";
import { refundPaymentIntent } from "@/lib/off-session-charge";

/**
 * When admin/ops/driver cancels on behalf of the company — full Stripe refund if PAID.
 */
export async function applyCompanyCancelRefund(bookingId: string): Promise<{
  refunded: boolean;
  amount?: number;
  message?: string;
}> {
  const reservation = await prisma.reservation.findUnique({
    where: { bookingId },
  });
  if (!reservation) {
    return { refunded: false, message: "not_found" };
  }

  // No-show keeps prepaid fare — never auto-refund via company cancel path.
  if (reservation.status === "NO_SHOW" || reservation.noShowMarkedAt) {
    return { refunded: false, message: "no_show_retained" };
  }

  const decision = getCancelMoneyDecision({
    serviceDate: reservation.serviceDate,
    serviceTime: reservation.serviceTime,
    isLongDistance: reservation.isLongDistance,
    actor: "company",
  });

  const piId = extractStripePaymentIntentId(reservation);
  const isPaid = String(reservation.paymentStatus || "").toUpperCase() === "PAID";
  const alreadyRefunded = ["REFUNDED", "PARTIALLY_REFUNDED"].includes(
    String(reservation.paymentStatus || "").toUpperCase()
  );

  if (!isPaid || !piId || alreadyRefunded || decision.refundPercent <= 0) {
    const note = [
      reservation.specialRequirements?.trim() || "",
      "Company / driver cancel — full refund policy applied",
      !isPaid ? "No Stripe capture to refund" : "",
      alreadyRefunded ? "Already refunded" : "",
    ]
      .filter(Boolean)
      .join("\n");

    await prisma.reservation.update({
      where: { id: reservation.id },
      data: {
        status: "CANCELLED",
        specialRequirements: note,
      },
    });
    return { refunded: false, message: "no_refund_needed" };
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    return { refunded: false, message: "stripe_not_configured" };
  }

  const refund = await refundPaymentIntent({
    paymentIntentId: piId,
    refundPercent: 100,
    reason: "Company / driver cancel — full refund",
    metadata: { bookingId, actor: "company" },
  });

  const noteBits = [
    reservation.specialRequirements?.trim() || "",
    "Company / driver cancel — full refund",
    refund.ok
      ? `Refund: 100% ($${refund.amount.toFixed(2)})`
      : `Refund failed: ${refund.message}`,
  ].filter(Boolean);

  await prisma.reservation.update({
    where: { id: reservation.id },
    data: {
      status: "CANCELLED",
      paymentStatus: refund.ok ? "REFUNDED" : reservation.paymentStatus,
      specialRequirements: noteBits.join("\n"),
    },
  });

  return refund.ok
    ? { refunded: true, amount: refund.amount }
    : { refunded: false, message: refund.message };
}
