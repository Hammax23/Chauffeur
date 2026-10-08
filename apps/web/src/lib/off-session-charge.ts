import Stripe from "stripe";
import { getStripe } from "@/lib/stripe-customer";

export const MAX_SAVED_CARDS = 5;

export type ChargeCardResult =
  | {
      ok: true;
      paymentIntentId: string;
      paymentMethodId: string;
      amount: number;
      currency: string;
    }
  | {
      ok: false;
      code: "declined" | "requires_action" | "no_method" | "stripe_error";
      message: string;
      triedPaymentMethodIds: string[];
    };

/**
 * Charge a Stripe customer off-session: default PM first, then other saved cards.
 */
export async function chargeCustomerOffSession(opts: {
  stripeCustomerId: string;
  amountCad: number;
  currency?: string;
  description: string;
  metadata?: Record<string, string>;
  preferredPaymentMethodId?: string | null;
  idempotencyKey?: string;
  stripe?: Stripe;
}): Promise<ChargeCardResult> {
  const stripe = opts.stripe ?? getStripe();
  const amountCents = Math.round(opts.amountCad * 100);
  if (!Number.isFinite(amountCents) || amountCents < 50) {
    return {
      ok: false,
      code: "stripe_error",
      message: "Charge amount too small",
      triedPaymentMethodIds: [],
    };
  }

  const [methods, customer] = await Promise.all([
    stripe.paymentMethods.list({ customer: opts.stripeCustomerId, type: "card" }),
    stripe.customers.retrieve(opts.stripeCustomerId),
  ]);

  const defaultPm =
    !("deleted" in customer) && customer.invoice_settings?.default_payment_method
      ? typeof customer.invoice_settings.default_payment_method === "string"
        ? customer.invoice_settings.default_payment_method
        : customer.invoice_settings.default_payment_method.id
      : null;

  const ids = methods.data.map((m) => m.id);
  const ordered: string[] = [];
  const prefer = opts.preferredPaymentMethodId || defaultPm;
  if (prefer && ids.includes(prefer)) ordered.push(prefer);
  for (const id of ids) {
    if (!ordered.includes(id)) ordered.push(id);
  }

  if (ordered.length === 0) {
    return {
      ok: false,
      code: "no_method",
      message: "No saved payment method",
      triedPaymentMethodIds: [],
    };
  }

  const tried: string[] = [];
  let lastMessage = "Card declined";

  for (const paymentMethodId of ordered) {
    tried.push(paymentMethodId);
    try {
      const createOpts: Stripe.PaymentIntentCreateParams = {
        amount: amountCents,
        currency: (opts.currency || "cad").toLowerCase(),
        customer: opts.stripeCustomerId,
        payment_method: paymentMethodId,
        off_session: true,
        confirm: true,
        description: opts.description,
        metadata: opts.metadata || {},
      };
      const paymentIntent = opts.idempotencyKey
        ? await stripe.paymentIntents.create(createOpts, {
            idempotencyKey: `${opts.idempotencyKey}:${paymentMethodId}`,
          })
        : await stripe.paymentIntents.create(createOpts);

      if (paymentIntent.status === "succeeded") {
        return {
          ok: true,
          paymentIntentId: paymentIntent.id,
          paymentMethodId,
          amount: paymentIntent.amount / 100,
          currency: paymentIntent.currency,
        };
      }
      if (paymentIntent.status === "requires_action") {
        lastMessage = "Payment requires authentication";
        continue;
      }
      lastMessage = `Payment status: ${paymentIntent.status}`;
    } catch (error: unknown) {
      if (error instanceof Stripe.errors.StripeCardError) {
        lastMessage = error.message;
        continue;
      }
      if (error instanceof Stripe.errors.StripeError) {
        lastMessage = error.message;
        // Card errors we can retry next; others may be fatal
        if (error.code === "authentication_required") continue;
        continue;
      }
      lastMessage = error instanceof Error ? error.message : "Charge failed";
    }
  }

  const needsAuth = /authenticat/i.test(lastMessage);
  return {
    ok: false,
    code: needsAuth ? "requires_action" : "declined",
    message: lastMessage,
    triedPaymentMethodIds: tried,
  };
}

export async function refundPaymentIntent(opts: {
  paymentIntentId: string;
  /** 0–100 */
  refundPercent: number;
  reason?: string;
  metadata?: Record<string, string>;
  stripe?: Stripe;
}): Promise<{ ok: true; refundId: string; amount: number } | { ok: false; message: string }> {
  const stripe = opts.stripe ?? getStripe();
  const pct = Math.max(0, Math.min(100, opts.refundPercent));
  if (pct <= 0) {
    return { ok: false, message: "No refund requested" };
  }

  try {
    const pi = await stripe.paymentIntents.retrieve(opts.paymentIntentId);
    if (pi.status !== "succeeded") {
      return { ok: false, message: `PaymentIntent not refundable (${pi.status})` };
    }
    const refundCents =
      pct >= 100 ? undefined : Math.round((pi.amount_received || pi.amount) * (pct / 100));

    if (refundCents !== undefined && refundCents < 1) {
      return { ok: false, message: "Refund amount too small" };
    }

    const refund = await stripe.refunds.create({
      payment_intent: opts.paymentIntentId,
      ...(refundCents != null ? { amount: refundCents } : {}),
      reason: "requested_by_customer",
      metadata: {
        ...(opts.metadata || {}),
        refundPercent: String(pct),
        note: opts.reason || "",
      },
    });

    return {
      ok: true,
      refundId: refund.id,
      amount: (refund.amount || 0) / 100,
    };
  } catch (e: unknown) {
    return {
      ok: false,
      message: e instanceof Error ? e.message : "Refund failed",
    };
  }
}
