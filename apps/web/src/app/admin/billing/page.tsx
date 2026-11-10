"use client";

import { useCallback, useEffect, useState } from "react";
import { FileText, RefreshCw, Send, Link2, Unlink, AlertTriangle } from "lucide-react";

type InvoiceRow = {
  id: string;
  invoiceNumber: string;
  kind: string;
  status: string;
  bookingId: string;
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
      } else {
        setMessage("Done");
        await load();
      }
    } catch {
      setMessage("Network error");
    } finally {
      setBusyId(null);
    }
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

        {/* Manual issue */}
        <section className="rounded-2xl border border-gray-200 bg-white p-5 flex flex-col sm:flex-row gap-3 sm:items-end">
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Issue / ensure invoice for reservation id (cash etc.)
            </label>
            <input
              value={manualReservationId}
              onChange={(e) => setManualReservationId(e.target.value)}
              placeholder="Reservation cuid…"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
          </div>
          <button
            type="button"
            disabled={!manualReservationId.trim() || busyId === "issue"}
            onClick={() =>
              void postAction({
                action: "issue_manual",
                reservationId: manualReservationId.trim(),
              })
            }
            className="px-4 py-2 rounded-lg text-sm font-semibold bg-gray-900 text-white disabled:opacity-40"
          >
            Issue invoice
          </button>
        </section>

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
                        <div className="font-semibold text-gray-900">{inv.invoiceNumber}</div>
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
                        <div className="flex flex-wrap gap-1.5">
                          <a
                            href={`/api/admin/billing/invoices/${encodeURIComponent(inv.id)}/pdf`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs font-semibold text-[#8B6914] hover:underline"
                          >
                            PDF
                          </a>
                          <button
                            type="button"
                            disabled={busyId === inv.id}
                            onClick={() =>
                              void postAction({ action: "resend", invoiceId: inv.id })
                            }
                            className="inline-flex items-center gap-1 text-xs font-semibold text-gray-700 hover:text-black"
                          >
                            <Send className="w-3 h-3" />
                            Resend
                          </button>
                          {inv.emailStatus === "FAILED" && (
                            <button
                              type="button"
                              onClick={() =>
                                void postAction({
                                  action: "retry",
                                  invoiceId: inv.id,
                                  type: "EMAIL",
                                })
                              }
                              className="text-xs font-semibold text-rose-700"
                            >
                              Retry email
                            </button>
                          )}
                          {inv.qbSyncStatus === "FAILED" && (
                            <button
                              type="button"
                              onClick={() =>
                                void postAction({
                                  action: "retry",
                                  invoiceId: inv.id,
                                  type: "QBO_SYNC",
                                })
                              }
                              className="text-xs font-semibold text-rose-700"
                            >
                              Retry QB
                            </button>
                          )}
                          {inv.dropboxSyncStatus === "FAILED" && (
                            <button
                              type="button"
                              onClick={() =>
                                void postAction({
                                  action: "retry",
                                  invoiceId: inv.id,
                                  type: "DROPBOX_SYNC",
                                })
                              }
                              className="text-xs font-semibold text-rose-700"
                            >
                              Retry Dropbox
                            </button>
                          )}
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
