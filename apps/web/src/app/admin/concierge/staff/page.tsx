// @ts-nocheck
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Plus, Pencil, Trash2, X } from "lucide-react";

type Hotel = { id: string; name: string };
type Staff = {
  id: string;
  name: string;
  email: string;
  phone: string;
  isActive: boolean;
  hotelId: string;
  hotelName: string;
};

export default function ConciergeStaffPage() {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Staff | null>(null);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    hotelId: "",
    isActive: true,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setError("");
      const [sRes, hRes] = await Promise.all([
        fetch("/api/admin/concierge/staff", { credentials: "include" }),
        fetch("/api/admin/concierge/hotels", { credentials: "include" }),
      ]);
      const sData = await sRes.json().catch(() => ({}));
      const hData = await hRes.json().catch(() => ({}));
      if (sData.success) setStaff(sData.staff || []);
      else setError(sData.error || "Failed to load staff");
      if (hData.success) setHotels(hData.hotels || []);
      else if (sData.success) {
        setError(hData.error || "Failed to load hotels for staff form");
      }
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
    setForm({
      name: "",
      email: "",
      phone: "",
      password: "",
      hotelId: hotels[0]?.id || "",
      isActive: true,
    });
    setModal(true);
  }

  function openEdit(s: Staff) {
    setEditing(s);
    setForm({
      name: s.name,
      email: s.email,
      phone: s.phone,
      password: "",
      hotelId: s.hotelId,
      isActive: s.isActive,
    });
    setModal(true);
  }

  async function save() {
    if (!form.hotelId.trim()) {
      alert("Select a hotel first");
      return;
    }
    if (!editing && !form.password.trim()) {
      alert("Password is required");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/concierge/staff", {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editing ? { id: editing.id, ...form } : form),
      });
      const data = await res.json().catch(() => ({}));
      if (!data.success) {
        alert(data.error || "Save failed");
        return;
      }
      setModal(false);
      load();
    } catch {
      alert("Failed to connect");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this concierge?")) return;
    try {
      const res = await fetch(`/api/admin/concierge/staff?id=${id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!data.success) {
        alert(data.error || "Delete failed");
        return;
      }
      load();
    } catch {
      alert("Failed to connect");
    }
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
        <h1 className="text-2xl font-bold text-gray-900">Concierge staff</h1>
        <button
          type="button"
          onClick={openCreate}
          disabled={hotels.length === 0}
          title={hotels.length === 0 ? "Add a hotel first" : undefined}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#C9A063] text-white text-sm font-medium disabled:opacity-50"
        >
          <Plus className="w-4 h-4" /> Add staff
        </button>
      </div>

      {error ? <p className="mb-4 text-sm text-red-600">{error}</p> : null}

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-500">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Hotel</th>
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {staff.map((s) => (
              <tr key={s.id} className="border-t border-gray-50">
                <td className="px-4 py-3 font-medium">{s.name}</td>
                <td className="px-4 py-3">{s.email}</td>
                <td className="px-4 py-3">{s.hotelName}</td>
                <td className="px-4 py-3">{s.phone || "—"}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-1 rounded-full ${s.isActive ? "bg-green-50 text-green-700" : "bg-gray-100"}`}>
                    {s.isActive ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right space-x-2">
                  <button type="button" onClick={() => openEdit(s)} className="p-1.5 hover:bg-gray-100 rounded-lg">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button type="button" onClick={() => remove(s.id)} className="p-1.5 hover:bg-red-50 rounded-lg">
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
          <div className="bg-white rounded-2xl w-full max-w-lg p-6">
            <div className="flex justify-between mb-4">
              <h2 className="text-lg font-semibold">{editing ? "Edit staff" : "Add staff"}</h2>
              <button type="button" onClick={() => setModal(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3">
              <input className="w-full border rounded-xl px-3 py-2 text-sm" placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <input className="w-full border rounded-xl px-3 py-2 text-sm" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              <input className="w-full border rounded-xl px-3 py-2 text-sm" placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              <input
                className="w-full border rounded-xl px-3 py-2 text-sm"
                placeholder={editing ? "New password (optional)" : "Password"}
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
              <select
                className="w-full border rounded-xl px-3 py-2 text-sm"
                value={form.hotelId}
                onChange={(e) => setForm({ ...form, hotelId: e.target.value })}
              >
                <option value="">Select hotel</option>
                {hotels.map((h) => (
                  <option key={h.id} value={h.id}>{h.name}</option>
                ))}
              </select>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
                Active
              </label>
            </div>
            {hotels.length === 0 ? (
              <p className="mt-3 text-sm text-amber-700">Add a hotel first before creating staff.</p>
            ) : null}
            <button
              type="button"
              disabled={saving || !form.hotelId.trim() || !form.name.trim() || !form.email.trim() || (!editing && !form.password.trim())}
              onClick={save}
              className="mt-5 w-full py-2.5 rounded-xl bg-[#C9A063] text-white font-medium disabled:opacity-50"
            >
              Save
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
