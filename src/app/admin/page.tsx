"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  CalendarCheck, Car, Users, DollarSign,
  TrendingUp, Clock, MapPin, ArrowRight,
  Loader2, AlertCircle, RefreshCw
} from "lucide-react";

interface Stats {
  totalReservations: number;
  pendingReservations: number;
  activeTrips: number;
  completedTrips: number;
  totalDrivers: number;
  availableDrivers: number;
  totalRevenue: number;
  todayReservations: number;
}

interface RecentReservation {
  bookingId: string;
  firstName: string;
  lastName: string;
  status: string;
  serviceDate: string;
  vehicle: string;
  total: number;
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-gray-100 text-gray-700",
  "ON THE WAY": "bg-blue-100 text-blue-700",
  ARRIVED: "bg-yellow-100 text-yellow-700",
  CIC: "bg-purple-100 text-purple-700",
  DONE: "bg-green-100 text-green-700",
};

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentReservations, setRecentReservations] = useState<RecentReservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/dashboard");
      const data = await res.json();
      if (data.success) {
        setStats(data.stats);
        setRecentReservations(data.recentReservations || []);
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
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#C9A063] mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">Welcome back! Here&apos;s what&apos;s happening today.</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500" />
          <p className="text-red-700 text-sm">{error}</p>
          <button onClick={fetchData} className="ml-auto text-red-600 hover:text-red-800">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-8">
        {/* Total Reservations */}
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
              <CalendarCheck className="w-6 h-6 text-blue-600" />
            </div>
            <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">
              +{stats?.todayReservations || 0} today
            </span>
          </div>
          <p className="text-3xl font-bold text-gray-900">{stats?.totalReservations || 0}</p>
          <p className="text-gray-500 text-sm mt-1">Total Reservations</p>
        </div>

        {/* Active Trips */}
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center">
              <Car className="w-6 h-6 text-purple-600" />
            </div>
            <span className="text-xs font-medium text-purple-600 bg-purple-50 px-2 py-1 rounded-full flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-pulse" />
              Live
            </span>
          </div>
          <p className="text-3xl font-bold text-gray-900">{stats?.activeTrips || 0}</p>
          <p className="text-gray-500 text-sm mt-1">Active Trips</p>
        </div>

        {/* Drivers */}
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-[#C9A063]/10 rounded-xl flex items-center justify-center">
              <Users className="w-6 h-6 text-[#C9A063]" />
            </div>
            <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">
              {stats?.availableDrivers || 0} available
            </span>
          </div>
          <p className="text-3xl font-bold text-gray-900">{stats?.totalDrivers || 0}</p>
          <p className="text-gray-500 text-sm mt-1">Total Drivers</p>
        </div>

        {/* Revenue */}
        <div className="bg-gradient-to-br from-[#1C1C1E] to-[#2C2C2E] rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-[#C9A063]/20 rounded-xl flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-[#C9A063]" />
            </div>
            <TrendingUp className="w-5 h-5 text-green-400" />
          </div>
          <p className="text-3xl font-bold text-white">${(stats?.totalRevenue || 0).toLocaleString()}</p>
          <p className="text-gray-400 text-sm mt-1">Total Revenue</p>
        </div>
      </div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-gray-50 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-gray-400">{stats?.pendingReservations || 0}</p>
          <p className="text-xs text-gray-500 mt-1">Pending</p>
        </div>
        <div className="bg-blue-50 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-blue-600">{stats?.activeTrips || 0}</p>
          <p className="text-xs text-gray-500 mt-1">In Progress</p>
        </div>
        <div className="bg-green-50 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-green-600">{stats?.completedTrips || 0}</p>
          <p className="text-xs text-gray-500 mt-1">Completed</p>
        </div>
        <div className="bg-[#C9A063]/10 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-[#C9A063]">{stats?.todayReservations || 0}</p>
          <p className="text-xs text-gray-500 mt-1">Today</p>
        </div>
      </div>

      {/* Recent Reservations */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Recent Reservations</h2>
          <Link
            href="/admin/reservations"
            className="text-sm text-[#C9A063] font-medium hover:underline flex items-center gap-1"
          >
            View all <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {recentReservations.length === 0 ? (
          <div className="py-12 text-center">
            <CalendarCheck className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">No reservations yet</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {recentReservations.slice(0, 5).map((r) => (
              <div key={r.bookingId} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                      <Users className="w-5 h-5 text-gray-500" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{r.firstName} {r.lastName}</p>
                      <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                        <span className="font-medium text-[#C9A063]">{r.bookingId}</span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {r.serviceDate}
                        </span>
                        <span className="flex items-center gap-1">
                          <Car className="w-3 h-3" /> {r.vehicle}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-bold text-gray-900">
                      {r.total > 0 ? `$${r.total.toFixed(2)}` : "--"}
                    </span>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_COLORS[r.status] || STATUS_COLORS.PENDING}`}>
                      {r.status}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8">
        <Link
          href="/admin/reservations"
          className="bg-white rounded-xl p-5 border border-gray-100 hover:border-[#C9A063] hover:shadow-md transition-all group"
        >
          <CalendarCheck className="w-8 h-8 text-[#C9A063] mb-3" />
          <h3 className="font-semibold text-gray-900 group-hover:text-[#C9A063] transition-colors">Manage Reservations</h3>
          <p className="text-sm text-gray-500 mt-1">View and manage all bookings</p>
        </Link>
        <Link
          href="/admin/drivers"
          className="bg-white rounded-xl p-5 border border-gray-100 hover:border-[#C9A063] hover:shadow-md transition-all group"
        >
          <Car className="w-8 h-8 text-[#C9A063] mb-3" />
          <h3 className="font-semibold text-gray-900 group-hover:text-[#C9A063] transition-colors">Manage Drivers</h3>
          <p className="text-sm text-gray-500 mt-1">Add, edit, or remove drivers</p>
        </Link>
        <Link
          href="/admin/customers"
          className="bg-white rounded-xl p-5 border border-gray-100 hover:border-[#C9A063] hover:shadow-md transition-all group"
        >
          <Users className="w-8 h-8 text-[#C9A063] mb-3" />
          <h3 className="font-semibold text-gray-900 group-hover:text-[#C9A063] transition-colors">View Customers</h3>
          <p className="text-sm text-gray-500 mt-1">Browse customer records</p>
        </Link>
      </div>
    </div>
  );
}
