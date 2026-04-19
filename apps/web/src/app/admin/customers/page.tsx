"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Search, Phone, Mail, MapPin, Calendar,
  Loader2, AlertCircle, Users, DollarSign, Car
} from "lucide-react";

interface Customer {
  email: string;
  name: string;
  phone: string;
  totalBookings: number;
  totalSpent: number;
  lastBooking: string;
  lastPickup: string;
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const fetchCustomers = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/customers");
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

  const filtered = customers.filter((c) => {
    const query = searchQuery.toLowerCase();
    return (
      !query ||
      c.name?.toLowerCase().includes(query) ||
      c.email?.toLowerCase().includes(query) ||
      c.phone?.toLowerCase().includes(query)
    );
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#C9A063] mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Loading customers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Customers</h1>
        <p className="text-gray-500 mt-1">View all customer records from reservations</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{customers.length}</p>
              <p className="text-xs text-gray-500">Total Customers</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#C9A063]/10 rounded-lg flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-[#C9A063]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                ${customers.reduce((sum, c) => sum + c.totalSpent, 0).toLocaleString()}
              </p>
              <p className="text-xs text-gray-500">Total Revenue</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
              <Car className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {customers.reduce((sum, c) => sum + c.totalBookings, 0)}
              </p>
              <p className="text-xs text-gray-500">Total Bookings</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {customers.filter(c => c.totalBookings > 1).length}
              </p>
              <p className="text-xs text-gray-500">Repeat Customers</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-5">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search customers by name, email, or phone..."
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

      {/* Customers Table */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
        {/* Table Header */}
        <div className="hidden lg:grid grid-cols-[1fr_1fr_150px_120px_120px_150px] gap-4 px-5 py-3 bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider">
          <span>Customer</span>
          <span>Contact</span>
          <span>Bookings</span>
          <span>Total Spent</span>
          <span>Last Booking</span>
          <span>Last Pickup</span>
        </div>

        {filtered.length === 0 ? (
          <div className="py-16 text-center">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">No customers found</p>
            <p className="text-gray-400 text-xs mt-1">Customers will appear here when reservations are made</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filtered.map((customer) => (
              <div
                key={customer.email}
                className="grid grid-cols-1 lg:grid-cols-[1fr_1fr_150px_120px_120px_150px] gap-2 lg:gap-4 px-5 py-4 hover:bg-gray-50 transition-colors items-center"
              >
                {/* Customer Name */}
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-[#C9A063] to-[#A68B5B] rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-semibold text-sm">
                      {customer.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)}
                    </span>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{customer.name}</p>
                    {customer.totalBookings > 1 && (
                      <span className="text-xs text-[#C9A063] font-medium">Repeat Customer</span>
                    )}
                  </div>
                </div>

                {/* Contact */}
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Mail className="w-3.5 h-3.5 text-gray-400" />
                    <a href={`mailto:${customer.email}`} className="hover:text-[#C9A063] truncate">{customer.email}</a>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Phone className="w-3.5 h-3.5 text-gray-400" />
                    <a href={`tel:${customer.phone}`} className="hover:text-[#C9A063]">{customer.phone}</a>
                  </div>
                </div>

                {/* Bookings */}
                <div>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-semibold">
                    <Car className="w-3.5 h-3.5" />
                    {customer.totalBookings} {customer.totalBookings === 1 ? "trip" : "trips"}
                  </span>
                </div>

                {/* Total Spent */}
                <p className="text-sm font-bold text-gray-900">
                  ${customer.totalSpent.toFixed(2)}
                </p>

                {/* Last Booking */}
                <div className="flex items-center gap-1.5 text-sm text-gray-600">
                  <Calendar className="w-3.5 h-3.5 text-gray-400" />
                  <span>{customer.lastBooking || "--"}</span>
                </div>

                {/* Last Pickup */}
                <div className="flex items-start gap-1.5 text-sm text-gray-600">
                  <MapPin className="w-3.5 h-3.5 text-gray-400 mt-0.5 flex-shrink-0" />
                  <span className="truncate">{customer.lastPickup || "--"}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="text-center mt-6">
        <p className="text-gray-400 text-xs">
          Showing {filtered.length} of {customers.length} customers
        </p>
      </div>
    </div>
  );
}
