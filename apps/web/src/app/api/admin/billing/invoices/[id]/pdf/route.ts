import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireBillingAdmin } from "@/lib/admin-rbac";
import { buildInvoicePdfBuffer, invoicePdfFileName } from "@/lib/invoice-pdf";
import type { InvoiceFareSnapshot } from "@/lib/invoice-types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Stream a fresh tax-invoice PDF for Billing panel preview/download.
 * Avoids broken Cloudinary raw PDF delivery (often 401 / blocked PDF delivery).
 */
export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const gate = await requireBillingAdmin(req);
  if (!gate.ok) return gate.response;

  const { id } = await ctx.params;
  const inv = await prisma.invoice.findUnique({
    where: { id },
    select: {
      invoiceNumber: true,
      snapshotJson: true,
      kind: true,
    },
  });
  if (!inv) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  let snapshot: InvoiceFareSnapshot;
  try {
    snapshot = JSON.parse(inv.snapshotJson) as InvoiceFareSnapshot;
  } catch {
    return NextResponse.json({ error: "Invalid invoice snapshot" }, { status: 500 });
  }

  try {
    const buffer = await buildInvoicePdfBuffer({
      invoiceNumber: inv.invoiceNumber,
      snapshot,
    });
    const filename = invoicePdfFileName(inv.invoiceNumber);
    const disposition =
      req.nextUrl.searchParams.get("download") === "1"
        ? `attachment; filename="${filename}"`
        : `inline; filename="${filename}"`;

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": disposition,
        "Cache-Control": "private, no-store",
        "Content-Length": String(buffer.length),
      },
    });
  } catch (e) {
    console.error("[billing invoice pdf]", e);
    return NextResponse.json({ error: "Failed to build PDF" }, { status: 500 });
  }
}
