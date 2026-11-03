import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

const getStripe = () => {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) throw new Error("STRIPE_SECRET_KEY is not configured");
  return new Stripe(key);
};

/**
 * Public website card capture for guest booking.
 * Always creates a *new* Stripe customer (never merges by email) so attackers
 * cannot attach cards to an existing app customer's Stripe profile.
 * Rate-limited; never exposes charge capability.
 */
export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const rl = await checkRateLimit(`stripe-setup:${ip}`, {
    maxRequests: 8,
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
    const email =
      typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    const name =
      typeof body?.name === "string" ? body.name.trim().slice(0, 120) : undefined;

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
    }

    const emailRl = await checkRateLimit(`stripe-setup-email:${email}`, {
      maxRequests: 6,
      windowMs: 15 * 60 * 1000,
    });
    if (!emailRl.success) {
      return NextResponse.json(
        { error: `Too many requests. Try again in ${emailRl.resetIn} seconds.` },
        { status: 429 }
      );
    }

    const stripe = getStripe();

    // Intentionally do NOT stripe.customers.list({ email }) — that would let
    // anyone with an email attach payment methods to an existing customer.
    const customer = await stripe.customers.create({
      email,
      name,
      metadata: { source: "web_guest_booking" },
    });

    const setupIntent = await stripe.setupIntents.create({
      customer: customer.id,
      payment_method_types: ["card"],
      usage: "off_session",
      metadata: { source: "web_guest_booking", email },
    });

    return NextResponse.json({
      clientSecret: setupIntent.client_secret,
      customerId: customer.id,
    });
  } catch (error: unknown) {
    console.error(
      "SetupIntent error:",
      error instanceof Error ? error.message : error
    );
    return NextResponse.json(
      { error: "Unable to start card verification. Please try again." },
      { status: 500 }
    );
  }
}
