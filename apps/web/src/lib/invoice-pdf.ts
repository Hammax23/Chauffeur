import "server-only";
import PDFDocument from "pdfkit";
import type { InvoiceFareSnapshot } from "@/lib/invoice-types";
import { roundMoney } from "@/lib/invoice-types";

function money(n: number): string {
  return `$${roundMoney(n).toFixed(2)}`;
}

/** Build a Canada-style tax invoice PDF from an immutable snapshot. */
export async function buildInvoicePdfBuffer(opts: {
  invoiceNumber: string;
  snapshot: InvoiceFareSnapshot;
  docTitle?: string;
}): Promise<Buffer> {
  const { invoiceNumber, snapshot } = opts;
  const title =
    opts.docTitle ||
    (snapshot.kind === "CREDIT_NOTE"
      ? "Credit Note"
      : snapshot.kind === "SUPPLEMENT"
        ? "Supplemental Invoice"
        : snapshot.kind === "REVISION"
          ? "Invoice Revision"
          : "Tax Invoice");

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "LETTER", margin: 48 });
    const chunks: Buffer[] = [];
    doc.on("data", (c) => chunks.push(Buffer.from(c)));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const c = snapshot.company;
    const gold = "#8B6914";

    doc
      .fillColor(gold)
      .fontSize(11)
      .font("Helvetica-Bold")
      .text(c.legalName.toUpperCase(), { continued: false });
    doc.moveDown(0.3);
    doc.fillColor("#111").fontSize(20).font("Helvetica-Bold").text(title);
    doc.moveDown(0.4);

    doc.fontSize(9).font("Helvetica").fillColor("#444");
    doc.text(c.addressLine1);
    doc.text(c.addressLine2);
    doc.text(c.country);
    doc.text(`${c.phone} · ${c.email}`);
    doc.text(c.website);
    if (c.hstNumber) {
      doc.font("Helvetica-Bold").fillColor("#111").text(`HST/GST #: ${c.hstNumber}`);
    } else {
      doc
        .fillColor("#a00")
        .text("HST/GST #: (set BILLING_HST_NUMBER on server)");
    }

    doc.moveDown(1);
    doc.fillColor("#111");

    const issued = new Date(snapshot.issuedAt).toLocaleDateString("en-CA", {
      year: "numeric",
      month: "long",
      day: "numeric",
      timeZone: "America/Toronto",
    });

    const leftX = 48;
    const rightX = 320;
    let y = doc.y;

    doc.font("Helvetica-Bold").fontSize(9).text("Invoice #", leftX, y);
    doc.font("Helvetica").fontSize(11).text(invoiceNumber, leftX, y + 12);
    doc.font("Helvetica-Bold").fontSize(9).text("Issued", rightX, y);
    doc.font("Helvetica").fontSize(11).text(issued, rightX, y + 12);
    doc.y = y + 40;

    y = doc.y;
    doc.font("Helvetica-Bold").fontSize(9).text("Billed to", leftX, y);
    doc
      .font("Helvetica-Bold")
      .fontSize(11)
      .text(snapshot.customer.name || "Guest", leftX, y + 12);
    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor("#444")
      .text(snapshot.customer.email || "", leftX, y + 28);
    if (snapshot.customer.phone) {
      doc.text(snapshot.customer.phone, leftX, y + 40);
    }

    doc.fillColor("#111").font("Helvetica-Bold").fontSize(9).text("Booking", rightX, y);
    doc.font("Helvetica").fontSize(11).text(snapshot.bookingId, rightX, y + 12);
    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor("#444")
      .text(`Payment: ${snapshot.paymentStatus}`, rightX, y + 28);
    if (snapshot.paymentMethodLabel) {
      doc.text(snapshot.paymentMethodLabel, rightX, y + 40);
    }
    doc.y = Math.max(doc.y, y + 60);
    doc.fillColor("#111");
    doc.moveDown(0.8);

    doc.font("Helvetica-Bold").fontSize(10).text("Trip details");
    doc.moveDown(0.3);
    doc.font("Helvetica").fontSize(9).fillColor("#333");
    const tripRows: [string, string][] = [
      ["Service date", `${snapshot.trip.serviceDate} · ${snapshot.trip.serviceTime}`],
      ["Service", snapshot.trip.serviceType || "Chauffeur"],
      ["Vehicle", snapshot.trip.vehicle || "—"],
      ["Passengers", String(snapshot.trip.passengers || 1)],
      ["Pickup", snapshot.trip.pickupLocation || "—"],
      ["Drop-off", snapshot.trip.dropoffLocation || "—"],
    ];
    if (snapshot.trip.stops?.length) {
      tripRows.push(["Stops", snapshot.trip.stops.join(" | ")]);
    }
    for (const [label, value] of tripRows) {
      doc.font("Helvetica-Bold").fillColor("#666").text(label, { continued: false });
      doc.font("Helvetica").fillColor("#111").text(value, { width: 500 });
      doc.moveDown(0.25);
    }

    doc.moveDown(0.6);
    doc.font("Helvetica-Bold").fontSize(10).fillColor("#111").text("Fare summary");
    doc.moveDown(0.4);

    const tableTop = doc.y;
    doc.font("Helvetica-Bold").fontSize(9);
    doc.text("Description", leftX, tableTop);
    doc.text("Amount", 480, tableTop, { width: 70, align: "right" });
    doc
      .moveTo(leftX, tableTop + 14)
      .lineTo(550, tableTop + 14)
      .strokeColor("#ddd")
      .stroke();

    let rowY = tableTop + 20;
    doc.font("Helvetica").fontSize(9).fillColor("#222");
    for (const line of snapshot.lines) {
      doc.text(line.label, leftX, rowY, { width: 400 });
      doc.text(money(line.amount), 480, rowY, { width: 70, align: "right" });
      rowY += 16;
      if (rowY > 700) {
        doc.addPage();
        rowY = 48;
      }
    }

    rowY += 6;
    doc
      .moveTo(leftX, rowY)
      .lineTo(550, rowY)
      .strokeColor("#ddd")
      .stroke();
    rowY += 10;
    doc.font("Helvetica-Bold").fontSize(11).fillColor(gold);
    doc.text("Total (CAD)", leftX, rowY);
    doc.text(money(snapshot.total), 480, rowY, { width: 70, align: "right" });

    if (snapshot.kind === "CREDIT_NOTE" && snapshot.creditOfInvoiceNumber) {
      rowY += 24;
      doc
        .font("Helvetica")
        .fontSize(9)
        .fillColor("#444")
        .text(`Credit against invoice ${snapshot.creditOfInvoiceNumber}`, leftX, rowY);
    }

    doc.y = rowY + 40;
    doc
      .font("Helvetica")
      .fontSize(8)
      .fillColor("#888")
      .text(
        "This document is issued by SARJ Worldwide. Amounts are frozen at issue time and are not editable by staff. Questions: " +
          c.email,
        { width: 500, align: "left" }
      );

    doc.end();
  });
}

export function invoicePdfFileName(invoiceNumber: string): string {
  const safe = invoiceNumber.replace(/[^a-zA-Z0-9_-]/g, "_");
  return `SARJ_${safe}.pdf`;
}
