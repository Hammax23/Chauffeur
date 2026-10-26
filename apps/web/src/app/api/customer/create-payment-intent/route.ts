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

const RETURN_URL = "sarjworldwide://stripe-redirect";

function bookingModeFromBody(body: Record<string, unknown>): "hourly" | "distance" {
  return String(body.bookingMode || "distance").toLowerCase() === "hourly"
    ? "hourly"
    : "distance";
}

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
        {
          success: false,
          error: `Too many requests. Please try again in ${rateLimit.resetIn} seconds.`,
        },
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

    const body = (await req.json()) as Record<string, unknown>;
    const fare = await resolveAppReservationFare({
      ...body,
      customerId: tokenData.id,
      promoCode: body?.promoCode,
      useReferralCredit: body?.useReferralCredit,
    });
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
    const paymentMethodId =
      typeof body.paymentMethodId === "string" ? body.paymentMethodId.trim() : "";
    const mode = bookingModeFromBody(body);

    const stripe = getStripe();
    const stripeCustomerId = await ensureStripeCustomer(dbCustomer, stripe);

    const metadata = {
      source: "app",
      type: "reservation",
      customerId: tokenData.id,
      vehicleId,
      vehicleName: vehicle,
      distanceMeters: String(Number(body.distanceMeters) || 0),
      bookingMode: mode,
      hourlyDuration: String(Math.min(24, Math.max(2, Math.floor(Number(body.hourlyDuration) || 2)))),
      gratuityPercent: String(fare.pricing.gratuityPercent),
      promoCode: fare.pricing.promoCode || "",
      discountAmount: String(fare.pricing.discountAmount || 0),
    };

    const pricingPayload = {
      subtotal: fare.pricing.subtotal,
      discountAmount: fare.pricing.discountAmount,
      hst: fare.pricing.hst,
      gratuity: fare.pricing.gratuity,
      total: fare.pricing.total,
      promoCode: fare.pricing.promoCode,
    };

    // Uber-style: charge selected saved card (on-session so 3DS can complete).
    if (paymentMethodId.startsWith("pm_")) {
      try {
        const pm = await stripe.paymentMethods.retrieve(paymentMethodId);
        const pmCustomer =
          typeof pm.customer === "string" ? pm.customer : pm.customer?.id || null;
        if (pmCustomer !== stripeCustomerId) {
          return NextResponse.json(
            { success: false, error: "That card is not on your account." },
            { status: 400 }
          );
        }

        const idempotencyKey = [
          "app-book",
          tokenData.id,
          String(amountCents),
          paymentMethodId,
          mode,
          String(fare.pricing.gratuityPercent),
          fare.pricing.promoCode || "",
          String(Math.floor(Number(body.distanceMeters) || 0)),
          String(Math.min(24, Math.max(2, Math.floor(Number(body.hourlyDuration) || 2)))),
        ].join(":");

        const paymentIntent = await stripe.paymentIntents.create(
          {
            amount: amountCents,
            currency: "cad",
            customer: stripeCustomerId,
            payment_method: paymentMethodId,
            payment_method_types: ["card"],
            confirm: true,
            off_session: false,
            setup_future_usage: "off_session",
            return_url: RETURN_URL,
            receipt_email: email || undefined,
            metadata,
          },
          { idempotencyKey }
        );

        if (paymentIntent.status === "succeeded") {
          return NextResponse.json({
            success: true,
            status: "succeeded",
            paymentIntentId: paymentIntent.id,
            paymentMethodId,
            customerId: stripeCustomerId,
            amountCents,
            pricing: pricingPayload,
          });
        }

        if (
          paymentIntent.status === "requires_action" ||
          paymentIntent.status === "requires_confirmation"
        ) {
          if (!paymentIntent.client_secret) {
            return NextResponse.json(
              { success: false, error: "Could not start card authentication." },
              { status: 502 }
            );
          }
          return NextResponse.json({
            success: true,
            status: "requires_action",
            clientSecret: paymentIntent.client_secret,
            paymentIntentId: paymentIntent.id,
            paymentMethodId,
            customerId: stripeCustomerId,
            amountCents,
            pricing: pricingPayload,
          });
        }

        return NextResponse.json(
          {
            success: false,
            error: `Payment could not be completed (${paymentIntent.status}). Try another card.`,
          },
          { status: 402 }
        );
      } catch (err: unknown) {
        const message =
          err && typeof err === "object" && "message" in err
            ? String((err as { message?: string }).message)
            : "Card was declined. Try another card.";
        console.error("[app-payment-intent] saved-card", message);
        return NextResponse.json(
          { success: false, error: message || "Card was declined. Try another card." },
          { status: 402 }
        );
      }
    }

    // Fallback: PaymentSheet (new card / wallets).
    const ephemeralKeySecret = await createCustomerEphemeralKey(stripeCustomerId, stripe);

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: "cad",
      customer: stripeCustomerId,
      setup_future_usage: "off_session",
      automatic_payment_methods: { enabled: true },
      receipt_email: email || undefined,
      metadata,
    });

    return NextResponse.json({
      success: true,
      status: "requires_payment_method",
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      customerId: stripeCustomerId,
      ephemeralKeySecret,
      amountCents,
      pricing: pricingPayload,
    });
  } catch (error) {
    console.error("[app-payment-intent]", error instanceof Error ? error.message : error);
    return NextResponse.json(
      { success: false, error: "Could not start payment. Please try again." },
      { status: 500 }
    );
  }
}
