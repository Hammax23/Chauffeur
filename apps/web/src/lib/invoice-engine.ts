import "server-only";
import prisma from "@/lib/prisma";
import {
  buildCreditNoteSnapshot,
  buildStandardFareSnapshot,
  buildSupplementSnapshot,
  type ReservationInvoiceSource,
} from "@/lib/invoice-snapshot";
import { buildInvoicePdfBuffer, invoicePdfFileName } from "@/lib/invoice-pdf";
import { uploadInvoicePdf, isInvoiceStorageConfigured } from "@/lib/invoice-storage";
import { sendTransactionalEmail, isEmailConfigured } from "@/lib/email-delivery";
import type { InvoiceFareSnapshot, InvoiceJobType } from "@/lib/invoice-types";
import { roundMoney } from "@/lib/invoice-types";
import { syncInvoiceToQuickBooks } from "@/lib/integrations/quickbooks";
import { syncInvoiceToDropbox } from "@/lib/integrations/dropbox";

const TORONTO_TZ = "America/Toronto";

function torontoYear(d = new Date()): number {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TORONTO_TZ,
    year: "numeric",
  }).formatToParts(d);
  return Number(parts.find((p) => p.type === "year")?.value || d.getFullYear());
}

async function allocateInvoiceNumber(
  tx: Omit<typeof prisma, "$connect" | "$disconnect" | "$on" | "$transaction" | "$extends">
): Promise<string> {
  const year = torontoYear();
  const id = `INV-${year}`;
  await tx.invoiceSequence.upsert({
    where: { year },
    create: { id, year, lastNumber: 0 },
    update: {},
  });
  const current = await tx.invoiceSequence.update({
    where: { year },
    data: { lastNumber: { increment: 1 } },
  });
  return `INV-${year}-${String(current.lastNumber).padStart(6, "0")}`;
}

async function writeBillingAudit(opts: {
  actor: string;
  adminId?: string | null;
  action: string;
  invoiceId?: string | null;
  bookingId?: string | null;
  meta?: Record<string, unknown>;
}) {
  try {
    await prisma.billingAuditLog.create({
      data: {
        actor: opts.actor,
        adminId: opts.adminId || null,
        action: opts.action,
        invoiceId: opts.invoiceId || null,
        bookingId: opts.bookingId || null,
        metaJson: opts.meta ? JSON.stringify(opts.meta) : null,
      },
    });
  } catch (e) {
    console.error("[billing-audit]", e);
  }
}

async function enqueueJobs(invoiceId: string, types: InvoiceJobType[]) {
  for (const type of types) {
    const uniqueKey = `${invoiceId}:${type}`;
    try {
      await prisma.invoiceJob.upsert({
        where: { uniqueKey },
        create: {
          invoiceId,
          type,
          status: "PENDING",
          uniqueKey,
          nextAttemptAt: new Date(),
        },
        update: {},
      });
    } catch (e) {
      console.error("[invoice-engine] enqueue", type, e);
    }
  }
}

function parseSnapshot(json: string): InvoiceFareSnapshot {
  return JSON.parse(json) as InvoiceFareSnapshot;
}

async function loadReservationSource(reservationId: string): Promise<ReservationInvoiceSource | null> {
  const r = await prisma.reservation.findUnique({ where: { id: reservationId } });
  if (!r) return null;
  return r as unknown as ReservationInvoiceSource;
}

/**
 * Idempotent: one STANDARD invoice per paid reservation.
 * Safe to call from website, app, and Stripe webhook.
 */
export async function ensureStandardInvoiceForReservation(
  reservationId: string,
  opts?: { actor?: string }
): Promise<{ invoiceId: string; created: boolean; invoiceNumber: string } | null> {
  const existing = await prisma.invoice.findFirst({
    where: { reservationId, kind: "STANDARD", revision: 0 },
    select: { id: true, invoiceNumber: true },
  });
  if (existing) {
    return {
      invoiceId: existing.id,
      created: false,
      invoiceNumber: existing.invoiceNumber,
    };
  }

  const r = await loadReservationSource(reservationId);
  if (!r) return null;

  const pay = String(r.paymentStatus || "").toUpperCase();
  if (pay !== "PAID") {
    // Cash / unpaid: do not auto-issue tax invoice as paid sales receipt.
    return null;
  }

  const snapshot = buildStandardFareSnapshot(r, { kind: "STANDARD", revision: 0 });
  const actor = opts?.actor || "system";

  try {
    const created = await prisma.$transaction(async (tx) => {
      // Re-check inside transaction
      const again = await tx.invoice.findFirst({
        where: { reservationId, kind: "STANDARD", revision: 0 },
      });
      if (again) return { row: again, created: false as const };

      const invoiceNumber = await allocateInvoiceNumber(tx as any);
      const row = await tx.invoice.create({
        data: {
          invoiceNumber,
          kind: "STANDARD",
          status: "ISSUED",
          reservationId,
          bookingId: r.bookingId,
          revision: 0,
          snapshotJson: JSON.stringify(snapshot),
          subtotal: snapshot.subtotal,
          discountAmount: snapshot.discountAmount,
          hst: snapshot.hst,
          gratuity: snapshot.gratuity,
          total: snapshot.total,
          customerName: snapshot.customer.name,
          customerEmail: snapshot.customer.email,
          customerPhone: snapshot.customer.phone || null,
          stripePaymentIntentId: snapshot.stripePaymentIntentId,
          createdByActor: actor,
          emailStatus: "PENDING",
          qbSyncStatus: "PENDING",
          dropboxSyncStatus: "PENDING",
        },
      });
      return { row, created: true as const };
    });

    if (created.created) {
      await enqueueJobs(created.row.id, ["EMAIL", "QBO_SYNC", "DROPBOX_SYNC"]);
      await writeBillingAudit({
        actor,
        action: "INVOICE_ISSUED",
        invoiceId: created.row.id,
        bookingId: r.bookingId,
        meta: { invoiceNumber: created.row.invoiceNumber, kind: "STANDARD" },
      });
      // Process outbox promptly (best-effort; cron can retry).
      void processInvoiceJobs(created.row.id).catch((e) =>
        console.error("[invoice-engine] process jobs", e)
      );
    }

    return {
      invoiceId: created.row.id,
      created: created.created,
      invoiceNumber: created.row.invoiceNumber,
    };
  } catch (e: unknown) {
    // Unique race — fetch winner
    const winner = await prisma.invoice.findFirst({
      where: { reservationId, kind: "STANDARD", revision: 0 },
    });
    if (winner) {
      return {
        invoiceId: winner.id,
        created: false,
        invoiceNumber: winner.invoiceNumber,
      };
    }
    console.error("[invoice-engine] ensureStandardInvoiceForReservation", e);
    throw e;
  }
}

/** Supplemental invoice when a fare adjustment becomes PAID. */
export async function ensureSupplementInvoiceForAdjustment(
  fareAdjustmentId: string,
  opts?: { actor?: string }
): Promise<{ invoiceId: string; created: boolean } | null> {
  const existing = await prisma.invoice.findUnique({
    where: { fareAdjustmentId },
  });
  if (existing) return { invoiceId: existing.id, created: false };

  const adj = await prisma.fareAdjustment.findUnique({ where: { id: fareAdjustmentId } });
  if (!adj || String(adj.status).toUpperCase() !== "PAID") return null;

  const r = await loadReservationSource(adj.reservationId);
  if (!r) return null;

  const snapshot = buildSupplementSnapshot(r, adj);
  const actor = opts?.actor || "system";

  try {
    const invoiceNumberBase = await prisma.$transaction(async (tx) => {
      const again = await tx.invoice.findUnique({ where: { fareAdjustmentId } });
      if (again) return { row: again, created: false as const };
      const invoiceNumber = `${await allocateInvoiceNumber(tx as any)}-S`;
      const row = await tx.invoice.create({
        data: {
          invoiceNumber,
          kind: "SUPPLEMENT",
          status: "ISSUED",
          reservationId: adj.reservationId,
          bookingId: adj.bookingId,
          fareAdjustmentId: adj.id,
          revision: 0,
          snapshotJson: JSON.stringify(snapshot),
          subtotal: snapshot.subtotal,
          discountAmount: 0,
          hst: snapshot.hst,
          gratuity: 0,
          total: snapshot.total,
          customerName: snapshot.customer.name,
          customerEmail: snapshot.customer.email,
          customerPhone: snapshot.customer.phone || null,
          stripePaymentIntentId: adj.stripePaymentIntentId,
          createdByActor: actor,
        },
      });
      return { row, created: true as const };
    });

    if (invoiceNumberBase.created) {
      await enqueueJobs(invoiceNumberBase.row.id, ["EMAIL", "QBO_SYNC", "DROPBOX_SYNC"]);
      await writeBillingAudit({
        actor,
        action: "SUPPLEMENT_ISSUED",
        invoiceId: invoiceNumberBase.row.id,
        bookingId: adj.bookingId,
        meta: { fareAdjustmentId, invoiceNumber: invoiceNumberBase.row.invoiceNumber },
      });
      void processInvoiceJobs(invoiceNumberBase.row.id).catch(() => {});
    }
    return {
      invoiceId: invoiceNumberBase.row.id,
      created: invoiceNumberBase.created,
    };
  } catch (e) {
    const winner = await prisma.invoice.findUnique({ where: { fareAdjustmentId } });
    if (winner) return { invoiceId: winner.id, created: false };
    throw e;
  }
}

/** Credit note after Stripe refund (owner-triggered money movement). */
export async function issueCreditNoteForRefund(opts: {
  reservationId: string;
  refundAmount: number;
  stripeRefundId?: string | null;
  actor?: string;
}): Promise<{ invoiceId: string; created: boolean } | null> {
  const standard = await prisma.invoice.findFirst({
    where: { reservationId: opts.reservationId, kind: "STANDARD", revision: 0 },
    orderBy: { createdAt: "asc" },
  });
  if (!standard) return null;

  if (opts.stripeRefundId) {
    const dup = await prisma.invoice.findFirst({
      where: { stripeRefundId: opts.stripeRefundId, kind: "CREDIT_NOTE" },
    });
    if (dup) return { invoiceId: dup.id, created: false };
  }

  const originalSnap = parseSnapshot(standard.snapshotJson);
  const refundAmount = roundMoney(opts.refundAmount);
  const snapshot = buildCreditNoteSnapshot(originalSnap, {
    refundAmount,
    stripeRefundId: opts.stripeRefundId,
    creditOfInvoiceNumber: standard.invoiceNumber,
  });
  const actor = opts.actor || "system";

  const creditNumber = `${standard.invoiceNumber}-C${Date.now().toString(36).slice(-4)}`;
  const row = await prisma.invoice.create({
    data: {
      invoiceNumber: creditNumber,
      kind: "CREDIT_NOTE",
      status: "ISSUED",
      reservationId: opts.reservationId,
      bookingId: standard.bookingId,
      parentInvoiceId: standard.id,
      revision: 0,
      snapshotJson: JSON.stringify(snapshot),
      subtotal: snapshot.subtotal,
      discountAmount: 0,
      hst: 0,
      gratuity: 0,
      total: snapshot.total,
      customerName: snapshot.customer.name,
      customerEmail: snapshot.customer.email,
      customerPhone: snapshot.customer.phone || null,
      stripePaymentIntentId: standard.stripePaymentIntentId,
      stripeRefundId: opts.stripeRefundId || null,
      createdByActor: actor,
    },
  });

  const fullCredit = refundAmount >= roundMoney(standard.total) - 0.01;
  await prisma.invoice.update({
    where: { id: standard.id },
    data: { status: fullCredit ? "CREDITED" : "PARTIALLY_CREDITED" },
  });

  await enqueueJobs(row.id, ["EMAIL", "QBO_SYNC", "DROPBOX_SYNC"]);
  await writeBillingAudit({
    actor,
    action: "CREDIT_NOTE_ISSUED",
    invoiceId: row.id,
    bookingId: standard.bookingId,
    meta: { refundAmount, stripeRefundId: opts.stripeRefundId, against: standard.invoiceNumber },
  });
  void processInvoiceJobs(row.id).catch(() => {});
  return { invoiceId: row.id, created: true };
}

async function ensurePdf(invoiceId: string): Promise<{ url: string; storageKey: string; buffer: Buffer }> {
  const inv = await prisma.invoice.findUniqueOrThrow({ where: { id: invoiceId } });
  const snapshot = parseSnapshot(inv.snapshotJson);
  const buffer = await buildInvoicePdfBuffer({
    invoiceNumber: inv.invoiceNumber,
    snapshot,
  });

  if (inv.pdfUrl && inv.pdfStorageKey) {
    return { url: inv.pdfUrl, storageKey: inv.pdfStorageKey, buffer };
  }

  if (!isInvoiceStorageConfigured()) {
    // Still allow emailing with in-memory attachment; mark storage pending via empty key.
    return { url: "", storageKey: "", buffer };
  }

  const uploaded = await uploadInvoicePdf({
    buffer,
    invoiceNumber: inv.invoiceNumber,
    bookingId: inv.bookingId,
  });
  await prisma.invoice.update({
    where: { id: invoiceId },
    data: { pdfUrl: uploaded.url, pdfStorageKey: uploaded.storageKey },
  });
  return { ...uploaded, buffer };
}

async function runEmailJob(invoiceId: string): Promise<void> {
  const inv = await prisma.invoice.findUniqueOrThrow({ where: { id: invoiceId } });
  if (!isEmailConfigured()) {
    throw new Error("Email provider not configured");
  }
  const { buffer } = await ensurePdf(invoiceId);
  const snapshot = parseSnapshot(inv.snapshotJson);
  const to = inv.customerEmail;
  if (!to) throw new Error("Customer email missing");

  const isCredit = inv.kind === "CREDIT_NOTE";
  const subject = isCredit
    ? `Credit note ${inv.invoiceNumber} — SARJ Worldwide`
    : `Your SARJ invoice ${inv.invoiceNumber} (booking ${inv.bookingId})`;

  const html = `<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;color:#111;line-height:1.5;">
    <p>Dear ${escapeHtml(inv.customerName || "Guest")},</p>
    <p>Please find attached your <strong>SARJ Worldwide ${isCredit ? "credit note" : "tax invoice"}</strong>.</p>
    <p style="margin:16px 0;padding:12px 14px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;">
      <strong>Invoice #:</strong> ${escapeHtml(inv.invoiceNumber)}<br/>
      <strong>Booking:</strong> ${escapeHtml(inv.bookingId)}<br/>
      <strong>Total:</strong> $${roundMoney(inv.total).toFixed(2)} CAD
    </p>
    <p style="font-size:13px;color:#64748b;">This is your branded SARJ invoice (tax document). If you also received a Stripe card receipt, that is payment confirmation only — not a duplicate charge.</p>
    <p style="font-size:13px;color:#64748b;">Trip: ${escapeHtml(snapshot.trip.serviceDate)} · ${escapeHtml(snapshot.trip.pickupLocation || "")}</p>
    <p>Thank you for choosing SARJ Worldwide.<br/>${escapeHtml(snapshot.company.email)} · ${escapeHtml(snapshot.company.phone)}</p>
  </body></html>`;

  const sent = await sendTransactionalEmail({
    to,
    subject,
    html,
    attachments: [
      {
        filename: invoicePdfFileName(inv.invoiceNumber),
        content: buffer,
        contentType: "application/pdf",
      },
    ],
    logLabel: "invoice-email",
  });
  if (!sent) throw new Error("Invoice email send failed");

  await prisma.invoice.update({
    where: { id: invoiceId },
    data: {
      emailStatus: "DONE",
      emailedAt: new Date(),
      status: inv.status === "ISSUED" ? "EMAILED" : inv.status,
    },
  });
}

function escapeHtml(s: string): string {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const MAX_RESENDS_PER_INVOICE = 8;

export async function resendInvoiceEmail(opts: {
  invoiceId: string;
  actor: string;
  adminId?: string | null;
  toEmail?: string | null;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const inv = await prisma.invoice.findUnique({ where: { id: opts.invoiceId } });
  if (!inv) return { ok: false, error: "Invoice not found" };
  if (inv.resendCount >= MAX_RESENDS_PER_INVOICE) {
    return { ok: false, error: "Resend limit reached for this invoice" };
  }

  const alternate = opts.toEmail?.trim().toLowerCase() || "";
  const to = alternate || inv.customerEmail;
  if (!to || !to.includes("@")) return { ok: false, error: "Valid email required" };

  if (!isEmailConfigured()) return { ok: false, error: "Email not configured" };

  const { buffer } = await ensurePdf(inv.id);
  const sent = await sendTransactionalEmail({
    to,
    subject: `Your SARJ invoice ${inv.invoiceNumber} (copy)`,
    html: `<p>Attached is a copy of invoice <strong>${escapeHtml(inv.invoiceNumber)}</strong> for booking ${escapeHtml(inv.bookingId)}.</p>`,
    attachments: [
      {
        filename: invoicePdfFileName(inv.invoiceNumber),
        content: buffer,
        contentType: "application/pdf",
      },
    ],
    logLabel: "invoice-resend",
  });
  if (!sent) return { ok: false, error: "Send failed" };

  await prisma.invoice.update({
    where: { id: inv.id },
    data: {
      resendCount: { increment: 1 },
      lastResentAt: new Date(),
      resentTo: alternate && alternate !== inv.customerEmail.toLowerCase() ? alternate : null,
      emailStatus: "DONE",
      emailedAt: inv.emailedAt || new Date(),
    },
  });
  await writeBillingAudit({
    actor: opts.actor,
    adminId: opts.adminId,
    action: "INVOICE_RESEND",
    invoiceId: inv.id,
    bookingId: inv.bookingId,
    meta: { to, alternate: Boolean(alternate) },
  });
  return { ok: true };
}

async function markJob(
  jobId: string,
  status: "DONE" | "FAILED" | "PENDING",
  lastError?: string | null
) {
  await prisma.invoiceJob.update({
    where: { id: jobId },
    data: {
      status,
      lastError: lastError || null,
      attempts: { increment: status === "PENDING" ? 0 : 1 },
      nextAttemptAt:
        status === "FAILED"
          ? new Date(Date.now() + 15 * 60 * 1000)
          : status === "PENDING"
            ? new Date()
            : null,
    },
  });
}

/** Process pending outbox jobs for one invoice (or all due jobs if invoiceId omitted). */
export async function processInvoiceJobs(invoiceId?: string): Promise<void> {
  const now = new Date();
  const jobs = await prisma.invoiceJob.findMany({
    where: {
      status: { in: ["PENDING", "FAILED"] },
      OR: [{ nextAttemptAt: null }, { nextAttemptAt: { lte: now } }],
      ...(invoiceId ? { invoiceId } : {}),
      attempts: { lt: 12 },
    },
    orderBy: { createdAt: "asc" },
    take: invoiceId ? 10 : 40,
  });

  for (const job of jobs) {
    try {
      if (job.type === "EMAIL") {
        await runEmailJob(job.invoiceId);
        await prisma.invoiceJob.update({
          where: { id: job.id },
          data: { status: "DONE", lastError: null, attempts: { increment: 1 } },
        });
      } else if (job.type === "QBO_SYNC") {
        const result = await syncInvoiceToQuickBooks(job.invoiceId);
        await prisma.invoice.update({
          where: { id: job.invoiceId },
          data: {
            qbSyncStatus: result.status,
            qbDocId: result.docId || undefined,
          },
        });
        await prisma.invoiceJob.update({
          where: { id: job.id },
          data: {
            status: result.status === "FAILED" ? "FAILED" : "DONE",
            lastError: result.error || null,
            attempts: { increment: 1 },
            nextAttemptAt:
              result.status === "FAILED" ? new Date(Date.now() + 15 * 60 * 1000) : null,
          },
        });
      } else if (job.type === "DROPBOX_SYNC") {
        const { buffer } = await ensurePdf(job.invoiceId);
        const result = await syncInvoiceToDropbox(job.invoiceId, buffer);
        await prisma.invoice.update({
          where: { id: job.invoiceId },
          data: {
            dropboxSyncStatus: result.status,
            dropboxPath: result.path || undefined,
          },
        });
        await prisma.invoiceJob.update({
          where: { id: job.id },
          data: {
            status: result.status === "FAILED" ? "FAILED" : "DONE",
            lastError: result.error || null,
            attempts: { increment: 1 },
            nextAttemptAt:
              result.status === "FAILED" ? new Date(Date.now() + 15 * 60 * 1000) : null,
          },
        });
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("[invoice-engine] job failed", job.type, job.id, msg);
      await markJob(job.id, "FAILED", msg.slice(0, 500));
      if (job.type === "EMAIL") {
        await prisma.invoice.update({
          where: { id: job.invoiceId },
          data: { emailStatus: "FAILED" },
        });
      } else if (job.type === "QBO_SYNC") {
        await prisma.invoice.update({
          where: { id: job.invoiceId },
          data: { qbSyncStatus: "FAILED" },
        });
      } else if (job.type === "DROPBOX_SYNC") {
        await prisma.invoice.update({
          where: { id: job.invoiceId },
          data: { dropboxSyncStatus: "FAILED" },
        });
      }
    }
  }
}

export async function retryInvoiceJob(opts: {
  invoiceId: string;
  type: InvoiceJobType;
  actor: string;
  adminId?: string | null;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const uniqueKey = `${opts.invoiceId}:${opts.type}`;
  await prisma.invoiceJob.upsert({
    where: { uniqueKey },
    create: {
      invoiceId: opts.invoiceId,
      type: opts.type,
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
  await writeBillingAudit({
    actor: opts.actor,
    adminId: opts.adminId,
    action: "SYNC_RETRY",
    invoiceId: opts.invoiceId,
    meta: { type: opts.type },
  });
  await processInvoiceJobs(opts.invoiceId);
  return { ok: true };
}

/** Manual cash / unpaid → issue STANDARD once marked paid by assistant workflow. */
export async function issueManualInvoiceForReservation(
  reservationId: string,
  opts: { actor: string; adminId?: string | null }
) {
  const r = await prisma.reservation.findUnique({ where: { id: reservationId } });
  if (!r) return { ok: false as const, error: "Reservation not found" };

  // Allow manual issue for PAID or explicitly cash-complete flows.
  const result = await ensureStandardInvoiceForReservation(reservationId, {
    actor: opts.actor,
  });
  if (!result) {
    // Force issue even if not PAID (cash receipt) by temporarily treating as paid snapshot
    const source = r as unknown as ReservationInvoiceSource;
    const snapshot = buildStandardFareSnapshot(
      { ...source, paymentStatus: source.paymentStatus || "CASH" },
      { kind: "STANDARD", revision: 0 }
    );
    const existing = await prisma.invoice.findFirst({
      where: { reservationId, kind: "STANDARD", revision: 0 },
    });
    if (existing) {
      return { ok: true as const, invoiceId: existing.id, invoiceNumber: existing.invoiceNumber };
    }
    const invoiceNumber = await prisma.$transaction(async (tx) =>
      allocateInvoiceNumber(tx as any)
    );
    const row = await prisma.invoice.create({
      data: {
        invoiceNumber,
        kind: "STANDARD",
        status: "ISSUED",
        reservationId,
        bookingId: r.bookingId,
        revision: 0,
        snapshotJson: JSON.stringify(snapshot),
        subtotal: snapshot.subtotal,
        discountAmount: snapshot.discountAmount,
        hst: snapshot.hst,
        gratuity: snapshot.gratuity,
        total: snapshot.total,
        customerName: snapshot.customer.name,
        customerEmail: snapshot.customer.email,
        customerPhone: snapshot.customer.phone || null,
        createdByActor: opts.actor,
      },
    });
    await enqueueJobs(row.id, ["EMAIL", "QBO_SYNC", "DROPBOX_SYNC"]);
    await writeBillingAudit({
      actor: opts.actor,
      adminId: opts.adminId,
      action: "MANUAL_INVOICE_ISSUED",
      invoiceId: row.id,
      bookingId: r.bookingId,
    });
    void processInvoiceJobs(row.id).catch(() => {});
    return { ok: true as const, invoiceId: row.id, invoiceNumber: row.invoiceNumber };
  }
  await writeBillingAudit({
    actor: opts.actor,
    adminId: opts.adminId,
    action: "MANUAL_INVOICE_ENSURE",
    invoiceId: result.invoiceId,
    bookingId: r.bookingId,
  });
  void processInvoiceJobs(result.invoiceId).catch(() => {});
  return {
    ok: true as const,
    invoiceId: result.invoiceId,
    invoiceNumber: result.invoiceNumber,
  };
}
