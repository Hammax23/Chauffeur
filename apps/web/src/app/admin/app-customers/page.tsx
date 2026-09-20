"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import {
  Search,
  Loader2,
  AlertCircle,
  Users,
  Mail,
  Phone,
  MapPin,
  X,
  Shield,
  Ban,
  Trash2,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";

type AppCustomer = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  city: string | null;
  photo: string | null;
  oauthProvider: string | null;
  accountStatus: string;
  blockedAt: string | null;
  blockedReason: string | null;
  deactivatedAt: string | null;
  createdAt: string;
};

type ConfirmState =
  | { type: "block"; customer: AppCustomer }
  | { type: "unblock"; customer: AppCustomer }
  | { type: "delete"; customer: AppCustomer }
  | null;

function isBlocked(c: AppCustomer) {
  return String(c.accountStatus || "ACTIVE").toUpperCase() === "BLOCKED";
}

function isDeactivated(c: AppCustomer) {
  return String(c.accountStatus || "ACTIVE").toUpperCase() === "DEACTIVATED";
}

function statusLabel(c: AppCustomer) {
  if (isBlocked(c)) return "Blocked";
  if (isDeactivated(c)) return "Deactivated";
  return "Active";
}

function initials(c: AppCustomer) {
  return `${c.firstName} ${c.lastName}`
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function AppCustomersPage() {
  const [customers, setCustomers] = useState<AppCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "blocked" | "deactivated">("all");
  const [selected, setSelected] = useState<AppCustomer | null>(null);
  const [confirm, setConfirm] = useState<ConfirmState>(null);
  const [blockReason, setBlockReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const fetchCustomers = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/app-customers", { credentials: "include" });
      const data = await res.json();
      if (data.success) {
        setCustomers(data.customers || []);
        setError("");
      } else {
        setError(data.error || "Failed to fetch");
      }
    } catch {
      setError("Failed to connect to server");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 2800);
    return () => clearTimeout(t);
  }, [toast]);

  const stats = useMemo(() => {
    const blocked = customers.filter(isBlocked).length;
    const deactivated = customers.filter(isDeactivated).length;
    return {
      total: customers.length,
      apple: customers.filter((c) => c.oauthProvider === "apple").length,
      google: customers.filter((c) => c.oauthProvider === "google").length,
      blocked,
      deactivated,
      active: customers.length - blocked - deactivated,
    };
  }, [customers]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return customers.filter((c) => {
      if (statusFilter === "blocked" && !isBlocked(c)) return false;
      if (statusFilter === "deactivated" && !isDeactivated(c)) return false;
      if (statusFilter === "active" && (isBlocked(c) || isDeactivated(c))) return false;
      if (!q) return true;
      const name = `${c.firstName} ${c.lastName}`.toLowerCase();
      return (
        name.includes(q) ||
        c.email.toLowerCase().includes(q) ||
        (c.phone || "").toLowerCase().includes(q) ||
        (c.city || "").toLowerCase().includes(q)
      );
    });
  }, [customers, searchQuery, statusFilter]);

  const upsertCustomer = (updated: AppCustomer) => {
    setCustomers((prev) => prev.map((c) => (c.id === updated.id ? { ...c, ...updated } : c)));
    setSelected((prev) => (prev?.id === updated.id ? { ...prev, ...updated } : prev));
  };

  const runAction = async () => {
    if (!confirm) return;
    setActionLoading(true);
    setError("");
    try {
      const { customer, type } = confirm;
      if (type === "delete") {
        const res = await fetch(`/api/admin/app-customers/${customer.id}`, {
          method: "DELETE",
          credentials: "include",
        });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.error || "Delete failed");
        setCustomers((prev) => prev.filter((c) => c.id !== customer.id));
        if (selected?.id === customer.id) setSelected(null);
        setToast(`${customer.firstName} ${customer.lastName} deleted`);
      } else {
        const res = await fetch(`/api/admin/app-customers/${customer.id}`, {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: type,
            reason: type === "block" ? blockReason : undefined,
          }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.error || "Update failed");
        upsertCustomer(data.customer);
        setToast(
          type === "block"
            ? `${customer.firstName} blocked from the app`
            : `${customer.firstName} unblocked`
        );
      }
      setConfirm(null);
      setBlockReason("");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Action failed");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#C9A063] mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Loading app customers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">App Registered Customers</h1>
        <p className="text-gray-500 mt-1">
          Customers created via the mobile app (Google/Apple or in-app registration)
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              <p className="text-xs text-gray-500">Total</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.active}</p>
              <p className="text-xs text-gray-500">Active</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center">
              <Ban className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.blocked}</p>
              <p className="text-xs text-gray-500">Blocked</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#C9A063]/10 rounded-lg flex items-center justify-center">
              <Shield className="w-5 h-5 text-[#C9A063]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {stats.apple}
                <span className="text-gray-300 mx-1">/</span>
                {stats.google}
              </p>
              <p className="text-xs text-gray-500">Apple / Google</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, email, phone, city..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white rounded-xl border border-gray-200 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#C9A063] focus:ring-2 focus:ring-[#C9A063]/10"
          />
        </div>
        <div className="flex rounded-xl border border-gray-200 bg-white p-1">
          {([
            ["all", "All"],
            ["active", "Active"],
            ["blocked", "Blocked"],
            ["deactivated", "Deactivated"],
          ] as const).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setStatusFilter(id)}
              className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === id
                  ? "bg-gray-900 text-white"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="mb-5 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {toast && (
        <div className="mb-5 p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <p className="text-emerald-800 text-sm">{toast}</p>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="hidden lg:grid grid-cols-[1fr_200px_120px_110px_160px_150px] gap-3 px-5 py-3 bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider">
          <span>Customer</span>
          <span>Contact</span>
          <span>Provider</span>
          <span>Status</span>
          <span>Registered</span>
          <span className="text-right">Actions</span>
        </div>

        {filtered.length === 0 ? (
          <div className="py-16 text-center">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">No app customers found</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filtered.map((c) => {
              const blocked = isBlocked(c);
              const deactivated = isDeactivated(c);
              const inactive = blocked || deactivated;
              return (
                <div
                  key={c.id}
                  className="grid grid-cols-1 lg:grid-cols-[1fr_200px_120px_110px_160px_150px] gap-2 lg:gap-3 px-5 py-4 hover:bg-gray-50/80 transition-colors items-center"
                >
                  <button
                    type="button"
                    onClick={() => setSelected(c)}
                    className="flex items-center gap-3 min-w-0 text-left"
                  >
                    <div className="w-10 h-10 bg-gradient-to-br from-[#C9A063] to-[#A68B5B] rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {c.photo ? (
                        <Image
                          src={c.photo}
                          alt={c.firstName}
                          width={40}
                          height={40}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-white font-semibold text-sm">{initials(c)}</span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 truncate">
                        {c.firstName} {c.lastName}
                      </p>
                      <p className="text-xs text-gray-500 truncate lg:hidden">{c.email}</p>
                    </div>
                  </button>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Mail className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      <span className="truncate">{c.email}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Phone className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      <span className="truncate">{c.phone || "--"}</span>
                    </div>
                  </div>

                  <div>
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">
                      {c.oauthProvider ? c.oauthProvider.toUpperCase() : "PASSWORD"}
                    </span>
                  </div>

                  <div>
                    <span
                      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                        blocked
                          ? "bg-amber-50 text-amber-800 border border-amber-200"
                          : deactivated
                            ? "bg-slate-100 text-slate-700 border border-slate-200"
                            : "bg-emerald-50 text-emerald-700 border border-emerald-100"
                      }`}
                    >
                      {statusLabel(c)}
                    </span>
                  </div>

                  <div className="text-sm text-gray-600">
                    {new Date(c.createdAt).toLocaleString("en-US", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </div>

                  <div className="flex items-center justify-start lg:justify-end gap-1.5">
                    {inactive ? (
                      <button
                        type="button"
                        title={deactivated ? "Reactivate customer" : "Unblock customer"}
                        onClick={() => setConfirm({ type: "unblock", customer: c })}
                        className="inline-flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-100 transition-colors"
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        {deactivated ? "Reactivate" : "Unblock"}
                      </button>
                    ) : (
                      <button
                        type="button"
                        title="Block customer"
                        onClick={() => {
                          setBlockReason("");
                          setConfirm({ type: "block", customer: c });
                        }}
                        className="inline-flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-xs font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-100 transition-colors"
                      >
                        <Ban className="w-3.5 h-3.5" />
                        Block
                      </button>
                    )}
                    <button
                      type="button"
                      title="Delete customer"
                      onClick={() => setConfirm({ type: "delete", customer: c })}
                      className="inline-flex items-center justify-center p-2 rounded-lg text-red-600 bg-red-50 hover:bg-red-100 border border-red-100 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSelected(null)} />
          <div className="relative bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-lg p-4 sm:p-6 shadow-xl max-h-[85dvh] overflow-y-auto">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="min-w-0">
                <h2 className="text-lg font-bold text-gray-900">Customer Details</h2>
                <p className="text-xs text-gray-500 mt-1 break-all">{selected.id}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="p-2.5 min-h-[44px] min-w-[44px] shrink-0 flex items-center justify-center hover:bg-gray-100 rounded-lg"
                aria-label="Close"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="space-y-3 text-sm mb-5">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-gray-400" />
                <span className="font-semibold text-gray-900">
                  {selected.firstName} {selected.lastName}
                </span>
                <span
                  className={`ml-auto text-xs font-semibold px-2 py-0.5 rounded-full ${
                    isBlocked(selected)
                      ? "bg-amber-50 text-amber-800"
                      : isDeactivated(selected)
                        ? "bg-slate-100 text-slate-700"
                        : "bg-emerald-50 text-emerald-700"
                  }`}
                >
                  {statusLabel(selected)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-gray-400" />
                <span className="text-gray-700 break-all">{selected.email}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-gray-400" />
                <span className="text-gray-700">{selected.phone || "--"}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-gray-400" />
                <span className="text-gray-700">{selected.city || "--"}</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-gray-400" />
                <span className="text-gray-700">
                  Provider:{" "}
                  {selected.oauthProvider ? selected.oauthProvider.toUpperCase() : "PASSWORD"}
                </span>
              </div>
              {isDeactivated(selected) && (
                <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 text-slate-800 text-xs">
                  <p className="font-semibold mb-1">Self-deactivated</p>
                  {selected.deactivatedAt ? (
                    <p>
                      Since{" "}
                      {new Date(selected.deactivatedAt).toLocaleString("en-US", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </p>
                  ) : (
                    <p>Customer deactivated their account from the app.</p>
                  )}
                </div>
              )}
              {isBlocked(selected) && (
                <div className="rounded-xl bg-amber-50 border border-amber-100 p-3 text-amber-900 text-xs">
                  <p className="font-semibold mb-1">Blocked</p>
                  <p>{selected.blockedReason || "No reason recorded"}</p>
                  {selected.blockedAt ? (
                    <p className="mt-1 text-amber-700/80">
                      Since{" "}
                      {new Date(selected.blockedAt).toLocaleString("en-US", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </p>
                  ) : null}
                </div>
              )}
              <div className="pt-1 text-xs text-gray-500">
                Registered:{" "}
                {new Date(selected.createdAt).toLocaleString("en-US", {
                  dateStyle: "full",
                  timeStyle: "short",
                })}
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
              {isBlocked(selected) || isDeactivated(selected) ? (
                <button
                  type="button"
                  onClick={() => setConfirm({ type: "unblock", customer: selected })}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100"
                >
                  <ShieldCheck className="w-4 h-4" />
                  {isDeactivated(selected) ? "Reactivate" : "Unblock"}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setBlockReason("");
                    setConfirm({ type: "block", customer: selected });
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-amber-900 bg-amber-50 hover:bg-amber-100"
                >
                  <Ban className="w-4 h-4" />
                  Block access
                </button>
              )}
              <button
                type="button"
                onClick={() => setConfirm({ type: "delete", customer: selected })}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-red-700 bg-red-50 hover:bg-red-100"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {confirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => !actionLoading && setConfirm(null)} />
          <div className="relative bg-white rounded-2xl w-full max-w-md p-6 shadow-xl">
            <div
              className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 ${
                confirm.type === "delete"
                  ? "bg-red-50"
                  : confirm.type === "block"
                    ? "bg-amber-50"
                    : "bg-emerald-50"
              }`}
            >
              {confirm.type === "delete" ? (
                <Trash2 className="w-6 h-6 text-red-500" />
              ) : confirm.type === "block" ? (
                <Ban className="w-6 h-6 text-amber-600" />
              ) : (
                <ShieldCheck className="w-6 h-6 text-emerald-600" />
              )}
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">
              {confirm.type === "delete"
                ? "Delete customer?"
                : confirm.type === "block"
                  ? "Block customer?"
                  : "Unblock customer?"}
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              {confirm.type === "delete" ? (
                <>
                  Permanently remove{" "}
                  <span className="font-semibold text-gray-900">
                    {confirm.customer.firstName} {confirm.customer.lastName}
                  </span>
                  . Past reservations stay in the system; the customer account and app access are
                  removed.
                </>
              ) : confirm.type === "block" ? (
                <>
                  <span className="font-semibold text-gray-900">
                    {confirm.customer.firstName} {confirm.customer.lastName}
                  </span>{" "}
                  will not be able to sign in to the mobile app until unblocked.
                </>
              ) : (
                <>
                  Restore app access for{" "}
                  <span className="font-semibold text-gray-900">
                    {confirm.customer.firstName} {confirm.customer.lastName}
                  </span>
                  .
                </>
              )}
            </p>

            {confirm.type === "block" && (
              <div className="mb-4">
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                  Reason (optional)
                </label>
                <textarea
                  value={blockReason}
                  onChange={(e) => setBlockReason(e.target.value)}
                  rows={3}
                  placeholder="e.g. Fraudulent bookings, abuse, unpaid disputes..."
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#C9A063] focus:ring-2 focus:ring-[#C9A063]/10 resize-none"
                />
              </div>
            )}

            <div className="flex gap-2 justify-end">
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => setConfirm(null)}
                className="px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={runAction}
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50 ${
                  confirm.type === "delete"
                    ? "bg-red-600 hover:bg-red-700"
                    : confirm.type === "block"
                      ? "bg-amber-600 hover:bg-amber-700"
                      : "bg-emerald-600 hover:bg-emerald-700"
                }`}
              >
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {confirm.type === "delete"
                  ? "Delete permanently"
                  : confirm.type === "block"
                    ? "Block access"
                    : "Unblock"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
