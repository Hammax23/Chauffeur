import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");

export async function POST(req: NextRequest) {
  try {
    const { 
      customerId, 
      paymentMethodId, 
      amount, 
      currency = "cad",
      description,
      reservationId 
    } = await req.json();

    if (!customerId || !paymentMethodId || !amount) {
      return NextResponse.json(
        { error: "Missing required fields: customerId, paymentMethodId, amount" },
        { status: 400 }
      );
    }

    // Create a PaymentIntent with the saved payment method
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency,
      customer: customerId,
      payment_method: paymentMethodId,
      off_session: true, // Charging without customer present
      confirm: true, // Immediately confirm the payment
      description: description || `Chauffeur Service - Reservation #${reservationId}`,
      metadata: {
        reservationId: reservationId || "",
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
    } else if (paymentIntent.status === "requires_action") {
      // 3D Secure required - need customer interaction
      return NextResponse.json({
        success: false,
        requiresAction: true,
        clientSecret: paymentIntent.client_secret,
        message: "Payment requires additional authentication (3D Secure)",
      });
    } else {
      return NextResponse.json({
        success: false,
        status: paymentIntent.status,
        message: `Payment status: ${paymentIntent.status}`,
      });
    }
  } catch (error: unknown) {
    console.error("Stripe charge error:", error);
    
    if (error instanceof Stripe.errors.StripeCardError) {
      // Card was declined
      return NextResponse.json(
        { 
          error: "Card declined", 
          message: error.message,
          code: error.code 
        },
        { status: 400 }
      );
    }
    
    if (error instanceof Stripe.errors.StripeError) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to process payment" },
      { status: 500 }
    );
  }
}
