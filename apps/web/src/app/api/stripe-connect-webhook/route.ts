// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { applyAccountUpdatedWebhook, getStripeConnect } from "@/lib/stripe-connect";
import { writeAudit } from "@/lib/driver-pay";

/**
 * Stripe Connect webhook endpoint. Point your *Connect* webhook endpoint in the Stripe
 * dashboard here (separate from the primary account webhook because the signing secret
 * differs). Env var: `STRIPE_CONNECT_WEBHOOK_SECRET` (falls back to STRIPE_WEBHOOK_SECRET
 * if unset — same webhook used for both will also work).
 *
 * We handle `account.updated` and (best-effort) `transfer.created / updated`. Everything
 * else logs and 200s so Stripe does not retry.
 */
export async function POST(request: NextRequest) {
  const stripe = getStripeConnect();
  if (!stripe) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
  }

  const webhookSecret =
    process.env.STRIPE_CONNECT_WEBHOOK_SECRET || process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 503 });
  }

  const body = await request.text();
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err: any) {
    console.error("[stripe-connect-webhook] signature verification failed", err?.message);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "account.updated": {
        const account = event.data.object as Stripe.Account;
        const result = await applyAccountUpdatedWebhook(account);
        if (!result.matched) {
          console.log(
            `[stripe-connect-webhook] account.updated for unknown driver ${account.id}`
          );
        }
        break;
      }

      case "account.application.deauthorized": {
        // Driver disconnected the Connect account; log but keep the row (admin can decide).
        const account = event.data.object as Stripe.Account;
        await writeAudit({
          action: "connect_account_deauthorized",
          entityType: "CONNECT",
          entityId: null,
          details: { stripeAccountId: account.id },
          actor: "stripe_webhook",
        });
        break;
      }

      case "transfer.created":
      case "transfer.updated":
      case "transfer.reversed":
      case "payout.paid":
      case "payout.failed": {
        // Informational only — Mark Paid is the authoritative admin assertion.
        await writeAudit({
          action: `connect_${event.type.replace(/\./g, "_")}`,
          entityType: "CONNECT",
          entityId: null,
          details: { id: (event.data.object as any)?.id, type: event.type },
          actor: "stripe_webhook",
        });
        break;
      }

      default:
        // Not interesting — log at debug level only.
        break;
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error("[stripe-connect-webhook] handler failed", error);
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }
}
