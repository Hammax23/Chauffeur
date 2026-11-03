import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { verifyAdminAuth } from "@/lib/admin-auth";

const getStripe = () => {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) throw new Error("STRIPE_SECRET_KEY is not configured");
  return new Stripe(key);
};

/**
 * Admin-only off-session charge. Never accept anonymous callers —
 * previously this endpoint was fully public (Critical).
 */
export async function POST(req: NextRequest) {
  const auth = await verifyAdminAuth(req);
  if (!auth.authenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const {
      customerId,
      paymentMethodId,
      amount,
      currency = "cad",
      description,
      reservationId,
    } = await req.json();

    if (!customerId || !paymentMethodId || !amount) {
      return NextResponse.json(
        { error: "Missing required fields: customerId, paymentMethodId, amount" },
        { status: 400 }
      );
    }

    if (typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }

    const stripe = getStripe();
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency,
      customer: customerId,
      payment_method: paymentMethodId,
      off_session: true,
      confirm: true,
      description:
        description || `Chauffeur Service - Reservation #${reservationId || ""}`,
      metadata: {
        reservationId: reservationId || "",
        chargedBy: "admin",
      },
    });

    if (paymentIntent.status === "succeeded") {
      return NextResponse.json({
        success: true,
        paymentIntentId: paymentIntent.id,
        amount: paymentIntent.amount / 100,
        currency: paymentIntent.currency,
        status: paymentIntent.status,
        message: "Payment successful",
      });
    }

    if (paymentIntent.status === "requires_action") {
      return NextResponse.json({
        success: false,
        requiresAction: true,
        clientSecret: paymentIntent.client_secret,
        message: "Payment requires additional authentication (3D Secure)",
      });
    }

    return NextResponse.json({
      success: false,
      status: paymentIntent.status,
      message: `Payment status: ${paymentIntent.status}`,
    });
  } catch (error: unknown) {
    console.error("Stripe charge error:", error);

    if (error instanceof Stripe.errors.StripeCardError) {
      return NextResponse.json(
        { error: "Card declined", message: error.message, code: error.code },
        { status: 400 }
      );
    }

    if (error instanceof Stripe.errors.StripeError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Failed to process payment" },
      { status: 500 }
    );
  }
}
