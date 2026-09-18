import { NextRequest, NextResponse } from "next/server";
import {
  getCustomerFromRequest,
  blockedCustomerResponse,
  isCustomerBlocked,
} from "@/lib/customer-auth";
import prisma from "@/lib/prisma";
import {
  createCustomerEphemeralKey,
  ensureStripeCustomer,
  getStripe,
} from "@/lib/stripe-customer";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

/**
 * Create SetupIntent + ephemeral key so the app can save a card via PaymentSheet (no charge).
 */
export async function POST(req: NextRequest) {
  try {
    const token = getCustomerFromRequest(req);
    if (!token) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json(
        { success: false, error: "Payments are temporarily unavailable." },
        { status: 503 }
      );
    }

    const clientIp = getClientIp(req);
    const rateLimit = checkRateLimit(`pm-setup:${token.id}:${clientIp}`, {
      maxRequests: 10,
      windowMs: 60 * 1000,
    });
    if (!rateLimit.success) {
      return NextResponse.json(
        {
          success: false,
          error: `Too many requests. Please try again in ${rateLimit.resetIn} seconds.`,
        },
        { status: 429 }
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
      },
    });
    if (!customer) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    if (isCustomerBlocked(customer)) {
      return NextResponse.json(blockedCustomerResponse(), { status: 403 });
    }

    const stripe = getStripe();
    const stripeCustomerId = await ensureStripeCustomer(customer, stripe);

    const [setupIntent, ephemeralKeySecret] = await Promise.all([
      stripe.setupIntents.create({
        customer: stripeCustomerId,
        payment_method_types: ["card"],
        usage: "off_session",
        metadata: { appCustomerId: customer.id, source: "app_wallet" },
      }),
      createCustomerEphemeralKey(stripeCustomerId, stripe),
    ]);

    return NextResponse.json({
      success: true,
      setupIntentClientSecret: setupIntent.client_secret,
      customerId: stripeCustomerId,
      ephemeralKeySecret,
    });
  } catch (e: unknown) {
    console.error("[customer payment-methods setup-intent]", e);
    return NextResponse.json(
      { success: false, error: "Could not start card setup. Please try again." },
      { status: 500 }
    );
  }
}
