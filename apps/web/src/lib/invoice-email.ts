/**
 * Professional tax-invoice email (Square-style layout, SARJ branding + logo).
 * Table-based HTML for Gmail / Outlook / Apple Mail.
 */
import { escapeHtml } from "@/lib/email-delivery";
import type { InvoiceFareSnapshot } from "@/lib/invoice-types";
import {
  buildInvoiceDisplayLines,
  displayBrandName,
  formatInvoicePhone,
  formatIssueDateShort,
  gratFuelLabel,
  invoiceLogoUrl,
  isSnapshotPaid,
  moneyCad,
  moneyCadSigned,
  siteBaseUrl,
} from "@/lib/invoice-format";

const GOLD = "#C9A063";
const SLATE = "#0A1120";
const TEXT = "#1a1a1a";
const MUTED = "#64748b";
const RULE = "#C9A063";
const BORDER = "#e5e7eb";
const FONT =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";

function e(s: string | number | null | undefined): string {
  if (s == null) return "";
  return escapeHtml(String(s));
}

function itemRowsHtml(snapshot: InvoiceFareSnapshot): string {
  return buildInvoiceDisplayLines(snapshot)
    .map((line) => {
      const absUnit = Math.abs(line.unitPrice);
      const amountCell = moneyCadSigned(line.amount);
      return `<tr>
        <td style="padding:14px 0;border-bottom:1px solid ${BORDER};color:${TEXT};font-size:13px;line-height:1.55;vertical-align:top;">${e(line.description)}</td>
        <td style="padding:14px 8px;border-bottom:1px solid ${BORDER};color:${TEXT};font-size:13px;text-align:center;vertical-align:top;white-space:nowrap;">${e(String(line.quantity))}</td>
        <td style="padding:14px 8px;border-bottom:1px solid ${BORDER};color:${TEXT};font-size:13px;text-align:right;vertical-align:top;white-space:nowrap;">${e(moneyCad(absUnit))}</td>
        <td style="padding:14px 0 14px 8px;border-bottom:1px solid ${BORDER};color:${TEXT};font-size:13px;text-align:right;vertical-align:top;white-space:nowrap;font-weight:600;">${e(amountCell)}</td>
      </tr>`;
    })
    .join("");
}

export type InvoiceEmailInput = {
  invoiceNumber: string;
  bookingId: string;
  snapshot: InvoiceFareSnapshot;
  kind?: string;
  isCopy?: boolean;
};

/**
 * Full HTML invoice email matching a professional sales-receipt layout,
 * with SARJ logo and gold brand accents.
 */
export function buildInvoiceEmailHtml(input: InvoiceEmailInput): string {
  const { invoiceNumber, bookingId, snapshot, isCopy } = input;
  const isCredit = snapshot.kind === "CREDIT_NOTE" || input.kind === "CREDIT_NOTE";
  const paid = !isCredit && isSnapshotPaid(snapshot);
  const company = snapshot.company;
  const phone = formatInvoicePhone(company.phone);
  const issued = formatIssueDateShort(snapshot.issuedAt);
  const hstLine = company.hstNumber ? `GST/HST: ${company.hstNumber}` : "";
  const displayName = displayBrandName(company.legalName);
  const title = isCredit ? `Credit note ${invoiceNumber}` : `Invoice ${invoiceNumber}`;
  const thanks = isCredit
    ? `${displayName} — credit note for your records.`
    : `${displayName}, appreciate your business! See you again!`;
  const totalLabel = isCredit ? "Credit total" : paid ? "Total paid" : "Total Due";
  const paymentHeadline = isCredit
    ? "Credited"
    : paid
      ? `Paid ${issued}`
      : `Due ${issued}`;

  const totalsRows = [
    `<tr>
      <td style="padding:4px 0;color:${MUTED};font-size:13px;">Subtotal</td>
      <td style="padding:4px 0;text-align:right;color:${TEXT};font-size:13px;">${e(moneyCadSigned(snapshot.subtotal))}</td>
    </tr>`,
    snapshot.discountAmount > 0
      ? `<tr>
      <td style="padding:4px 0;color:${MUTED};font-size:13px;">Discount</td>
      <td style="padding:4px 0;text-align:right;color:${TEXT};font-size:13px;">−${e(moneyCad(snapshot.discountAmount))}</td>
    </tr>`
      : "",
    snapshot.hst !== 0
      ? `<tr>
      <td style="padding:4px 0;color:${MUTED};font-size:13px;">HST</td>
      <td style="padding:4px 0;text-align:right;color:${TEXT};font-size:13px;">${e(moneyCadSigned(snapshot.hst))}</td>
    </tr>`
      : "",
    snapshot.gratuity > 0
      ? `<tr>
      <td style="padding:4px 0;color:${MUTED};font-size:13px;">${e(gratFuelLabel(snapshot))}</td>
      <td style="padding:4px 0;text-align:right;color:${TEXT};font-size:13px;">${e(moneyCad(snapshot.gratuity))}</td>
    </tr>`
      : "",
    `<tr>
      <td colspan="2" style="padding:10px 0 0 0;"><div style="height:1px;background:${BORDER};"></div></td>
    </tr>
    <tr>
      <td style="padding:12px 0 0 0;color:${TEXT};font-size:18px;font-weight:700;">${e(totalLabel)}</td>
      <td style="padding:12px 0 0 0;text-align:right;color:${TEXT};font-size:22px;font-weight:800;">${e(moneyCadSigned(snapshot.total))}</td>
    </tr>`,
  ]
    .filter(Boolean)
    .join("");

  const bullets = isCredit
    ? ""
    : `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 18px 0;">
        <tr>
          <td style="padding:4px 0;color:${TEXT};font-size:14px;line-height:1.55;vertical-align:top;width:22px;">★</td>
          <td style="padding:4px 0;color:${TEXT};font-size:14px;line-height:1.55;">Quick pick up from Toronto Pearson Airport. All we need is date, time &amp; your flight #</td>
        </tr>
        <tr>
          <td style="padding:4px 0;color:${TEXT};font-size:14px;line-height:1.55;vertical-align:top;">★</td>
          <td style="padding:4px 0;color:${TEXT};font-size:14px;line-height:1.55;">VIP Meet &amp; Greet Services available inside Toronto Pearson Airport. Please ask us for more info.</td>
        </tr>
        <tr>
          <td style="padding:4px 0;color:${TEXT};font-size:14px;line-height:1.55;vertical-align:top;">★</td>
          <td style="padding:4px 0;color:${TEXT};font-size:14px;line-height:1.55;">Your safety and privacy is our top priority!</td>
        </tr>
      </table>`;

  const copyNote = isCopy
    ? " This message is a requested copy of your document."
    : "";

  const finePrint = isCredit
    ? `<p style="margin:0 0 20px 0;color:${MUTED};font-size:11px;line-height:1.55;">This credit note adjusts a previously issued SARJ tax invoice. Booking <strong style="color:#475569;">${e(bookingId)}</strong>. The PDF attached is your official record.${copyNote}</p>`
    : `<p style="margin:0 0 8px 0;color:${MUTED};font-size:11px;line-height:1.55;">
        Complimentary bottled water, gum, phone chargers, and Wi‑Fi are provided in our vehicles for your comfort.
      </p>
      <p style="margin:0 0 20px 0;color:${MUTED};font-size:11px;line-height:1.55;">
        <strong style="color:#475569;">Terms:</strong> SARJ Worldwide is not liable for delays due to weather, road conditions, or events beyond our control.
        <strong style="color:#475569;">Cancellation:</strong> Transfers typically require 24 hours’ notice; coaches/buses 48 hours; hourly service often 12 hours — see your confirmation and
        <a href="${e(siteBaseUrl())}/privacy-policy#cancellation" style="color:${GOLD};text-decoration:underline;">cancellation policy</a> for full details.
        Booking <strong style="color:#475569;">${e(bookingId)}</strong>.${copyNote}
        A branded PDF tax invoice is attached (Stripe card receipts are payment confirmation only — not a duplicate charge).
      </p>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${e(title)} — SARJ Worldwide</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:${FONT};-webkit-font-smoothing:antialiased;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3f4f6;padding:28px 12px;">
    <tr><td align="center">
      <table role="presentation" width="680" cellspacing="0" cellpadding="0" style="max-width:680px;width:100%;background:#ffffff;border:1px solid ${BORDER};">

        <tr>
          <td style="padding:28px 32px 18px 32px;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
              <tr>
                <td style="vertical-align:top;width:62%;">
                  <table role="presentation" cellspacing="0" cellpadding="0">
                    <tr>
                      <td style="vertical-align:middle;padding-right:14px;">
                        <img src="${e(invoiceLogoUrl())}" width="140" alt="SARJ Worldwide" style="display:block;width:140px;height:auto;max-width:140px;border:0;" />
                      </td>
                      <td style="vertical-align:middle;">
                        <p style="margin:0;color:${SLATE};font-size:18px;font-weight:700;letter-spacing:-0.01em;line-height:1.2;">${e(displayName)}</p>
                        <p style="margin:4px 0 0 0;color:${MUTED};font-size:13px;line-height:1.4;">
                          <a href="tel:${e(company.phone.replace(/\s/g, ""))}" style="color:${MUTED};text-decoration:none;">${e(phone)}</a>
                        </p>
                        ${
                          hstLine
                            ? `<p style="margin:2px 0 0 0;color:${MUTED};font-size:12px;line-height:1.4;">${e(hstLine)}</p>`
                            : ""
                        }
                      </td>
                    </tr>
                  </table>
                </td>
                <td style="vertical-align:top;text-align:right;width:38%;">
                  <p style="margin:0;color:${TEXT};font-size:15px;font-weight:700;">${isCredit ? "Credit" : "Invoice"} #${e(invoiceNumber)}</p>
                  <p style="margin:6px 0 0 0;color:${MUTED};font-size:13px;">Issue date: ${e(issued)}</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <tr>
          <td style="padding:0 32px;">
            <div style="height:3px;background:${RULE};line-height:3px;font-size:0;">&nbsp;</div>
          </td>
        </tr>

        <tr>
          <td style="padding:28px 32px 8px 32px;">
            <h1 style="margin:0 0 12px 0;color:${SLATE};font-size:28px;font-weight:700;letter-spacing:-0.02em;line-height:1.2;">${e(title)}</h1>
            <p style="margin:0 0 16px 0;color:${TEXT};font-size:15px;line-height:1.55;">${e(thanks)}</p>
            ${bullets}
            ${finePrint}
          </td>
        </tr>

        <tr>
          <td style="padding:0 32px;">
            <div style="height:1px;background:${BORDER};line-height:1px;font-size:0;">&nbsp;</div>
          </td>
        </tr>

        <tr>
          <td style="padding:22px 32px;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
              <tr>
                <td style="vertical-align:top;width:33%;padding-right:12px;">
                  <p style="margin:0 0 6px 0;color:${MUTED};font-size:11px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;">Customer</p>
                  <p style="margin:0;color:${TEXT};font-size:14px;font-weight:600;line-height:1.4;">${e(snapshot.customer.name || "Guest")}</p>
                  <p style="margin:4px 0 0 0;color:${MUTED};font-size:12px;line-height:1.4;">
                    <a href="mailto:${e(snapshot.customer.email)}" style="color:${MUTED};text-decoration:none;">${e(snapshot.customer.email)}</a>
                  </p>
                </td>
                <td style="vertical-align:top;width:34%;padding:0 8px;">
                  <p style="margin:0 0 6px 0;color:${MUTED};font-size:11px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;">Invoice details</p>
                  <p style="margin:0;color:${TEXT};font-size:13px;line-height:1.45;">PDF created ${e(issued)}</p>
                  <p style="margin:4px 0 0 0;color:${TEXT};font-size:14px;font-weight:700;">${e(moneyCadSigned(snapshot.total))}</p>
                </td>
                <td style="vertical-align:top;width:33%;padding-left:12px;text-align:right;">
                  <p style="margin:0 0 6px 0;color:${MUTED};font-size:11px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;">Payment</p>
                  <p style="margin:0;color:${TEXT};font-size:13px;line-height:1.45;">${e(paymentHeadline)}</p>
                  <p style="margin:4px 0 0 0;color:${TEXT};font-size:14px;font-weight:700;">${e(moneyCadSigned(snapshot.total))}</p>
                  <p style="margin:4px 0 0 0;color:${MUTED};font-size:11px;">${e(snapshot.paymentMethodLabel || snapshot.paymentStatus || "")}</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <tr>
          <td style="padding:0 32px;">
            <div style="height:1px;background:${BORDER};line-height:1px;font-size:0;">&nbsp;</div>
          </td>
        </tr>

        <tr>
          <td style="padding:8px 32px 8px 32px;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
              <tr>
                <td style="padding:12px 0;border-bottom:2px solid ${SLATE};color:${MUTED};font-size:11px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;">Items</td>
                <td style="padding:12px 8px;border-bottom:2px solid ${SLATE};color:${MUTED};font-size:11px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;text-align:center;width:70px;">Qty</td>
                <td style="padding:12px 8px;border-bottom:2px solid ${SLATE};color:${MUTED};font-size:11px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;text-align:right;width:80px;">Price</td>
                <td style="padding:12px 0 12px 8px;border-bottom:2px solid ${SLATE};color:${MUTED};font-size:11px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;text-align:right;width:90px;">Amount</td>
              </tr>
              ${itemRowsHtml(snapshot)}
            </table>
          </td>
        </tr>

        <tr>
          <td style="padding:8px 32px 28px 32px;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
              <tr>
                <td style="width:48%;">&nbsp;</td>
                <td style="width:52%;">
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                    ${totalsRows}
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <tr>
          <td style="padding:18px 32px;background:#fafafa;border-top:1px solid ${BORDER};">
            <p style="margin:0;color:${MUTED};font-size:11px;line-height:1.55;text-align:center;">
              ${e(company.legalName)} · ${e(company.addressLine1)}${company.addressLine2 ? `, ${e(company.addressLine2)}` : ""}<br>
              <a href="mailto:${e(company.email)}" style="color:${GOLD};text-decoration:none;">${e(company.email)}</a>
              &nbsp;·&nbsp;
              <a href="${e(company.website)}" style="color:${GOLD};text-decoration:none;">${e(company.website.replace(/^https?:\/\//, ""))}</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
