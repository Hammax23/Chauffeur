/**
 * Shared invoice presentation helpers (email + PDF).
 */
import type { InvoiceFareSnapshot, InvoiceLineItem } from "@/lib/invoice-types";
import { roundMoney } from "@/lib/invoice-types";

export function siteBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    process.env.BILLING_WEBSITE?.trim() ||
    "https://sarjworldwide.ca"
  ).replace(/\/$/, "");
}

export function invoiceLogoUrl(): string {
  return process.env.BILLING_LOGO_URL?.trim() || `${siteBaseUrl()}/logo1.png`;
}

export function formatInvoicePhone(raw: string): string {
  const digits = String(raw || "").replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) {
    return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return raw || "";
}

/** Calendar date only — avoids UTC midnight shifting the day in Toronto. */
export function formatServiceLongDate(serviceDate: string, serviceTime: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(serviceDate || "").trim());
  if (m) {
    const y = Number(m[1]);
    const mo = Number(m[2]);
    const d = Number(m[3]);
    const utc = new Date(Date.UTC(y, mo - 1, d, 12, 0, 0));
    const datePart = new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC",
    }).format(utc);
    return serviceTime ? `${datePart}, ${serviceTime}` : datePart;
  }
  return `${serviceDate} ${serviceTime}`.trim();
}

export function formatIssueDateShort(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "America/Toronto",
  });
}

export function formatIssueDateLong(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-CA", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "America/Toronto",
  });
}

export function moneyCad(n: number): string {
  return `$${roundMoney(n).toFixed(2)}`;
}

export function moneyCadSigned(n: number): string {
  const v = roundMoney(n);
  if (v < 0) return `−$${Math.abs(v).toFixed(2)}`;
  return `$${v.toFixed(2)}`;
}

export function displayBrandName(legalName: string): string {
  return legalName.includes("SARJ") ? "SARJ Chauffeur" : legalName;
}

export function isSnapshotPaid(snapshot: InvoiceFareSnapshot): boolean {
  const ps = String(snapshot.paymentStatus || "").toUpperCase();
  return ps === "PAID" || ps.includes("PAID");
}

export function gratFuelLabel(snapshot: InvoiceFareSnapshot): string {
  const base = Math.max(0, roundMoney(snapshot.subtotal - (snapshot.discountAmount || 0)));
  if (base > 0 && snapshot.gratuity > 0) {
    const pct = Math.round((snapshot.gratuity / base) * 100);
    if (pct >= 1 && pct <= 40) return `Grat & Fuel (${pct}%)`;
  }
  return "Admin, Fuel & Grat";
}

export function tripItemDescription(snapshot: InvoiceFareSnapshot): string {
  const t = snapshot.trip;
  const parts: string[] = [];
  parts.push(formatServiceLongDate(t.serviceDate, t.serviceTime));
  if (t.vehicle) parts.push(t.vehicle);
  if (t.serviceType) parts.push(t.serviceType);
  if (snapshot.customer.name) parts.push(snapshot.customer.name);
  if (t.pickupLocation) parts.push(`P/U: ${t.pickupLocation}`);
  if (t.stops?.length) parts.push(`Stops: ${t.stops.join("; ")}`);
  if (t.dropoffLocation) parts.push(`D/O: ${t.dropoffLocation}`);
  return parts.filter(Boolean).join(", ");
}

export type InvoiceDisplayLine = {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
};

/**
 * Square-style item lines: one trip narrative + optional extras.
 * Tax / grat / discount stay in totals only (not duplicated in items).
 */
export function buildInvoiceDisplayLines(
  snapshot: InvoiceFareSnapshot
): InvoiceDisplayLine[] {
  if (snapshot.kind === "CREDIT_NOTE") {
    const credit =
      snapshot.lines.find((l) => l.key === "credit") ||
      snapshot.lines.find((l) => /credit|refund/i.test(l.label)) ||
      null;
    const amount = credit ? roundMoney(credit.amount) : roundMoney(snapshot.total);
    return [
      {
        description:
          credit?.label ||
          (snapshot.creditOfInvoiceNumber
            ? `Credit / refund (${snapshot.creditOfInvoiceNumber})`
            : "Credit / refund"),
        quantity: 1,
        unitPrice: amount,
        amount,
      },
    ];
  }

  const taxish = (l: InvoiceLineItem) =>
    l.key === "hst" ||
    l.key === "gratuity" ||
    l.key === "discount" ||
    /hst|grat|discount/i.test(l.label);

  const extras = snapshot.lines.filter(
    (l) =>
      !taxish(l) &&
      (l.key === "stopCharge" ||
        l.key === "childSeat" ||
        l.key === "supplement" ||
        (l.key !== "rideFare" && l.key !== "subtotal" && l.key !== "credit"))
  );

  const extraSum = roundMoney(
    extras.reduce((s, l) => s + Math.max(0, roundMoney(l.amount)), 0)
  );
  const ride = snapshot.lines.find((l) => l.key === "rideFare");
  let primary = roundMoney(snapshot.subtotal);

  if (ride) {
    const rideAmt = roundMoney(ride.amount);
    if (Math.abs(rideAmt + extraSum - snapshot.subtotal) < 0.02) {
      primary = rideAmt;
    } else if (extraSum > 0 && snapshot.subtotal > extraSum) {
      primary = roundMoney(snapshot.subtotal - extraSum);
    } else {
      primary = rideAmt > 0 ? rideAmt : primary;
    }
  } else if (extraSum > 0 && snapshot.subtotal > extraSum) {
    primary = roundMoney(snapshot.subtotal - extraSum);
  }

  const lines: InvoiceDisplayLine[] = [
    {
      description: tripItemDescription(snapshot),
      quantity: 1,
      unitPrice: primary,
      amount: primary,
    },
  ];

  for (const extra of extras) {
    const amount = roundMoney(extra.amount);
    lines.push({
      description: extra.label,
      quantity: 1,
      unitPrice: amount,
      amount,
    });
  }

  return lines;
}
