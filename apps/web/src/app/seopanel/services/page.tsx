"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Plus, Loader2, RefreshCw, Briefcase, Pencil, Trash2, Save, X,
} from "lucide-react";

interface Service {
  id?: string;
  slug: string;
  title: string;
  shortDesc: string;
  description: string;
  features: string[];
  icon: string;
  isActive: boolean;
  sortOrder: number;
  source: "db" | "static";
}

const inputCls = "w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30";

export default function SeoServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [icons, setIcons] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [editing, setEditing] = useState<Service | null>(null);
  const [form, setForm] = useState({
    title: "", slug: "", shortDesc: "", description: "",
    features: "", icon: "Car", isActive: true, sortOrder: 0,
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const fetchServices = useCallback(async () => {
    const res = await fetch("/api/seopanel/services", { credentials: "include" });
    const data = await res.json();
    if (data.success) {
      setServices(data.services);
      setIcons(data.icons || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchServices(); }, [fetchServices]);

  const handleSeed = async () => {
    setSeeding(true);
    await fetch("/api/seopanel/services", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "seed" }),
    });
    await fetchServices();
    setSeeding(false);
    setMessage("Services imported from static data into database.");
  };

  const openCreate = () => {
    setEditing({ slug: "", title: "", shortDesc: "", description: "", features: [], icon: "Car", isActive: true, sortOrder: services.length, source: "db" });
    setForm({ title: "", slug: "", shortDesc: "", description: "", features: "", icon: "Car", isActive: true, sortOrder: services.length });
  };

  const openEdit = (service: Service) => {
    setEditing(service);
    setForm({
      title: service.title,
      slug: service.slug,
      shortDesc: service.shortDesc,
      description: service.description,
      features: service.features.join("\n"),
      icon: service.icon,
      isActive: service.isActive,
      sortOrder: service.sortOrder,
    });
  };

  const handleSave = async () => {
    if (!editing) return;
    setSaving(true);
    setMessage("");

    const payload = {
      ...form,
      features: form.features.split("\n").map((f) => f.trim()).filter(Boolean),
    };

    const isNew = !editing.id;
    const res = await fetch(
      isNew ? "/api/seopanel/services" : `/api/seopanel/services/${editing.id}`,
      {
        method: isNew ? "POST" : "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );
    const data = await res.json();
    if (!data.success) {
      setMessage(data.error || "Save failed");
      setSaving(false);
      return;
    }

    setEditing(null);
    await fetchServices();
    setSaving(false);
    setMessage(isNew ? "Service created." : "Service updated.");
  };

  const handleDelete = async (service: Service) => {
    if (!service.id || !confirm(`Delete "${service.title}"?`)) return;
    await fetch(`/api/seopanel/services/${service.id}`, { method: "DELETE", credentials: "include" });
    await fetchServices();
    setMessage("Service deleted.");
  };

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-emerald-600" /></div>;
  }

  const usingStatic = services.every((s) => s.source === "static");

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Service Manager</h1>
          <p className="text-gray-500 text-sm mt-1">Manage services shown on /services</p>
        </div>
        <div className="flex gap-2">
          {usingStatic && (
            <button onClick={handleSeed} disabled={seeding} className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50">
              {seeding ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              Import to Database
            </button>
          )}
          <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700">
            <Plus className="w-4 h-4" /> Add Service
          </button>
        </div>
      </div>

      {message && <div className="px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm">{message}</div>}

      {editing && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">{editing.id ? "Edit Service" : "New Service"}</h2>
            <button onClick={() => setEditing(null)} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4" /></button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
              <input className={inputCls} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Slug *</label>
              <input className={`${inputCls} font-mono`} value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Short Description *</label>
              <input className={inputCls} value={form.shortDesc} onChange={(e) => setForm({ ...form, shortDesc: e.target.value })} />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Description *</label>
              <textarea className={`${inputCls} min-h-[100px]`} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Features (one per line)</label>
              <textarea className={`${inputCls} min-h-[120px] font-mono`} value={form.features} onChange={(e) => setForm({ ...form, features: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Icon</label>
              <select className={inputCls} value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })}>
                {icons.map((icon) => <option key={icon} value={icon}>{icon}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-2 pt-7">
              <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="rounded" />
              <span className="text-sm text-gray-700">Active on site</span>
            </div>
          </div>
          <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 disabled:opacity-60">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Service
          </button>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Service</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden md:table-cell">Short Description</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Status</th>
              <th className="text-right px-4 py-3 font-semibold text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody>
            {services.map((service) => (
              <tr key={service.slug} className="border-b border-gray-50 hover:bg-gray-50/50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-emerald-600" />
                    <span className="font-medium text-gray-900">{service.title}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-500 hidden md:table-cell line-clamp-1">{service.shortDesc}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${service.isActive ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>
                    {service.isActive ? "Active" : "Hidden"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Link href={`/seopanel/pages/edit?path=${encodeURIComponent(`/services/${service.slug}`)}`} className="p-2 hover:bg-blue-50 rounded-lg text-blue-600 text-xs font-semibold">SEO</Link>
                    {service.id && (
                      <>
                        <button onClick={() => openEdit(service)} className="p-2 hover:bg-gray-100 rounded-lg text-gray-600"><Pencil className="w-4 h-4" /></button>
                        <button onClick={() => handleDelete(service)} className="p-2 hover:bg-red-50 rounded-lg text-red-600"><Trash2 className="w-4 h-4" /></button>
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
