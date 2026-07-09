"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Plus, Loader2, RefreshCw, MapPin, Pencil, Trash2, Save, X,
} from "lucide-react";

interface City {
  id?: string;
  slug: string;
  label: string;
  isActive: boolean;
  sortOrder: number;
  description?: string | null;
  source: "db" | "static";
}

const inputCls = "w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30";

export default function SeoCitiesPage() {
  const [cities, setCities] = useState<City[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [editing, setEditing] = useState<City | null>(null);
  const [form, setForm] = useState({ label: "", slug: "", description: "", isActive: true, sortOrder: 0 });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const fetchCities = useCallback(async () => {
    const res = await fetch("/api/seopanel/cities", { credentials: "include" });
    const data = await res.json();
    if (data.success) setCities(data.cities);
    setLoading(false);
  }, []);

  useEffect(() => { fetchCities(); }, [fetchCities]);

  const handleSeed = async () => {
    setSeeding(true);
    await fetch("/api/seopanel/cities", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "seed" }),
    });
    await fetchCities();
    setSeeding(false);
    setMessage("Cities imported from static data into database.");
  };

  const openCreate = () => {
    setEditing({ slug: "", label: "", isActive: true, sortOrder: cities.length, source: "db" });
    setForm({ label: "", slug: "", description: "", isActive: true, sortOrder: cities.length });
  };

  const openEdit = (city: City) => {
    setEditing(city);
    setForm({
      label: city.label,
      slug: city.slug,
      description: city.description || "",
      isActive: city.isActive,
      sortOrder: city.sortOrder,
    });
  };

  const handleSave = async () => {
    if (!editing) return;
    setSaving(true);
    setMessage("");

    const isNew = !editing.id;
    const res = await fetch(
      isNew ? "/api/seopanel/cities" : `/api/seopanel/cities/${editing.id}`,
      {
        method: isNew ? "POST" : "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      }
    );
    const data = await res.json();
    if (!data.success) {
      setMessage(data.error || "Save failed");
      setSaving(false);
      return;
    }

    setEditing(null);
    await fetchCities();
    setSaving(false);
    setMessage(isNew ? "City created." : "City updated.");
  };

  const handleDelete = async (city: City) => {
    if (!city.id || !confirm(`Delete "${city.label}"?`)) return;
    await fetch(`/api/seopanel/cities/${city.id}`, { method: "DELETE", credentials: "include" });
    await fetchCities();
    setMessage("City deleted.");
  };

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-emerald-600" /></div>;
  }

  const usingStatic = cities.every((c) => c.source === "static");

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">City Manager</h1>
          <p className="text-gray-500 text-sm mt-1">Manage cities shown on /cities-we-serve</p>
        </div>
        <div className="flex gap-2">
          {usingStatic && (
            <button onClick={handleSeed} disabled={seeding} className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50">
              {seeding ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              Import to Database
            </button>
          )}
          <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700">
            <Plus className="w-4 h-4" /> Add City
          </button>
        </div>
      </div>

      {message && <div className="px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm">{message}</div>}
      {usingStatic && (
        <div className="px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm">
          Cities are currently loaded from static code. Click <strong>Import to Database</strong> to enable full panel management.
        </div>
      )}

      {editing && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">{editing.id ? "Edit City" : "New City"}</h2>
            <button onClick={() => setEditing(null)} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4" /></button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Label *</label>
              <input className={inputCls} value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Slug *</label>
              <input className={`${inputCls} font-mono`} value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sort Order</label>
              <input type="number" className={inputCls} value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })} />
            </div>
            <div className="flex items-center gap-2 pt-7">
              <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="rounded" />
              <span className="text-sm text-gray-700">Active on site</span>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label>
            <textarea className={`${inputCls} min-h-[80px]`} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 disabled:opacity-60">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save City
          </button>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">City</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden sm:table-cell">Slug</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Status</th>
              <th className="text-right px-4 py-3 font-semibold text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody>
            {cities.map((city) => (
              <tr key={city.slug} className="border-b border-gray-50 hover:bg-gray-50/50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-emerald-600" />
                    <span className="font-medium text-gray-900">{city.label}</span>
                  </div>
                </td>
                <td className="px-4 py-3 font-mono text-gray-500 hidden sm:table-cell">{city.slug}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${city.isActive ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>
                    {city.isActive ? "Active" : "Hidden"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Link href={`/seopanel/pages/edit?path=${encodeURIComponent(`/cities-we-serve/${city.slug}`)}`} className="p-2 hover:bg-blue-50 rounded-lg text-blue-600" title="Edit SEO">
                      SEO
                    </Link>
                    {city.id && (
                      <>
                        <button onClick={() => openEdit(city)} className="p-2 hover:bg-gray-100 rounded-lg text-gray-600"><Pencil className="w-4 h-4" /></button>
                        <button onClick={() => handleDelete(city)} className="p-2 hover:bg-red-50 rounded-lg text-red-600"><Trash2 className="w-4 h-4" /></button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
