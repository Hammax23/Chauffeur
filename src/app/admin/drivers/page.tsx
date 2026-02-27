"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Plus, Search, Phone, Mail, Car, Star,
  Loader2, AlertCircle, Edit2, Trash2, X, Check,
  User, MapPin, ClipboardList, Camera, Upload
} from "lucide-react";
import Image from "next/image";

interface Reservation {
  bookingId: string;
  firstName: string;
  lastName: string;
  serviceDate: string;
  serviceTime: string;
  pickupLocation: string;
  dropoffLocation: string;
  vehicle: string;
  assignedDriverId: string | null;
}

interface Driver {
  id: string;
  name: string;
  phone: string;
  email: string;
  vehicle: string;
  vehiclePlate: string;
  status: "available" | "on_trip" | "offline";
  photo?: string;
  rating: number;
  totalTrips: number;
  createdAt: string;
}

const STATUS_COLORS = {
  available: { bg: "bg-green-100", text: "text-green-700", dot: "bg-green-500" },
  on_trip: { bg: "bg-blue-100", text: "text-blue-700", dot: "bg-blue-500" },
  offline: { bg: "bg-gray-100", text: "text-gray-500", dot: "bg-gray-400" },
};

const STATUS_LABELS = {
  available: "Available",
  on_trip: "On Trip",
  offline: "Offline",
};

export default function DriversPage() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  
  // Assign to Reservation
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loadingReservations, setLoadingReservations] = useState(false);
  const [assigning, setAssigning] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    vehicle: "",
    vehiclePlate: "",
    status: "available" as Driver["status"],
    photo: "",
  });
  const [uploading, setUploading] = useState(false);

  const fetchDrivers = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/drivers");
      const data = await res.json();
      if (data.success) {
        setDrivers(data.drivers || []);
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
    fetchDrivers();
  }, [fetchDrivers]);

  const filtered = drivers.filter((d) => {
    const query = searchQuery.toLowerCase();
    return (
      !query ||
      d.name?.toLowerCase().includes(query) ||
      d.phone?.toLowerCase().includes(query) ||
      d.email?.toLowerCase().includes(query) ||
      d.vehicle?.toLowerCase().includes(query) ||
      d.vehiclePlate?.toLowerCase().includes(query)
    );
  });

  const openAddModal = () => {
    setEditingDriver(null);
    setForm({ name: "", phone: "", email: "", vehicle: "", vehiclePlate: "", status: "available", photo: "" });
    setShowModal(true);
  };

  const openEditModal = (driver: Driver) => {
    setEditingDriver(driver);
    setForm({
      name: driver.name,
      phone: driver.phone,
      email: driver.email,
      vehicle: driver.vehicle,
      vehiclePlate: driver.vehiclePlate,
      status: driver.status,
      photo: driver.photo || "",
    });
    setShowModal(true);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", "driver");

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (data.success) {
        setForm({ ...form, photo: data.url });
      } else {
        setError(data.error || "Failed to upload photo");
      }
    } catch {
      setError("Failed to upload photo");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      const url = editingDriver ? `/api/admin/drivers/${editingDriver.id}` : "/api/admin/drivers";
      const method = editingDriver ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();

      if (data.success) {
        await fetchDrivers();
        setShowModal(false);
      } else {
        setError(data.error || "Failed to save");
      }
    } catch {
      setError("Failed to save driver");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this driver?")) return;
    
    setDeleting(id);
    try {
      const res = await fetch(`/api/admin/drivers/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        await fetchDrivers();
      } else {
        setError(data.error || "Failed to delete");
      }
    } catch {
      setError("Failed to delete driver");
    } finally {
      setDeleting(null);
    }
  };

  const openAssignModal = async (driver: Driver) => {
    setSelectedDriver(driver);
    setShowAssignModal(true);
    setLoadingReservations(true);
    try {
      const res = await fetch("/api/admin/reservations");
      const data = await res.json();
      if (data.success) {
        // Filter to show only unassigned reservations or those not marked as DONE
        const available = (data.reservations || []).filter(
          (r: Reservation) => !r.assignedDriverId && r.bookingId
        );
        setReservations(available);
      }
    } catch {
      setError("Failed to load reservations");
    } finally {
      setLoadingReservations(false);
    }
  };

  const handleAssign = async (bookingId: string) => {
    if (!selectedDriver) return;
    setAssigning(bookingId);
    try {
      const res = await fetch("/api/admin/reservations/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId, driverId: selectedDriver.id }),
      });
      const data = await res.json();
      if (data.success) {
        setShowAssignModal(false);
        setSelectedDriver(null);
        await fetchDrivers();
      } else {
        setError(data.error || "Failed to assign");
      }
    } catch {
      setError("Failed to assign driver");
    } finally {
      setAssigning(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#C9A063] mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Loading drivers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Drivers</h1>
          <p className="text-gray-500 mt-1">Manage your driver fleet</p>
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#C9A063] text-white rounded-xl text-sm font-medium hover:bg-[#B8904F] transition-all"
        >
          <Plus className="w-4 h-4" />
          Add Driver
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <p className="text-2xl font-bold text-gray-900">{drivers.length}</p>
          <p className="text-xs text-gray-500">Total Drivers</p>
        </div>
        <div className="bg-green-50 rounded-xl p-4 border border-green-100">
          <p className="text-2xl font-bold text-green-600">{drivers.filter(d => d.status === "available").length}</p>
          <p className="text-xs text-gray-500">Available</p>
        </div>
        <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
          <p className="text-2xl font-bold text-blue-600">{drivers.filter(d => d.status === "on_trip").length}</p>
          <p className="text-xs text-gray-500">On Trip</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-5">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search drivers..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-12 pr-4 py-3 bg-white rounded-xl border border-gray-200 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#C9A063] focus:ring-2 focus:ring-[#C9A063]/10"
        />
      </div>

      {error && (
        <div className="mb-5 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500" />
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {/* Drivers Grid */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 py-16 text-center">
          <Car className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">No drivers found</p>
          <button onClick={openAddModal} className="mt-4 text-[#C9A063] font-medium text-sm hover:underline">
            Add your first driver
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((driver) => {
            const statusStyle = STATUS_COLORS[driver.status];
            return (
              <div
                key={driver.id}
                className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-[#C9A063] to-[#A68B5B] rounded-full flex items-center justify-center overflow-hidden">
                      {driver.photo ? (
                        <Image src={driver.photo} alt={driver.name} width={48} height={48} className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-6 h-6 text-white" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{driver.name}</h3>
                      <p className="text-xs text-gray-500">{driver.id}</p>
                    </div>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${statusStyle.bg} ${statusStyle.text} flex items-center gap-1.5`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${statusStyle.dot} ${driver.status === "on_trip" ? "animate-pulse" : ""}`} />
                    {STATUS_LABELS[driver.status]}
                  </span>
                </div>

                <div className="space-y-2 text-sm text-gray-600 mb-4">
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <span>{driver.phone}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <span className="truncate">{driver.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Car className="w-4 h-4 text-gray-400" />
                    <span>{driver.vehicle} • {driver.vehiclePlate}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                      <span className="font-semibold text-gray-900">{driver.rating.toFixed(1)}</span>
                    </div>
                    <span className="text-gray-500">{driver.totalTrips} trips</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openAssignModal(driver)}
                      className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Assign to Reservation"
                    >
                      <ClipboardList className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => openEditModal(driver)}
                      className="p-2 text-gray-400 hover:text-[#C9A063] hover:bg-[#C9A063]/10 rounded-lg transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(driver.id)}
                      disabled={deleting === driver.id}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      {deleting === driver.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowModal(false)} />
          <div className="relative bg-white rounded-2xl w-full max-w-md p-6 shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">
                {editingDriver ? "Edit Driver" : "Add New Driver"}
              </h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Photo Upload */}
              <div className="flex justify-center">
                <div className="relative">
                  <div className="w-24 h-24 rounded-full bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden">
                    {form.photo ? (
                      <Image src={form.photo} alt="Driver" width={96} height={96} className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-10 h-10 text-gray-400" />
                    )}
                  </div>
                  <label className="absolute bottom-0 right-0 w-8 h-8 bg-[#C9A063] rounded-full flex items-center justify-center cursor-pointer hover:bg-[#B8904F] transition-colors shadow-lg">
                    {uploading ? (
                      <Loader2 className="w-4 h-4 text-white animate-spin" />
                    ) : (
                      <Camera className="w-4 h-4 text-white" />
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="hidden"
                      disabled={uploading}
                    />
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:border-[#C9A063] focus:ring-2 focus:ring-[#C9A063]/10"
                  placeholder="Driver name"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    type="tel"
                    required
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:border-[#C9A063] focus:ring-2 focus:ring-[#C9A063]/10"
                    placeholder="Phone number"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:border-[#C9A063] focus:ring-2 focus:ring-[#C9A063]/10"
                    placeholder="Email"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle</label>
                  <input
                    type="text"
                    required
                    value={form.vehicle}
                    onChange={(e) => setForm({ ...form, vehicle: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:border-[#C9A063] focus:ring-2 focus:ring-[#C9A063]/10"
                    placeholder="e.g., Mercedes S-Class"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Plate Number</label>
                  <input
                    type="text"
                    required
                    value={form.vehiclePlate}
                    onChange={(e) => setForm({ ...form, vehiclePlate: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:border-[#C9A063] focus:ring-2 focus:ring-[#C9A063]/10"
                    placeholder="e.g., ABC 123"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value as Driver["status"] })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:border-[#C9A063] focus:ring-2 focus:ring-[#C9A063]/10"
                >
                  <option value="available">Available</option>
                  <option value="on_trip">On Trip</option>
                  <option value="offline">Offline</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-2.5 bg-[#C9A063] text-white rounded-xl text-sm font-medium hover:bg-[#B8904F] disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  {editingDriver ? "Update" : "Add Driver"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign to Reservation Modal */}
      {showAssignModal && selectedDriver && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => { setShowAssignModal(false); setSelectedDriver(null); }} />
          <div className="relative bg-white rounded-2xl w-full max-w-lg p-6 shadow-xl max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Assign Reservation</h2>
                <p className="text-sm text-gray-500">Assign a reservation to <span className="font-medium text-[#C9A063]">{selectedDriver.name}</span></p>
              </div>
              <button onClick={() => { setShowAssignModal(false); setSelectedDriver(null); }} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {loadingReservations ? (
                <div className="py-12 text-center">
                  <Loader2 className="w-6 h-6 animate-spin text-[#C9A063] mx-auto mb-2" />
                  <p className="text-gray-500 text-sm">Loading reservations...</p>
                </div>
              ) : reservations.length === 0 ? (
                <div className="py-12 text-center">
                  <ClipboardList className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm">No unassigned reservations available</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {reservations.map((res) => (
                    <div key={res.bookingId} className="border border-gray-200 rounded-xl p-4 hover:border-[#C9A063]/50 transition-colors">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 text-sm">{res.firstName} {res.lastName}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{res.bookingId}</p>
                          <div className="mt-2 space-y-1 text-xs text-gray-600">
                            <p><span className="text-gray-400">Date:</span> {res.serviceDate} at {res.serviceTime}</p>
                            <p><span className="text-gray-400">Vehicle:</span> {res.vehicle}</p>
                            <p className="truncate"><span className="text-gray-400">From:</span> {res.pickupLocation}</p>
                            <p className="truncate"><span className="text-gray-400">To:</span> {res.dropoffLocation}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleAssign(res.bookingId)}
                          disabled={assigning === res.bookingId}
                          className="px-3 py-1.5 bg-[#C9A063] text-white rounded-lg text-xs font-medium hover:bg-[#B8904F] disabled:opacity-50 flex items-center gap-1.5 flex-shrink-0"
                        >
                          {assigning === res.bookingId ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Check className="w-3 h-3" />
                          )}
                          Assign
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
