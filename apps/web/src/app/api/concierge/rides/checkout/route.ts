import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import prisma from "@/lib/prisma";
import { verifyConciergeToken } from "@/lib/concierge-auth";
import { computePlatformFee } from "@/lib/concierge-rules";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

const getStripe = () => new Stripe(process.env.STRIPE_SECRET_KEY!);

function safeReturnBase(raw: unknown): string {
  const fallback = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(
    /\/+$/,
    ""
  );
  const candidate = String(raw || "").trim().replace(/\/+$/, "");
  if (!candidate) return fallback;
  try {
    const u = new URL(candidate);
    if (u.protocol !== "http:" && u.protocol !== "https:") return fallback;
    return `${u.protocol}//${u.host}`;
  } catch {
    return fallback;
  }
}

/** Stripe Checkout Session for hotel concierge APP payment (demo / guest pay link). */
export async function POST(req: NextRequest) {
  const auth = await verifyConciergeToken(req);
  if (!auth) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const clientIp = getClientIp(req);
  const rateLimit = checkRateLimit(`concierge-checkout:${clientIp}`, {
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
      include: { hotel: { select: { name: true } } },
    });
    if (!ride) {
      return NextResponse.json({ success: false, error: "Ride not found" }, { status: 404 });
    }
    if (ride.fare < 0.5) {
      return NextResponse.json(
        { success: false, error: "Fare must be at least $0.50 for Stripe" },
        { status: 400 }
      );
    }
    if (["CANCELLED"].includes(ride.status)) {
      return NextResponse.json({ success: false, error: "Ride is cancelled" }, { status: 400 });
    }

    const amountCents = Math.round(ride.fare * 100);
    const platformFee = computePlatformFee(ride.fare, "APP");
    const returnBase = safeReturnBase(body.returnBaseUrl);

    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "cad",
            unit_amount: amountCents,
            product_data: {
              name: `Hotel Concierge · ${ride.requestCode}`,
              description: `${ride.hotel.name} · ${ride.pickupLocation.slice(0, 80)}`,
            },
          },
        },
      ],
      success_url: `${returnBase}/concierge/pay/success?rideId=${encodeURIComponent(ride.id)}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${returnBase}/concierge/pay/cancel?rideId=${encodeURIComponent(ride.id)}`,
      metadata: {
        type: "concierge_ride",
        rideId: ride.id,
        requestCode: ride.requestCode,
        conciergeId: auth.id,
        platformFee: String(platformFee),
      },
      payment_intent_data: {
        metadata: {
          type: "concierge_ride",
          rideId: ride.id,
          requestCode: ride.requestCode,
        },
      },
    });

    return NextResponse.json({
      success: true,
      url: session.url,
      sessionId: session.id,
      platformFee,
      amount: ride.fare,
      demoHint:
        "Use Stripe test keys + card 4242 4242 4242 4242 for free demo. Live keys charge real money.",
    });
  } catch (e) {
    console.error("[concierge checkout]", e);
    return NextResponse.json({ success: false, error: "Checkout session failed" }, { status: 500 });
  }
}
