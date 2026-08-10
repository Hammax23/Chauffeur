// @ts-nocheck
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Plus, Pencil, X, Trash2 } from "lucide-react";

type Profile = {
  id: string;
  driverId: string;
  membershipStatus: string;
  membershipExpiresAt: string | null;
  vehicleClass: string;
  vehicleLabel: string;
  availability: string;
  referralEarnings: number;
  driver: {
    id: string;
    driverId: string;
    name: string;
    email: string;
    phone: string;
    vehicle?: string;
  };
};

type DriverOption = { id: string; name: string; email: string; driverId: string };

export default function ConciergeDriversPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [drivers, setDrivers] = useState<DriverOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Profile | null>(null);
  const [form, setForm] = useState({
    driverId: "",
    membershipStatus: "ACTIVE",
    membershipExpiresAt: "",
    vehicleClass: "SEDAN",
    vehicleLabel: "",
    availability: "OFFLINE",
    referralEarnings: 0,
  });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const [pRes, dRes] = await Promise.all([
        fetch("/api/admin/concierge/drivers"),
        fetch("/api/admin/drivers"),
      ]);
      const pData = await pRes.json();
      const dData = await dRes.json();
      if (pData.success) setProfiles(pData.drivers || []);
      if (dData.success) setDrivers(dData.drivers || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function openEnroll() {
    setEditing(null);
    setForm({
      driverId: "",
      membershipStatus: "ACTIVE",
      membershipExpiresAt: "",
      vehicleClass: "SEDAN",
      vehicleLabel: "",
      availability: "OFFLINE",
      referralEarnings: 0,
    });
    setModal(true);
  }

  function openEdit(p: Profile) {
    setEditing(p);
    setForm({
      driverId: p.driverId,
      membershipStatus: p.membershipStatus,
      membershipExpiresAt: p.membershipExpiresAt
        ? p.membershipExpiresAt.slice(0, 10)
        : "",
      vehicleClass: p.vehicleClass,
      vehicleLabel: p.vehicleLabel,
      availability: p.availability === "BUSY" ? "BUSY" : p.availability,
      referralEarnings: p.referralEarnings,
    });
    setModal(true);
  }

  async function save() {
    setSaving(true);
    try {
      const body = editing
        ? {
            id: editing.id,
            membershipStatus: form.membershipStatus,
            membershipExpiresAt: form.membershipExpiresAt || null,
            vehicleClass: form.vehicleClass,
            vehicleLabel: form.vehicleLabel,
            availability: form.availability === "BUSY" ? undefined : form.availability,
            referralEarnings: form.referralEarnings,
          }
        : {
            driverId: form.driverId,
            membershipStatus: form.membershipStatus,
            membershipExpiresAt: form.membershipExpiresAt || null,
            vehicleClass: form.vehicleClass,
            vehicleLabel: form.vehicleLabel,
          };
      const res = await fetch("/api/admin/concierge/drivers", {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
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

  async function unenroll(id: string, name: string) {
    if (!confirm(`Unenroll ${name} from Hotel Concierge?`)) return;
    const res = await fetch(`/api/admin/concierge/drivers?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    const data = await res.json();
    if (!data.success) {
      alert(data.error || "Unenroll failed");
      return;
    }
    load();
  }

  const enrolledIds = new Set(profiles.map((p) => p.driverId));
  const availableDrivers = drivers.filter((d) => !enrolledIds.has(d.id));

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
          <h1 className="text-2xl font-bold text-gray-900">Concierge drivers</h1>
          <p className="text-sm text-gray-500 mt-1">Membership, vehicle class, and availability.</p>
        </div>
        <button
          type="button"
          onClick={openEnroll}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#C9A063] text-white text-sm font-medium"
        >
          <Plus className="w-4 h-4" /> Enroll driver
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-500">
            <tr>
              <th className="px-4 py-3">Driver</th>
              <th className="px-4 py-3">Class</th>
              <th className="px-4 py-3">Membership</th>
              <th className="px-4 py-3">Availability</th>
              <th className="px-4 py-3">Referral $</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {profiles.map((p) => (
              <tr key={p.id} className="border-t border-gray-50">
                <td className="px-4 py-3">
                  <div className="font-medium">{p.driver.name}</div>
                  <div className="text-xs text-gray-400">{p.driver.email}</div>
                </td>
                <td className="px-4 py-3">
                  {p.vehicleClass}
                  {p.vehicleLabel ? ` · ${p.vehicleLabel}` : ""}
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-1 rounded-full ${p.membershipStatus === "ACTIVE" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                    {p.membershipStatus}
                  </span>
                  {p.membershipExpiresAt && (
                    <div className="text-xs text-gray-400 mt-1">
                      Exp {new Date(p.membershipExpiresAt).toLocaleDateString()}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3">{p.availability}</td>
                <td className="px-4 py-3">${p.referralEarnings.toFixed(2)}</td>
                <td className="px-4 py-3 text-right space-x-1">
                  <button type="button" onClick={() => openEdit(p)} className="p-1.5 hover:bg-gray-100 rounded-lg">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => unenroll(p.id, p.driver.name)}
                    className="p-1.5 hover:bg-red-50 rounded-lg"
                    title="Unenroll"
                  >
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
              <h2 className="text-lg font-semibold">{editing ? "Edit profile" : "Enroll driver"}</h2>
              <button type="button" onClick={() => setModal(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3">
              {!editing && (
                <select
                  className="w-full border rounded-xl px-3 py-2 text-sm"
                  value={form.driverId}
                  onChange={(e) => setForm({ ...form, driverId: e.target.value })}
                >
                  <option value="">Select driver</option>
                  {availableDrivers.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.driverId})
                    </option>
                  ))}
                </select>
              )}
              <select
                className="w-full border rounded-xl px-3 py-2 text-sm"
                value={form.membershipStatus}
                onChange={(e) => setForm({ ...form, membershipStatus: e.target.value })}
              >
                <option value="ACTIVE">ACTIVE</option>
                <option value="EXPIRED">EXPIRED</option>
              </select>
              <label className="block text-sm text-gray-600">
                Membership expires
                <input
                  type="date"
                  className="mt-1 w-full border rounded-xl px-3 py-2 text-sm"
                  value={form.membershipExpiresAt}
                  onChange={(e) => setForm({ ...form, membershipExpiresAt: e.target.value })}
                />
              </label>
              <select
                className="w-full border rounded-xl px-3 py-2 text-sm"
                value={form.vehicleClass}
                onChange={(e) => setForm({ ...form, vehicleClass: e.target.value })}
              >
                <option value="SEDAN">SEDAN</option>
                <option value="SUV">SUV</option>
                <option value="CADILLAC">CADILLAC</option>
              </select>
              <input
                className="w-full border rounded-xl px-3 py-2 text-sm"
                placeholder="Vehicle label (e.g. GMC Yukon)"
                value={form.vehicleLabel}
                onChange={(e) => setForm({ ...form, vehicleLabel: e.target.value })}
              />
              {editing && form.availability !== "BUSY" && (
                <select
                  className="w-full border rounded-xl px-3 py-2 text-sm"
                  value={form.availability}
                  onChange={(e) => setForm({ ...form, availability: e.target.value })}
                >
                  <option value="ONLINE">ONLINE</option>
                  <option value="OFFLINE">OFFLINE</option>
                </select>
              )}
              {editing && (
                <label className="block text-sm text-gray-600">
                  Referral earnings (placeholder)
                  <input
                    type="number"
                    className="mt-1 w-full border rounded-xl px-3 py-2 text-sm"
                    value={form.referralEarnings}
                    onChange={(e) => setForm({ ...form, referralEarnings: Number(e.target.value) })}
                  />
                </label>
              )}
            </div>
            <button
              type="button"
              disabled={saving}
              onClick={save}
              className="mt-5 w-full py-2.5 rounded-xl bg-[#C9A063] text-white font-medium"
            >
              Save
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
