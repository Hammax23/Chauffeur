import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { sanitizeInput } from "@/lib/sanitize";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { fleetData } from "@/data/fleet";
import { reservationTotalCents } from "@/lib/reservation-pricing";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(request: NextRequest) {
  try {
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
    const bookingMode = sanitizeInput(body.bookingMode) === "hourly" ? "hourly" : "distance";
    const distanceMeters = typeof body.distanceMeters === "number" ? body.distanceMeters : 0;
    const hourlyDuration = typeof body.hourlyDuration === "number" ? body.hourlyDuration : 3;
    const stopCount = typeof body.stopCount === "number" ? body.stopCount : 0;
    const childSeatCount = typeof body.childSeatCount === "number" ? body.childSeatCount : 0;
    const meetGreet = body.meetGreet === true;
    const bouquetFlowers = body.bouquetFlowers === true;
    const gratuityPercent = typeof body.gratuityPercent === "number" ? body.gratuityPercent : 15;
    const currency = sanitizeInput(body.currency) || "cad";
    const email = sanitizeInput(body.email);

    const metadata: Record<string, string> = {};
    if (body.metadata && typeof body.metadata === "object") {
      for (const [key, value] of Object.entries(body.metadata)) {
        metadata[sanitizeInput(key)] = sanitizeInput(String(value));
      }
    }

    const vehicle = fleetData.find((v) => v.id === vehicleId);
    if (!vehicle) {
      return NextResponse.json({ error: "Invalid vehicle selection" }, { status: 400 });
    }

    const serverAmountCents = reservationTotalCents({
      vehicleId,
      bookingMode,
      distanceMeters,
      hourlyDuration,
      stopCount,
      childSeatCount,
      meetGreet,
      bouquetFlowers,
      gratuityPercent,
    });

    if (!serverAmountCents || serverAmountCents < 50) {
      return NextResponse.json(
        { error: "Invalid booking total. Please complete your trip details." },
        { status: 400 }
      );
    }

    if (clientAmount !== serverAmountCents) {
      console.error(
        `Price mismatch: client=${clientAmount}, server=${serverAmountCents}, vehicle=${vehicleId}, mode=${bookingMode}`
      );
      return NextResponse.json(
        { error: "Price verification failed. Please refresh and try again." },
        { status: 400 }
      );
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: serverAmountCents,
      currency,
      automatic_payment_methods: { enabled: true },
      receipt_email: email || undefined,
      metadata: {
        ...metadata,
        vehicleId,
        vehicleName: vehicle.name,
        bookingMode,
        distanceMeters: String(distanceMeters),
        hourlyDuration: String(hourlyDuration),
        gratuityPercent: String(gratuityPercent),
      },
    });

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Payment intent creation failed";
    console.error("Stripe error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
