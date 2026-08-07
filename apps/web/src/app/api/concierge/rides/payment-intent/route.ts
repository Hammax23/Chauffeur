import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import prisma from "@/lib/prisma";
import { verifyConciergeToken } from "@/lib/concierge-auth";
import { computePlatformFee } from "@/lib/concierge-rules";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

const getStripe = () => new Stripe(process.env.STRIPE_SECRET_KEY!);

/** Create PaymentIntent for guest APP payment on a concierge ride (fare + tracked 5% fee). */
export async function POST(req: NextRequest) {
  const auth = await verifyConciergeToken(req);
  if (!auth) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const clientIp = getClientIp(req);
  const rateLimit = checkRateLimit(`concierge-pay:${clientIp}`, {
    maxRequests: 15,
    windowMs: 60 * 1000,
  });
  if (!rateLimit.success) {
    return NextResponse.json(
      { success: false, error: `Too many requests. Try again in ${rateLimit.resetIn}s.` },
      { status: 429 }
    );
  }

  try {
    const body = await req.json();
    const rideId = String(body.rideId || "");
    if (!rideId) {
      return NextResponse.json({ success: false, error: "rideId required" }, { status: 400 });
    }

    const ride = await prisma.conciergeRideRequest.findFirst({
      where: { id: rideId, conciergeId: auth.id },
    });
    if (!ride) {
      return NextResponse.json({ success: false, error: "Ride not found" }, { status: 404 });
    }
    if (ride.fare < 0.5) {
      return NextResponse.json({ success: false, error: "Fare must be at least $0.50" }, { status: 400 });
    }

    const amountCents = Math.round(ride.fare * 100);
    const platformFee = computePlatformFee(ride.fare, "APP");

    const stripe = getStripe();
    const intent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: "cad",
      automatic_payment_methods: { enabled: true },
      metadata: {
        type: "concierge_ride",
        rideId: ride.id,
        requestCode: ride.requestCode,
        platformFee: String(platformFee),
        conciergeId: auth.id,
      },
    });

    // Prefill APP method + fee; finalize on confirm endpoint or set_payment after success
    await prisma.conciergeRideRequest.update({
      where: { id: ride.id },
      data: {
        guestPaymentMethod: "APP",
        platformFee,
      },
    });

    return NextResponse.json({
      success: true,
      clientSecret: intent.client_secret,
      platformFee,
      amount: ride.fare,
    });
  } catch (e) {
    console.error("[concierge payment-intent]", e);
    return NextResponse.json({ success: false, error: "Payment intent failed" }, { status: 500 });
  }
}
