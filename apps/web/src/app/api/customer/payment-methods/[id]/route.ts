import { NextRequest, NextResponse } from "next/server";
import {
  getCustomerFromRequest,
  blockedCustomerResponse,
  isCustomerBlocked,
} from "@/lib/customer-auth";
import prisma from "@/lib/prisma";
import { getStripe } from "@/lib/stripe-customer";

type RouteParams = { params: Promise<{ id: string }> };

/** Detach a saved card (must belong to this customer's Stripe customer). */
export async function DELETE(req: NextRequest, { params }: RouteParams) {
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

    const { id: paymentMethodId } = await params;
    if (!paymentMethodId?.startsWith("pm_")) {
      return NextResponse.json({ success: false, error: "Invalid payment method." }, { status: 400 });
    }

    const customer = await prisma.customer.findUnique({
      where: { id: token.id },
      select: { stripeCustomerId: true, accountStatus: true },
    });
    if (!customer) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    if (isCustomerBlocked(customer)) {
      return NextResponse.json(blockedCustomerResponse(), { status: 403 });
    }
    if (!customer.stripeCustomerId) {
      return NextResponse.json({ success: false, error: "No saved cards." }, { status: 404 });
    }

    const stripe = getStripe();
    const pm = await stripe.paymentMethods.retrieve(paymentMethodId);
    if (pm.customer !== customer.stripeCustomerId) {
      return NextResponse.json({ success: false, error: "Card not found." }, { status: 404 });
    }

    await stripe.paymentMethods.detach(paymentMethodId);

    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    console.error("[customer payment-methods DELETE]", e);
    return NextResponse.json(
      { success: false, error: "Could not remove this card. Please try again." },
      { status: 500 }
    );
  }
}
