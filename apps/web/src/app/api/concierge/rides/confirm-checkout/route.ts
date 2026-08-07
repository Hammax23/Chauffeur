import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import prisma from "@/lib/prisma";
import { computePlatformFee } from "@/lib/concierge-rules";

const getStripe = () => new Stripe(process.env.STRIPE_SECRET_KEY!);

/** Finalize APP payment after Stripe Checkout succeeds (no JWT — session is proof). */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const sessionId = String(body.sessionId || "");
    if (!sessionId.startsWith("cs_")) {
      return NextResponse.json({ success: false, error: "Invalid session" }, { status: 400 });
    }

    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.payment_status !== "paid") {
      return NextResponse.json(
        { success: false, error: `Payment not complete (${session.payment_status})` },
        { status: 400 }
      );
    }

    const rideId = String(session.metadata?.rideId || body.rideId || "");
    if (!rideId || session.metadata?.type !== "concierge_ride") {
      return NextResponse.json({ success: false, error: "Not a concierge payment" }, { status: 400 });
    }

    const ride = await prisma.conciergeRideRequest.findUnique({ where: { id: rideId } });
    if (!ride) {
      return NextResponse.json({ success: false, error: "Ride not found" }, { status: 404 });
    }

    const platformFee = computePlatformFee(ride.fare, "APP");
    const updated = await prisma.conciergeRideRequest.update({
      where: { id: rideId },
      data: {
        guestPaymentMethod: "APP",
        platformFee,
      },
      select: {
        id: true,
        requestCode: true,
        fare: true,
        platformFee: true,
        guestPaymentMethod: true,
      },
    });

    return NextResponse.json({
      success: true,
      ride: updated,
      paymentIntentId:
        typeof session.payment_intent === "string"
          ? session.payment_intent
          : session.payment_intent?.id || null,
    });
  } catch (e) {
    console.error("[concierge confirm-checkout]", e);
    return NextResponse.json({ success: false, error: "Confirm failed" }, { status: 500 });
  }
}
