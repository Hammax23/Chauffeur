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
  DollarSign,
  Settings,
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

type PricingSettings = {
  baseDistanceKm: number;
  extraKmRate: number;
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
  const [pricingSettings, setPricingSettings] = useState<PricingSettings>({
    baseDistanceKm: 17,
    extraKmRate: 3.2,
  });
  const [savingSettings, setSavingSettings] = useState(false);

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

  const fetchPricingSettings = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/charges");
      const data = await res.json();
      if (data.success && data.charges) {
        const baseKm = data.charges.find((c: { chargeKey: string }) => c.chargeKey === "baseDistanceKm");
        const extraRate = data.charges.find((c: { chargeKey: string }) => c.chargeKey === "extraKmRate");
        setPricingSettings({
          baseDistanceKm: baseKm?.amount ?? 17,
          extraKmRate: extraRate?.amount ?? 3.2,
        });
      }
    } catch {
      /* keep defaults */
    }
  }, []);

  const savePricingSettings = async () => {
    setSavingSettings(true);
    setError("");
    try {
      await Promise.all([
        fetch("/api/admin/charges", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chargeKey: "baseDistanceKm",
            chargeName: "Base Distance (KM)",
            amount: pricingSettings.baseDistanceKm,
          }),
        }),
        fetch("/api/admin/charges", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chargeKey: "extraKmRate",
            chargeName: "Extra KM Rate",
            amount: pricingSettings.extraKmRate,
          }),
        }),
      ]);
      setMessage("Distance pricing settings saved");
      setTimeout(() => setMessage(""), 3000);
    } catch {
      setError("Failed to save pricing settings");
    } finally {
      setSavingSettings(false);
    }
  };

  useEffect(() => {
    fetchVehicles();
    fetchPricingSettings();
  }, [fetchVehicles, fetchPricingSettings]);

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
            Set mobile app vehicle pricing the same way as Fleet Pricing — hourly base rate,
            per-km, and shared distance settings (base km + extra km rate).
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
              <span className="text-xs font-semibold text-gray-500 uppercase flex items-center gap-1">
                <DollarSign className="w-3 h-3 text-emerald-600" />
                Hourly / Base Rate (CAD) *
              </span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.hourlyRate}
                onChange={(e) => setForm((p) => ({ ...p, hourlyRate: parseFloat(e.target.value) || 0 }))}
                className={fieldClass}
              />
              <span className="text-[11px] text-gray-400">
                Base price for distance bookings (first {pricingSettings.baseDistanceKm} km) and hourly bookings
              </span>
            </label>
            <label className="space-y-1.5">
              <span className="text-xs font-semibold text-gray-500 uppercase flex items-center gap-1">
                <DollarSign className="w-3 h-3 text-blue-600" />
                Price / km (CAD)
              </span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.pricePerKm}
                onChange={(e) => setForm((p) => ({ ...p, pricePerKm: parseFloat(e.target.value) || 0 }))}
                className={fieldClass}
              />
              <span className="text-[11px] text-gray-400">
                Shown in app; distance fare uses base rate + extra km settings below
              </span>
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
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Vehicle
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Group
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Hourly / Base
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Per KM
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((v) => (
                  <tr
                    key={v.id}
                    className={`hover:bg-gray-50/80 ${!v.isActive ? "opacity-55" : ""}`}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-16 h-10 rounded-lg overflow-hidden bg-gray-100 shrink-0 border border-gray-100">
                          {v.image ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={v.image} alt={v.title} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <ImageIcon className="w-4 h-4 text-gray-300" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium text-gray-900 truncate">{v.title}</div>
                          <div className="text-xs text-gray-500 font-mono truncate">{v.tierId}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${
                          v.group === "executive"
                            ? "bg-amber-50 text-amber-800"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {v.group}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-1 justify-end">
                        <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="font-semibold text-gray-900">{v.hourlyRate.toFixed(2)}</span>
                        <span className="text-xs text-gray-500">/hr</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-1 justify-end">
                        <DollarSign className="w-3.5 h-3.5 text-blue-600" />
                        <span className="font-semibold text-gray-900">{v.pricePerKm.toFixed(2)}</span>
                        <span className="text-xs text-gray-500">/km</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          title={v.isActive ? "Active" : "Inactive"}
                          onClick={() => toggleField(v, "isActive")}
                          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"
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
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => openEdit(v)}
                          className="p-2 rounded-lg hover:bg-gray-100 text-blue-600"
                          title="Edit pricing"
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
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Distance Pricing Settings — same keys as Fleet Pricing */}
      <div className="mt-6 bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-gray-900">
          <Settings className="w-5 h-5 text-[#C9A063]" />
          Distance Pricing Settings
        </h2>
        <p className="text-sm text-gray-500 mb-4">
          Shared with website Fleet Pricing. App distance fare = vehicle base rate for the first{" "}
          {pricingSettings.baseDistanceKm} km, then ${pricingSettings.extraKmRate.toFixed(2)} per extra km.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Base Distance (KM)</label>
            <input
              type="number"
              value={pricingSettings.baseDistanceKm}
              onChange={(e) =>
                setPricingSettings({
                  ...pricingSettings,
                  baseDistanceKm: parseFloat(e.target.value) || 0,
                })
              }
              className={fieldClass}
              min={0}
              step={1}
            />
            <p className="text-xs text-gray-500 mt-1">Vehicle base price covers up to this distance</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Extra KM Rate ($)</label>
            <input
              type="number"
              value={pricingSettings.extraKmRate}
              onChange={(e) =>
                setPricingSettings({
                  ...pricingSettings,
                  extraKmRate: parseFloat(e.target.value) || 0,
                })
              }
              className={fieldClass}
              min={0}
              step={0.1}
            />
            <p className="text-xs text-gray-500 mt-1">Charge per KM after base distance</p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-4">
          <button
            type="button"
            onClick={savePricingSettings}
            disabled={savingSettings}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 text-sm font-semibold"
          >
            {savingSettings ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {savingSettings ? "Saving..." : "Save Settings"}
          </button>
          <p className="text-sm text-gray-500">
            Example: {pricingSettings.baseDistanceKm} km = Base Rate ·{" "}
            {pricingSettings.baseDistanceKm + 10} km = Base + (10 × $
            {pricingSettings.extraKmRate.toFixed(2)})
          </p>
        </div>
      </div>

      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
        <h3 className="font-semibold text-blue-900 mb-2">How App Fleet Pricing Works</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>
            • <strong>Base Price:</strong> Each vehicle&apos;s hourly rate is the base for distance
            bookings (covers first {pricingSettings.baseDistanceKm} km)
          </li>
          <li>
            • <strong>Extra KM:</strong> After {pricingSettings.baseDistanceKm} km, $
            {pricingSettings.extraKmRate.toFixed(2)} is charged per additional km
          </li>
          <li>
            • <strong>Hourly Rate:</strong> Also used if you add hourly bookings in the app later
          </li>
          <li>
            • <strong>Active:</strong> Only active vehicles with a price appear in the mobile app
          </li>
        </ul>
      </div>
    </div>
  );
}
