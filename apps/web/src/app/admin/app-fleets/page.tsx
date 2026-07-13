"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Car,
  Plus,
  Edit2,
  Trash2,
  Save,
  X,
  Upload,
  Loader2,
  Download,
  Smartphone,
  ImageIcon,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";

type AppFleetVehicle = {
  id: string;
  tierId: string;
  title: string;
  subtitle: string;
  description: string;
  image: string;
  group: string;
  category: string;
  seating: string;
  luggage: string;
  pricePerKm: number;
  hourlyRate: number;
  showOnHome: boolean;
  isActive: boolean;
  sortOrder: number;
};

type FormState = Omit<AppFleetVehicle, "id">;

const CATEGORIES = ["Sedan", "SUV", "Van", "Executive", "Coach"];
const GROUPS = [
  { value: "standard", label: "Standard" },
  { value: "executive", label: "Executive" },
];

const emptyForm: FormState = {
  tierId: "",
  title: "",
  subtitle: "",
  description: "",
  image: "",
  group: "standard",
  category: "Sedan",
  seating: "",
  luggage: "",
  pricePerKm: 0,
  hourlyRate: 0,
  showOnHome: true,
  isActive: true,
  sortOrder: 0,
};

const fieldClass =
  "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#C9A063]/30 focus:border-[#C9A063]";

export default function AppFleetsAdminPage() {
  const [vehicles, setVehicles] = useState<AppFleetVehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [filterGroup, setFilterGroup] = useState<"all" | "standard" | "executive">("all");

  const fetchVehicles = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/app-fleet");
      const data = await res.json();
      if (data.success) {
        setVehicles(data.vehicles || []);
      } else {
        setError(data.error || "Failed to load app fleet");
      }
    } catch {
      setError("Failed to connect to server");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVehicles();
  }, [fetchVehicles]);

  const filtered = useMemo(() => {
    if (filterGroup === "all") return vehicles;
    return vehicles.filter((v) => v.group === filterGroup);
  }, [filterGroup, vehicles]);

  const openAdd = () => {
    setIsAdding(true);
    setEditingId(null);
    setForm({
      ...emptyForm,
      sortOrder: vehicles.length + 1,
    });
  };

  const openEdit = (v: AppFleetVehicle) => {
    setIsAdding(false);
    setEditingId(v.id);
    setForm({
      tierId: v.tierId,
      title: v.title,
      subtitle: v.subtitle,
      description: v.description,
      image: v.image,
      group: v.group,
      category: v.category,
      seating: v.seating,
      luggage: v.luggage,
      pricePerKm: v.pricePerKm,
      hourlyRate: v.hourlyRate,
      showOnHome: v.showOnHome,
      isActive: v.isActive,
      sortOrder: v.sortOrder,
    });
  };

  const closeForm = () => {
    setIsAdding(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const handleUpload = async (file: File) => {
    setUploading(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (data.success && data.imageUrl) {
        setForm((prev) => ({ ...prev, image: data.imageUrl }));
        setMessage("Image uploaded");
        setTimeout(() => setMessage(""), 2500);
      } else {
        setError(data.error || "Upload failed");
      }
    } catch {
      setError("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!form.tierId.trim() || !form.title.trim()) {
      setError("Tier ID and title are required");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/admin/app-fleet", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingId ? { id: editingId, ...form } : form),
      });
      const data = await res.json();
      if (data.success) {
        closeForm();
        await fetchVehicles();
        setMessage(editingId ? "Vehicle updated" : "Vehicle created");
        setTimeout(() => setMessage(""), 2500);
      } else {
        setError(data.error || "Save failed");
      }
    } catch {
      setError("Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Delete "${title}" from app fleet?`)) return;
    try {
      const res = await fetch(`/api/admin/app-fleet?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        await fetchVehicles();
        if (editingId === id) closeForm();
      } else {
        setError(data.error || "Delete failed");
      }
    } catch {
      setError("Delete failed");
    }
  };

  const toggleField = async (v: AppFleetVehicle, field: "isActive" | "showOnHome") => {
    try {
      const res = await fetch("/api/admin/app-fleet", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...v, [field]: !v[field] }),
      });
      const data = await res.json();
      if (data.success) await fetchVehicles();
      else setError(data.error || "Update failed");
    } catch {
      setError("Update failed");
    }
  };

  const handleSeed = async () => {
    setSeeding(true);
    setError("");
    try {
      const res = await fetch("/api/admin/app-fleet/seed", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setMessage(data.message || "Seeded");
        await fetchVehicles();
        setTimeout(() => setMessage(""), 4000);
      } else {
        setError(data.error || "Seed failed");
      }
    } catch {
      setError("Seed failed");
    } finally {
      setSeeding(false);
    }
  };

  const showForm = isAdding || !!editingId;

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 text-[#C9A063] text-xs font-semibold uppercase tracking-wider mb-1">
            <Smartphone className="w-3.5 h-3.5" />
            Mobile app
          </div>
          <h1 className="text-2xl font-bold text-gray-900">App Fleets</h1>
          <p className="text-sm text-gray-500 mt-1 max-w-xl">
            Manage vehicles shown in the mobile app — titles, images, per-km & hourly pricing,
            standard/executive groups. Website Fleet Pricing stays separate.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleSeed}
            disabled={seeding}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-60"
          >
            {seeding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Seed defaults
          </button>
          <button
            type="button"
            onClick={openAdd}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-semibold rounded-lg bg-[#1C1C1E] text-white hover:bg-black"
          >
            <Plus className="w-4 h-4" />
            Add vehicle
          </button>
        </div>
      </div>

      {(error || message) && (
        <div
          className={`mb-4 rounded-xl px-4 py-3 text-sm ${
            error ? "bg-red-50 text-red-700 border border-red-100" : "bg-emerald-50 text-emerald-700 border border-emerald-100"
          }`}
        >
          {error || message}
        </div>
      )}

      <div className="flex items-center gap-2 mb-4">
        {(["all", "standard", "executive"] as const).map((g) => (
          <button
            key={g}
            type="button"
            onClick={() => setFilterGroup(g)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold capitalize transition-colors ${
              filterGroup === g
                ? "bg-[#C9A063] text-[#1a1a1a]"
                : "bg-white border border-gray-200 text-gray-600 hover:border-[#C9A063]/50"
            }`}
          >
            {g === "all" ? "All" : g}
          </button>
        ))}
        <span className="text-xs text-gray-400 ml-auto">{filtered.length} vehicles</span>
      </div>

      {showForm && (
        <div className="mb-6 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="text-base font-semibold text-gray-900">
              {editingId ? "Edit app vehicle" : "New app vehicle"}
            </h2>
            <button type="button" onClick={closeForm} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="space-y-1.5">
              <span className="text-xs font-semibold text-gray-500 uppercase">Tier ID *</span>
              <input
                value={form.tierId}
                onChange={(e) => setForm((p) => ({ ...p, tierId: e.target.value }))}
                placeholder="e.g. black-sedan"
                className={fieldClass}
              />
            </label>
            <label className="space-y-1.5">
              <span className="text-xs font-semibold text-gray-500 uppercase">Title *</span>
              <input
                value={form.title}
                onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                placeholder="BLACK SUV"
                className={fieldClass}
              />
            </label>
            <label className="space-y-1.5 md:col-span-2">
              <span className="text-xs font-semibold text-gray-500 uppercase">Subtitle</span>
              <input
                value={form.subtitle}
                onChange={(e) => setForm((p) => ({ ...p, subtitle: e.target.value }))}
                placeholder="Large SUV"
                className={fieldClass}
              />
            </label>
            <label className="space-y-1.5 md:col-span-2">
              <span className="text-xs font-semibold text-gray-500 uppercase">Description</span>
              <textarea
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                rows={2}
                className={fieldClass}
              />
            </label>
            <label className="space-y-1.5">
              <span className="text-xs font-semibold text-gray-500 uppercase">Group</span>
              <select
                value={form.group}
                onChange={(e) => setForm((p) => ({ ...p, group: e.target.value }))}
                className={fieldClass}
              >
                {GROUPS.map((g) => (
                  <option key={g.value} value={g.value}>
                    {g.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1.5">
              <span className="text-xs font-semibold text-gray-500 uppercase">Category</span>
              <select
                value={form.category}
                onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
                className={fieldClass}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1.5">
              <span className="text-xs font-semibold text-gray-500 uppercase">Price / km (CAD)</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.pricePerKm}
                onChange={(e) => setForm((p) => ({ ...p, pricePerKm: parseFloat(e.target.value) || 0 }))}
                className={fieldClass}
              />
            </label>
            <label className="space-y-1.5">
              <span className="text-xs font-semibold text-gray-500 uppercase">Hourly rate (CAD)</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.hourlyRate}
                onChange={(e) => setForm((p) => ({ ...p, hourlyRate: parseFloat(e.target.value) || 0 }))}
                className={fieldClass}
              />
            </label>
            <label className="space-y-1.5">
              <span className="text-xs font-semibold text-gray-500 uppercase">Seating</span>
              <input
                value={form.seating}
                onChange={(e) => setForm((p) => ({ ...p, seating: e.target.value }))}
                placeholder="6 maximum, 5 comfortable"
                className={fieldClass}
              />
            </label>
            <label className="space-y-1.5">
              <span className="text-xs font-semibold text-gray-500 uppercase">Luggage</span>
              <input
                value={form.luggage}
                onChange={(e) => setForm((p) => ({ ...p, luggage: e.target.value }))}
                placeholder="4 large, 4 medium"
                className={fieldClass}
              />
            </label>
            <label className="space-y-1.5">
              <span className="text-xs font-semibold text-gray-500 uppercase">Sort order</span>
              <input
                type="number"
                value={form.sortOrder}
                onChange={(e) => setForm((p) => ({ ...p, sortOrder: parseInt(e.target.value, 10) || 0 }))}
                className={fieldClass}
              />
            </label>
            <div className="flex items-end gap-4 pb-1">
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm((p) => ({ ...p, isActive: e.target.checked }))}
                  className="rounded border-gray-300 text-[#C9A063] focus:ring-[#C9A063]"
                />
                Active in app
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.showOnHome}
                  onChange={(e) => setForm((p) => ({ ...p, showOnHome: e.target.checked }))}
                  className="rounded border-gray-300 text-[#C9A063] focus:ring-[#C9A063]"
                />
                Show on home
              </label>
            </div>

            <div className="md:col-span-2 space-y-2">
              <span className="text-xs font-semibold text-gray-500 uppercase">Image</span>
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="w-full sm:w-44 h-28 rounded-xl border border-dashed border-gray-200 bg-gray-50 overflow-hidden flex items-center justify-center">
                  {form.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={form.image} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <ImageIcon className="w-8 h-8 text-gray-300" />
                  )}
                </div>
                <div className="flex-1 space-y-2">
                  <input
                    value={form.image}
                    onChange={(e) => setForm((p) => ({ ...p, image: e.target.value }))}
                    placeholder="Image URL or upload below"
                    className={fieldClass}
                  />
                  <label className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border border-gray-200 bg-white hover:bg-gray-50 cursor-pointer">
                    {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                    Upload image
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      className="hidden"
                      disabled={uploading}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) void handleUpload(file);
                        e.target.value = "";
                      }}
                    />
                  </label>
                </div>
              </div>
            </div>
          </div>
          <div className="px-5 py-4 border-t border-gray-100 flex justify-end gap-2 bg-gray-50">
            <button
              type="button"
              onClick={closeForm}
              className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-200 bg-white text-gray-700"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg bg-[#C9A063] text-[#1a1a1a] hover:bg-[#B8904F] disabled:opacity-60"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-gray-400">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 px-6">
            <Car className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-700">No app fleet vehicles yet</p>
            <p className="text-xs text-gray-400 mt-1 mb-4">
              Seed defaults or add vehicles manually for the mobile app.
            </p>
            <button
              type="button"
              onClick={handleSeed}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg bg-[#C9A063] text-[#1a1a1a]"
            >
              <Download className="w-4 h-4" />
              Seed defaults
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filtered.map((v) => (
              <div
                key={v.id}
                className={`flex flex-col sm:flex-row sm:items-center gap-4 px-4 py-4 ${
                  !v.isActive ? "opacity-55 bg-gray-50/80" : ""
                }`}
              >
                <div className="w-full sm:w-28 h-20 rounded-xl overflow-hidden bg-gray-100 shrink-0 border border-gray-100">
                  {v.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={v.image} alt={v.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon className="w-6 h-6 text-gray-300" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-semibold text-gray-900 truncate">{v.title}</h3>
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${
                        v.group === "executive"
                          ? "bg-amber-50 text-amber-800"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {v.group}
                    </span>
                    <span className="text-[10px] font-medium text-gray-400 font-mono">{v.tierId}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5 truncate">{v.subtitle || "—"}</p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-gray-600">
                    <span>
                      <strong className="text-gray-900">${v.pricePerKm.toFixed(2)}</strong>/km
                    </span>
                    <span>
                      <strong className="text-gray-900">${v.hourlyRate.toFixed(2)}</strong>/hr
                    </span>
                    <span className="text-gray-400">{v.category}</span>
                    <span className="text-gray-400">Order {v.sortOrder}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                  <button
                    type="button"
                    title={v.isActive ? "Active" : "Inactive"}
                    onClick={() => toggleField(v, "isActive")}
                    className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"
                  >
                    {v.isActive ? (
                      <ToggleRight className="w-5 h-5 text-emerald-600" />
                    ) : (
                      <ToggleLeft className="w-5 h-5" />
                    )}
                  </button>
                  <button
                    type="button"
                    title={v.showOnHome ? "Shown on home" : "Hidden from home"}
                    onClick={() => toggleField(v, "showOnHome")}
                    className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide border ${
                      v.showOnHome
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "border-gray-200 text-gray-400"
                    }`}
                  >
                    Home
                  </button>
                  <button
                    type="button"
                    onClick={() => openEdit(v)}
                    className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(v.id, v.title)}
                    className="p-2 rounded-lg hover:bg-red-50 text-red-500"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
