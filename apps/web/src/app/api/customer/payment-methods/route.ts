import { NextRequest, NextResponse } from "next/server";
import {
  getCustomerFromRequest,
  customerInactiveHttpResponse,
} from "@/lib/customer-auth";
import prisma from "@/lib/prisma";
import {
  ensureStripeCustomer,
  getStripe,
} from "@/lib/stripe-customer";

async function loadActiveCustomer(req: NextRequest) {
  const token = getCustomerFromRequest(req);
  if (!token) return { error: NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 }) };

  const customer = await prisma.customer.findUnique({
    where: { id: token.id },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      stripeCustomerId: true,
      accountStatus: true,
      deactivatedAt: true,
      oauthProvider: true,
    },
  });

  if (!customer) {
    return { error: NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 }) };
  }
  const inactive = customerInactiveHttpResponse(customer);
  if (inactive) {
    return { error: NextResponse.json(inactive.body, { status: inactive.status }) };
  }
  return { customer };
}

/** List saved cards for the authenticated customer. */
export async function GET(req: NextRequest) {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json(
        { success: false, error: "Payments are temporarily unavailable." },
        { status: 503 }
      );
    }

    const loaded = await loadActiveCustomer(req);
    if ("error" in loaded) return loaded.error;

    const stripe = getStripe();
    const stripeCustomerId = await ensureStripeCustomer(loaded.customer, stripe);

    const [methods, stripeCustomer] = await Promise.all([
      stripe.paymentMethods.list({ customer: stripeCustomerId, type: "card" }),
      stripe.customers.retrieve(stripeCustomerId),
    ]);

    const defaultPm =
      !("deleted" in stripeCustomer) && stripeCustomer.invoice_settings?.default_payment_method
        ? typeof stripeCustomer.invoice_settings.default_payment_method === "string"
          ? stripeCustomer.invoice_settings.default_payment_method
          : stripeCustomer.invoice_settings.default_payment_method.id
        : null;

    const cards = methods.data.map((pm) => ({
      id: pm.id,
      brand: pm.card?.brand || "card",
      last4: pm.card?.last4 || "••••",
      expMonth: pm.card?.exp_month ?? null,
      expYear: pm.card?.exp_year ?? null,
      isDefault: defaultPm === pm.id,
    }));

    return NextResponse.json({
      success: true,
      customerId: stripeCustomerId,
      paymentMethods: cards,
    });
  } catch (e: unknown) {
    console.error("[customer payment-methods GET]", e);
    const code =
      e && typeof e === "object" && "code" in e
        ? String((e as { code?: string }).code)
        : "";
    if (code === "P2024") {
      return NextResponse.json(
        {
          success: false,
          error: "Server is busy. Please wait a moment and try again.",
        },
        { status: 503 }
      );
    }
    const stripeMsg =
      e && typeof e === "object" && "message" in e
        ? String((e as { message?: string }).message)
        : "";
    // Live Stripe customer id + test secret (or reverse) — clearest recovery path.
    if (/no such customer/i.test(stripeMsg)) {
      return NextResponse.json(
        {
          success: false,
          error: "Payment profile needs refresh. Pull to refresh or re-open this screen.",
        },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { success: false, error: "Could not load payment methods." },
      { status: 500 }
    );
  }
}
