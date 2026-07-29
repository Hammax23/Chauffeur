"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Plus, Pencil, Trash2, X } from "lucide-react";

type Hotel = {
  id: string;
  name: string;
  address: string;
  city: string;
  phone: string;
  email: string;
  commissionPercent: number;
  isActive: boolean;
  _count?: { concierges: number; rideRequests: number };
};

const empty = {
  name: "",
  address: "",
  city: "",
  phone: "",
  email: "",
  commissionPercent: 10,
  isActive: true,
};

export default function ConciergeHotelsPage() {
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Hotel | null>(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/concierge/hotels");
      const data = await res.json();
      if (data.success) setHotels(data.hotels || []);
      else setError(data.error || "Failed");
    } catch {
      setError("Failed to connect");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function openCreate() {
    setEditing(null);
    setForm(empty);
    setModal(true);
  }

  function openEdit(h: Hotel) {
    setEditing(h);
    setForm({
      name: h.name,
      address: h.address,
      city: h.city,
      phone: h.phone,
      email: h.email,
      commissionPercent: h.commissionPercent,
      isActive: h.isActive,
    });
    setModal(true);
  }

  async function save() {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/concierge/hotels", {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editing ? { id: editing.id, ...form } : form),
      });
      const data = await res.json();
      if (!data.success) {
        alert(data.error || "Save failed");
        return;
      }
      setModal(false);
      load();
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this hotel?")) return;
    await fetch(`/api/admin/concierge/hotels?id=${id}`, { method: "DELETE" });
    load();
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#C9A063]" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8">
      <Link href="/admin/concierge" className="inline-flex items-center gap-1 text-sm text-gray-500 mb-4 hover:text-gray-800">
        <ArrowLeft className="w-4 h-4" /> Concierge
      </Link>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Hotels</h1>
          <p className="text-gray-500 text-sm mt-1">Commission % is paid by drivers to the hotel (offline confirm).</p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#C9A063] text-white text-sm font-medium"
        >
          <Plus className="w-4 h-4" /> Add hotel
        </button>
      </div>

      {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-500">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">City</th>
              <th className="px-4 py-3">Commission %</th>
              <th className="px-4 py-3">Staff</th>
              <th className="px-4 py-3">Trips</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {hotels.map((h) => (
              <tr key={h.id} className="border-t border-gray-50">
                <td className="px-4 py-3 font-medium">{h.name}</td>
                <td className="px-4 py-3">{h.city || "—"}</td>
                <td className="px-4 py-3">{h.commissionPercent}%</td>
                <td className="px-4 py-3">{h._count?.concierges ?? 0}</td>
                <td className="px-4 py-3">{h._count?.rideRequests ?? 0}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-1 rounded-full ${h.isActive ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                    {h.isActive ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right space-x-2">
                  <button type="button" onClick={() => openEdit(h)} className="p-1.5 hover:bg-gray-100 rounded-lg">
                    <Pencil className="w-4 h-4 text-gray-600" />
                  </button>
                  <button type="button" onClick={() => remove(h.id)} className="p-1.5 hover:bg-red-50 rounded-lg">
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">{editing ? "Edit hotel" : "Add hotel"}</h2>
              <button type="button" onClick={() => setModal(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3">
              {(["name", "address", "city", "phone", "email"] as const).map((k) => (
                <input
                  key={k}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm"
                  placeholder={k.charAt(0).toUpperCase() + k.slice(1)}
                  value={form[k]}
                  onChange={(e) => setForm({ ...form, [k]: e.target.value })}
                />
              ))}
              <label className="block text-sm text-gray-600">
                Commission %
                <input
                  type="number"
                  min={0}
                  step={0.1}
                  className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm"
                  value={form.commissionPercent}
                  onChange={(e) => setForm({ ...form, commissionPercent: Number(e.target.value) })}
                />
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                />
                Active
              </label>
            </div>
            <button
              type="button"
              disabled={saving || !form.name.trim()}
              onClick={save}
              className="mt-5 w-full py-2.5 rounded-xl bg-[#C9A063] text-white font-medium disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
