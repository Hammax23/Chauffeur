import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getCustomerFromRequest } from "@/lib/customer-auth";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import {
  fareTotalCents,
  resolveAppReservationFare,
} from "@/lib/app-reservation-fare";

const getStripe = () => new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: NextRequest) {
  try {
    const tokenData = getCustomerFromRequest(req);
    if (!tokenData) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const clientIp = getClientIp(req);
    const rateLimit = checkRateLimit(`app-payment:${tokenData.id}:${clientIp}`, {
      maxRequests: 10,
      windowMs: 60 * 1000,
    });
    if (!rateLimit.success) {
      return NextResponse.json(
        { success: false, error: `Too many requests. Please try again in ${rateLimit.resetIn} seconds.` },
        { status: 429 }
      );
    }

    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json(
        { success: false, error: "Payments are temporarily unavailable." },
        { status: 503 }
      );
    }

    const body = await req.json();
    const fare = await resolveAppReservationFare(body);
    if ("error" in fare) {
      return NextResponse.json({ success: false, error: fare.error }, { status: 400 });
    }

    const amountCents = fareTotalCents(fare.pricing.total);
    if (amountCents < 50) {
      return NextResponse.json(
        { success: false, error: "Invalid booking total. Please complete your trip details." },
        { status: 400 }
      );
    }

    const email =
      typeof body.email === "string" && body.email.trim()
        ? body.email.trim()
        : tokenData.email;
    const vehicleId = typeof body.vehicleId === "string" ? body.vehicleId.trim() : "";
    const vehicle = typeof body.vehicle === "string" ? body.vehicle.trim() : "";

    const stripe = getStripe();
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: "cad",
      automatic_payment_methods: { enabled: true },
      receipt_email: email || undefined,
      metadata: {
        source: "app",
        customerId: tokenData.id,
        vehicleId,
        vehicleName: vehicle,
        distanceMeters: String(Number(body.distanceMeters) || 0),
        gratuityPercent: String(fare.pricing.gratuityPercent),
      },
    });

    return NextResponse.json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amountCents,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Payment intent creation failed";
    console.error("[app-payment-intent]", message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
