import "server-only";
import Stripe from "stripe";
import prisma from "@/lib/prisma";
import { processInvoiceJobs } from "@/lib/invoice-engine";
import type { InvoiceFareSnapshot } from "@/lib/invoice-types";
import { safeReturnBase } from "@/lib/reservation-payment-link";

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) throw new Error("STRIPE_SECRET_KEY is not configured");
  return new Stripe(key);
}

function parseSnap(json: string): InvoiceFareSnapshot | null {
  try {
    return JSON.parse(json) as InvoiceFareSnapshot;
  } catch {
    return null;
  }
}

function isPaidSnapshot(snapshot: InvoiceFareSnapshot | null): boolean {
  return String(snapshot?.paymentStatus || "").toUpperCase() === "PAID";
}

async function writeAudit(opts: {
  actor: string;
  adminId?: string | null;
  action: string;
  invoiceId: string;
  bookingId: string;
  meta?: Record<string, unknown>;
}) {
  try {
    await prisma.billingAuditLog.create({
      data: {
        actor: opts.actor,
        adminId: opts.adminId || null,
        action: opts.action,
        invoiceId: opts.invoiceId,
        bookingId: opts.bookingId,
        metaJson: opts.meta ? JSON.stringify(opts.meta) : null,
      },
    });
  } catch (e) {
    console.error("[manual-invoice-payment] audit", e);
  }
}

async function enqueueDeliveryJobs(invoiceId: string) {
  for (const type of ["EMAIL", "QBO_SYNC", "DROPBOX_SYNC"] as const) {
    const uniqueKey = `${invoiceId}:${type}`;
    await prisma.invoiceJob.upsert({
      where: { uniqueKey },
      create: {
        invoiceId,
        type,
        status: "PENDING",
        uniqueKey,
        nextAttemptAt: new Date(),
      },
      update: {
        status: "PENDING",
        nextAttemptAt: new Date(),
        lastError: null,
      },
    });
  }
  await prisma.invoice.update({
    where: { id: invoiceId },
    data: {
      emailStatus: "PENDING",
      qbSyncStatus: "PENDING",
      dropboxSyncStatus: "PENDING",
    },
  });
}

/**
 * Verify a succeeded PaymentIntent belongs to this manual invoice and amount matches.
 * Never trust the client alone.
 */
export async function verifyManualInvoicePaymentIntent(opts: {
  invoiceId: string;
  bookingId: string;
  expectedTotalCad: number;
  paymentIntentId: string;
}): Promise<
  | { ok: true; paymentIntentId: string; amount: number }
  | { ok: false; error: string }
> {
  const piId = String(opts.paymentIntentId || "").trim();
  if (!piId.startsWith("pi_")) {
    return { ok: false, error: "Invalid payment intent id" };
  }

  const stripe = getStripe();
  let pi: Stripe.PaymentIntent;
  try {
    pi = await stripe.paymentIntents.retrieve(piId);
  } catch {
    return { ok: false, error: "Payment intent not found" };
  }

  if (pi.status !== "succeeded") {
    return { ok: false, error: `Payment not succeeded (${pi.status})` };
  }

  if (pi.metadata?.type !== "manual_invoice") {
    return { ok: false, error: "Payment is not for a manual invoice" };
  }

  const metaInvoiceId = String(pi.metadata.invoiceId || "").trim();
  const metaBookingId = String(pi.metadata.bookingId || "").trim();
  if (metaInvoiceId && metaInvoiceId !== opts.invoiceId) {
    return { ok: false, error: "Payment intent invoice mismatch" };
  }
  if (metaBookingId && metaBookingId !== opts.bookingId) {
    return { ok: false, error: "Payment intent booking mismatch" };
  }
  if (!metaInvoiceId && !metaBookingId) {
    return { ok: false, error: "Payment intent missing invoice metadata" };
  }

  const expectedCents = Math.round((Number(opts.expectedTotalCad) || 0) * 100);
  if (!Number.isFinite(expectedCents) || expectedCents < 50) {
    return { ok: false, error: "Invalid invoice total" };
  }
  if (pi.amount !== expectedCents) {
    return {
      ok: false,
      error: `Paid amount mismatch (got ${pi.amount}, expected ${expectedCents})`,
    };
  }

  return { ok: true, paymentIntentId: pi.id, amount: pi.amount / 100 };
}

/** True when this manual invoice must not email until Stripe marks it paid. */
export function manualInvoiceEmailHeld(invoice: {
  source: string;
  emailStatus: string;
  snapshotJson: string;
}): boolean {
  if (invoice.source !== "MANUAL") return false;
  const snapshot = parseSnap(invoice.snapshotJson);
  if (isPaidSnapshot(snapshot)) return false;
  if (invoice.emailStatus === "SKIPPED") return true;
  const method = String(snapshot?.paymentMethodLabel || "");
  return /^credit\s*card$/i.test(method);
}

/** After Stripe payment succeeds — update snapshot + deliver email/QB/Dropbox once. */
export async function markManualInvoicePaidAndDeliver(opts: {
  invoiceId?: string | null;
  bookingId?: string | null;
  paymentIntentId?: string | null;
  /** When false, skip Stripe retrieve (only for already-verified internal callers). */
  verifyPayment?: boolean;
  actor: string;
  adminId?: string | null;
}): Promise<{ ok: true; invoiceId: string; alreadyPaid: boolean } | { ok: false; error: string }> {
  const invoice =
    (opts.invoiceId
      ? await prisma.invoice.findUnique({ where: { id: opts.invoiceId } })
      : null) ||
    (opts.bookingId
      ? await prisma.invoice.findFirst({
          where: { bookingId: opts.bookingId, source: "MANUAL" },
          orderBy: { createdAt: "desc" },
        })
      : null);

  if (!invoice) return { ok: false, error: "Invoice not found" };
  if (invoice.source !== "MANUAL") {
    return { ok: false, error: "Not a manual invoice" };
  }

  const snapshot = parseSnap(invoice.snapshotJson);
  if (!snapshot) return { ok: false, error: "Invalid invoice snapshot" };

  const alreadyPaid = isPaidSnapshot(snapshot);
  if (alreadyPaid && invoice.emailStatus === "DONE") {
    return { ok: true, invoiceId: invoice.id, alreadyPaid: true };
  }

  const verify = opts.verifyPayment !== false;
  let verifiedPiId = opts.paymentIntentId || invoice.stripePaymentIntentId || null;

  if (!alreadyPaid) {
    if (verify) {
      if (!opts.paymentIntentId) {
        return { ok: false, error: "paymentIntentId required to mark paid" };
      }
      const check = await verifyManualInvoicePaymentIntent({
        invoiceId: invoice.id,
        bookingId: invoice.bookingId,
        expectedTotalCad: invoice.total,
        paymentIntentId: opts.paymentIntentId,
      });
      if (!check.ok) return check;
      verifiedPiId = check.paymentIntentId;
    } else if (!opts.paymentIntentId) {
      return { ok: false, error: "paymentIntentId required" };
    } else {
      verifiedPiId = opts.paymentIntentId;
    }

    const nextSnap: InvoiceFareSnapshot = {
      ...snapshot,
      paymentStatus: "PAID",
      paymentMethodLabel: snapshot.paymentMethodLabel || "Credit card",
      stripePaymentIntentId: verifiedPiId,
    };

    await prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        snapshotJson: JSON.stringify(nextSnap),
        stripePaymentIntentId: verifiedPiId,
      },
    });

    await writeAudit({
      actor: opts.actor,
      adminId: opts.adminId,
      action: "MANUAL_INVOICE_MARKED_PAID",
      invoiceId: invoice.id,
      bookingId: invoice.bookingId,
      meta: { paymentIntentId: verifiedPiId },
    });
  }

  // Deliver only from held/failed — never reset in-flight PENDING or completed DONE.
  const email = String(invoice.emailStatus || "").toUpperCase();
  if (email === "SKIPPED" || email === "FAILED") {
    await enqueueDeliveryJobs(invoice.id);
    void processInvoiceJobs(invoice.id).catch(() => {});
  }

  return { ok: true, invoiceId: invoice.id, alreadyPaid };
}

export async function createManualInvoicePaymentLink(opts: {
  invoiceId: string;
  returnBaseUrl?: unknown;
  actor: string;
  adminId?: string | null;
}): Promise<{ url: string; sessionId: string; amount: number }> {
  const inv = await prisma.invoice.findUnique({ where: { id: opts.invoiceId } });
  if (!inv || inv.source !== "MANUAL") {
    throw new Error("Manual invoice not found");
  }
  const amount = Number(inv.total) || 0;
  if (amount < 0.5) throw new Error("Total must be at least $0.50");

  const snapshot = parseSnap(inv.snapshotJson);
  if (isPaidSnapshot(snapshot)) {
    throw new Error("Invoice is already paid");
  }

  const amountCents = Math.round(amount * 100);
  const returnBase = safeReturnBase(opts.returnBaseUrl);
  const stripe = getStripe();

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    customer_email: inv.customerEmail || undefined,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "cad",
          unit_amount: amountCents,
          product_data: {
            name: `SARJ Invoice ${inv.invoiceNumber}`,
            description: `${inv.customerName} · ${inv.bookingId}`,
          },
        },
      },
    ],
    success_url: `${returnBase}/pay/success?invoiceId=${encodeURIComponent(inv.id)}&bookingId=${encodeURIComponent(inv.bookingId)}&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${returnBase}/pay/cancel?invoiceId=${encodeURIComponent(inv.id)}&bookingId=${encodeURIComponent(inv.bookingId)}`,
    metadata: {
      type: "manual_invoice",
      invoiceId: inv.id,
      bookingId: inv.bookingId,
      expectedAmountCents: String(amountCents),
    },
    payment_intent_data: {
      metadata: {
        type: "manual_invoice",
        invoiceId: inv.id,
        bookingId: inv.bookingId,
      },
    },
  });

  if (!session.url) throw new Error("Stripe did not return a checkout URL");

  await writeAudit({
    actor: opts.actor,
    adminId: opts.adminId,
    action: "MANUAL_INVOICE_PAYMENT_LINK_CREATED",
    invoiceId: inv.id,
    bookingId: inv.bookingId,
    meta: { sessionId: session.id },
  });

  return { url: session.url, sessionId: session.id, amount };
}

export async function createManualInvoicePaymentIntent(opts: {
  invoiceId: string;
  actor: string;
  adminId?: string | null;
}): Promise<{ clientSecret: string; paymentIntentId: string; amount: number }> {
  const inv = await prisma.invoice.findUnique({ where: { id: opts.invoiceId } });
  if (!inv || inv.source !== "MANUAL") {
    throw new Error("Manual invoice not found");
  }
  const amount = Number(inv.total) || 0;
  if (amount < 0.5) throw new Error("Total must be at least $0.50");

  const snapshot = parseSnap(inv.snapshotJson);
  if (isPaidSnapshot(snapshot)) {
    throw new Error("Invoice is already paid");
  }

  const amountCents = Math.round(amount * 100);
  const stripe = getStripe();
  const paymentIntent = await stripe.paymentIntents.create({
    amount: amountCents,
    currency: "cad",
    automatic_payment_methods: { enabled: true },
    description: `SARJ Invoice ${inv.invoiceNumber}`,
    // No receipt_email here — invoice email is sent by us only after paid.
    metadata: {
      type: "manual_invoice",
      invoiceId: inv.id,
      bookingId: inv.bookingId,
    },
  });

  if (!paymentIntent.client_secret) {
    throw new Error("Stripe did not return a client secret");
  }

  await writeAudit({
    actor: opts.actor,
    adminId: opts.adminId,
    action: "MANUAL_INVOICE_PAYMENT_INTENT_CREATED",
    invoiceId: inv.id,
    bookingId: inv.bookingId,
    meta: { paymentIntentId: paymentIntent.id },
  });

  return {
    clientSecret: paymentIntent.client_secret,
    paymentIntentId: paymentIntent.id,
    amount,
  };
}

/** Confirm Checkout Session for manual invoice (pay/success page). */
export async function confirmManualInvoiceCheckoutSession(opts: {
  sessionId: string;
  actor?: string;
}): Promise<
  | {
      ok: true;
      invoiceNumber: string;
      bookingId: string;
      total: number;
    }
  | { ok: false; error: string }
> {
  const sessionId = String(opts.sessionId || "").trim();
  if (!sessionId.startsWith("cs_")) {
    return { ok: false, error: "Invalid session" };
  }

  const stripe = getStripe();
  const session = await stripe.checkout.sessions.retrieve(sessionId);

  if (session.payment_status !== "paid") {
    return { ok: false, error: `Payment not complete (${session.payment_status})` };
  }
  if (session.metadata?.type !== "manual_invoice") {
    return { ok: false, error: "Not a manual invoice payment" };
  }

  const invoiceId = String(session.metadata.invoiceId || "").trim();
  const bookingId = String(session.metadata.bookingId || "").trim();
  if (!invoiceId && !bookingId) {
    return { ok: false, error: "Missing invoice metadata" };
  }

  const inv =
    (invoiceId
      ? await prisma.invoice.findUnique({ where: { id: invoiceId } })
      : null) ||
    (bookingId
      ? await prisma.invoice.findFirst({
          where: { bookingId, source: "MANUAL" },
          orderBy: { createdAt: "desc" },
        })
      : null);

  if (!inv) return { ok: false, error: "Invoice not found" };

  const expectedCents = Math.round((Number(inv.total) || 0) * 100);
  if (session.amount_total == null || session.amount_total !== expectedCents) {
    return { ok: false, error: "Paid amount does not match invoice total" };
  }

  const piId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id || null;
  if (!piId) return { ok: false, error: "Missing payment intent on session" };

  const marked = await markManualInvoicePaidAndDeliver({
    invoiceId: inv.id,
    bookingId: inv.bookingId,
    paymentIntentId: piId,
    verifyPayment: true,
    actor: opts.actor || "checkout-confirm",
  });
  if (!marked.ok) return marked;

  return {
    ok: true,
    invoiceNumber: inv.invoiceNumber,
    bookingId: inv.bookingId,
    total: inv.total,
  };
}
