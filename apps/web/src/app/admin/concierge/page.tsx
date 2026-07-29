"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Building2,
  Car,
  AlertTriangle,
  DollarSign,
  Loader2,
  RefreshCw,
  Hotel,
  Users,
  Route,
  Scale,
  Sprout,
} from "lucide-react";

type Stats = {
  activeDrivers: number;
  onlineDrivers: number;
  activeHotels: number;
  totalTrips: number;
  totalRevenue: number;
  platformRevenue: number;
  outstandingCommissionDisputes: number;
};

type Trip = {
  id: string;
  requestCode: string;
  status: string;
  fare: number;
  guestPaymentMethod: string;
  hotel: { name: string };
  concierge: { name: string };
  assignedDriverProfile?: { driver: { name: string } } | null;
  createdAt: string;
};

const LINKS = [
  { href: "/admin/concierge/hotels", label: "Hotels", icon: Hotel },
  { href: "/admin/concierge/staff", label: "Staff", icon: Users },
  { href: "/admin/concierge/drivers", label: "Drivers", icon: Car },
  { href: "/admin/concierge/trips", label: "Trips", icon: Route },
  { href: "/admin/concierge/commissions", label: "Commissions", icon: Scale },
];

export default function ConciergeAdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [recent, setRecent] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [seeding, setSeeding] = useState(false);
  const [seedMsg, setSeedMsg] = useState("");

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/concierge/dashboard");
      const data = await res.json();
      if (data.success) {
        setStats(data.stats);
        setRecent(data.recentTrips || []);
        setError("");
      } else {
        setError(data.error || "Failed to load");
      }
    } catch {
      setError("Failed to connect");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function seedDemo() {
    setSeeding(true);
    setSeedMsg("");
    try {
      const res = await fetch("/api/admin/concierge/seed", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setSeedMsg(
          `Demo ready — login: ${data.conciergeLogin?.email} / ${data.conciergeLogin?.password}`
        );
        fetchData();
      } else {
        setSeedMsg(data.error || "Seed failed");
      }
    } catch {
      setSeedMsg("Seed failed");
    } finally {
      setSeeding(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#C9A063]" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Hotel Concierge</h1>
          <p className="text-gray-500 mt-1">Marketplace overview for hotels, staff, and drivers.</p>
        </div>
        <button
          type="button"
          onClick={seedDemo}
          disabled={seeding}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#C9A063] text-white text-sm font-medium hover:bg-[#b8904f] disabled:opacity-60"
        >
          {seeding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sprout className="w-4 h-4" />}
          Seed demo data
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
          <p className="text-red-700 text-sm flex-1">{error}</p>
          <button type="button" onClick={fetchData}>
            <RefreshCw className="w-4 h-4 text-red-600" />
          </button>
        </div>
      )}
      {seedMsg && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-900">
          {seedMsg}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Active hotels", value: stats?.activeHotels, icon: Building2, color: "text-blue-600 bg-blue-50" },
          { label: "Online drivers", value: `${stats?.onlineDrivers ?? 0}/${stats?.activeDrivers ?? 0}`, icon: Car, color: "text-green-600 bg-green-50" },
          { label: "Total trips", value: stats?.totalTrips, icon: Route, color: "text-purple-600 bg-purple-50" },
          { label: "Open disputes", value: stats?.outstandingCommissionDisputes, icon: AlertTriangle, color: "text-red-600 bg-red-50" },
          { label: "Trip revenue", value: `$${(stats?.totalRevenue ?? 0).toFixed(2)}`, icon: DollarSign, color: "text-[#C9A063] bg-amber-50" },
          { label: "Platform fees (5%)", value: `$${(stats?.platformRevenue ?? 0).toFixed(2)}`, icon: DollarSign, color: "text-emerald-600 bg-emerald-50" },
        ].map((card) => (
          <div key={card.label} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${card.color}`}>
              <card.icon className="w-5 h-5" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{card.value ?? 0}</p>
            <p className="text-gray-500 text-sm mt-1">{card.label}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-3 mb-8">
        {LINKS.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 bg-white hover:border-[#C9A063] text-sm font-medium text-gray-800"
          >
            <l.icon className="w-4 h-4 text-[#C9A063]" />
            {l.label}
          </Link>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Recent trips</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Code</th>
                <th className="px-4 py-3 font-medium">Hotel</th>
                <th className="px-4 py-3 font-medium">Concierge</th>
                <th className="px-4 py-3 font-medium">Driver</th>
                <th className="px-4 py-3 font-medium">Pay</th>
                <th className="px-4 py-3 font-medium">Fare</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {recent.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                    No trips yet
                  </td>
                </tr>
              ) : (
                recent.map((t) => (
                  <tr key={t.id} className="border-t border-gray-50">
                    <td className="px-4 py-3 font-mono text-xs">{t.requestCode}</td>
                    <td className="px-4 py-3">{t.hotel?.name}</td>
                    <td className="px-4 py-3">{t.concierge?.name}</td>
                    <td className="px-4 py-3">{t.assignedDriverProfile?.driver?.name || "—"}</td>
                    <td className="px-4 py-3">{t.guestPaymentMethod}</td>
                    <td className="px-4 py-3">${t.fare.toFixed(2)}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs px-2 py-1 rounded-full bg-gray-100">{t.status}</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
