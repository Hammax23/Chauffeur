"use client";

import { useCallback, useEffect, useState } from "react";
import {
  FileText,
  RefreshCw,
  Send,
  Link2,
  Unlink,
  AlertTriangle,
  Copy,
  ExternalLink,
  Trash2,
} from "lucide-react";
import { fleetData, type FleetVehicle } from "@/data/fleet";
import { PARCEL_SERVICE_TYPE } from "@/lib/parcel";
import AdminInvoiceCardPay from "@/components/AdminInvoiceCardPay";

const MANUAL_SERVICE_TYPES = [
  { value: "Point-to-Point transportation", label: "Distance" },
  { value: "Hourly ride", label: "Hourly" },
  { value: PARCEL_SERVICE_TYPE, label: "Parcel" },
] as const;

const MANUAL_PAYMENT_METHODS = [
  "Credit card",
  "Cash",
  "e-Transfer",
  "Debit",
  "Cheque",
  "Invoice / Net terms",
  "Other",
] as const;

type PendingCardCollect = {
  invoiceId: string;
  invoiceNumber: string;
  bookingId: string;
  total: number;
  paymentUrl: string;
  clientSecret: string;
};

const fieldClass =
  "w-full rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#C9A063]/40 focus:border-[#C9A063]";
const labelClass = "block text-xs font-semibold text-gray-600 mb-1.5";

const emptyStandalone = () => ({
  customerName: "",
  customerEmails: [""] as string[],
  customerPhone: "",
  serviceType: "Point-to-Point transportation",
  vehicle: "",
  serviceDate: "",
  serviceTime: "",
  pickupLocation: "",
  dropoffLocation: "",
  stops: "",
  passengers: "1",
  paymentMethodLabel: "Credit card",
  alreadyPaid: false,
});

function splitEmails(raw: string | null | undefined): string[] {
  const parts = String(raw || "")
    .split(/[,;\n]+/)
    .map((e) => e.trim())
    .filter(Boolean);
  return parts.length ? parts : [""];
}

function joinEmails(emails: string[]): string {
  return emails.map((e) => e.trim()).filter(Boolean).join(", ");
}

type InvoiceRow = {
  id: string;
  invoiceNumber: string;
  kind: string;
  status: string;
  bookingId: string;
  source?: string;
  reservationId?: string | null;
  customerName: string;
  customerEmail: string;
  total: number;
  currency: string;
  emailStatus: string;
  qbSyncStatus: string;
  dropboxSyncStatus: string;
  pdfUrl: string | null;
  emailedAt: string | null;
  resendCount: number;
  createdAt: string;
};

type ManualLine = { label: string; amount: string };

const emptyManualLine = (): ManualLine => ({ label: "", amount: "" });

type Integrations = {
  role: string;
  encryptionConfigured: boolean;
  billingHstNumberSet: boolean;
  quickbooks: {
    connected: boolean;
    realmId: string | null;
    connectedAt: string | null;
    connectedByEmail: string | null;
    envReady: boolean;
  };
  dropbox: {
    connected: boolean;
    folderPath: string | null;
    connectedAt: string | null;
    connectedByEmail: string | null;
    envReady: boolean;
  };
};

function badge(status: string) {
  const s = (status || "").toUpperCase();
  const color =
    s === "DONE" || s === "EMAILED" || s === "ISSUED"
      ? "bg-emerald-50 text-emerald-800 ring-emerald-200"
      : s === "FAILED"
        ? "bg-rose-50 text-rose-800 ring-rose-200"
        : s === "SKIPPED"
          ? "bg-slate-50 text-slate-600 ring-slate-200"
          : "bg-amber-50 text-amber-900 ring-amber-200";
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-md text-[10px] font-semibold ring-1 ${color}`}>
      {s || "—"}
    </span>
  );
}

export default function AdminBillingPage() {
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [failedCount, setFailedCount] = useState(0);
  const [integrations, setIntegrations] = useState<Integrations | null>(null);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [manualReservationId, setManualReservationId] = useState("");
  const [loadedBookingId, setLoadedBookingId] = useState<string | null>(null);
  const [loadedReservationId, setLoadedReservationId] = useState<string | null>(
    null
  );
  const [manualGratuity, setManualGratuity] = useState("");
  const [standalone, setStandalone] = useState(emptyStandalone);
  const [manualLines, setManualLines] = useState<ManualLine[]>([
    { label: "Ride fare", amount: "" },
  ]);
  const [fleetVehicles, setFleetVehicles] = useState<FleetVehicle[]>(fleetData);
  const [pendingCard, setPendingCard] = useState<PendingCardCollect | null>(null);
  const isCardCollect = /^credit\s*card$/i.test(standalone.paymentMethodLabel);

  const vehicleInFleet = fleetVehicles.some((v) => v.name === standalone.vehicle);

  useEffect(() => {
    fetch("/api/fleet")
      .then((r) => r.json())
      .then((data: { success?: boolean; vehicles?: FleetVehicle[] }) => {
        if (data?.success && Array.isArray(data.vehicles) && data.vehicles.length > 0) {
          setFleetVehicles(data.vehicles);
        }
      })
      .catch(() => {
        /* keep static fleetData fallback */
      });
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [invRes, intRes] = await Promise.all([
        fetch(`/api/admin/billing/invoices?q=${encodeURIComponent(q)}`, {
          credentials: "include",
        }),
        fetch("/api/admin/billing/integrations", { credentials: "include" }),
      ]);
      const invJson = await invRes.json();
      const intJson = await intRes.json();
      if (invJson.success) {
        setInvoices(invJson.invoices || []);
        setFailedCount(invJson.failedCount || 0);
      }
      if (intJson.success) setIntegrations(intJson);
    } catch {
      setMessage("Failed to load billing data");
    } finally {
      setLoading(false);
    }
  }, [q]);

  useEffect(() => {
    void load();
  }, [load]);

  async function postAction(body: Record<string, unknown>) {
    setBusyId(String(body.invoiceId || body.action || "x"));
    setMessage("");
    try {
      const res = await fetch("/api/admin/billing/invoices", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!json.success) {
        setMessage(json.error || "Action failed");
        return;
      }

      setMessage("Done");
      await load();
    } catch {
      setMessage("Network error");
    } finally {
      setBusyId(null);
    }
  }

  async function loadReservationIntoForm() {
    const key = manualReservationId.trim();
    if (!key) return;
    setBusyId("load_reservation");
    setMessage("");
    setPendingCard(null);
    try {
      const res = await fetch("/api/admin/billing/invoices", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "load_reservation", bookingId: key }),
      });
      const json = await res.json();
      if (!json.success || !json.reservation) {
        setMessage(json.error || "Reservation not found");
        return;
      }
      const r = json.reservation as {
        id: string;
        bookingId: string;
        customerName: string;
        customerEmail: string;
        customerPhone: string;
        serviceType: string;
        vehicle: string;
        serviceDate: string;
        serviceTime: string;
        pickupLocation: string;
        dropoffLocation: string;
        stops: string;
        passengers: string;
        paymentStatus: string;
        gratuity?: number;
        lines: { label: string; amount: number }[];
        existingInvoice?: {
          id: string;
          invoiceNumber: string;
          emailStatus: string;
          total: number;
          paid: boolean;
        } | null;
      };

      // Unpaid invoice already exists — resume collect instead of creating a duplicate.
      if (r.existingInvoice && !r.existingInvoice.paid) {
        setLoadedBookingId(r.bookingId);
        setLoadedReservationId(r.id);
        setMessage(
          `${r.existingInvoice.invoiceNumber} already exists for ${r.bookingId} (unpaid). Opening collect payment…`
        );
        await beginPaymentCollect({
          invoiceId: r.existingInvoice.id,
          invoiceNumber: r.existingInvoice.invoiceNumber,
          bookingId: r.bookingId,
          total: Number(r.existingInvoice.total),
        });
        return;
      }

      setLoadedBookingId(r.bookingId);
      setLoadedReservationId(r.id);
      setStandalone({
        customerName: r.customerName,
        customerEmails: splitEmails(r.customerEmail),
        customerPhone: r.customerPhone,
        serviceType: r.serviceType || "Point-to-Point transportation",
        vehicle: r.vehicle,
        serviceDate: r.serviceDate,
        serviceTime: r.serviceTime,
        pickupLocation: r.pickupLocation,
        dropoffLocation: r.dropoffLocation,
        stops: r.stops,
        passengers: r.passengers || "1",
        paymentMethodLabel: "Credit card",
        alreadyPaid: false,
      });
      setManualLines(
        r.lines?.length
          ? r.lines.map((l) => ({
              label: l.label,
              amount: String(l.amount),
            }))
          : [{ label: "Ride fare", amount: "" }]
      );
      setManualGratuity(
        r.gratuity && r.gratuity > 0 ? String(r.gratuity) : ""
      );
      const paidNote =
        String(r.paymentStatus || "").toUpperCase() === "PAID"
          ? " (booking already marked PAID — review carefully)"
          : "";
      const priorNote = r.existingInvoice?.paid
        ? ` Prior invoice ${r.existingInvoice.invoiceNumber} is paid.`
        : "";
      setMessage(
        `Loaded ${r.bookingId} into Create manual invoice — review & Create & collect payment.${paidNote}${priorNote}`
      );
      document.getElementById("create-manual-invoice")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    } catch {
      setMessage("Network error loading reservation");
    } finally {
      setBusyId(null);
    }
  }

  async function beginPaymentCollect(opts: {
    invoiceId: string;
    invoiceNumber: string;
    bookingId: string;
    total: number;
  }) {
    setPendingCard(null);
    const [linkRes, piRes] = await Promise.all([
      fetch("/api/admin/billing/invoices", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_payment_link",
          invoiceId: opts.invoiceId,
          returnBaseUrl: window.location.origin,
        }),
      }),
      fetch("/api/admin/billing/invoices", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_payment_intent",
          invoiceId: opts.invoiceId,
        }),
      }),
    ]);
    const linkJson = await linkRes.json();
    const piJson = await piRes.json();
    if (!linkJson.success || !piJson.success) {
      setMessage(
        linkJson.error ||
          piJson.error ||
          "Invoice created but payment setup failed — retry from the invoice list."
      );
      await load();
      return;
    }
    setPendingCard({
      invoiceId: opts.invoiceId,
      invoiceNumber: opts.invoiceNumber,
      bookingId: opts.bookingId,
      total: opts.total,
      paymentUrl: String(linkJson.url),
      clientSecret: String(piJson.clientSecret),
    });
    setMessage(
      `${opts.invoiceNumber} ready — collect payment below. No customer email until paid.`
    );
    await load();
  }

  async function connect(provider: "QUICKBOOKS" | "DROPBOX") {
    setMessage("");
    const res = await fetch("/api/admin/billing/integrations", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "connect", provider }),
    });
    const json = await res.json();
    if (!json.success) {
      setMessage(json.error || "Connect failed (owner only)");
      return;
    }
    window.location.href = json.url;
  }

  async function disconnect(provider: "QUICKBOOKS" | "DROPBOX") {
    if (!confirm(`Disconnect ${provider}? Only the owner should do this.`)) return;
    const res = await fetch("/api/admin/billing/integrations", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "disconnect", provider }),
    });
    const json = await res.json();
    if (!json.success) setMessage(json.error || "Disconnect failed");
    else {
      setMessage("Disconnected");
      await load();
    }
  }

  const isOwner = integrations?.role === "OWNER";

  const manualSubtotal = manualLines.reduce((s, l) => {
    const n = Number(l.amount);
    return s + (Number.isFinite(n) ? n : 0);
  }, 0);
  const manualHst = Math.round(manualSubtotal * 0.13 * 100) / 100;
  const manualGratNum = Math.max(0, Number(manualGratuity) || 0);
  const manualTotal =
    Math.round((manualSubtotal + manualHst + manualGratNum) * 100) / 100;

  function clearManualForm() {
    setStandalone(emptyStandalone());
    setManualLines([{ label: "Ride fare", amount: "" }]);
    setManualGratuity("");
    setLoadedBookingId(null);
    setLoadedReservationId(null);
    setManualReservationId("");
  }

  async function issueStandalone() {
    setBusyId("issue_standalone");
    setMessage("");
    setPendingCard(null);
    try {
      const lines = manualLines
        .map((l) => ({
          label: l.label.trim(),
          amount: Number(l.amount),
        }))
        .filter((l) => l.label && Number.isFinite(l.amount) && Math.abs(l.amount) > 0.0001);

      const customerEmail = joinEmails(standalone.customerEmails);
      if (!customerEmail.includes("@")) {
        setMessage("Add at least one valid customer email");
        setBusyId(null);
        return;
      }

      const { customerEmails: _emails, ...standaloneRest } = standalone;
      const payload = {
        action: "issue_standalone",
        ...standaloneRest,
        customerEmail,
        ...(loadedBookingId ? { bookingId: loadedBookingId } : {}),
        ...(loadedReservationId ? { reservationId: loadedReservationId } : {}),
        alreadyPaid: isCardCollect ? false : standalone.alreadyPaid,
        passengers: standalone.passengers.trim()
          ? Number(standalone.passengers)
          : undefined,
        gratuity: manualGratNum > 0 ? manualGratNum : 0,
        lines,
      };

      const res = await fetch("/api/admin/billing/invoices", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!json.success) {
        setMessage(json.error || "Failed to issue manual invoice");
        return;
      }

      if (json.deferDelivery) {
        await beginPaymentCollect({
          invoiceId: String(json.invoiceId),
          invoiceNumber: String(json.invoiceNumber),
          bookingId: String(json.bookingId),
          total: Number(json.total),
        });
        return;
      }

      setMessage(
        `Issued ${json.invoiceNumber} · ${json.bookingId} · $${Number(json.total).toFixed(2)} · email sent`
      );
      clearManualForm();
      await load();
    } catch {
      setMessage("Network error");
    } finally {
      setBusyId(null);
    }
  }

  async function onCardPaid(paymentIntentId: string) {
    if (!pendingCard) return;
    setBusyId("confirm_paid");
    try {
      const res = await fetch("/api/admin/billing/invoices", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "confirm_manual_paid",
          invoiceId: pendingCard.invoiceId,
          paymentIntentId,
        }),
      });
      const json = await res.json();
      if (!json.success) {
        setMessage(json.error || "Paid but invoice email failed to queue");
      } else {
        setMessage(
          `Payment OK · ${pendingCard.invoiceNumber} · invoice email sending to customer`
        );
        setPendingCard(null);
        clearManualForm();
        await load();
      }
    } catch {
      setMessage("Network error after payment");
    } finally {
      setBusyId(null);
    }
  }

  async function copyPaymentLink() {
    if (!pendingCard?.paymentUrl) return;
    try {
      await navigator.clipboard.writeText(pendingCard.paymentUrl);
      setMessage("Payment link copied");
    } catch {
      setMessage("Could not copy — select the link manually");
    }
  }

  return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 tracking-tight flex items-center gap-2">
              <FileText className="w-6 h-6 text-[#C9A063]" />
              Billing &amp; Invoices
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Canonical SARJ tax invoices. Amounts are frozen — staff cannot edit line items.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void load()}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-white border border-gray-200 hover:bg-gray-50"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>

        {failedCount > 0 && (
          <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>
              {failedCount} invoice(s) have a failed email/QB/Dropbox sync. Use Retry below.
            </span>
          </div>
        )}

        {message && (
          <div className="rounded-lg bg-slate-900 text-white text-sm px-4 py-2">{message}</div>
        )}

        {/* Integrations */}
        <section className="rounded-2xl border border-gray-200 bg-white p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
            Archives &amp; books
          </h2>
          {!integrations?.encryptionConfigured && (
            <p className="text-sm text-rose-700">
              Set <code className="text-xs">INTEGRATION_TOKEN_ENCRYPTION_KEY</code> before connecting
              QuickBooks/Dropbox.
            </p>
          )}
          {!integrations?.billingHstNumberSet && (
            <p className="text-sm text-amber-800">
              Set <code className="text-xs">BILLING_HST_NUMBER</code> so tax invoices show your CRA
              registration.
            </p>
          )}
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="rounded-xl border border-gray-100 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <p className="font-medium text-gray-900">QuickBooks Online</p>
                {badge(integrations?.quickbooks.connected ? "DONE" : "PENDING")}
              </div>
              <p className="text-xs text-gray-500">
                {integrations?.quickbooks.connected
                  ? `Connected${integrations.quickbooks.connectedByEmail ? ` by ${integrations.quickbooks.connectedByEmail}` : ""}`
                  : "Owner OAuth connect required"}
              </p>
              {isOwner && (
                <div className="flex gap-2 pt-1">
                  {!integrations?.quickbooks.connected ? (
                    <button
                      type="button"
                      disabled={!integrations?.quickbooks.envReady}
                      onClick={() => void connect("QUICKBOOKS")}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-md bg-[#C9A063] text-black disabled:opacity-40"
                    >
                      <Link2 className="w-3.5 h-3.5" />
                      Connect
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => void disconnect("QUICKBOOKS")}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-md border border-rose-200 text-rose-700"
                    >
                      <Unlink className="w-3.5 h-3.5" />
                      Disconnect
                    </button>
                  )}
                </div>
              )}
            </div>
            <div className="rounded-xl border border-gray-100 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <p className="font-medium text-gray-900">Dropbox</p>
                {badge(integrations?.dropbox.connected ? "DONE" : "PENDING")}
              </div>
              <p className="text-xs text-gray-500">
                {integrations?.dropbox.folderPath || "Company Invoices folder"}
              </p>
              {isOwner && (
                <div className="flex gap-2 pt-1">
                  {!integrations?.dropbox.connected ? (
                    <button
                      type="button"
                      disabled={!integrations?.dropbox.envReady}
                      onClick={() => void connect("DROPBOX")}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-md bg-[#C9A063] text-black disabled:opacity-40"
                    >
                      <Link2 className="w-3.5 h-3.5" />
                      Connect
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => void disconnect("DROPBOX")}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-md border border-rose-200 text-rose-700"
                    >
                      <Unlink className="w-3.5 h-3.5" />
                      Disconnect
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Standalone manual invoice (+ optional load from booking) */}
        <section
          id="create-manual-invoice"
          className="rounded-2xl border border-gray-200 bg-white overflow-hidden"
        >
          <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/80 space-y-3">
            <div>
              <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
                Create manual invoice
              </h2>
              <p className="text-xs text-gray-500 mt-1">
                Walk-in / phone, or load an existing booking below. Amounts are pre-tax; HST
                13% is added automatically. Credit card → email only after payment.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Load from reservation (booking id)
                </label>
                <input
                  value={manualReservationId}
                  onChange={(e) => setManualReservationId(e.target.value)}
                  placeholder="SARJ-MWTJ66FC575"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white"
                />
              </div>
              <button
                type="button"
                disabled={
                  !manualReservationId.trim() || busyId === "load_reservation"
                }
                onClick={() => void loadReservationIntoForm()}
                className="px-4 py-2 rounded-lg text-sm font-semibold bg-gray-900 text-white disabled:opacity-40 whitespace-nowrap"
              >
                {busyId === "load_reservation"
                  ? "Loading…"
                  : "Load into form"}
              </button>
            </div>
            {loadedBookingId && (
              <p className="text-[11px] font-semibold text-[#8B6914]">
                Form filled from {loadedBookingId}
                {loadedReservationId ? " (linked)" : ""} — review, then Create &amp;
                collect payment.
              </p>
            )}
          </div>

          <div className="p-5 space-y-6">
            {/* 1. Customer */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-[#8B6914] uppercase tracking-wider">
                1 · Customer
              </h3>
              <div className="grid sm:grid-cols-3 gap-3">
                <div>
                  <label className={labelClass}>Full name *</label>
                  <input
                    value={standalone.customerName}
                    onChange={(e) =>
                      setStandalone((s) => ({ ...s, customerName: e.target.value }))
                    }
                    placeholder="Guest name"
                    className={fieldClass}
                  />
                </div>
                <div className="sm:col-span-1">
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <label className="block text-xs font-semibold text-gray-600">
                      Email *{" "}
                      <span className="font-normal text-gray-400">
                        (all get invoice when paid)
                      </span>
                    </label>
                    {standalone.customerEmails.length < 5 && (
                      <button
                        type="button"
                        onClick={() =>
                          setStandalone((s) => ({
                            ...s,
                            customerEmails: [...s.customerEmails, ""],
                          }))
                        }
                        className="text-[11px] font-semibold text-[#8B6914] hover:underline whitespace-nowrap"
                      >
                        + Add email
                      </button>
                    )}
                  </div>
                  <div className="space-y-2">
                    {standalone.customerEmails.map((value, idx) => (
                      <div key={idx} className="flex gap-2 items-center">
                        <input
                          type="email"
                          autoComplete={idx === 0 ? "email" : "off"}
                          value={value}
                          onChange={(e) => {
                            const next = e.target.value;
                            setStandalone((s) => ({
                              ...s,
                              customerEmails: s.customerEmails.map((em, i) =>
                                i === idx ? next : em
                              ),
                            }));
                          }}
                          placeholder={
                            idx === 0 ? "guest@email.com" : "assistant@email.com"
                          }
                          className={fieldClass}
                        />
                        {standalone.customerEmails.length > 1 && (
                          <button
                            type="button"
                            onClick={() =>
                              setStandalone((s) => ({
                                ...s,
                                customerEmails: s.customerEmails.filter(
                                  (_, i) => i !== idx
                                ),
                              }))
                            }
                            className="text-xs font-semibold text-rose-700 shrink-0"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Phone</label>
                  <input
                    value={standalone.customerPhone}
                    onChange={(e) =>
                      setStandalone((s) => ({ ...s, customerPhone: e.target.value }))
                    }
                    placeholder="(416) 000-0000"
                    className={fieldClass}
                  />
                </div>
              </div>
            </div>

            {/* 2. Trip */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-[#8B6914] uppercase tracking-wider">
                2 · Trip details
              </h3>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div>
                  <label className={labelClass}>Service type</label>
                  <select
                    value={standalone.serviceType}
                    onChange={(e) =>
                      setStandalone((s) => ({ ...s, serviceType: e.target.value }))
                    }
                    className={fieldClass}
                  >
                    {!MANUAL_SERVICE_TYPES.some(
                      (t) => t.value === standalone.serviceType
                    ) && standalone.serviceType ? (
                      <option value={standalone.serviceType}>
                        {standalone.serviceType}
                      </option>
                    ) : null}
                    {MANUAL_SERVICE_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Vehicle</label>
                  <select
                    value={standalone.vehicle}
                    onChange={(e) =>
                      setStandalone((s) => ({ ...s, vehicle: e.target.value }))
                    }
                    className={fieldClass}
                  >
                    <option value="">Select vehicle…</option>
                    {!vehicleInFleet && standalone.vehicle ? (
                      <option value={standalone.vehicle}>
                        {standalone.vehicle} (from booking)
                      </option>
                    ) : null}
                    {fleetVehicles.map((v) => (
                      <option key={v.id} value={v.name}>
                        {v.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Date</label>
                  <input
                    type="date"
                    value={standalone.serviceDate}
                    onChange={(e) =>
                      setStandalone((s) => ({ ...s, serviceDate: e.target.value }))
                    }
                    className={fieldClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Time</label>
                  <input
                    type="time"
                    value={standalone.serviceTime}
                    onChange={(e) =>
                      setStandalone((s) => ({ ...s, serviceTime: e.target.value }))
                    }
                    className={fieldClass}
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Pickup</label>
                  <input
                    value={standalone.pickupLocation}
                    onChange={(e) =>
                      setStandalone((s) => ({ ...s, pickupLocation: e.target.value }))
                    }
                    placeholder="Pickup address"
                    className={fieldClass}
                  />
                </div>
                {standalone.serviceType !== "Hourly ride" && (
                  <div>
                    <label className={labelClass}>Drop-off</label>
                    <input
                      value={standalone.dropoffLocation}
                      onChange={(e) =>
                        setStandalone((s) => ({ ...s, dropoffLocation: e.target.value }))
                      }
                      placeholder="Drop-off address"
                      className={fieldClass}
                    />
                  </div>
                )}
                {standalone.serviceType === "Hourly ride" && (
                  <div>
                    <label className={labelClass}>Passengers</label>
                    <input
                      type="number"
                      min={1}
                      value={standalone.passengers}
                      onChange={(e) =>
                        setStandalone((s) => ({ ...s, passengers: e.target.value }))
                      }
                      className={fieldClass}
                    />
                  </div>
                )}
              </div>

              {standalone.serviceType !== "Hourly ride" && (
                <div className="grid sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className={labelClass}>Stops (optional)</label>
                    <input
                      value={standalone.stops}
                      onChange={(e) =>
                        setStandalone((s) => ({ ...s, stops: e.target.value }))
                      }
                      placeholder="Stop 1 | Stop 2"
                      className={fieldClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Passengers</label>
                    <input
                      type="number"
                      min={1}
                      value={standalone.passengers}
                      onChange={(e) =>
                        setStandalone((s) => ({ ...s, passengers: e.target.value }))
                      }
                      className={fieldClass}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* 3. Charges */}
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-xs font-bold text-[#8B6914] uppercase tracking-wider">
                  3 · Charges (before tax)
                </h3>
                <button
                  type="button"
                  disabled={manualLines.length >= 20}
                  onClick={() => setManualLines((rows) => [...rows, emptyManualLine()])}
                  className="text-xs font-semibold text-[#8B6914] hover:underline disabled:opacity-40"
                >
                  + Add line
                </button>
              </div>
              <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-3 space-y-2">
                <div className="hidden sm:grid grid-cols-[1fr_7.5rem_4rem] gap-2 px-1 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                  <span>Description</span>
                  <span className="text-right">Amount CAD</span>
                  <span />
                </div>
                {manualLines.map((line, idx) => (
                  <div
                    key={idx}
                    className="grid grid-cols-1 sm:grid-cols-[1fr_7.5rem_4rem] gap-2 items-center"
                  >
                    <input
                      value={line.label}
                      onChange={(e) =>
                        setManualLines((rows) =>
                          rows.map((r, i) =>
                            i === idx ? { ...r, label: e.target.value } : r
                          )
                        )
                      }
                      placeholder="e.g. Ride fare"
                      className={fieldClass}
                    />
                    <input
                      value={line.amount}
                      onChange={(e) =>
                        setManualLines((rows) =>
                          rows.map((r, i) =>
                            i === idx ? { ...r, amount: e.target.value } : r
                          )
                        )
                      }
                      placeholder="0.00"
                      inputMode="decimal"
                      className={`${fieldClass} tabular-nums text-right`}
                    />
                    <button
                      type="button"
                      disabled={manualLines.length <= 1}
                      onClick={() =>
                        setManualLines((rows) => rows.filter((_, i) => i !== idx))
                      }
                      className="text-xs text-rose-700 font-semibold disabled:opacity-30 py-2"
                    >
                      Remove
                    </button>
                  </div>
                ))}
                <div className="grid sm:grid-cols-[1fr_7.5rem] gap-2 items-center pt-1">
                  <label className="text-sm text-gray-600">
                    Admin, Fuel &amp; Grat{" "}
                    <span className="text-xs text-gray-400">(after HST, not taxed)</span>
                  </label>
                  <input
                    value={manualGratuity}
                    onChange={(e) => setManualGratuity(e.target.value)}
                    placeholder="0.00"
                    inputMode="decimal"
                    className={`${fieldClass} tabular-nums text-right`}
                  />
                </div>
                <div className="flex flex-wrap items-center justify-end gap-x-5 gap-y-1 pt-2 border-t border-gray-200 text-sm">
                  <span className="text-gray-500">
                    Subtotal{" "}
                    <strong className="text-gray-900 tabular-nums">
                      ${manualSubtotal.toFixed(2)}
                    </strong>
                  </span>
                  <span className="text-gray-500">
                    HST{" "}
                    <strong className="text-gray-900 tabular-nums">
                      ${manualHst.toFixed(2)}
                    </strong>
                  </span>
                  {manualGratNum > 0 ? (
                    <span className="text-gray-500">
                      Grat{" "}
                      <strong className="text-gray-900 tabular-nums">
                        ${manualGratNum.toFixed(2)}
                      </strong>
                    </span>
                  ) : null}
                  <span className="text-gray-900 font-semibold">
                    Total{" "}
                    <strong className="tabular-nums text-base">${manualTotal.toFixed(2)}</strong>
                  </span>
                </div>
              </div>
            </div>

            {/* 4. Payment */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-[#8B6914] uppercase tracking-wider">
                4 · Payment
              </h3>
              <p className="text-xs text-gray-500">
                Credit card: create invoice → payment link / enter card. Customer gets the
                invoice email only after payment succeeds.
              </p>
              <div className="grid sm:grid-cols-[1fr_auto_auto] gap-3 items-end">
                <div>
                  <label className={labelClass}>Payment method</label>
                  <select
                    value={standalone.paymentMethodLabel}
                    onChange={(e) => {
                      const v = e.target.value;
                      const card = /^credit\s*card$/i.test(v);
                      setStandalone((s) => ({
                        ...s,
                        paymentMethodLabel: v,
                        alreadyPaid: card ? false : s.alreadyPaid || true,
                      }));
                    }}
                    className={fieldClass}
                  >
                    {MANUAL_PAYMENT_METHODS.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
                {!isCardCollect && (
                  <label className="inline-flex items-center gap-2 text-sm text-gray-800 h-[38px] px-1">
                    <input
                      type="checkbox"
                      checked={standalone.alreadyPaid}
                      onChange={(e) =>
                        setStandalone((s) => ({ ...s, alreadyPaid: e.target.checked }))
                      }
                      className="rounded border-gray-300"
                    />
                    Already paid
                  </label>
                )}
                <button
                  type="button"
                  disabled={busyId === "issue_standalone" || Boolean(pendingCard)}
                  onClick={() => void issueStandalone()}
                  className="px-5 py-2.5 rounded-lg text-sm font-semibold bg-[#C9A063] text-black disabled:opacity-40 whitespace-nowrap"
                >
                  {busyId === "issue_standalone"
                    ? "Creating…"
                    : isCardCollect
                      ? "Create & collect payment"
                      : "Issue invoice"}
                </button>
              </div>
            </div>

          </div>
        </section>

        {pendingCard && (
          <section className="rounded-2xl border border-[#C9A063]/40 bg-[#C9A063]/5 p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  Collect payment · {pendingCard.invoiceNumber}
                </p>
                <p className="text-xs text-gray-600 mt-0.5">
                  {pendingCard.bookingId} · ${pendingCard.total.toFixed(2)} CAD — no
                  customer invoice email until paid
                </p>
              </div>
              <button
                type="button"
                className="text-xs font-semibold text-gray-600 hover:underline"
                onClick={() => setPendingCard(null)}
              >
                Dismiss
              </button>
            </div>

            <div className="space-y-2">
              <label className={labelClass}>Payment link (WhatsApp / email)</label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  readOnly
                  value={pendingCard.paymentUrl}
                  className={`${fieldClass} font-mono text-xs`}
                />
                <button
                  type="button"
                  onClick={() => void copyPaymentLink()}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border border-gray-200 bg-white hover:bg-gray-50"
                >
                  <Copy className="w-3.5 h-3.5" />
                  Copy
                </button>
                <a
                  href={pendingCard.paymentUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border border-gray-200 bg-white hover:bg-gray-50"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Open
                </a>
              </div>
            </div>

            <div className="pt-2 border-t border-[#C9A063]/20">
              <p className="text-xs text-gray-600 mb-3">
                Or enter the card here (phone / WhatsApp) — Stripe secure form
              </p>
              <AdminInvoiceCardPay
                clientSecret={pendingCard.clientSecret}
                onSuccess={(pi) => void onCardPaid(pi)}
                onError={(err) => setMessage(err)}
              />
            </div>
          </section>
        )}

        {/* Search + table */}
        <section className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search booking, invoice #, email…"
              className="w-full sm:max-w-sm rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={() => void postAction({ action: "process_jobs" })}
              className="text-xs font-semibold text-[#8B6914] hover:underline"
            >
              Process pending jobs now
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3">Invoice</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Total</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">QB</th>
                  <th className="px-4 py-3">Dropbox</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                      Loading…
                    </td>
                  </tr>
                ) : invoices.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                      No invoices yet
                    </td>
                  </tr>
                ) : (
                  invoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-gray-50/80">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-gray-900 flex items-center gap-2 flex-wrap">
                          {inv.invoiceNumber}
                          {(inv.source || "").toUpperCase() === "MANUAL" && (
                            <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wide bg-slate-100 text-slate-700 ring-1 ring-slate-200">
                              MANUAL
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500">
                          {inv.bookingId} · {inv.kind}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-gray-900">{inv.customerName}</div>
                        <div className="text-xs text-gray-500">{inv.customerEmail}</div>
                      </td>
                      <td className="px-4 py-3 tabular-nums font-medium">
                        ${Number(inv.total).toFixed(2)}
                      </td>
                      <td className="px-4 py-3">{badge(inv.emailStatus)}</td>
                      <td className="px-4 py-3">{badge(inv.qbSyncStatus)}</td>
                      <td className="px-4 py-3">{badge(inv.dropboxSyncStatus)}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-nowrap items-center gap-0">
                          <a
                            href={`/api/admin/billing/invoices/${encodeURIComponent(inv.id)}/pdf`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-semibold bg-[#C9A063]/15 text-[#8B6914] ring-1 ring-[#C9A063]/35 hover:bg-[#C9A063]/25"
                          >
                            <FileText className="w-3 h-3" />
                            PDF
                          </a>
                          <span
                            className="mx-2 h-5 w-px shrink-0 bg-gray-300"
                            aria-hidden
                          />
                          {inv.emailStatus !== "SKIPPED" ? (
                            <button
                              type="button"
                              disabled={busyId === inv.id}
                              onClick={() =>
                                void postAction({ action: "resend", invoiceId: inv.id })
                              }
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-semibold bg-white text-gray-700 ring-1 ring-gray-200 hover:bg-gray-50 disabled:opacity-40"
                            >
                              <Send className="w-3 h-3" />
                              Resend
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled={busyId === inv.id || Boolean(pendingCard)}
                              onClick={() =>
                                void beginPaymentCollect({
                                  invoiceId: inv.id,
                                  invoiceNumber: inv.invoiceNumber,
                                  bookingId: inv.bookingId,
                                  total: Number(inv.total),
                                })
                              }
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-semibold bg-amber-50 text-amber-900 ring-1 ring-amber-200 hover:bg-amber-100 disabled:opacity-40 whitespace-nowrap"
                            >
                              Collect
                            </button>
                          )}
                          {inv.emailStatus === "FAILED" && (
                            <>
                              <span
                                className="mx-2 h-5 w-px shrink-0 bg-gray-300"
                                aria-hidden
                              />
                              <button
                                type="button"
                                onClick={() =>
                                  void postAction({
                                    action: "retry",
                                    invoiceId: inv.id,
                                    type: "EMAIL",
                                  })
                                }
                                className="inline-flex items-center px-2.5 py-1.5 rounded-md text-xs font-semibold text-rose-700 ring-1 ring-rose-200 hover:bg-rose-50 whitespace-nowrap"
                              >
                                Retry email
                              </button>
                            </>
                          )}
                          {inv.qbSyncStatus === "FAILED" && (
                            <>
                              <span
                                className="mx-2 h-5 w-px shrink-0 bg-gray-300"
                                aria-hidden
                              />
                              <button
                                type="button"
                                onClick={() =>
                                  void postAction({
                                    action: "retry",
                                    invoiceId: inv.id,
                                    type: "QBO_SYNC",
                                  })
                                }
                                className="inline-flex items-center px-2.5 py-1.5 rounded-md text-xs font-semibold text-rose-700 ring-1 ring-rose-200 hover:bg-rose-50 whitespace-nowrap"
                              >
                                Retry QB
                              </button>
                            </>
                          )}
                          {inv.dropboxSyncStatus === "FAILED" && (
                            <>
                              <span
                                className="mx-2 h-5 w-px shrink-0 bg-gray-300"
                                aria-hidden
                              />
                              <button
                                type="button"
                                onClick={() =>
                                  void postAction({
                                    action: "retry",
                                    invoiceId: inv.id,
                                    type: "DROPBOX_SYNC",
                                  })
                                }
                                className="inline-flex items-center px-2.5 py-1.5 rounded-md text-xs font-semibold text-rose-700 ring-1 ring-rose-200 hover:bg-rose-50 whitespace-nowrap"
                              >
                                Retry Dropbox
                              </button>
                            </>
                          )}
                          <span
                            className="mx-2 h-5 w-px shrink-0 bg-gray-300"
                            aria-hidden
                          />
                          <button
                            type="button"
                            disabled={busyId === inv.id}
                            onClick={() => {
                              if (
                                !confirm(
                                  `Delete invoice ${inv.invoiceNumber}?\n\nThis permanently removes it from Billing. This cannot be undone.`
                                )
                              ) {
                                return;
                              }
                              void postAction({
                                action: "delete_invoice",
                                invoiceId: inv.id,
                              });
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-semibold text-rose-700 ring-1 ring-rose-200 hover:bg-rose-50 disabled:opacity-40"
                          >
                            <Trash2 className="w-3 h-3" />
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
  );
}
