import Stripe from "stripe";
import prisma from "@/lib/prisma";

export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY is not configured");
  }
  return new Stripe(key);
}

export type AppCustomerForStripe = {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  stripeCustomerId?: string | null;
};

/**
 * Ensure the app Customer has a durable Stripe Customer id (for PaymentSheet + saved cards).
 */
export async function ensureStripeCustomer(
  customer: AppCustomerForStripe,
  stripe: Stripe = getStripe()
): Promise<string> {
  if (customer.stripeCustomerId) {
    try {
      const existing = await stripe.customers.retrieve(customer.stripeCustomerId);
      if (!("deleted" in existing && existing.deleted)) {
        return customer.stripeCustomerId;
      }
    } catch {
      // Stale / missing id — recreate below
    }
  }

  const name = [customer.firstName, customer.lastName].filter(Boolean).join(" ").trim() || undefined;

  const created = await stripe.customers.create({
    email: customer.email,
    name,
    metadata: {
      appCustomerId: customer.id,
      source: "sarj_app",
    },
  });

  await prisma.customer.update({
    where: { id: customer.id },
    data: { stripeCustomerId: created.id },
  });

  return created.id;
}

/** Ephemeral key for Stripe PaymentSheet (mobile). */
export async function createCustomerEphemeralKey(
  stripeCustomerId: string,
  stripe: Stripe = getStripe()
): Promise<string> {
  const key = await stripe.ephemeralKeys.create(
    { customer: stripeCustomerId },
    { apiVersion: "2026-01-28.clover" }
  );
  if (!key.secret) {
    throw new Error("Stripe did not return an ephemeral key secret");
  }
  return key.secret;
}
