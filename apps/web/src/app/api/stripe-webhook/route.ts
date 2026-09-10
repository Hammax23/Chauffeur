import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import prisma from "@/lib/prisma";

const getStripe = () => new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-01-28.clover" as any,
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get("stripe-signature");

    if (!signature) {
      return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
    }

    let event: Stripe.Event;

    try {
      const stripe = getStripe();
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err: any) {
      console.error("Webhook signature verification failed:", err.message);
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (
          session.payment_status === "paid" &&
          session.metadata?.type === "reservation" &&
          session.metadata?.bookingId
        ) {
          const bookingId = session.metadata.bookingId;
          try {
            await prisma.reservation.update({
              where: { bookingId },
              data: { paymentStatus: "PAID" },
            });
            console.log(`Reservation ${bookingId} marked PAID via checkout.session.completed`);
          } catch (e) {
            console.error(`Failed to mark reservation ${bookingId} paid:`, e);
          }
        }
        break;
      }

      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log(`Payment succeeded: ${paymentIntent.id}`);
        console.log("Amount:", paymentIntent.amount / 100, paymentIntent.currency.toUpperCase());
        console.log("Metadata:", paymentIntent.metadata);
        if (paymentIntent.metadata?.type === "reservation" && paymentIntent.metadata?.bookingId) {
          const bookingId = paymentIntent.metadata.bookingId;
          try {
            await prisma.reservation.update({
              where: { bookingId },
              data: { paymentStatus: "PAID" },
            });
          } catch (e) {
            console.error(`Failed to mark reservation ${bookingId} paid from PI:`, e);
          }
        }
        break;
      }

      case "payment_intent.payment_failed": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.error(`Payment failed: ${paymentIntent.id}`);
        console.error("Error:", paymentIntent.last_payment_error?.message);
        break;
      }

      case "charge.refunded": {
        const charge = event.data.object as Stripe.Charge;
        console.log(`Refund processed for charge: ${charge.id}`);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error("Webhook error:", error);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }
}
