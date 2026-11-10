export type InvoiceKind = "STANDARD" | "REVISION" | "SUPPLEMENT" | "CREDIT_NOTE";
export type InvoiceStatus =
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
  reservationId: string;
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
  };
  lines: InvoiceLineItem[];
  subtotal: number;
  discountAmount: number;
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
