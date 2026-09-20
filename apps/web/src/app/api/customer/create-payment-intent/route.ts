import { NextRequest, NextResponse } from "next/server";
import {
  getCustomerFromRequest,
  customerInactiveHttpResponse,
} from "@/lib/customer-auth";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import {
  fareTotalCents,
  resolveAppReservationFare,
} from "@/lib/app-reservation-fare";
import prisma from "@/lib/prisma";
import {
  createCustomerEphemeralKey,
  ensureStripeCustomer,
  getStripe,
} from "@/lib/stripe-customer";

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

    const dbCustomer = await prisma.customer.findUnique({
      where: { id: tokenData.id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        stripeCustomerId: true,
        accountStatus: true,
        deactivatedAt: true,
        oauthProvider: true,
      },
    });
    if (!dbCustomer) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const inactive = customerInactiveHttpResponse(dbCustomer);
    if (inactive) {
      return NextResponse.json(inactive.body, { status: inactive.status });
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
        : dbCustomer.email;
    const vehicleId = typeof body.vehicleId === "string" ? body.vehicleId.trim() : "";
    const vehicle = typeof body.vehicle === "string" ? body.vehicle.trim() : "";

    const stripe = getStripe();
    const stripeCustomerId = await ensureStripeCustomer(dbCustomer, stripe);
    const ephemeralKeySecret = await createCustomerEphemeralKey(stripeCustomerId, stripe);

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: "cad",
      customer: stripeCustomerId,
      setup_future_usage: "off_session",
      automatic_payment_methods: { enabled: true },
      receipt_email: email || undefined,
      metadata: {
        source: "app",
        customerId: tokenData.id,
        vehicleId,
        vehicleName: vehicle,
        distanceMeters: String(Number(body.distanceMeters) || 0),
        bookingMode:
          String(body.bookingMode || "distance").toLowerCase() === "hourly"
            ? "hourly"
            : "distance",
        hourlyDuration: String(
          Math.max(3, Math.floor(Number(body.hourlyDuration) || 3))
        ),
        gratuityPercent: String(fare.pricing.gratuityPercent),
      },
    });

    return NextResponse.json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      customerId: stripeCustomerId,
      ephemeralKeySecret,
      amountCents,
    });
  } catch (error) {
    console.error("[app-payment-intent]", error instanceof Error ? error.message : error);
    return NextResponse.json(
      { success: false, error: "Could not start payment. Please try again." },
      { status: 500 }
    );
  }
}
