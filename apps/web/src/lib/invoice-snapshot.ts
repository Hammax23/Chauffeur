import "server-only";
import type { InvoiceFareSnapshot, InvoiceKind, InvoiceLineItem } from "@/lib/invoice-types";
import { roundMoney } from "@/lib/invoice-types";
import { getBillingCompany } from "@/lib/billing-company";

export type ReservationInvoiceSource = {
  id: string;
  bookingId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  serviceType: string;
  vehicle: string;
  serviceDate: string;
  serviceTime: string;
  pickupLocation: string;
  dropoffLocation: string;
  stops?: string | null;
  passengers?: number | null;
  rideFare?: number | null;
  stopCharge?: number | null;
  childSeatCharge?: number | null;
  subtotal?: number | null;
  discountAmount?: number | null;
  hst?: number | null;
  gratuity?: number | null;
  total?: number | null;
  paymentStatus?: string | null;
  stripePaymentIntentId?: string | null;
  cardLast4?: string | null;
  cardType?: string | null;
  specialRequirements?: string | null;
};

function paymentMethodLabel(r: ReservationInvoiceSource): string {
  if (r.cardLast4) {
    const brand = (r.cardType || "Card").trim();
    return `${brand} •••• ${r.cardLast4}`;
  }
  const ps = String(r.paymentStatus || "").toUpperCase();
  if (ps.includes("CASH")) return "Cash / pay on delivery";
  if (ps === "PAID") return "Card payment";
  return ps || "—";
}

function parseStops(stops?: string | null): string[] {
  return String(stops || "")
    .split("|")
    .map((s) => s.trim())
    .filter(Boolean);
}

function meetGreetBouquetExtras(specialRequirements?: string | null): InvoiceLineItem[] {
  const text = String(specialRequirements || "");
  const lines: InvoiceLineItem[] = [];
  // Amounts already rolled into subtotal; labels only if mentioned — avoid double count.
  // Keep snapshot lines from numeric fields primarily.
  void text;
  return lines;
}

/** Build immutable fare snapshot from reservation row (STANDARD / REVISION). */
export function buildStandardFareSnapshot(
  r: ReservationInvoiceSource,
  opts?: { kind?: InvoiceKind; revision?: number }
): InvoiceFareSnapshot {
  const company = getBillingCompany();
  const subtotal = roundMoney(r.subtotal || 0);
  const discountAmount = roundMoney(r.discountAmount || 0);
  const hst = roundMoney(r.hst || 0);
  const gratuity = roundMoney(r.gratuity || 0);
  const total = roundMoney(r.total || 0);
  const rideFare = roundMoney(r.rideFare || 0);
  const stopCharge = roundMoney(r.stopCharge || 0);
  const childSeatCharge = roundMoney(r.childSeatCharge || 0);

  const lines: InvoiceLineItem[] = [];
  if (rideFare > 0) lines.push({ key: "rideFare", label: "Ride fare", amount: rideFare });
  if (stopCharge > 0) lines.push({ key: "stopCharge", label: "Stops", amount: stopCharge });
  if (childSeatCharge > 0) {
    lines.push({ key: "childSeat", label: "Child seat(s)", amount: childSeatCharge });
  }
  // If ride/extras don't explain subtotal, show subtotal explicitly
  const explained = roundMoney(rideFare + stopCharge + childSeatCharge);
  if (Math.abs(explained - subtotal) > 0.02 && subtotal > 0) {
    lines.push({ key: "subtotal", label: "Subtotal", amount: subtotal });
  } else if (rideFare <= 0 && subtotal > 0) {
    lines.push({ key: "subtotal", label: "Subtotal", amount: subtotal });
  }
  if (discountAmount > 0) {
    lines.push({ key: "discount", label: "Discount", amount: -discountAmount });
  }
  if (hst > 0) lines.push({ key: "hst", label: "HST (13%)", amount: hst });
  if (gratuity > 0) {
    lines.push({ key: "gratuity", label: "Admin, Fuel & Grat", amount: gratuity });
  }
  lines.push(...meetGreetBouquetExtras(r.specialRequirements));

  const guest = `${r.firstName || ""} ${r.lastName || ""}`.trim() || "Guest";

  return {
    version: 1,
    issuedAt: new Date().toISOString(),
    currency: "CAD",
    bookingId: r.bookingId,
    reservationId: r.id,
    kind: opts?.kind || "STANDARD",
    revision: opts?.revision ?? 0,
    customer: {
      name: guest,
      email: r.email || "",
      phone: r.phone || "",
    },
    trip: {
      serviceType: r.serviceType || "Chauffeur",
      vehicle: r.vehicle || "",
      serviceDate: r.serviceDate || "",
      serviceTime: r.serviceTime || "",
      pickupLocation: r.pickupLocation || "",
      dropoffLocation: r.dropoffLocation || "",
      stops: parseStops(r.stops),
      passengers: Number(r.passengers) || 1,
    },
    lines,
    subtotal,
    discountAmount,
    hst,
    gratuity,
    total,
    paymentStatus: String(r.paymentStatus || "—"),
    paymentMethodLabel: paymentMethodLabel(r),
    stripePaymentIntentId: r.stripePaymentIntentId || null,
    cardLast4: r.cardLast4 || null,
    cardType: r.cardType || null,
    company: {
      legalName: company.legalName,
      addressLine1: company.addressLine1,
      addressLine2: company.addressLine2,
      country: company.country,
      phone: company.phone,
      email: company.email,
      website: company.website,
      hstNumber: company.hstNumber,
    },
  };
}

export function buildSupplementSnapshot(
  r: ReservationInvoiceSource,
  adj: {
    id: string;
    type: string;
    description: string;
    amount: number;
    hst: number;
    total: number;
  }
): InvoiceFareSnapshot {
  const base = buildStandardFareSnapshot(r, { kind: "SUPPLEMENT", revision: 0 });
  const amount = roundMoney(adj.amount);
  const hst = roundMoney(adj.hst);
  const total = roundMoney(adj.total);
  const label =
    adj.description?.trim() ||
    ({
      WAIT: "Pickup wait",
      MG_WAIT: "Meet & Greet wait",
      EXTRA_STOP: "Extra stop",
      CAPACITY: "Capacity adjustment",
      OTHER: "Trip adjustment",
      NO_SHOW: "No-show retention",
    }[adj.type] ||
      "Trip adjustment");

  return {
    ...base,
    kind: "SUPPLEMENT",
    issuedAt: new Date().toISOString(),
    fareAdjustmentId: adj.id,
    lines: [
      { key: "adj", label, amount },
      ...(hst > 0 ? [{ key: "hst", label: "HST (13%)", amount: hst }] : []),
    ],
    subtotal: amount,
    discountAmount: 0,
    hst,
    gratuity: 0,
    total,
    paymentStatus: "PAID",
  };
}

export function buildCreditNoteSnapshot(
  original: InvoiceFareSnapshot,
  opts: {
    refundAmount: number;
    stripeRefundId?: string | null;
    creditOfInvoiceNumber: string;
  }
): InvoiceFareSnapshot {
  const refundAmount = roundMoney(opts.refundAmount);
  return {
    ...original,
    kind: "CREDIT_NOTE",
    issuedAt: new Date().toISOString(),
    revision: 0,
    lines: [
      {
        key: "credit",
        label: `Credit / refund (${opts.creditOfInvoiceNumber})`,
        amount: -refundAmount,
      },
    ],
    subtotal: -refundAmount,
    discountAmount: 0,
    hst: 0,
    gratuity: 0,
    total: -refundAmount,
    paymentStatus: "REFUNDED",
    creditOfInvoiceNumber: opts.creditOfInvoiceNumber,
    refundAmount,
    stripeRefundId: opts.stripeRefundId || null,
  };
}
