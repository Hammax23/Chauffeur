import "server-only";
import fs from "fs";
import path from "path";
import PDFDocument from "pdfkit";
import type { InvoiceFareSnapshot } from "@/lib/invoice-types";
import { roundMoney } from "@/lib/invoice-types";
import {
  buildInvoiceDisplayLines,
  displayBrandName,
  formatInvoicePhone,
  formatIssueDateLong,
  gratFuelLabel,
  invoiceLogoUrl,
  isSnapshotPaid,
  moneyCad,
  moneyCadSigned,
  siteBaseUrl,
} from "@/lib/invoice-format";

async function loadLogoBuffer(): Promise<Buffer | null> {
  try {
    const local = path.join(process.cwd(), "public", "logo1.png");
    if (fs.existsSync(local)) return fs.readFileSync(local);
  } catch {
    /* fall through */
  }
  try {
    const res = await fetch(invoiceLogoUrl(), { cache: "force-cache" });
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
  } catch {
    return null;
  }
}

/** Build a Canada-style tax invoice PDF from an immutable snapshot. */
export async function buildInvoicePdfBuffer(opts: {
  invoiceNumber: string;
  snapshot: InvoiceFareSnapshot;
  docTitle?: string;
}): Promise<Buffer> {
  const { invoiceNumber, snapshot } = opts;
  const isCredit = snapshot.kind === "CREDIT_NOTE";
  const paid = !isCredit && isSnapshotPaid(snapshot);
  const title =
    opts.docTitle ||
    (isCredit
      ? "Credit Note"
      : snapshot.kind === "SUPPLEMENT"
        ? "Supplemental Invoice"
        : snapshot.kind === "REVISION"
          ? "Invoice Revision"
          : "Tax Invoice");

  const logo = await loadLogoBuffer();

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "LETTER", margin: 48 });
    const chunks: Buffer[] = [];
    doc.on("data", (c) => chunks.push(Buffer.from(c)));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const c = snapshot.company;
    const gold = "#C9A063";
    const slate = "#0A1120";
    const muted = "#64748b";
    const brand = displayBrandName(c.legalName);
    const phone = formatInvoicePhone(c.phone);
    const issued = formatIssueDateLong(snapshot.issuedAt);
    const leftX = 48;
    const rightEdge = 564;
    const pageWidth = rightEdge - leftX;

    // —— Header: wide wordmark logo (823×322) — never force a square ——
    const headerTop = 48;
    const logoW = 138;
    const logoH = Math.round(logoW * (322 / 823)); // ~54, preserve aspect
    if (logo) {
      try {
        doc.image(logo, leftX, headerTop, { width: logoW });
      } catch {
        /* ignore bad image */
      }
    }

    const textLeft = logo ? leftX + logoW + 14 : leftX;
    const metaTop = headerTop + 4;
    doc
      .fillColor(slate)
      .font("Helvetica-Bold")
      .fontSize(13)
      .text(brand, textLeft, metaTop, { width: 220 });
    doc
      .fillColor(muted)
      .font("Helvetica")
      .fontSize(9)
      .text(phone, textLeft, metaTop + 18, { width: 220 });
    if (c.hstNumber) {
      doc.text(`GST/HST: ${c.hstNumber}`, textLeft, metaTop + 31, { width: 220 });
    } else {
      doc
        .fillColor("#a00")
        .text("GST/HST: (set BILLING_HST_NUMBER)", textLeft, metaTop + 31, {
          width: 220,
        });
    }

    doc
      .fillColor(slate)
      .font("Helvetica-Bold")
      .fontSize(11)
      .text(`${isCredit ? "Credit" : "Invoice"} #${invoiceNumber}`, leftX, metaTop, {
        width: pageWidth,
        align: "right",
      });
    doc
      .fillColor(muted)
      .font("Helvetica")
      .fontSize(9)
      .text(`Issue date: ${issued}`, leftX, metaTop + 16, {
        width: pageWidth,
        align: "right",
      });

    // Gold rule — clear of logo height
    const ruleY = headerTop + Math.max(logoH, 48) + 14;
    doc
      .moveTo(leftX, ruleY)
      .lineTo(rightEdge, ruleY)
      .lineWidth(2.5)
      .strokeColor(gold)
      .stroke();

    // Title + thank-you
    let y = ruleY + 18;
    doc
      .fillColor(slate)
      .font("Helvetica-Bold")
      .fontSize(22)
      .text(`${title} ${invoiceNumber}`, leftX, y, { width: pageWidth });
    y = doc.y + 8;

    doc
      .fillColor("#1a1a1a")
      .font("Helvetica")
      .fontSize(10)
      .text(
        isCredit
          ? `${brand} — credit note for your records.`
          : `${brand}, appreciate your business! See you again!`,
        leftX,
        y,
        { width: pageWidth }
      );
    y = doc.y + 10;

    if (!isCredit) {
      const bullets = [
        "Quick pick up from Toronto Pearson Airport. All we need is date, time & your flight #",
        "VIP Meet & Greet Services available inside Toronto Pearson Airport. Please ask us for more info.",
        "Your safety and privacy is our top priority!",
      ];
      doc.font("Helvetica").fontSize(9).fillColor("#1a1a1a");
      for (const b of bullets) {
        doc.text(`★  ${b}`, leftX, y, { width: pageWidth });
        y = doc.y + 3;
      }
      y += 6;
      doc
        .fillColor(muted)
        .fontSize(8)
        .text(
          "Complimentary bottled water, gum, phone chargers, and Wi-Fi are provided in our vehicles for your comfort.",
          leftX,
          y,
          { width: pageWidth }
        );
      y = doc.y + 4;
      doc.text(
        `Terms: SARJ Worldwide is not liable for delays due to weather, road conditions, or events beyond our control. Cancellation: see ${siteBaseUrl()}/privacy-policy#cancellation. Booking ${snapshot.bookingId}.`,
        leftX,
        y,
        { width: pageWidth }
      );
      y = doc.y + 12;
    } else {
      doc
        .fillColor(muted)
        .fontSize(8)
        .text(
          `This credit note adjusts a previously issued SARJ tax invoice. Booking ${snapshot.bookingId}.`,
          leftX,
          y,
          { width: pageWidth }
        );
      y = doc.y + 12;
    }

    // Divider
    doc
      .moveTo(leftX, y)
      .lineTo(rightEdge, y)
      .lineWidth(0.8)
      .strokeColor("#e5e7eb")
      .stroke();
    y += 14;

    // Customer | Invoice details | Payment
    const colW = pageWidth / 3;
    const paymentHeadline = isCredit
      ? "Credited"
      : paid
        ? `Paid ${issued}`
        : `Due ${issued}`;

    doc.fillColor(muted).font("Helvetica-Bold").fontSize(8);
    doc.text("CUSTOMER", leftX, y, { width: colW - 8 });
    doc.text("INVOICE DETAILS", leftX + colW, y, { width: colW - 8 });
    doc.text("PAYMENT", leftX + colW * 2, y, { width: colW, align: "right" });
    y += 12;

    doc.fillColor(slate).font("Helvetica-Bold").fontSize(10);
    doc.text(snapshot.customer.name || "Guest", leftX, y, { width: colW - 8 });
    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor("#1a1a1a")
      .text(`PDF created ${issued}`, leftX + colW, y, { width: colW - 8 });
    doc.text(paymentHeadline, leftX + colW * 2, y, { width: colW, align: "right" });
    y += 13;

    doc.fillColor(muted).font("Helvetica").fontSize(8);
    doc.text(snapshot.customer.email || "", leftX, y, { width: colW - 8 });
    doc
      .fillColor(slate)
      .font("Helvetica-Bold")
      .fontSize(10)
      .text(moneyCadSigned(snapshot.total), leftX + colW, y, { width: colW - 8 });
    doc.text(moneyCadSigned(snapshot.total), leftX + colW * 2, y, {
      width: colW,
      align: "right",
    });
    y += 12;
    if (snapshot.paymentMethodLabel || snapshot.paymentStatus) {
      doc
        .fillColor(muted)
        .font("Helvetica")
        .fontSize(8)
        .text(snapshot.paymentMethodLabel || snapshot.paymentStatus, leftX + colW * 2, y, {
          width: colW,
          align: "right",
        });
      y += 10;
    }

    y += 6;
    doc
      .moveTo(leftX, y)
      .lineTo(rightEdge, y)
      .lineWidth(0.8)
      .strokeColor("#e5e7eb")
      .stroke();
    y += 10;

    // Items table header
    const qtyX = 380;
    const priceX = 430;
    const amtX = 500;
    doc
      .moveTo(leftX, y + 14)
      .lineTo(rightEdge, y + 14)
      .lineWidth(1.2)
      .strokeColor(slate)
      .stroke();

    doc.fillColor(muted).font("Helvetica-Bold").fontSize(8);
    doc.text("ITEMS", leftX, y);
    doc.text("QTY", qtyX, y, { width: 40, align: "center" });
    doc.text("PRICE", priceX, y, { width: 60, align: "right" });
    doc.text("AMOUNT", amtX, y, { width: 64, align: "right" });
    y += 20;

    const displayLines = buildInvoiceDisplayLines(snapshot);
    doc.font("Helvetica").fontSize(9).fillColor("#1a1a1a");
    for (const line of displayLines) {
      if (y > 700) {
        doc.addPage();
        y = 48;
      }
      const descHeight = doc.heightOfString(line.description, { width: 320 });
      doc.text(line.description, leftX, y, { width: 320 });
      doc.text(String(line.quantity), qtyX, y, { width: 40, align: "center" });
      doc.text(moneyCad(Math.abs(line.unitPrice)), priceX, y, {
        width: 60,
        align: "right",
      });
      doc.font("Helvetica-Bold").text(moneyCadSigned(line.amount), amtX, y, {
        width: 64,
        align: "right",
      });
      doc.font("Helvetica");
      y += Math.max(descHeight, 12) + 10;
      doc
        .moveTo(leftX, y - 4)
        .lineTo(rightEdge, y - 4)
        .lineWidth(0.5)
        .strokeColor("#e5e7eb")
        .stroke();
    }

    // Totals
    y += 8;
    if (y > 680) {
      doc.addPage();
      y = 48;
    }
    const totalsX = 340;
    const totalsLabelW = 130;
    const totalsValX = 480;

    const addTotalRow = (label: string, value: string, bold = false) => {
      doc
        .font(bold ? "Helvetica-Bold" : "Helvetica")
        .fontSize(bold ? 12 : 9)
        .fillColor(bold ? slate : muted)
        .text(label, totalsX, y, { width: totalsLabelW });
      doc
        .fillColor(slate)
        .font(bold ? "Helvetica-Bold" : "Helvetica")
        .fontSize(bold ? 14 : 9)
        .text(value, totalsValX, y, { width: 84, align: "right" });
      y += bold ? 20 : 14;
    };

    addTotalRow("Subtotal", moneyCadSigned(snapshot.subtotal));
    if (snapshot.discountAmount > 0) {
      addTotalRow("Discount", `−${moneyCad(snapshot.discountAmount)}`);
    }
    if (roundMoney(snapshot.hst) !== 0) {
      addTotalRow("HST", moneyCadSigned(snapshot.hst));
    }
    if (snapshot.gratuity > 0) {
      addTotalRow(gratFuelLabel(snapshot), moneyCad(snapshot.gratuity));
    }

    doc
      .moveTo(totalsX, y)
      .lineTo(rightEdge, y)
      .lineWidth(0.8)
      .strokeColor("#e5e7eb")
      .stroke();
    y += 8;

    const totalLabel = isCredit ? "Credit total" : paid ? "Total paid" : "Total Due";
    addTotalRow(totalLabel, moneyCadSigned(snapshot.total), true);

    if (isCredit && snapshot.creditOfInvoiceNumber) {
      y += 6;
      doc
        .font("Helvetica")
        .fontSize(8)
        .fillColor(muted)
        .text(`Credit against invoice ${snapshot.creditOfInvoiceNumber}`, leftX, y);
      y += 14;
    }

    // Footer — sit directly under totals (never force to y=720; that spills a blank page 2).
    const footerBlock = 58;
    const pageBottom = doc.page.height - 36;
    y += 22;
    if (y + footerBlock > pageBottom) {
      y = Math.max(y - 8, pageBottom - footerBlock);
    }
    doc
      .moveTo(leftX, y)
      .lineTo(rightEdge, y)
      .lineWidth(0.8)
      .strokeColor("#e5e7eb")
      .stroke();
    y += 10;
    doc
      .font("Helvetica")
      .fontSize(8)
      .fillColor(muted)
      .text(
        `${c.legalName} · ${c.addressLine1}${c.addressLine2 ? `, ${c.addressLine2}` : ""}`,
        leftX,
        y,
        { width: pageWidth, align: "center", lineBreak: false }
      );
    y += 12;
    doc.text(`${c.email} · ${c.website.replace(/^https?:\/\//, "")}`, leftX, y, {
      width: pageWidth,
      align: "center",
      lineBreak: false,
    });
    y += 12;
    doc.text(
      "Amounts are frozen at issue time and are not editable by staff.",
      leftX,
      y,
      { width: pageWidth, align: "center", lineBreak: false }
    );

    doc.end();
  });
}

export function invoicePdfFileName(invoiceNumber: string): string {
  const safe = invoiceNumber.replace(/[^a-zA-Z0-9_-]/g, "_");
  return `SARJ_${safe}.pdf`;
}
