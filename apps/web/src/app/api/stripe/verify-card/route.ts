import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

const getStripe = () => {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) throw new Error("STRIPE_SECRET_KEY is not configured");
  return new Stripe(key);
};

/** Public website card verify — rate-limited; returns only booking-needed fields. */
export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const rl = await checkRateLimit(`stripe-verify:${ip}`, {
    maxRequests: 15,
    windowMs: 15 * 60 * 1000,
  });
  if (!rl.success) {
    return NextResponse.json(
      { error: `Too many requests. Try again in ${rl.resetIn} seconds.` },
      { status: 429 }
    );
  }

  try {
    const body = await request.json();
    const setupIntentId =
      typeof body?.setupIntentId === "string" ? body.setupIntentId.trim() : "";
    if (!setupIntentId.startsWith("seti_")) {
      return NextResponse.json({ error: "Invalid setupIntentId" }, { status: 400 });
    }

    const stripe = getStripe();
    const setupIntent = await stripe.setupIntents.retrieve(setupIntentId, {
      expand: ["payment_method"],
    });

    // Only accept intents created by our guest booking flow.
    if (setupIntent.metadata?.source !== "web_guest_booking") {
      return NextResponse.json(
        { error: "Invalid card verification session" },
        { status: 400 }
      );
    }

    if (setupIntent.status === "succeeded") {
      const paymentMethod = setupIntent.payment_method as Stripe.PaymentMethod;
      if (!paymentMethod || typeof paymentMethod === "string") {
        return NextResponse.json(
          { verified: false, error: "Payment method missing" },
          { status: 400 }
        );
      }
      const card = paymentMethod.card;

      return NextResponse.json({
        verified: true,
        card: {
          brand: card?.brand,
          last4: card?.last4,
          expMonth: card?.exp_month,
          expYear: card?.exp_year,
        },
        paymentMethodId: paymentMethod.id,
        customerId: setupIntent.customer,
      });
    }

    return NextResponse.json({
      verified: false,
      status: setupIntent.status,
      error: "Card verification incomplete",
    });
  } catch (error: unknown) {
    console.error(
      "Verify card error:",
      error instanceof Error ? error.message : error
    );
    return NextResponse.json(
      { error: "Unable to verify card. Please try again." },
      { status: 500 }
    );
  }
}
