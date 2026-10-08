import { NextRequest, NextResponse } from "next/server";
import {
  getCustomerFromRequest,
  customerInactiveHttpResponse,
} from "@/lib/customer-auth";
import prisma from "@/lib/prisma";
import { ensureStripeCustomer, getStripe } from "@/lib/stripe-customer";

/** Set default payment method for off-session charges. */
export async function POST(req: NextRequest) {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json(
        { success: false, error: "Payments are temporarily unavailable." },
        { status: 503 }
      );
    }

    const token = getCustomerFromRequest(req);
    if (!token) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const paymentMethodId = String(body?.paymentMethodId || "").trim();
    if (!paymentMethodId.startsWith("pm_")) {
      return NextResponse.json(
        { success: false, error: "Invalid payment method." },
        { status: 400 }
      );
    }

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
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const inactive = customerInactiveHttpResponse(customer);
    if (inactive) {
      return NextResponse.json(inactive.body, { status: inactive.status });
    }

    const stripe = getStripe();
    const stripeCustomerId = await ensureStripeCustomer(customer, stripe);
    const pm = await stripe.paymentMethods.retrieve(paymentMethodId);
    if (pm.customer !== stripeCustomerId) {
      return NextResponse.json(
        { success: false, error: "This card is not on your account." },
        { status: 403 }
      );
    }

    await stripe.customers.update(stripeCustomerId, {
      invoice_settings: { default_payment_method: paymentMethodId },
    });

    return NextResponse.json({ success: true, defaultPaymentMethodId: paymentMethodId });
  } catch (e: unknown) {
    console.error("[customer payment-methods default]", e);
    return NextResponse.json(
      { success: false, error: "Could not set default card." },
      { status: 500 }
    );
  }
}
