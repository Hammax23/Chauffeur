import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import prisma from "@/lib/prisma";

const getStripe = () => new Stripe(process.env.STRIPE_SECRET_KEY!);

/** Finalize reservation payment after Stripe Checkout succeeds (session is proof). */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const sessionId = String(body.sessionId || "");
    if (!sessionId.startsWith("cs_")) {
      return NextResponse.json({ success: false, error: "Invalid session" }, { status: 400 });
    }

    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["payment_intent", "payment_intent.payment_method"],
    });

    if (session.payment_status !== "paid") {
      return NextResponse.json(
        { success: false, error: `Payment not complete (${session.payment_status})` },
        { status: 400 }
      );
    }

    if (session.metadata?.type !== "reservation") {
      return NextResponse.json({ success: false, error: "Not a reservation payment" }, { status: 400 });
    }

    const bookingId = String(session.metadata?.bookingId || body.bookingId || "").trim();
    if (!bookingId) {
      return NextResponse.json({ success: false, error: "Missing bookingId" }, { status: 400 });
    }

    const reservation = await prisma.reservation.findUnique({ where: { bookingId } });
    if (!reservation) {
      return NextResponse.json({ success: false, error: "Reservation not found" }, { status: 404 });
    }

    const expectedCents = Math.round((Number(reservation.total) || 0) * 100);
    if (expectedCents > 0 && session.amount_total != null && session.amount_total !== expectedCents) {
      return NextResponse.json(
        { success: false, error: "Paid amount does not match reservation total" },
        { status: 400 }
      );
    }

    const paymentIntent =
      typeof session.payment_intent === "object" && session.payment_intent
        ? session.payment_intent
        : null;
    const paymentMethod =
      paymentIntent &&
      typeof paymentIntent.payment_method === "object" &&
      paymentIntent.payment_method
        ? paymentIntent.payment_method
        : null;

    const card = paymentMethod && "card" in paymentMethod ? paymentMethod.card : null;
    const stripePaymentMethodId =
      paymentMethod && "id" in paymentMethod
        ? paymentMethod.id
        : typeof paymentIntent?.payment_method === "string"
          ? paymentIntent.payment_method
          : reservation.stripePaymentMethodId;
    const stripeCustomerId =
      typeof session.customer === "string"
        ? session.customer
        : session.customer && "id" in session.customer
          ? session.customer.id
          : reservation.stripeCustomerId;

    const updated = await prisma.reservation.update({
      where: { bookingId },
      data: {
        paymentStatus: "PAID",
        stripeCustomerId: stripeCustomerId || undefined,
        stripePaymentMethodId: stripePaymentMethodId || undefined,
        cardLast4: card?.last4 || reservation.cardLast4 || undefined,
        cardType: card?.brand || reservation.cardType || undefined,
      },
      select: {
        bookingId: true,
        paymentStatus: true,
        total: true,
        firstName: true,
        lastName: true,
      },
    });

    return NextResponse.json({
      success: true,
      reservation: updated,
      paymentIntentId: paymentIntent?.id || null,
    });
  } catch (e) {
    console.error("[reservation confirm-checkout]", e);
    return NextResponse.json({ success: false, error: "Confirm failed" }, { status: 500 });
  }
}
