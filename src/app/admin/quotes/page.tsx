"use client";

import { useState, useEffect, useCallback } from "react";
import {
  FileText, Search, Loader2, AlertCircle, Edit2, Trash2, X, Check,
  User, Phone, Mail, Car, MapPin, Clock, ChevronDown, ChevronUp
} from "lucide-react";

interface Quote {
  id: string;
  quoteId: string;
  status: string;
  passengerName: string;
  passengers: string;
  phone: string;
  email: string;
  serviceType: string;
  vehicle: string;
  pickupTime: string;
  pickupLocation: string;
  stops: string | null;
  dropoffLocation: string;
  additionalNotes: string | null;
  createdAt: string;
}

const STATUS_OPTIONS = ["NEW", "CONTACTED", "QUOTED", "CONVERTED", "CLOSED"];

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  NEW: { bg: "bg-blue-100", text: "text-blue-700" },
  CONTACTED: { bg: "bg-yellow-100", text: "text-yellow-700" },
  QUOTED: { bg: "bg-purple-100", text: "text-purple-700" },
  CONVERTED: { bg: "bg-green-100", text: "text-green-700" },
  CLOSED: { bg: "bg-gray-100", text: "text-gray-500" },
};

export default function QuotesPage() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Quote>>({});
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchQuotes = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/quotes");
      const data = await res.json();
      if (data.success) {
        setQuotes(data.quotes || []);
        setError("");
      } else {
        setError(data.error || "Failed to fetch quotes");
      }
    } catch {
      setError("Failed to fetch quotes");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQuotes();
  }, [fetchQuotes]);

  const filtered = quotes.filter((q) => {
    const query = searchQuery.toLowerCase();
    return (
      q.passengerName?.toLowerCase().includes(query) ||
      q.email?.toLowerCase().includes(query) ||
      q.phone?.toLowerCase().includes(query) ||
      q.quoteId?.toLowerCase().includes(query) ||
      q.serviceType?.toLowerCase().includes(query)
    );
  });

  const startEdit = (quote: Quote) => {
    setEditingId(quote.id);
    setEditForm({ ...quote });
    setExpandedId(quote.id);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  const saveEdit = async () => {
    if (!editingId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/quotes/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      const data = await res.json();
      if (data.success) {
        await fetchQuotes();
        setEditingId(null);
        setEditForm({});
      } else {
        setError(data.error || "Failed to update");
      }
    } catch {
      setError("Failed to update quote");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this quote?")) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/admin/quotes/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        await fetchQuotes();
      } else {
        setError(data.error || "Failed to delete");
      }
    } catch {
      setError("Failed to delete quote");
    } finally {
      setDeleting(null);
    }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      const quote = quotes.find((q) => q.id === id);
      if (!quote) return;
      
      const res = await fetch(`/api/admin/quotes/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...quote, status }),
      });
      const data = await res.json();
      if (data.success) {
        await fetchQuotes();
      }
    } catch {
      setError("Failed to update status");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-[#C9A063] animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Online Quotes</h1>
          <p className="text-gray-500 text-sm mt-1">{quotes.length} quote requests</p>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500" />
          <span className="text-red-700 text-sm">{error}</span>
          <button onClick={() => setError("")} className="ml-auto text-red-500 hover:text-red-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search quotes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#C9A063] focus:ring-2 focus:ring-[#C9A063]/10"
          />
        </div>
      </div>

      {/* Quotes List */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-gray-100">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No quotes found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((quote) => {
            const isExpanded = expandedId === quote.id;
            const isEditing = editingId === quote.id;
            const statusStyle = STATUS_COLORS[quote.status] || STATUS_COLORS.NEW;

            return (
              <div key={quote.id} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                {/* Row Header */}
                <div
                  className="p-4 flex items-center gap-4 cursor-pointer hover:bg-gray-50"
                  onClick={() => setExpandedId(isExpanded ? null : quote.id)}
                >
                  <div className="w-10 h-10 bg-gradient-to-br from-[#C9A063] to-[#A68B5B] rounded-full flex items-center justify-center flex-shrink-0">
                    <User className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900 truncate">{quote.passengerName}</h3>
                      <span className="text-xs text-gray-400">{quote.quoteId}</span>
                    </div>
                    <p className="text-sm text-gray-500 truncate">{quote.serviceType} • {quote.vehicle}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <select
                      value={quote.status}
                      onChange={(e) => {
                        e.stopPropagation();
                        updateStatus(quote.id, e.target.value);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className={`px-2.5 py-1 rounded-full text-xs font-semibold border-0 cursor-pointer ${statusStyle.bg} ${statusStyle.text}`}
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                    <span className="text-xs text-gray-400 hidden sm:block">
                      {new Date(quote.createdAt).toLocaleDateString()}
                    </span>
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="border-t border-gray-100 p-4 bg-gray-50">
                    {isEditing ? (
                      /* Edit Form */
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Passenger Name</label>
                            <input
                              type="text"
                              value={editForm.passengerName || ""}
                              onChange={(e) => setEditForm({ ...editForm, passengerName: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#C9A063]"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Passengers</label>
                            <input
                              type="text"
                              value={editForm.passengers || ""}
                              onChange={(e) => setEditForm({ ...editForm, passengers: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#C9A063]"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Phone</label>
                            <input
                              type="text"
                              value={editForm.phone || ""}
                              onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#C9A063]"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Email</label>
                            <input
                              type="email"
                              value={editForm.email || ""}
                              onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#C9A063]"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Service Type</label>
                            <input
                              type="text"
                              value={editForm.serviceType || ""}
                              onChange={(e) => setEditForm({ ...editForm, serviceType: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#C9A063]"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Vehicle</label>
                            <input
                              type="text"
                              value={editForm.vehicle || ""}
                              onChange={(e) => setEditForm({ ...editForm, vehicle: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#C9A063]"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Pickup Time</label>
                            <input
                              type="text"
                              value={editForm.pickupTime || ""}
                              onChange={(e) => setEditForm({ ...editForm, pickupTime: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#C9A063]"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
                            <select
                              value={editForm.status || "NEW"}
                              onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#C9A063]"
                            >
                              {STATUS_OPTIONS.map((s) => (
                                <option key={s} value={s}>{s}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">Pickup Location</label>
                          <input
                            type="text"
                            value={editForm.pickupLocation || ""}
                            onChange={(e) => setEditForm({ ...editForm, pickupLocation: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#C9A063]"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">Dropoff Location</label>
                          <input
                            type="text"
                            value={editForm.dropoffLocation || ""}
                            onChange={(e) => setEditForm({ ...editForm, dropoffLocation: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#C9A063]"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">Additional Notes</label>
                          <textarea
                            value={editForm.additionalNotes || ""}
                            onChange={(e) => setEditForm({ ...editForm, additionalNotes: e.target.value })}
                            rows={2}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#C9A063]"
                          />
                        </div>
                        <div className="flex gap-2 pt-2">
                          <button
                            onClick={saveEdit}
                            disabled={saving}
                            className="px-4 py-2 bg-[#C9A063] text-white rounded-lg text-sm font-medium hover:bg-[#B8904F] disabled:opacity-50 flex items-center gap-2"
                          >
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                            Save
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-300"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* View Details */
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <div>
                            <p className="text-xs text-gray-500 uppercase font-medium mb-1">Contact</p>
                            <div className="space-y-1.5">
                              <a href={`mailto:${quote.email}`} className="flex items-center gap-2 text-sm text-[#C9A063] hover:underline">
                                <Mail className="w-3.5 h-3.5" /> {quote.email}
                              </a>
                              <a href={`tel:${quote.phone}`} className="flex items-center gap-2 text-sm text-[#C9A063] hover:underline">
                                <Phone className="w-3.5 h-3.5" /> {quote.phone}
                              </a>
                            </div>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 uppercase font-medium mb-1">Service</p>
                            <p className="text-sm text-gray-700">{quote.serviceType}</p>
                            <p className="text-sm text-gray-700 flex items-center gap-1.5 mt-1">
                              <Car className="w-3.5 h-3.5 text-gray-400" /> {quote.vehicle}
                            </p>
                            <p className="text-sm text-gray-700 mt-1">{quote.passengers} passengers</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 uppercase font-medium mb-1">Pickup Time</p>
                            <p className="text-sm text-gray-700 flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-gray-400" /> {quote.pickupTime}
                            </p>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <p className="text-xs text-gray-500 uppercase font-medium mb-1">Pickup Location</p>
                            <p className="text-sm text-gray-700 flex items-start gap-1.5">
                              <MapPin className="w-3.5 h-3.5 text-green-500 mt-0.5 flex-shrink-0" />
                              {quote.pickupLocation}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 uppercase font-medium mb-1">Dropoff Location</p>
                            <p className="text-sm text-gray-700 flex items-start gap-1.5">
                              <MapPin className="w-3.5 h-3.5 text-red-500 mt-0.5 flex-shrink-0" />
                              {quote.dropoffLocation}
                            </p>
                          </div>
                        </div>
                        {quote.stops && (
                          <div>
                            <p className="text-xs text-gray-500 uppercase font-medium mb-1">Stops</p>
                            <p className="text-sm text-gray-700">{quote.stops}</p>
                          </div>
                        )}
                        {quote.additionalNotes && (
                          <div>
                            <p className="text-xs text-gray-500 uppercase font-medium mb-1">Additional Notes</p>
                            <p className="text-sm text-gray-700">{quote.additionalNotes}</p>
                          </div>
                        )}
                        <div className="flex gap-2 pt-2 border-t border-gray-200">
                          <button
                            onClick={() => startEdit(quote)}
                            className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 flex items-center gap-1.5"
                          >
                            <Edit2 className="w-3.5 h-3.5" /> Edit
                          </button>
                          <button
                            onClick={() => handleDelete(quote.id)}
                            disabled={deleting === quote.id}
                            className="px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100 flex items-center gap-1.5 disabled:opacity-50"
                          >
                            {deleting === quote.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="w-3.5 h-3.5" />
                            )}
                            Delete
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
