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
  // ASCII hyphen — Unicode minus (U+2212) renders as " in some email clients.
  if (v < 0) return `-$${Math.abs(v).toFixed(2)}`;
  return `$${v.toFixed(2)}`;
}

export function displayBrandName(legalName: string): string {
  return legalName.includes("SARJ") ? "SARJ Chauffeur" : legalName;
}

/** Manual form tabs: Distance / Hourly / Parcel (not internal long labels). */
export function displayServiceTypeLabel(
  serviceType: string | null | undefined
): string {
  const raw = String(serviceType || "").trim();
  if (!raw) return "";
  if (/parcel/i.test(raw)) return "Parcel";
  if (/hourly/i.test(raw)) return "Hourly";
  if (/point|distance|p2p|point-to-point/i.test(raw)) return "Distance";
  return raw;
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

/** Email / PDF discount row label — prefers stored %, else derives from amount. */
export function discountLabel(snapshot: InvoiceFareSnapshot): string {
  const amount = roundMoney(snapshot.discountAmount || 0);
  if (amount <= 0) return "Discount";
  const stored = Number(snapshot.discountPercent);
  if (Number.isFinite(stored) && stored > 0) {
    const pct = Math.round(stored * 100) / 100;
    return `Discount (${pct}%)`;
  }
  const sub = roundMoney(snapshot.subtotal || 0);
  if (sub > 0) {
    const derived = Math.round((amount / sub) * 100);
    if (derived >= 1 && derived <= 100) return `Discount (${derived}%)`;
  }
  return "Discount";
}

export function tripItemDescription(snapshot: InvoiceFareSnapshot): string {
  const t = snapshot.trip;
  const parts: string[] = [];
  parts.push(formatServiceLongDate(t.serviceDate, t.serviceTime));
  if (t.vehicle) parts.push(t.vehicle);
  if (t.serviceType) parts.push(displayServiceTypeLabel(t.serviceType));
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

  // Manual standalone invoices use line_1…line_n — show those only (no synthetic trip fare).
  const customLines = snapshot.lines.filter(
    (l) => !taxish(l) && /^line_\d+$/i.test(l.key)
  );
  const hasReservationFareKeys = snapshot.lines.some(
    (l) => l.key === "rideFare" || l.key === "subtotal" || l.key === "supplement"
  );
  if (customLines.length > 0 && !hasReservationFareKeys) {
    return customLines.map((l) => {
      const amount = roundMoney(l.amount);
      return {
        description: l.label,
        quantity: 1,
        unitPrice: amount,
        amount,
      };
    });
  }

  const extras = snapshot.lines.filter(
    (l) =>
      !taxish(l) &&
      !/^line_\d+$/i.test(l.key) &&
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

/**
 * Optional trip extras for email/PDF — hide empty / default "No" values
 * (e.g. 407 ETR: No should not appear).
 */
export function isMeaningfulTripDetail(
  value: string | number | null | undefined
): boolean {
  const raw = String(value ?? "").trim();
  if (!raw) return false;
  const lower = raw.toLowerCase();
  if (
    lower === "no" ||
    lower === "n" ||
    lower === "n/a" ||
    lower === "na" ||
    lower === "none" ||
    lower === "false" ||
    lower === "0"
  ) {
    return false;
  }
  return true;
}
