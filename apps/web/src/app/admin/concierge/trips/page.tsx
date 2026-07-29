"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";

type Trip = {
  id: string;
  requestCode: string;
  status: string;
  fare: number;
  platformFee: number;
  hotelCommission: number;
  guestPaymentMethod: string;
  vehicleRequestRule: string;
  pickupLocation: string;
  hotel: { name: string };
  concierge: { name: string };
  assignedDriverProfile?: { driver: { name: string } } | null;
  commission?: { matched: boolean; disputeOpen: boolean } | null;
  createdAt: string;
};

export default function ConciergeTripsPage() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = status ? `?status=${status}` : "";
      const res = await fetch(`/api/admin/concierge/trips${qs}`);
      const data = await res.json();
      if (data.success) setTrips(data.trips || []);
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="p-6 lg:p-8">
      <Link href="/admin/concierge" className="inline-flex items-center gap-1 text-sm text-gray-500 mb-4 hover:text-gray-800">
        <ArrowLeft className="w-4 h-4" /> Concierge
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Trips</h1>
        <select
          className="border rounded-xl px-3 py-2 text-sm"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">All statuses</option>
          {["OPEN", "ASSIGNED", "ON_THE_WAY", "ARRIVED", "IN_TRIP", "COMPLETED", "CANCELLED"].map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-[#C9A063]" />
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-500">
              <tr>
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Hotel / Concierge</th>
                <th className="px-4 py-3">Pickup</th>
                <th className="px-4 py-3">Rule</th>
                <th className="px-4 py-3">Pay</th>
                <th className="px-4 py-3">Fare / Fee / Hotel</th>
                <th className="px-4 py-3">Driver</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {trips.map((t) => (
                <tr key={t.id} className="border-t border-gray-50">
                  <td className="px-4 py-3 font-mono text-xs">{t.requestCode}</td>
                  <td className="px-4 py-3">
                    <div>{t.hotel?.name}</div>
                    <div className="text-xs text-gray-400">{t.concierge?.name}</div>
                  </td>
                  <td className="px-4 py-3 max-w-[180px] truncate">{t.pickupLocation}</td>
                  <td className="px-4 py-3">{t.vehicleRequestRule}</td>
                  <td className="px-4 py-3">{t.guestPaymentMethod}</td>
                  <td className="px-4 py-3">
                    ${t.fare.toFixed(2)} / ${t.platformFee.toFixed(2)} / ${t.hotelCommission.toFixed(2)}
                  </td>
                  <td className="px-4 py-3">{t.assignedDriverProfile?.driver?.name || "—"}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs px-2 py-1 rounded-full bg-gray-100">{t.status}</span>
                    {t.commission?.disputeOpen && (
                      <span className="ml-1 text-xs text-red-600">dispute</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
