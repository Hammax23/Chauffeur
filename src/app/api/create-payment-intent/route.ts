import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { sanitizeInput } from "@/lib/sanitize";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { fleetData } from "@/data/fleet";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-01-28.clover" as any,
});

export async function POST(request: NextRequest) {
  try {
    // Rate limiting: 10 requests per minute per IP
    const clientIp = getClientIp(request);
    const rateLimit = checkRateLimit(`payment:${clientIp}`, { maxRequests: 10, windowMs: 60 * 1000 });
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: `Too many requests. Please try again in ${rateLimit.resetIn} seconds.` },
        { status: 429 }
      );
    }

    const body = await request.json();
    const clientAmount = typeof body.amount === "number" ? body.amount : 0;
    const vehicleId = sanitizeInput(body.vehicleId);
    const durationValue = typeof body.durationValue === "number" ? body.durationValue : 0;
    const currency = sanitizeInput(body.currency) || "cad";
    const metadata: Record<string, string> = {};
    if (body.metadata && typeof body.metadata === "object") {
      for (const [key, value] of Object.entries(body.metadata)) {
        metadata[sanitizeInput(key)] = sanitizeInput(value);
      }
    }

    // Server-side price verification: independently calculate from fleet data
    const vehicle = fleetData.find((v) => v.id === vehicleId);
    if (!vehicle) {
      return NextResponse.json(
        { error: "Invalid vehicle selection" },
        { status: 400 }
      );
    }

    if (durationValue <= 0) {
      return NextResponse.json(
        { error: "Invalid route duration" },
        { status: 400 }
      );
    }

    const durationHours = Math.max(1, Math.ceil(durationValue / 3600));
    const serverPrice = vehicle.price * durationHours;
    const serverAmountCents = Math.round(serverPrice * 100);

    // Reject if client amount doesn't match server calculation
    if (clientAmount !== serverAmountCents) {
      console.error(`Price mismatch: client=${clientAmount}, server=${serverAmountCents}, vehicle=${vehicleId}, duration=${durationValue}s`);
      return NextResponse.json(
        { error: "Price verification failed. Please refresh and try again." },
        { status: 400 }
      );
    }

    // Create a PaymentIntent with the server-verified amount
    const paymentIntent = await stripe.paymentIntents.create({
      amount: serverAmountCents,
      currency,
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        ...metadata,
        vehicleId,
        vehicleName: vehicle.name,
        hourlyRate: String(vehicle.price),
        durationHours: String(durationHours),
        calculatedPrice: String(serverPrice),
      },
    });

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });
  } catch (error: any) {
    console.error("Stripe error:", error);
    return NextResponse.json(
      { error: error.message || "Payment intent creation failed" },
      { status: 500 }
    );
  }
}
