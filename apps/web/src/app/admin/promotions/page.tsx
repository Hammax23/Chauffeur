"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Tag,
  Plus,
  Edit2,
  Trash2,
  Save,
  X,
  Loader2,
  RefreshCw,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";

type Promotion = {
  id: string;
  code: string;
  type: "PERCENT" | "FIXED" | string;
  value: number;
  isActive: boolean;
  startsAt: string | null;
  endsAt: string | null;
  maxRedemptions: number | null;
  redeemedCount: number;
  maxPerCustomer: number | null;
  minSubtotal: number | null;
  label: string | null;
  createdAt: string;
  updatedAt: string;
};

type FormState = {
  code: string;
  type: "PERCENT" | "FIXED";
  value: string;
  isActive: boolean;
  startsAt: string;
  endsAt: string;
  maxRedemptions: string;
  maxPerCustomer: string;
  minSubtotal: string;
  label: string;
};

const emptyForm: FormState = {
  code: "",
  type: "PERCENT",
  value: "20",
  isActive: true,
  startsAt: "",
  endsAt: "",
  maxRedemptions: "",
  maxPerCustomer: "1",
  minSubtotal: "",
  label: "",
};

const fieldClass =
  "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#C9A063]/30 focus:border-[#C9A063]";

function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromLocalInput(local: string): string | null {
  if (!local.trim()) return null;
  const d = new Date(local);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function formatDiscount(p: Promotion) {
  if (p.type === "PERCENT") return `${p.value}% off`;
  return `$${Number(p.value).toFixed(2)} off`;
}

function promoToForm(p: Promotion): FormState {
  return {
    code: p.code,
    type: p.type === "FIXED" ? "FIXED" : "PERCENT",
    value: String(p.value),
    isActive: p.isActive,
    startsAt: toLocalInput(p.startsAt),
    endsAt: toLocalInput(p.endsAt),
    maxRedemptions: p.maxRedemptions != null ? String(p.maxRedemptions) : "",
    maxPerCustomer: p.maxPerCustomer != null ? String(p.maxPerCustomer) : "",
    minSubtotal: p.minSubtotal != null ? String(p.minSubtotal) : "",
    label: p.label || "",
  };
}

export default function AdminPromotionsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);

  const load = useCallback(async () => {
    try {
      setError("");
      const res = await fetch("/api/admin/promotions", { credentials: "include" });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to load promotions");
      }
      setPromotions(data.promotions || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load promotions");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 2800);
    return () => clearTimeout(t);
  }, [toast]);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setFormOpen(true);
  };

  const openEdit = (p: Promotion) => {
    setEditingId(p.id);
    setForm(promoToForm(p));
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const buildPayload = () => {
    const value = Number(form.value);
    return {
      code: form.code.trim().toUpperCase(),
      type: form.type,
      value,
      isActive: form.isActive,
      startsAt: fromLocalInput(form.startsAt),
      endsAt: fromLocalInput(form.endsAt),
      maxRedemptions: form.maxRedemptions.trim()
        ? Number(form.maxRedemptions)
        : null,
      maxPerCustomer: form.maxPerCustomer.trim()
        ? Number(form.maxPerCustomer)
        : null,
      minSubtotal: form.minSubtotal.trim() ? Number(form.minSubtotal) : null,
      label: form.label.trim() || null,
    };
  };

  const save = async () => {
    const payload = buildPayload();
    if (!payload.code || payload.code.length < 2) {
      setError("Enter a promo code (at least 2 characters).");
      return;
    }
    if (!Number.isFinite(payload.value) || payload.value <= 0) {
      setError("Enter a valid discount value.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const url = editingId
        ? `/api/admin/promotions/${editingId}`
        : "/api/admin/promotions";
      const res = await fetch(url, {
        method: editingId ? "PATCH" : "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Save failed");
      }
      setToast(editingId ? "Promotion updated" : "Promotion created");
      closeForm();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (p: Promotion) => {
    try {
      const res = await fetch(`/api/admin/promotions/${p.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !p.isActive }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Update failed");
      }
      setToast(p.isActive ? "Promotion deactivated" : "Promotion activated");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed");
    }
  };

  const remove = async (p: Promotion) => {
    if (!window.confirm(`Delete promo code ${p.code}? This cannot be undone.`)) {
      return;
    }
    try {
      const res = await fetch(`/api/admin/promotions/${p.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Delete failed");
      }
      setToast("Promotion deleted");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
            <Tag className="h-6 w-6 text-[#C9A063]" />
            App Promotions
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Create promo codes for the mobile app checkout (percent or fixed $ off).
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setLoading(true);
              void load();
            }}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-lg bg-[#C9A063] px-3 py-2 text-sm font-medium text-white hover:bg-[#b8924f]"
          >
            <Plus className="h-4 w-4" />
            New code
          </button>
        </div>
      </div>

      {toast ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-800">
          {toast}
        </div>
      ) : null}
      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      {formOpen ? (
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-medium text-gray-900">
              {editingId ? "Edit promotion" : "Create promotion"}
            </h2>
            <button
              type="button"
              onClick={closeForm}
              className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <label className="block text-sm">
              <span className="mb-1 block text-gray-600">Code *</span>
              <input
                className={fieldClass}
                value={form.code}
                onChange={(e) =>
                  setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))
                }
                placeholder="SARJ20"
                maxLength={32}
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-gray-600">Type *</span>
              <select
                className={fieldClass}
                value={form.type}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    type: e.target.value === "FIXED" ? "FIXED" : "PERCENT",
                  }))
                }
              >
                <option value="PERCENT">Percent off</option>
                <option value="FIXED">Fixed $ off</option>
              </select>
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-gray-600">
                Value * {form.type === "PERCENT" ? "(%)" : "($)"}
              </span>
              <input
                className={fieldClass}
                type="number"
                min={0}
                step="0.01"
                value={form.value}
                onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))}
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-gray-600">Starts at</span>
              <input
                className={fieldClass}
                type="datetime-local"
                value={form.startsAt}
                onChange={(e) => setForm((f) => ({ ...f, startsAt: e.target.value }))}
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-gray-600">Ends at</span>
              <input
                className={fieldClass}
                type="datetime-local"
                value={form.endsAt}
                onChange={(e) => setForm((f) => ({ ...f, endsAt: e.target.value }))}
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-gray-600">Max redemptions (global)</span>
              <input
                className={fieldClass}
                type="number"
                min={0}
                placeholder="Unlimited"
                value={form.maxRedemptions}
                onChange={(e) =>
                  setForm((f) => ({ ...f, maxRedemptions: e.target.value }))
                }
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-gray-600">Max per customer</span>
              <input
                className={fieldClass}
                type="number"
                min={0}
                placeholder="1"
                value={form.maxPerCustomer}
                onChange={(e) =>
                  setForm((f) => ({ ...f, maxPerCustomer: e.target.value }))
                }
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-gray-600">Min subtotal ($)</span>
              <input
                className={fieldClass}
                type="number"
                min={0}
                step="0.01"
                placeholder="None"
                value={form.minSubtotal}
                onChange={(e) =>
                  setForm((f) => ({ ...f, minSubtotal: e.target.value }))
                }
              />
            </label>
            <label className="block text-sm sm:col-span-2">
              <span className="mb-1 block text-gray-600">Label / note</span>
              <input
                className={fieldClass}
                value={form.label}
                onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
                placeholder="Spring launch"
                maxLength={200}
              />
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700 pt-6">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) =>
                  setForm((f) => ({ ...f, isActive: e.target.checked }))
                }
                className="rounded border-gray-300 text-[#C9A063] focus:ring-[#C9A063]"
              />
              Active
            </label>
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              onClick={closeForm}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void save()}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-[#C9A063] px-4 py-2 text-sm font-medium text-white hover:bg-[#b8924f] disabled:opacity-60"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save
            </button>
          </div>
        </div>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-gray-500">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading…
          </div>
        ) : promotions.length === 0 ? (
          <div className="py-16 text-center text-sm text-gray-500">
            No promo codes yet. Create one to offer discounts in the mobile app.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-gray-100 bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Code</th>
                  <th className="px-4 py-3 font-medium">Discount</th>
                  <th className="px-4 py-3 font-medium">Uses</th>
                  <th className="px-4 py-3 font-medium">Window</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {promotions.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50/80">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-gray-900">{p.code}</div>
                      {p.label ? (
                        <div className="text-xs text-gray-500">{p.label}</div>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-gray-700">{formatDiscount(p)}</td>
                    <td className="px-4 py-3 text-gray-700">
                      {p.redeemedCount}
                      {p.maxRedemptions != null ? ` / ${p.maxRedemptions}` : ""}
                      {p.maxPerCustomer != null ? (
                        <span className="block text-xs text-gray-400">
                          max {p.maxPerCustomer}/customer
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {p.startsAt || p.endsAt ? (
                        <>
                          {p.startsAt
                            ? new Date(p.startsAt).toLocaleString()
                            : "—"}
                          {" → "}
                          {p.endsAt ? new Date(p.endsAt).toLocaleString() : "—"}
                        </>
                      ) : (
                        "Always"
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${
                          p.isActive
                            ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                            : "border-gray-200 bg-gray-50 text-gray-600"
                        }`}
                      >
                        {p.isActive ? "Active" : "Off"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          title={p.isActive ? "Deactivate" : "Activate"}
                          onClick={() => void toggleActive(p)}
                          className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
                        >
                          {p.isActive ? (
                            <ToggleRight className="h-4 w-4 text-emerald-600" />
                          ) : (
                            <ToggleLeft className="h-4 w-4" />
                          )}
                        </button>
                        <button
                          type="button"
                          title="Edit"
                          onClick={() => openEdit(p)}
                          className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          title="Delete"
                          onClick={() => void remove(p)}
                          className="rounded-lg p-2 text-red-500 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
