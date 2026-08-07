import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import prisma from "@/lib/prisma";
import { verifyConciergeToken } from "@/lib/concierge-auth";
import { computePlatformFee } from "@/lib/concierge-rules";

const getStripe = () => new Stripe(process.env.STRIPE_SECRET_KEY!);

/** After Stripe PaymentIntent succeeds, lock APP payment + 5% platform fee. */
export async function POST(req: NextRequest) {
  const auth = await verifyConciergeToken(req);
  if (!auth) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const rideId = String(body.rideId || "");
    const paymentIntentId = String(body.paymentIntentId || "");
    if (!rideId || !paymentIntentId) {
      return NextResponse.json(
        { success: false, error: "rideId and paymentIntentId required" },
        { status: 400 }
      );
    }

    const ride = await prisma.conciergeRideRequest.findFirst({
      where: { id: rideId, conciergeId: auth.id },
    });
    if (!ride) {
      return NextResponse.json({ success: false, error: "Ride not found" }, { status: 404 });
    }

    const stripe = getStripe();
    const intent = await stripe.paymentIntents.retrieve(paymentIntentId);
    if (intent.status !== "succeeded") {
      return NextResponse.json(
        { success: false, error: `Payment not succeeded (${intent.status})` },
        { status: 400 }
      );
    }
    if (intent.metadata?.rideId && intent.metadata.rideId !== rideId) {
      return NextResponse.json({ success: false, error: "Payment mismatch" }, { status: 400 });
    }

    const platformFee = computePlatformFee(ride.fare, "APP");
    const updated = await prisma.conciergeRideRequest.update({
      where: { id: rideId },
      data: { guestPaymentMethod: "APP", platformFee },
      include: { commission: true },
    });

    return NextResponse.json({ success: true, ride: updated });
  } catch (e) {
    console.error("[concierge confirm-payment]", e);
    return NextResponse.json({ success: false, error: "Confirm failed" }, { status: 500 });
  }
}
