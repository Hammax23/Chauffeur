"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import {
  Search,
  Loader2,
  AlertCircle,
  Users,
  Mail,
  Phone,
  MapPin,
  X,
  Shield,
} from "lucide-react";

type AppCustomer = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  city: string | null;
  photo: string | null;
  oauthProvider: string | null;
  createdAt: string;
};

export default function AppCustomersPage() {
  const [customers, setCustomers] = useState<AppCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selected, setSelected] = useState<AppCustomer | null>(null);

  const fetchCustomers = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/app-customers");
      const data = await res.json();
      if (data.success) {
        setCustomers(data.customers || []);
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
    fetchCustomers();
  }, [fetchCustomers]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter((c) => {
      const name = `${c.firstName} ${c.lastName}`.toLowerCase();
      return (
        name.includes(q) ||
        c.email.toLowerCase().includes(q) ||
        (c.phone || "").toLowerCase().includes(q) ||
        (c.city || "").toLowerCase().includes(q)
      );
    });
  }, [customers, searchQuery]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#C9A063] mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Loading app customers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">App Registered Customers</h1>
        <p className="text-gray-500 mt-1">Customers created via the mobile app (Google/Apple or in-app registration)</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{customers.length}</p>
              <p className="text-xs text-gray-500">Total</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#C9A063]/10 rounded-lg flex items-center justify-center">
              <Shield className="w-5 h-5 text-[#C9A063]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {customers.filter((c) => c.oauthProvider === "apple").length}
              </p>
              <p className="text-xs text-gray-500">Apple</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center">
              <Shield className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {customers.filter((c) => c.oauthProvider === "google").length}
              </p>
              <p className="text-xs text-gray-500">Google</p>
            </div>
          </div>
        </div>
      </div>

      <div className="relative mb-5">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search by name, email, phone, city..."
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

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="hidden lg:grid grid-cols-[1fr_220px_160px_200px] gap-4 px-5 py-3 bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider">
          <span>Customer</span>
          <span>Contact</span>
          <span>Provider</span>
          <span>Registered</span>
        </div>

        {filtered.length === 0 ? (
          <div className="py-16 text-center">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">No app customers found</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filtered.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelected(c)}
                className="w-full text-left grid grid-cols-1 lg:grid-cols-[1fr_220px_160px_200px] gap-2 lg:gap-4 px-5 py-4 hover:bg-gray-50 transition-colors items-center"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 bg-gradient-to-br from-[#C9A063] to-[#A68B5B] rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {c.photo ? (
                      <Image src={c.photo} alt={c.firstName} width={40} height={40} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-white font-semibold text-sm">
                        {`${c.firstName} ${c.lastName}`.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{c.firstName} {c.lastName}</p>
                    <p className="text-xs text-gray-500 truncate">{c.email}</p>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Mail className="w-3.5 h-3.5 text-gray-400" />
                    <span className="truncate">{c.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Phone className="w-3.5 h-3.5 text-gray-400" />
                    <span className="truncate">{c.phone || "--"}</span>
                  </div>
                </div>

                <div>
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">
                    {c.oauthProvider ? c.oauthProvider.toUpperCase() : "PASSWORD"}
                  </span>
                </div>

                <div className="text-sm text-gray-600">
                  {new Date(c.createdAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSelected(null)} />
          <div className="relative bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-lg p-4 sm:p-6 shadow-xl max-h-[85dvh] overflow-y-auto">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="min-w-0">
                <h2 className="text-lg font-bold text-gray-900">Customer Details</h2>
                <p className="text-xs text-gray-500 mt-1 break-all">{selected.id}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="p-2.5 min-h-[44px] min-w-[44px] shrink-0 flex items-center justify-center hover:bg-gray-100 rounded-lg"
                aria-label="Close"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-gray-400" />
                <span className="font-semibold text-gray-900">{selected.firstName} {selected.lastName}</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-gray-400" />
                <span className="text-gray-700 break-all">{selected.email}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-gray-400" />
                <span className="text-gray-700">{selected.phone || "--"}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-gray-400" />
                <span className="text-gray-700">{selected.city || "--"}</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-gray-400" />
                <span className="text-gray-700">
                  Provider: {selected.oauthProvider ? selected.oauthProvider.toUpperCase() : "PASSWORD"}
                </span>
              </div>
              <div className="pt-2 text-xs text-gray-500">
                Registered:{" "}
                {new Date(selected.createdAt).toLocaleString("en-US", { dateStyle: "full", timeStyle: "short" })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

