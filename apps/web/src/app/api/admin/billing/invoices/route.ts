import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireBillingAdmin } from "@/lib/admin-rbac";
import {
  issueManualInvoiceForReservation,
  processInvoiceJobs,
  resendInvoiceEmail,
  retryInvoiceJob,
} from "@/lib/invoice-engine";
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

/** POST — resend | retry | issue_manual | process_jobs */
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

  if (action === "process_jobs") {
    await processInvoiceJobs();
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ success: false, error: "Unknown action" }, { status: 400 });
}
