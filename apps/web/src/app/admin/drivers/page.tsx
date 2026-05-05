"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Plus, Search, Phone, Mail, Car, Star,
  Loader2, AlertCircle, Edit2, Trash2, X, Check,
  User, ClipboardList, Camera, Upload, Link2, Copy, Clock, CheckCircle, XCircle, Send, Eye, EyeOff,
  FileText,
} from "lucide-react";
import Image from "next/image";
import {
  DEFAULT_VISIBLE_FIELDS,
  DRIVER_INVITE_FIELD_KEYS,
  DRIVER_PROFILE_FIELD_KEYS,
  DRIVER_DOCUMENT_FIELD_KEYS,
  DRIVER_VEHICLE_DOC_FIELD_KEYS,
  DRIVER_INVITE_FIELD_LABELS,
  emptyPrefilledFieldsRecord,
  isDocumentUploadField,
  isPrefilledOptionalWhenClosed,
  type DriverInviteFieldKey,
  type VisibleFieldsMap,
} from "@/lib/driver-invite-config";

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

interface DriverInvite {
  id: string;
  token: string;
  email: string | null;
  name: string | null;
  status: "PENDING" | "USED" | "EXPIRED" | "REVOKED";
  expiresAt: string;
  usedAt: string | null;
  createdAt: string;
  registrationUrl?: string;
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
    password: "",
  });
  const [uploading, setUploading] = useState(false);

  // Invite states
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showInvitesListModal, setShowInvitesListModal] = useState(false);
  const [invites, setInvites] = useState<DriverInvite[]>([]);
  const [loadingInvites, setLoadingInvites] = useState(false);
  const [creatingInvite, setCreatingInvite] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: "", name: "", expiryHours: "48" });
  const [fieldVisibility, setFieldVisibility] = useState<VisibleFieldsMap>({ ...DEFAULT_VISIBLE_FIELDS });
  const [prefilledFields, setPrefilledFields] = useState<Record<DriverInviteFieldKey, string>>(() =>
    emptyPrefilledFieldsRecord()
  );
  const [uploadingInviteField, setUploadingInviteField] = useState<DriverInviteFieldKey | null>(null);
  const [generatedLink, setGeneratedLink] = useState("");
  const [copySuccess, setCopySuccess] = useState(false);
  const [deletingInvite, setDeletingInvite] = useState<string | null>(null);

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
    // Auto-refresh every 5 seconds to show real-time driver status (active/inactive)
    const interval = setInterval(() => {
      fetchDrivers();
    }, 5000);
    return () => clearInterval(interval);
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
    setForm({ name: "", phone: "", email: "", vehicle: "", vehiclePlate: "", status: "available", photo: "", password: "" });
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
      password: "",
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

  // Invite functions
  const fetchInvites = async () => {
    setLoadingInvites(true);
    try {
      const res = await fetch("/api/admin/driver-invites");
      const data = await res.json();
      if (data.success) {
        setInvites(data.invites || []);
      }
    } catch {
      setError("Failed to load invites");
    } finally {
      setLoadingInvites(false);
    }
  };

  const handleInviteClosedFieldUpload = async (
    key: DriverInviteFieldKey,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingInviteField(key);
    setError("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", key === "photo" ? "driver" : "driver-document");
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (data.success) {
        setPrefilledFields((prev) => ({ ...prev, [key]: data.url }));
      } else {
        setError(data.error || "Upload failed");
      }
    } catch {
      setError("Upload failed");
    } finally {
      setUploadingInviteField(null);
      e.target.value = "";
    }
  };

  const renderInviteFieldRow = (key: DriverInviteFieldKey) => {
    const open = fieldVisibility[key];
    const label = DRIVER_INVITE_FIELD_LABELS[key];
    const docKind = isDocumentUploadField(key);
    const showDocClosedUi = !open && docKind;
    const showTextClosedUi = !open && !docKind;

    return (
      <div
        key={key}
        className="rounded-xl border border-gray-200 bg-gray-50/80 p-3 sm:p-3.5 space-y-2"
      >
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
          <span className="text-sm font-medium text-gray-800 min-w-0 break-words pr-1">{label}</span>
          <div className="flex w-full sm:w-auto rounded-lg border border-gray-200 bg-white overflow-hidden shrink-0">
            <button
              type="button"
              onClick={() => setFieldVisibility((prev) => ({ ...prev, [key]: true }))}
              className={`flex flex-1 sm:flex-initial items-center justify-center gap-1.5 px-3 py-2.5 sm:px-2.5 sm:py-1.5 min-h-[44px] sm:min-h-0 text-xs font-medium transition-colors ${
                open ? "bg-emerald-600 text-white" : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              <Eye className="w-3.5 h-3.5 shrink-0" />
              Open
            </button>
            <button
              type="button"
              onClick={() => setFieldVisibility((prev) => ({ ...prev, [key]: false }))}
              className={`flex flex-1 sm:flex-initial items-center justify-center gap-1.5 px-3 py-2.5 sm:px-2.5 sm:py-1.5 min-h-[44px] sm:min-h-0 text-xs font-medium transition-colors ${
                !open ? "bg-gray-700 text-white" : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              <EyeOff className="w-3.5 h-3.5 shrink-0" />
              Closed
            </button>
          </div>
        </div>

        {open && (key === "name" || key === "email") && (
          <div>
            <label className="block text-xs text-gray-500 mb-1">
              Optional pre-fill when driver opens the link
            </label>
            <input
              type={key === "email" ? "email" : "text"}
              value={key === "name" ? inviteForm.name : inviteForm.email}
              onChange={(e) =>
                setInviteForm({
                  ...inviteForm,
                  [key === "name" ? "name" : "email"]: e.target.value,
                })
              }
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:border-[#C9A063] focus:ring-2 focus:ring-[#C9A063]/10"
              placeholder={key === "name" ? "Pre-fill name on form" : "Pre-fill email on form"}
            />
          </div>
        )}

        {open && key !== "name" && key !== "email" && (
          <p className="text-xs text-gray-500 leading-relaxed">
            {key === "photo"
              ? "Driver will upload a profile photo on the registration page."
              : docKind && key !== "photo"
                ? "Driver will upload this document (PDF or image) on the registration page."
                : "Driver will enter this on the registration page."}
          </p>
        )}

        {showDocClosedUi && (
          <div className="space-y-2">
            <label className="block text-xs text-gray-600">
              {isPrefilledOptionalWhenClosed(key)
                ? "Optional — paste URL or upload"
                : "Required — paste secure URL or upload file"}
            </label>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
              <input
                type="text"
                value={prefilledFields[key]}
                onChange={(e) =>
                  setPrefilledFields((prev) => ({ ...prev, [key]: e.target.value }))
                }
                className="w-full flex-1 min-w-0 px-3 py-2.5 sm:py-2 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:border-[#C9A063] focus:ring-2 focus:ring-[#C9A063]/10"
                placeholder="https://..."
              />
              <label className="flex sm:flex-shrink-0 items-center justify-center gap-2 w-full sm:w-11 h-11 rounded-lg border border-gray-200 bg-white cursor-pointer hover:bg-gray-50 py-2 sm:py-0 text-xs sm:text-[0] font-medium text-gray-600 sm:font-normal">
                {uploadingInviteField === key ? (
                  <Loader2 className="w-4 h-4 animate-spin text-[#C9A063]" />
                ) : (
                  <Upload className="w-4 h-4 text-gray-600" />
                )}
                <span className="sm:hidden">Upload file</span>
                <input
                  type="file"
                  accept={key === "photo" ? "image/*" : "image/*,application/pdf"}
                  className="hidden"
                  disabled={uploadingInviteField !== null}
                  onChange={(e) => handleInviteClosedFieldUpload(key, e)}
                />
              </label>
            </div>
          </div>
        )}

        {showTextClosedUi && (
          <div>
            <label className="block text-xs text-gray-600 mb-1">
              Required — {label} for driver record
            </label>
            <input
              type="text"
              value={prefilledFields[key]}
              onChange={(e) =>
                setPrefilledFields((prev) => ({
                  ...prev,
                  [key]: e.target.value,
                }))
              }
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:border-[#C9A063] focus:ring-2 focus:ring-[#C9A063]/10"
              placeholder={`Enter ${label.toLowerCase()}`}
              required
            />
          </div>
        )}
      </div>
    );
  };

  const openInviteModal = () => {
    setInviteForm({ email: "", name: "", expiryHours: "48" });
    setFieldVisibility({ ...DEFAULT_VISIBLE_FIELDS });
    setPrefilledFields(emptyPrefilledFieldsRecord());
    setGeneratedLink("");
    setCopySuccess(false);
    setShowInviteModal(true);
  };

  const openInvitesList = async () => {
    setShowInvitesListModal(true);
    await fetchInvites();
  };

  const handleCreateInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingInvite(true);
    setError("");

    for (const key of DRIVER_INVITE_FIELD_KEYS) {
      if (fieldVisibility[key]) continue;
      if (isPrefilledOptionalWhenClosed(key)) continue;
      if (!prefilledFields[key]?.trim()) {
        setError(
          `"${DRIVER_INVITE_FIELD_LABELS[key]}" is closed — provide a value or upload for the driver record.`
        );
        setCreatingInvite(false);
        return;
      }
    }

    try {
      const res = await fetch("/api/admin/driver-invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: fieldVisibility.email ? inviteForm.email.trim() || undefined : undefined,
          name: fieldVisibility.name ? inviteForm.name.trim() || undefined : undefined,
          expiryHours: inviteForm.expiryHours,
          visibleFields: fieldVisibility,
          prefilledFields,
        }),
      });
      const data = await res.json();

      if (data.success) {
        setGeneratedLink(data.invite.registrationUrl);
      } else {
        setError(data.error || "Failed to create invite");
      }
    } catch {
      setError("Failed to create invite");
    } finally {
      setCreatingInvite(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(generatedLink);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch {
      setError("Failed to copy to clipboard");
    }
  };

  const handleRevokeInvite = async (id: string) => {
    if (!confirm("Are you sure you want to revoke this invite?")) return;
    
    setDeletingInvite(id);
    try {
      const res = await fetch(`/api/admin/driver-invites?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        await fetchInvites();
      } else {
        setError(data.error || "Failed to revoke invite");
      }
    } catch {
      setError("Failed to revoke invite");
    } finally {
      setDeletingInvite(null);
    }
  };

  const getInviteStatusStyle = (status: string) => {
    switch (status) {
      case "PENDING": return { bg: "bg-amber-100", text: "text-amber-700", icon: Clock };
      case "USED": return { bg: "bg-green-100", text: "text-green-700", icon: CheckCircle };
      case "EXPIRED": return { bg: "bg-gray-100", text: "text-gray-500", icon: XCircle };
      case "REVOKED": return { bg: "bg-red-100", text: "text-red-700", icon: XCircle };
      default: return { bg: "bg-gray-100", text: "text-gray-500", icon: Clock };
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
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Drivers</h1>
          <p className="text-gray-500 mt-1">Manage your driver fleet</p>
        </div>
        <div className="flex flex-col min-[480px]:flex-row flex-wrap gap-2 w-full sm:w-auto">
          <button
            onClick={openInvitesList}
            className="flex flex-1 min-[480px]:flex-initial items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] border border-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 transition-all"
          >
            <Clock className="w-4 h-4 shrink-0" />
            View Invites
          </button>
          <button
            onClick={openInviteModal}
            className="flex flex-1 min-[480px]:flex-initial items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-all"
          >
            <Send className="w-4 h-4 shrink-0" />
            Invite Driver
          </button>
          <button
            onClick={openAddModal}
            className="flex flex-1 min-[480px]:flex-initial items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] bg-[#C9A063] text-white rounded-xl text-sm font-medium hover:bg-[#B8904F] transition-all"
          >
            <Plus className="w-4 h-4 shrink-0" />
            Add Driver
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6">
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
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowModal(false)} />
          <div className="relative bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-md max-h-[92dvh] sm:max-h-[90vh] overflow-y-auto p-4 sm:p-6 shadow-xl">
            <div className="flex items-start justify-between gap-3 mb-5 sm:mb-6">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 pr-2">
                {editingDriver ? "Edit Driver" : "Add New Driver"}
              </h2>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-2.5 min-h-[44px] min-w-[44px] shrink-0 flex items-center justify-center hover:bg-gray-100 rounded-lg"
                aria-label="Close"
              >
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    type="tel"
                    required
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-base sm:text-sm text-gray-900 focus:outline-none focus:border-[#C9A063] focus:ring-2 focus:ring-[#C9A063]/10"
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
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-base sm:text-sm text-gray-900 focus:outline-none focus:border-[#C9A063] focus:ring-2 focus:ring-[#C9A063]/10"
                    placeholder="Email"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password {editingDriver && <span className="text-xs text-gray-500">(leave blank to keep current)</span>}
                </label>
                {editingDriver && (
                  <div className="mb-2 flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-1 text-green-700 text-xs">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span className="font-medium">Current password is set</span>
                    </div>
                    <span className="text-gray-400 text-xs ml-auto">••••••••</span>
                  </div>
                )}
                <input
                  type="password"
                  required={!editingDriver}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:border-[#C9A063] focus:ring-2 focus:ring-[#C9A063]/10"
                  placeholder={editingDriver ? "Enter new password to change" : "Set driver password"}
                  minLength={6}
                />
              </div>

              <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="w-full sm:flex-1 px-4 py-3 sm:py-2.5 min-h-[48px] border border-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full sm:flex-1 px-4 py-3 sm:py-2.5 min-h-[48px] bg-[#C9A063] text-white rounded-xl text-sm font-medium hover:bg-[#B8904F] disabled:opacity-50 flex items-center justify-center gap-2"
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
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => { setShowAssignModal(false); setSelectedDriver(null); }} />
          <div className="relative bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-lg p-4 sm:p-6 shadow-xl max-h-[85dvh] sm:max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex items-start justify-between gap-3 mb-4 shrink-0">
              <div className="min-w-0 pr-2">
                <h2 className="text-lg sm:text-xl font-bold text-gray-900">Assign Reservation</h2>
                <p className="text-xs sm:text-sm text-gray-500 mt-1">
                  Assign a reservation to{" "}
                  <span className="font-medium text-[#C9A063] break-words">{selectedDriver.name}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => { setShowAssignModal(false); setSelectedDriver(null); }}
                className="p-2.5 min-h-[44px] min-w-[44px] shrink-0 flex items-center justify-center hover:bg-gray-100 rounded-lg"
                aria-label="Close"
              >
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
                    <div key={res.bookingId} className="border border-gray-200 rounded-xl p-3 sm:p-4 hover:border-[#C9A063]/50 transition-colors">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 text-sm">{res.firstName} {res.lastName}</p>
                          <p className="text-xs text-gray-500 mt-0.5 break-all">{res.bookingId}</p>
                          <div className="mt-2 space-y-1 text-xs text-gray-600">
                            <p><span className="text-gray-400">Date:</span> {res.serviceDate} at {res.serviceTime}</p>
                            <p><span className="text-gray-400">Vehicle:</span> {res.vehicle}</p>
                            <p className="break-words"><span className="text-gray-400">From:</span> {res.pickupLocation}</p>
                            <p className="break-words"><span className="text-gray-400">To:</span> {res.dropoffLocation}</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleAssign(res.bookingId)}
                          disabled={assigning === res.bookingId}
                          className="w-full sm:w-auto sm:flex-shrink-0 px-4 py-2.5 min-h-[44px] justify-center bg-[#C9A063] text-white rounded-lg text-xs font-medium hover:bg-[#B8904F] disabled:opacity-50 flex items-center gap-1.5"
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

      {/* Invite Driver Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-0 sm:p-4 md:p-6">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowInviteModal(false)} />
          <div className="relative bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-2xl p-4 sm:p-6 shadow-xl max-h-[calc(100dvh-0px)] sm:max-h-[90vh] flex flex-col">
            <div className="flex items-start justify-between gap-3 mb-4 sm:mb-6 shrink-0">
              <div className="min-w-0 flex-1 pr-2">
                <h2 className="text-lg sm:text-xl font-bold text-gray-900">Invite Driver</h2>
                <p className="text-xs sm:text-sm text-gray-500 mt-0.5">Generate a secure registration link</p>
              </div>
              <button
                type="button"
                onClick={() => setShowInviteModal(false)}
                className="p-2.5 min-h-[44px] min-w-[44px] shrink-0 flex items-center justify-center hover:bg-gray-100 rounded-lg"
                aria-label="Close"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {!generatedLink ? (
              <form onSubmit={handleCreateInvite} className="space-y-3 sm:space-y-4 flex flex-col min-h-0 flex-1 overflow-hidden">
                <p className="text-xs text-gray-500 shrink-0 leading-relaxed">
                  <span className="font-semibold text-gray-700">Open</span> = driver sees this on the registration page.{" "}
                  <span className="font-semibold text-gray-700">Closed</span> = you provide it here (upload or URL); it stays off the public form.
                </p>

                <div className="space-y-4 min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1 -mr-1 pb-2 max-h-[min(52dvh,420px)] sm:max-h-[min(58vh,520px)]">
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                      Profile &amp; vehicle
                    </p>
                    <div className="space-y-3">
                      {DRIVER_PROFILE_FIELD_KEYS.map(renderInviteFieldRow)}
                    </div>
                  </div>

                  <div className="border-t border-gray-100 pt-4">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-gray-500" />
                      Documents
                    </p>
                    <p className="text-xs text-gray-500 mb-2 leading-relaxed">
                      Compliance document uploads (PDF or image). Same Open / Closed rules — Open lets the driver upload on registration; Closed keeps files internal to admin.
                    </p>
                    <div className="space-y-3">
                      {DRIVER_DOCUMENT_FIELD_KEYS.map(renderInviteFieldRow)}
                    </div>
                  </div>

                  <div className="border-t border-gray-100 pt-4">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-2">
                      <Car className="w-4 h-4 text-gray-500" />
                      Vehicle
                    </p>
                    <p className="text-xs text-gray-500 mb-2 leading-relaxed">
                      Vehicle insurance and registration documents.
                    </p>
                    <div className="space-y-3">
                      {DRIVER_VEHICLE_DOC_FIELD_KEYS.map(renderInviteFieldRow)}
                    </div>
                  </div>
                </div>

                <div className="shrink-0">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Link Expiry</label>
                  <select
                    value={inviteForm.expiryHours}
                    onChange={(e) => setInviteForm({ ...inviteForm, expiryHours: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:border-[#C9A063] focus:ring-2 focus:ring-[#C9A063]/10"
                  >
                    <option value="24">24 hours</option>
                    <option value="48">48 hours</option>
                    <option value="72">72 hours</option>
                    <option value="168">7 days</option>
                  </select>
                </div>

                <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <Link2 className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-blue-900">Secure Invitation</p>
                      <p className="text-xs text-blue-700 mt-1">
                        One-time link; expires after the duration you pick. Only &quot;Open&quot; fields appear on{" "}
                        <code className="text-[11px] bg-blue-100/80 px-1 rounded">/driver-register</code>.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 pt-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowInviteModal(false)}
                    className="w-full sm:flex-1 px-4 py-3 sm:py-2.5 min-h-[48px] border border-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creatingInvite}
                    className="w-full sm:flex-1 px-4 py-3 sm:py-2.5 min-h-[48px] bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {creatingInvite ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
                    Generate Link
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-4 overflow-y-auto max-h-[calc(100dvh-8rem)]">
                <div className="bg-green-50 border border-green-100 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <p className="text-sm font-medium text-green-900">Link Generated Successfully!</p>
                  </div>
                  <p className="text-xs text-green-700">Share this link with the driver. They can use it to register themselves.</p>
                </div>

                <div className="flex flex-col gap-2 sm:block sm:relative">
                  <input
                    type="text"
                    readOnly
                    value={generatedLink}
                    className="w-full px-3 sm:px-4 py-3 sm:pr-24 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm text-gray-900 font-mono break-all"
                  />
                  <button
                    type="button"
                    onClick={copyToClipboard}
                    className={`sm:absolute sm:right-2 sm:top-1/2 sm:-translate-y-1/2 w-full sm:w-auto justify-center px-4 py-3 sm:py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all min-h-[44px] sm:min-h-0 ${
                      copySuccess 
                        ? "bg-green-100 text-green-700" 
                        : "bg-[#C9A063] text-white hover:bg-[#B8904F]"
                    }`}
                  >
                    {copySuccess ? (
                      <>
                        <Check className="w-3 h-3" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        Copy
                      </>
                    )}
                  </button>
                </div>

                <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setGeneratedLink("");
                      setInviteForm({ email: "", name: "", expiryHours: "48" });
                      setFieldVisibility({ ...DEFAULT_VISIBLE_FIELDS });
                      setPrefilledFields(emptyPrefilledFieldsRecord());
                    }}
                    className="w-full sm:flex-1 px-4 py-3 sm:py-2.5 min-h-[48px] border border-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50"
                  >
                    Generate Another
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowInviteModal(false)}
                    className="w-full sm:flex-1 px-4 py-3 sm:py-2.5 min-h-[48px] bg-[#C9A063] text-white rounded-xl text-sm font-medium hover:bg-[#B8904F]"
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* View Invites List Modal */}
      {showInvitesListModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowInvitesListModal(false)} />
          <div className="relative bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-2xl p-4 sm:p-6 shadow-xl max-h-[85dvh] sm:max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex items-start justify-between gap-3 mb-4 shrink-0">
              <div className="min-w-0">
                <h2 className="text-lg sm:text-xl font-bold text-gray-900">Driver Invites</h2>
                <p className="text-xs sm:text-sm text-gray-500">Manage registration invitations</p>
              </div>
              <button
                type="button"
                onClick={() => setShowInvitesListModal(false)}
                className="p-2.5 min-h-[44px] min-w-[44px] shrink-0 flex items-center justify-center hover:bg-gray-100 rounded-lg"
                aria-label="Close"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {loadingInvites ? (
                <div className="py-12 text-center">
                  <Loader2 className="w-6 h-6 animate-spin text-[#C9A063] mx-auto mb-2" />
                  <p className="text-gray-500 text-sm">Loading invites...</p>
                </div>
              ) : invites.length === 0 ? (
                <div className="py-12 text-center">
                  <Link2 className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm">No invites created yet</p>
                  <button
                    onClick={() => {
                      setShowInvitesListModal(false);
                      openInviteModal();
                    }}
                    className="mt-3 text-[#C9A063] font-medium text-sm hover:underline"
                  >
                    Create your first invite
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {invites.map((invite) => {
                    const statusStyle = getInviteStatusStyle(invite.status);
                    const StatusIcon = statusStyle.icon;
                    return (
                      <div key={invite.id} className="border border-gray-200 rounded-xl p-3 sm:p-4 hover:border-gray-300 transition-colors">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold flex items-center gap-1 ${statusStyle.bg} ${statusStyle.text}`}>
                                <StatusIcon className="w-3 h-3" />
                                {invite.status}
                              </span>
                              {invite.name && (
                                <span className="text-sm font-medium text-gray-900">{invite.name}</span>
                              )}
                            </div>
                            <div className="space-y-1 text-xs text-gray-600">
                              {invite.email && (
                                <p><span className="text-gray-400">Email:</span> {invite.email}</p>
                              )}
                              <p>
                                <span className="text-gray-400">Created:</span>{" "}
                                {new Date(invite.createdAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}
                              </p>
                              <p>
                                <span className="text-gray-400">Expires:</span>{" "}
                                {new Date(invite.expiresAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}
                              </p>
                              {invite.usedAt && (
                                <p>
                                  <span className="text-gray-400">Used:</span>{" "}
                                  {new Date(invite.usedAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}
                                </p>
                              )}
                            </div>
                          </div>
                          {invite.status === "PENDING" && (
                            <button
                              type="button"
                              onClick={() => handleRevokeInvite(invite.id)}
                              disabled={deletingInvite === invite.id}
                              className="self-start sm:self-auto px-4 py-2.5 sm:py-1.5 min-h-[44px] sm:min-h-0 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-colors w-full sm:w-auto"
                            >
                              {deletingInvite === invite.id ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <Trash2 className="w-3 h-3" />
                              )}
                              Revoke
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
