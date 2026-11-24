import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireBillingAdmin } from "@/lib/admin-rbac";
import {
  issueManualInvoiceForReservation,
  issueStandaloneInvoice,
  processInvoiceJobs,
  resendInvoiceEmail,
  retryInvoiceJob,
} from "@/lib/invoice-engine";
import {
  createManualInvoicePaymentIntent,
  createManualInvoicePaymentLink,
  markManualInvoicePaidAndDeliver,
} from "@/lib/manual-invoice-payment";
import type { InvoiceJobType } from "@/lib/invoice-types";

/** GET — list invoices for Billing panel (assistant-safe fields only). */
export async function GET(req: NextRequest) {
  const gate = await requireBillingAdmin(req);
  if (!gate.ok) return gate.response;

  const url = new URL(req.url);
  const q = (url.searchParams.get("q") || "").trim();
  const sync = (url.searchParams.get("sync") || "").trim().toUpperCase();
  const take = Math.min(100, Math.max(1, Number(url.searchParams.get("take") || 50)));

  const where: Record<string, unknown> = {};
  if (q) {
    where.OR = [
      { bookingId: { contains: q, mode: "insensitive" } },
      { invoiceNumber: { contains: q, mode: "insensitive" } },
      { customerEmail: { contains: q, mode: "insensitive" } },
      { customerName: { contains: q, mode: "insensitive" } },
    ];
  }
  if (sync === "FAILED") {
    where.OR = [
      { emailStatus: "FAILED" },
      { qbSyncStatus: "FAILED" },
      { dropboxSyncStatus: "FAILED" },
    ];
  }

  const [invoices, failedCount] = await Promise.all([
    prisma.invoice.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take,
      select: {
        id: true,
        invoiceNumber: true,
        kind: true,
        status: true,
        bookingId: true,
        source: true,
        reservationId: true,
        customerName: true,
        customerEmail: true,
        total: true,
        currency: true,
        emailStatus: true,
        qbSyncStatus: true,
        dropboxSyncStatus: true,
        pdfUrl: true,
        emailedAt: true,
        resendCount: true,
        createdAt: true,
      },
    }),
    prisma.invoice.count({
      where: {
        OR: [
          { emailStatus: "FAILED" },
          { qbSyncStatus: "FAILED" },
          { dropboxSyncStatus: "FAILED" },
        ],
      },
    }),
  ]);

  return NextResponse.json({
    success: true,
    role: gate.auth.role,
    failedCount,
    invoices: invoices.map((i) => ({
      ...i,
      createdAt: i.createdAt.toISOString(),
      emailedAt: i.emailedAt?.toISOString() || null,
    })),
  });
}

/** POST — resend | retry | issue_manual | issue_standalone | process_jobs */
export async function POST(req: NextRequest) {
  const gate = await requireBillingAdmin(req);
  if (!gate.ok) return gate.response;

  const body = await req.json().catch(() => ({}));
  const action = String(body.action || "").trim();

  if (action === "resend") {
    const invoiceId = String(body.invoiceId || "");
    const toEmail =
      typeof body.toEmail === "string" ? body.toEmail.trim().toLowerCase() : "";
    const result = await resendInvoiceEmail({
      invoiceId,
      actor: gate.auth.actor,
      adminId: gate.auth.adminId,
      toEmail: toEmail || null,
    });
    if (!result.ok) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }
    return NextResponse.json({ success: true });
  }

  if (action === "retry") {
    const invoiceId = String(body.invoiceId || "");
    const type = String(body.type || "").toUpperCase() as InvoiceJobType;
    if (!["EMAIL", "QBO_SYNC", "DROPBOX_SYNC"].includes(type)) {
      return NextResponse.json({ success: false, error: "Invalid job type" }, { status: 400 });
    }
    await retryInvoiceJob({
      invoiceId,
      type,
      actor: gate.auth.actor,
      adminId: gate.auth.adminId,
    });
    return NextResponse.json({ success: true });
  }

  if (action === "issue_manual") {
    const reservationId = String(body.reservationId || "");
    const result = await issueManualInvoiceForReservation(reservationId, {
      actor: gate.auth.actor,
      adminId: gate.auth.adminId,
    });
    if (!result.ok) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }
    return NextResponse.json({ success: true, ...result });
  }

  if (action === "issue_standalone") {
    const linesRaw = Array.isArray(body.lines) ? body.lines : [];
    const lines = linesRaw
      .map((l: { label?: unknown; amount?: unknown }) => ({
        label: String(l?.label || "").trim(),
        amount: Number(l?.amount),
      }))
      .filter((l: { label: string; amount: number }) => l.label && Number.isFinite(l.amount));

    const paymentMethodLabel =
      typeof body.paymentMethodLabel === "string" ? body.paymentMethodLabel.trim() : "";
    const isCardCollect = /^credit\s*card$/i.test(paymentMethodLabel);
    // Credit card: never email until Stripe payment succeeds.
    const alreadyPaid = isCardCollect ? false : Boolean(body.alreadyPaid);

    const result = await issueStandaloneInvoice(
      {
        customerName: String(body.customerName || ""),
        customerEmail: String(body.customerEmail || ""),
        customerPhone: typeof body.customerPhone === "string" ? body.customerPhone : "",
        serviceType: typeof body.serviceType === "string" ? body.serviceType : "",
        vehicle: typeof body.vehicle === "string" ? body.vehicle : "",
        serviceDate: typeof body.serviceDate === "string" ? body.serviceDate : "",
        serviceTime: typeof body.serviceTime === "string" ? body.serviceTime : "",
        pickupLocation: typeof body.pickupLocation === "string" ? body.pickupLocation : "",
        dropoffLocation: typeof body.dropoffLocation === "string" ? body.dropoffLocation : "",
        stops: typeof body.stops === "string" ? body.stops : "",
        passengers:
          body.passengers === "" || body.passengers == null
            ? undefined
            : Number(body.passengers),
        paymentMethodLabel,
        alreadyPaid,
        lines,
      },
      { actor: gate.auth.actor, adminId: gate.auth.adminId }
    );
    if (!result.ok) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }
    return NextResponse.json({ success: true, ...result });
  }

  if (action === "create_payment_link") {
    try {
      const link = await createManualInvoicePaymentLink({
        invoiceId: String(body.invoiceId || ""),
        returnBaseUrl: body.returnBaseUrl,
        actor: gate.auth.actor,
        adminId: gate.auth.adminId,
      });
      return NextResponse.json({ success: true, ...link });
    } catch (e) {
      return NextResponse.json(
        { success: false, error: e instanceof Error ? e.message : "Link failed" },
        { status: 400 }
      );
    }
  }

  if (action === "create_payment_intent") {
    try {
      const pi = await createManualInvoicePaymentIntent({
        invoiceId: String(body.invoiceId || ""),
        actor: gate.auth.actor,
        adminId: gate.auth.adminId,
      });
      return NextResponse.json({ success: true, ...pi });
    } catch (e) {
      return NextResponse.json(
        { success: false, error: e instanceof Error ? e.message : "Payment intent failed" },
        { status: 400 }
      );
    }
  }

  if (action === "confirm_manual_paid") {
    const paymentIntentId =
      typeof body.paymentIntentId === "string" ? body.paymentIntentId.trim() : "";
    if (!paymentIntentId.startsWith("pi_")) {
      return NextResponse.json(
        { success: false, error: "Valid paymentIntentId required" },
        { status: 400 }
      );
    }
    const result = await markManualInvoicePaidAndDeliver({
      invoiceId: String(body.invoiceId || ""),
      paymentIntentId,
      verifyPayment: true,
      actor: gate.auth.actor,
      adminId: gate.auth.adminId,
    });
    if (!result.ok) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }
    return NextResponse.json({ success: true, ...result });
  }

  if (action === "process_jobs") {
    await processInvoiceJobs();
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ success: false, error: "Unknown action" }, { status: 400 });
}
