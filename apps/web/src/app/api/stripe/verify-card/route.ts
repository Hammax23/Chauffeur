import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(request: NextRequest) {
  try {
    const { setupIntentId } = await request.json();

    const setupIntent = await stripe.setupIntents.retrieve(setupIntentId, {
      expand: ["payment_method"],
    });

    if (setupIntent.status === "succeeded") {
      const paymentMethod = setupIntent.payment_method as Stripe.PaymentMethod;
      const card = paymentMethod.card;

      return NextResponse.json({
        verified: true,
        card: {
          brand: card?.brand,
          last4: card?.last4,
          expMonth: card?.exp_month,
          expYear: card?.exp_year,
          cvcCheck: card?.checks?.cvc_check,
          addressCheck: card?.checks?.address_postal_code_check,
        },
        paymentMethodId: paymentMethod.id,
        customerId: setupIntent.customer,
      });
    }

    return NextResponse.json({
      verified: false,
      status: setupIntent.status,
      error: setupIntent.last_setup_error?.message,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Verify card error:", errorMessage);
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
