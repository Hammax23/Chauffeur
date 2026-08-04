"use client";

import { useState, useEffect } from "react";
import {
  Car,
  Plus,
  Edit2,
  Trash2,
  DollarSign,
  Save,
  X,
  ImageIcon,
  Download,
  Upload,
  Loader2,
} from "lucide-react";

interface FleetVehicle {
  id: string;
  vehicleId: string;
  name: string;
  dropdownName: string;
  description: string;
  image: string;
  category: string;
  seating: string;
  luggage: string;
  basePrice: number;
  baseDistanceKm: number;
  extraKmRate: number;
  hourlyRate: number;
  pricePerKm: number;
  isActive: boolean;
  sortOrder: number;
}

type VehicleFormData = Omit<FleetVehicle, "id">;

const CATEGORIES = ["Sedan", "SUV", "Van", "Executive", "Coach"];

const DEFAULT_BASE_DISTANCE_KM = 17;
const DEFAULT_EXTRA_KM_RATE = 3.2;

const emptyVehicle: VehicleFormData = {
  vehicleId: "",
  name: "",
  dropdownName: "",
  description: "",
  image: "",
  category: "Sedan",
  seating: "",
  luggage: "",
  basePrice: 0,
  baseDistanceKm: DEFAULT_BASE_DISTANCE_KM,
  extraKmRate: DEFAULT_EXTRA_KM_RATE,
  hourlyRate: 0,
  pricePerKm: DEFAULT_EXTRA_KM_RATE,
  isActive: true,
  sortOrder: 0,
};

function resolveBaseDistanceKm(vehicle: FleetVehicle): number {
  return vehicle.baseDistanceKm || DEFAULT_BASE_DISTANCE_KM;
}

function resolveExtraKmRate(vehicle: FleetVehicle): number {
  return vehicle.extraKmRate || vehicle.pricePerKm || DEFAULT_EXTRA_KM_RATE;
}

export default function FleetManagementPage() {
  const [vehicles, setVehicles] = useState<FleetVehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingVehicle, setEditingVehicle] = useState<FleetVehicle | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [seedMessage, setSeedMessage] = useState("");
  const [uploading, setUploading] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [formData, setFormData] = useState<VehicleFormData>(emptyVehicle);

  const fetchVehicles = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/fleet");
      const data = await res.json();
      if (data.success) {
        setVehicles(data.vehicles);
      } else {
        setError(data.error || "Failed to fetch vehicles");
      }
    } catch {
      setError("Failed to fetch vehicles");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVehicles();
  }, []);

  const handleEdit = (vehicle: FleetVehicle) => {
    const extraKmRate = resolveExtraKmRate(vehicle);
    setEditingVehicle(vehicle);
    setFormData({
      vehicleId: vehicle.vehicleId,
      name: vehicle.name,
      dropdownName: vehicle.dropdownName,
      description: vehicle.description,
      image: vehicle.image,
      category: vehicle.category,
      seating: vehicle.seating,
      luggage: vehicle.luggage,
      basePrice: vehicle.basePrice ?? 0,
      baseDistanceKm: resolveBaseDistanceKm(vehicle),
      extraKmRate,
      hourlyRate: vehicle.hourlyRate,
      pricePerKm: extraKmRate,
      isActive: vehicle.isActive,
      sortOrder: vehicle.sortOrder,
    });
    setIsAddingNew(false);
  };

  const handleAddNew = () => {
    setIsAddingNew(true);
    setEditingVehicle(null);
    setFormData({ ...emptyVehicle, sortOrder: vehicles.length });
  };

  const handleCancel = () => {
    setIsAddingNew(false);
    setEditingVehicle(null);
    setFormData(emptyVehicle);
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");

    const payload = {
      ...formData,
      extraKmRate: formData.extraKmRate,
      pricePerKm: formData.extraKmRate,
    };

    try {
      const url = "/api/admin/fleet";
      const method = isAddingNew ? "POST" : "PUT";
      const body = isAddingNew ? payload : { id: editingVehicle?.id, ...payload };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (data.success) {
        await fetchVehicles();
        handleCancel();
      } else {
        setError(data.error || "Failed to save vehicle");
      }
    } catch {
      setError("Failed to save vehicle");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this vehicle?")) return;

    try {
      const res = await fetch(`/api/admin/fleet?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        await fetchVehicles();
      } else {
        setError(data.error || "Failed to delete vehicle");
      }
    } catch {
      setError("Failed to delete vehicle");
    }
  };

  const handleToggleActive = async (vehicle: FleetVehicle) => {
    try {
      const res = await fetch("/api/admin/fleet", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: vehicle.id, isActive: !vehicle.isActive }),
      });
      const data = await res.json();
      if (data.success) {
        await fetchVehicles();
      }
    } catch {
      setError("Failed to update vehicle");
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError("");

    try {
      const uploadData = new FormData();
      uploadData.append("file", file);

      const res = await fetch("/api/admin/upload", {
        method: "POST",
        body: uploadData,
      });
      const data = await res.json();

      if (data.success) {
        setFormData((prev) => ({ ...prev, image: data.imageUrl }));
        setSeedMessage("Image uploaded successfully!");
        setTimeout(() => setSeedMessage(""), 3000);
      } else {
        setError(data.error || "Failed to upload image");
      }
    } catch {
      setError("Failed to upload image");
    } finally {
      setUploading(false);
    }
  };

  const handleSeed = async () => {
    if (
      !confirm(
        "This will import all static fleet data into the database. Existing vehicles will be skipped. Continue?"
      )
    )
      return;

    setSeeding(true);
    setSeedMessage("");
    setError("");

    try {
      const res = await fetch("/api/admin/fleet/seed", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setSeedMessage(`Seeded ${data.vehiclesCreated} vehicles and ${data.chargesCreated} charges!`);
        await fetchVehicles();
      } else {
        setError(data.error || "Failed to seed data");
      }
    } catch {
      setError("Failed to seed data");
    } finally {
      setSeeding(false);
    }
  };

  const updateExtraKmRate = (value: number) => {
    setFormData((prev) => ({
      ...prev,
      extraKmRate: value,
      pricePerKm: value,
    }));
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Car className="w-8 h-8 text-amber-600" />
          <h1 className="text-2xl font-bold text-gray-900">Fleet Pricing</h1>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleSeed}
            disabled={seeding}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            {seeding ? "Importing..." : "Import Static Data"}
          </button>
          <button
            onClick={handleAddNew}
            className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Vehicle
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      {seedMessage && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg">
          ✓ {seedMessage}
        </div>
      )}

      {/* Add/Edit Form */}
      {(isAddingNew || editingVehicle) && (
        <div className="mb-6 bg-white rounded-xl shadow-lg border p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            {isAddingNew ? <Plus className="w-5 h-5" /> : <Edit2 className="w-5 h-5" />}
            {isAddingNew ? "Add New Vehicle" : "Edit Vehicle"}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle ID*</label>
              <input
                type="text"
                value={formData.vehicleId}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    vehicleId: e.target.value.toLowerCase().replace(/\s+/g, "-"),
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-gray-900 bg-white"
                placeholder="e.g. cadillac-xts"
                disabled={!!editingVehicle}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name*</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-gray-900 bg-white"
                placeholder="e.g. Cadillac XTS"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Dropdown Name*</label>
              <input
                type="text"
                value={formData.dropdownName}
                onChange={(e) => setFormData({ ...formData, dropdownName: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-gray-900 bg-white"
                placeholder="e.g. LUXURY SEDAN"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category*</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-gray-900 bg-white"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Seating</label>
              <input
                type="text"
                value={formData.seating}
                onChange={(e) => setFormData({ ...formData, seating: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-gray-900 bg-white"
                placeholder="e.g. 3 maximum, 3 comfortable"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Luggage</label>
              <input
                type="text"
                value={formData.luggage}
                onChange={(e) => setFormData({ ...formData, luggage: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-gray-900 bg-white"
                placeholder="e.g. 2 large, 2 medium"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sort Order</label>
              <input
                type="number"
                value={formData.sortOrder}
                onChange={(e) =>
                  setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-gray-900 bg-white"
                min="0"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle Image</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={formData.image}
                  onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-gray-900 bg-white"
                  placeholder="/fleet/vehicle.png or https://..."
                />
                <label className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer disabled:opacity-50">
                  {uploading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4" />
                  )}
                  {uploading ? "Uploading..." : "Upload"}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    onChange={handleImageUpload}
                    className="hidden"
                    disabled={uploading}
                  />
                </label>
              </div>
              {formData.image && (
                <div className="mt-2 flex items-center gap-2">
                  <img
                    src={formData.image}
                    alt="Preview"
                    className="w-16 h-12 object-cover rounded border"
                  />
                  <span className="text-xs text-gray-500">{formData.image}</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="w-4 h-4 text-amber-600 border-gray-300 rounded focus:ring-amber-500"
              />
              <label htmlFor="isActive" className="text-sm font-medium text-gray-700">
                Active
              </label>
            </div>

            <div className="lg:col-span-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-gray-900 bg-white"
                rows={2}
                placeholder="Vehicle description..."
              />
            </div>
          </div>

          {/* Per-vehicle distance pricing */}
          <div className="mt-6 p-4 bg-amber-50 border-2 border-amber-200 rounded-xl">
            <h3 className="text-sm font-semibold text-amber-900 mb-3 flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Distance pricing (this vehicle only)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Base Price ($)*
                </label>
                <input
                  type="number"
                  value={formData.basePrice}
                  onChange={(e) =>
                    setFormData({ ...formData, basePrice: parseFloat(e.target.value) || 0 })
                  }
                  className="w-full px-3 py-2 border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-gray-900 bg-white"
                  min="0"
                  step="0.01"
                />
                <p className="text-xs text-amber-800 mt-1">
                  Flat fare for the first {formData.baseDistanceKm} km
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Base Distance (KM)*
                </label>
                <input
                  type="number"
                  value={formData.baseDistanceKm}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      baseDistanceKm: parseFloat(e.target.value) || DEFAULT_BASE_DISTANCE_KM,
                    })
                  }
                  className="w-full px-3 py-2 border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-gray-900 bg-white"
                  min="0"
                  step="1"
                />
                <p className="text-xs text-amber-800 mt-1">Included distance in base price</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Extra KM Rate ($)*
                </label>
                <input
                  type="number"
                  value={formData.extraKmRate}
                  onChange={(e) => updateExtraKmRate(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-gray-900 bg-white"
                  min="0"
                  step="0.1"
                />
                <p className="text-xs text-amber-800 mt-1">Per km after base distance</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Hourly Rate ($ / hour)*
                </label>
                <input
                  type="number"
                  value={formData.hourlyRate}
                  onChange={(e) =>
                    setFormData({ ...formData, hourlyRate: parseFloat(e.target.value) || 0 })
                  }
                  className="w-full px-3 py-2 border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-gray-900 bg-white"
                  min="0"
                  step="0.01"
                />
                <p className="text-xs text-amber-800 mt-1">Hourly bookings only (min 3 hours)</p>
              </div>
            </div>
            <p className="mt-3 text-sm text-amber-900">
              Example: {formData.baseDistanceKm} km trip = ${formData.basePrice.toFixed(2)} base
              price, {formData.baseDistanceKm + 10} km trip = $
              {(formData.basePrice + 10 * formData.extraKmRate).toFixed(2)} (base + 10 × $
              {formData.extraKmRate.toFixed(2)})
            </p>
          </div>

          <div className="flex gap-3 mt-4">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving ? "Saving..." : "Save"}
            </button>
            <button
              onClick={handleCancel}
              className="flex items-center gap-2 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
              <X className="w-4 h-4" />
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Vehicles Table */}
      <div className="bg-white rounded-xl shadow-lg border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Vehicle
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Base Price
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Base KM
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Extra $/KM
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Hourly
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {vehicles.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                    <Car className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                    <p>No vehicles found. Add your first vehicle to get started.</p>
                  </td>
                </tr>
              ) : (
                vehicles.map((vehicle) => {
                  const baseKm = resolveBaseDistanceKm(vehicle);
                  const extraRate = resolveExtraKmRate(vehicle);

                  return (
                    <tr
                      key={vehicle.id}
                      className={`hover:bg-gray-50 ${!vehicle.isActive ? "opacity-50" : ""}`}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {vehicle.image ? (
                            <img
                              src={vehicle.image}
                              alt={vehicle.name}
                              className="w-16 h-10 object-cover rounded"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = "none";
                              }}
                            />
                          ) : (
                            <div className="w-16 h-10 bg-gray-200 rounded flex items-center justify-center">
                              <ImageIcon className="w-5 h-5 text-gray-400" />
                            </div>
                          )}
                          <div>
                            <div className="font-medium text-gray-900">{vehicle.name}</div>
                            <div className="text-xs text-gray-500">{vehicle.vehicleId}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 text-xs font-medium bg-amber-100 text-amber-800 rounded">
                          {vehicle.category}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <DollarSign className="w-4 h-4 text-green-600" />
                          <span className="font-semibold text-gray-900">
                            {vehicle.basePrice.toFixed(2)}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="font-semibold text-gray-900">{baseKm}</span>
                        <span className="text-xs text-gray-500 ml-1">km</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <DollarSign className="w-4 h-4 text-amber-600" />
                          <span className="font-semibold text-gray-900">{extraRate.toFixed(2)}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <DollarSign className="w-4 h-4 text-blue-600" />
                          <span className="font-semibold text-gray-900">
                            {vehicle.hourlyRate.toFixed(2)}
                          </span>
                          <span className="text-xs text-gray-500">/hr</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => handleToggleActive(vehicle)}
                          className={`px-3 py-1 text-xs font-medium rounded-full ${
                            vehicle.isActive
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {vehicle.isActive ? "Active" : "Inactive"}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleEdit(vehicle)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(vehicle.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Help Text */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="font-semibold text-blue-900 mb-2">How Fleet Pricing Works</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>
            • <strong>Per-vehicle pricing:</strong> Each vehicle has its own base price, base
            distance, and extra km rate — there are no global distance pricing settings.
          </li>
          <li>
            • <strong>Base Price:</strong> Flat fare for distance bookings covering the first X km
            (set per vehicle)
          </li>
          <li>
            • <strong>Extra KM:</strong> After the vehicle&apos;s base distance, the extra km rate
            is charged per additional km
          </li>
          <li>
            • <strong>Hourly Rate:</strong> Separate — used only for hourly bookings (minimum 3
            hours)
          </li>
          <li>
            • <strong>Active:</strong> Only active vehicles appear in the reservation form
          </li>
        </ul>
      </div>
    </div>
  );
}
