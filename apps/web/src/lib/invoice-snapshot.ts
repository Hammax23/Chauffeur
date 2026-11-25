import "server-only";
import type { InvoiceFareSnapshot, InvoiceKind, InvoiceLineItem } from "@/lib/invoice-types";
import { roundMoney } from "@/lib/invoice-types";
import { getBillingCompany } from "@/lib/billing-company";
import { HST_RATE, applyGratuityThenHst } from "@/lib/reservation-pricing";
import { humanSpecialRequirements } from "@/lib/special-requirements";

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
  airline?: string | null;
  flightNumber?: string | null;
  flightNote?: string | null;
  childSeats?: number | null;
  childSeatType?: string | null;
  etr407?: string | null;
  distance?: string | null;
  duration?: string | null;
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
  if (gratuity > 0) {
    lines.push({ key: "gratuity", label: "Admin, Fuel & Grat", amount: gratuity });
  }
  if (hst > 0) lines.push({ key: "hst", label: "HST (13%)", amount: hst });
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
      airline: String(r.airline || "").trim() || undefined,
      flightNumber: String(r.flightNumber || "").trim() || undefined,
      flightNote: String(r.flightNote || "").trim() || undefined,
      childSeats: Math.max(0, Number(r.childSeats) || 0) || undefined,
      childSeatType: String(r.childSeatType || "").trim() || undefined,
      etr407: String(r.etr407 || "").trim() || undefined,
      distance: String(r.distance || "").trim() || undefined,
      duration: String(r.duration || "").trim() || undefined,
      specialRequirements:
        humanSpecialRequirements(r.specialRequirements) || undefined,
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

export type StandaloneInvoiceInput = {
  bookingId: string;
  /** When loaded from an existing booking — links Invoice → Reservation. */
  reservationId?: string | null;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  serviceType?: string;
  vehicle?: string;
  serviceDate?: string;
  serviceTime?: string;
  pickupLocation?: string;
  dropoffLocation?: string;
  /** Pipe-separated or free text; split on | or newlines */
  stops?: string;
  passengers?: number;
  airline?: string;
  flightNumber?: string;
  flightNote?: string;
  childSeats?: number;
  childSeatType?: string;
  etr407?: string;
  distance?: string;
  duration?: string;
  specialRequirements?: string;
  paymentMethodLabel?: string;
  alreadyPaid?: boolean;
  lines: { label: string; amount: number }[];
  /**
   * Admin, Fuel & Grat — same order as live reservation:
   * subtotal → grat (% or flat) → HST on (subtotal + grat) → total.
   * Pass a flat CAD amount (from auto-calc or staff edit).
   */
  gratuity?: number;
  /** When set (and gratuity omitted/0), compute grat from this percent of subtotal. */
  gratuityPercent?: number;
  hstRate?: number;
};

/** Manual / walk-in invoice — same tax order as reservation booking. */
export function buildStandaloneSnapshot(
  input: StandaloneInvoiceInput
): InvoiceFareSnapshot {
  const company = getBillingCompany();
  const hstRate =
    typeof input.hstRate === "number" && input.hstRate >= 0 ? input.hstRate : HST_RATE;

  const lines: InvoiceLineItem[] = input.lines
    .map((l, i) => ({
      key: `line_${i + 1}`,
      label: String(l.label || "").trim() || `Line ${i + 1}`,
      amount: roundMoney(l.amount),
    }))
    .filter((l) => Number.isFinite(l.amount) && Math.abs(l.amount) > 0.0001);

  const subtotal = roundMoney(lines.reduce((s, l) => s + l.amount, 0));
  const flatGrat = Math.max(0, Number(input.gratuity) || 0);
  let gratuity: number;
  let hst: number;
  let total: number;
  if (flatGrat > 0.0001) {
    // Flat grat from auto-calc / staff — HST on (subtotal + grat) like reservation.
    gratuity = roundMoney(flatGrat);
    const taxable = roundMoney(subtotal + gratuity);
    hst = roundMoney(taxable * hstRate);
    total = roundMoney(taxable + hst);
  } else if (
    typeof input.gratuityPercent === "number" &&
    input.gratuityPercent > 0
  ) {
    const computed = applyGratuityThenHst(
      subtotal,
      input.gratuityPercent,
      hstRate
    );
    gratuity = roundMoney(computed.gratuity);
    hst = roundMoney(computed.hst);
    total = roundMoney(computed.total);
  } else {
    gratuity = 0;
    hst = roundMoney(subtotal * hstRate);
    total = roundMoney(subtotal + hst);
  }

  const stops = String(input.stops || "")
    .split(/[|\n]/)
    .map((s) => s.trim())
    .filter(Boolean);

  const paid = Boolean(input.alreadyPaid);
  const method = String(input.paymentMethodLabel || "").trim() || "Manual / external";
  const reservationId = String(input.reservationId || "").trim() || null;

  return {
    version: 1,
    issuedAt: new Date().toISOString(),
    currency: "CAD",
    bookingId: input.bookingId,
    reservationId,
    kind: "STANDARD",
    revision: 0,
    customer: {
      name: String(input.customerName || "").trim() || "Guest",
      email: String(input.customerEmail || "").trim().toLowerCase(),
      phone: String(input.customerPhone || "").trim(),
    },
    trip: {
      serviceType: String(input.serviceType || "").trim() || "Manual billing",
      vehicle: String(input.vehicle || "").trim(),
      serviceDate: String(input.serviceDate || "").trim(),
      serviceTime: String(input.serviceTime || "").trim(),
      pickupLocation: String(input.pickupLocation || "").trim(),
      dropoffLocation: String(input.dropoffLocation || "").trim(),
      stops,
      passengers: Math.max(0, Math.floor(Number(input.passengers) || 0)),
      airline: String(input.airline || "").trim() || undefined,
      flightNumber: String(input.flightNumber || "").trim() || undefined,
      flightNote: String(input.flightNote || "").trim() || undefined,
      childSeats: Math.max(0, Math.floor(Number(input.childSeats) || 0)) || undefined,
      childSeatType: String(input.childSeatType || "").trim() || undefined,
      etr407: String(input.etr407 || "").trim() || undefined,
      distance: String(input.distance || "").trim() || undefined,
      duration: String(input.duration || "").trim() || undefined,
      specialRequirements:
        humanSpecialRequirements(input.specialRequirements) || undefined,
    },
    lines: [
      ...lines,
      ...(hst > 0
        ? [{ key: "hst", label: `HST (${(hstRate * 100).toFixed(0)}%)`, amount: hst }]
        : []),
      ...(gratuity > 0
        ? [{ key: "gratuity", label: "Admin, Fuel & Grat", amount: gratuity }]
        : []),
    ],
    subtotal,
    discountAmount: 0,
    hst,
    gratuity,
    total,
    paymentStatus: paid ? "PAID" : "MANUAL",
    paymentMethodLabel: method,
    stripePaymentIntentId: null,
    cardLast4: null,
    cardType: null,
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
