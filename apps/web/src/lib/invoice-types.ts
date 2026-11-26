export type InvoiceKind = "STANDARD" | "REVISION" | "SUPPLEMENT" | "CREDIT_NOTE";
export type InvoiceStatus =
  | "DRAFT"
  | "ISSUED"
  | "EMAILED"
  | "PARTIALLY_CREDITED"
  | "CREDITED"
  | "VOID";
export type InvoiceJobType = "EMAIL" | "QBO_SYNC" | "DROPBOX_SYNC";
export type SyncStatus = "PENDING" | "DONE" | "FAILED" | "SKIPPED";

export type InvoiceLineItem = {
  key: string;
  label: string;
  amount: number;
};

/** Frozen at issue time — PDF/QB/email must use this only. */
export type InvoiceFareSnapshot = {
  version: 1;
  issuedAt: string;
  currency: "CAD";
  bookingId: string;
  /** Null/empty for standalone manual invoices. */
  reservationId: string | null;
  kind: InvoiceKind;
  revision: number;
  customer: {
    name: string;
    email: string;
    phone: string;
  };
  trip: {
    serviceType: string;
    vehicle: string;
    serviceDate: string;
    serviceTime: string;
    pickupLocation: string;
    dropoffLocation: string;
    stops: string[];
    passengers: number;
    /** Optional extras — present on loaded bookings / richer manual invoices. */
    airline?: string;
    flightNumber?: string;
    flightNote?: string;
    childSeats?: number;
    childSeatType?: string;
    etr407?: string;
    distance?: string;
    duration?: string;
    specialRequirements?: string;
    /** Passenger at curb — when booker/assistant differs from pickup guest. */
    pickupName?: string;
    pickupPhone?: string;
    /** Staff-entered wait (e.g. "15 min") — charge is a separate line item. */
    waitingTime?: string;
  };
  lines: InvoiceLineItem[];
  subtotal: number;
  discountAmount: number;
  /** When set, email/PDF can show Discount (X%). */
  discountPercent?: number;
  hst: number;
  gratuity: number;
  total: number;
  paymentStatus: string;
  paymentMethodLabel: string;
  stripePaymentIntentId: string | null;
  cardLast4: string | null;
  cardType: string | null;
  /** For SUPPLEMENT / CREDIT_NOTE linkage */
  fareAdjustmentId?: string | null;
  creditOfInvoiceNumber?: string | null;
  refundAmount?: number | null;
  stripeRefundId?: string | null;
  company: {
    legalName: string;
    addressLine1: string;
    addressLine2: string;
    country: string;
    phone: string;
    email: string;
    website: string;
    hstNumber: string;
  };
};

export function roundMoney(n: number): number {
  return Math.round((Number(n) || 0) * 100) / 100;
}
