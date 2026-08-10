// @ts-nocheck
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Check } from "lucide-react";

type Commission = {
  id: string;
  driverClaim: string;
  conciergeClaim: string;
  matched: boolean;
  disputeOpen: boolean;
  resolvedNote: string | null;
  ride: {
    requestCode: string;
    hotelCommission: number;
    hotel: { name: string };
    concierge: { name: string };
    assignedDriverProfile?: { driver: { name: string } } | null;
  };
};

export default function ConciergeCommissionsPage() {
  const [filter, setFilter] = useState("disputes");
  const [items, setItems] = useState<Commission[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/concierge/commissions?filter=${filter}`);
      const data = await res.json();
      if (data.success) setItems(data.commissions || []);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  async function resolve(id: string) {
    const note = prompt("Resolution note", "Resolved by admin — matched in favor of hotel records");
    if (note === null) return;
    setResolving(id);
    try {
      const res = await fetch("/api/admin/concierge/commissions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, resolvedNote: note }),
      });
      const data = await res.json();
      if (!data.success) alert(data.error || "Failed");
      else load();
    } finally {
      setResolving(null);
    }
  }

  return (
    <div className="p-6 lg:p-8">
      <Link href="/admin/concierge" className="inline-flex items-center gap-1 text-sm text-gray-500 mb-4 hover:text-gray-800">
        <ArrowLeft className="w-4 h-4" /> Concierge
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Commissions</h1>
        <div className="flex gap-2">
          {[
            { id: "disputes", label: "Disputes" },
            { id: "pending", label: "Pending" },
            { id: "all", label: "All" },
          ].map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={`px-3 py-1.5 rounded-lg text-sm ${filter === f.id ? "bg-[#C9A063] text-white" : "bg-gray-100 text-gray-700"}`}
            >
              {f.label}
            </button>
          ))}
        </div>
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
                <th className="px-4 py-3">Trip</th>
                <th className="px-4 py-3">Hotel commission</th>
                <th className="px-4 py-3">Driver claim</th>
                <th className="px-4 py-3">Concierge claim</th>
                <th className="px-4 py-3">Match</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-gray-400">
                    No records
                  </td>
                </tr>
              ) : (
                items.map((c) => (
                  <tr key={c.id} className="border-t border-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-mono text-xs">{c.ride.requestCode}</div>
                      <div className="text-xs text-gray-500">
                        {c.ride.hotel.name} · {c.ride.concierge.name}
                      </div>
                      <div className="text-xs text-gray-400">
                        {c.ride.assignedDriverProfile?.driver?.name || "No driver"}
                      </div>
                    </td>
                    <td className="px-4 py-3">${c.ride.hotelCommission.toFixed(2)}</td>
                    <td className="px-4 py-3">{c.driverClaim}</td>
                    <td className="px-4 py-3">{c.conciergeClaim}</td>
                    <td className="px-4 py-3">
                      {c.disputeOpen ? (
                        <span className="text-xs text-red-600 font-medium">Dispute</span>
                      ) : c.matched ? (
                        <span className="text-xs text-green-600">Matched</span>
                      ) : (
                        <span className="text-xs text-gray-400">Pending</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {c.disputeOpen && (
                        <button
                          type="button"
                          disabled={resolving === c.id}
                          onClick={() => resolve(c.id)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gray-900 text-white text-xs"
                        >
                          <Check className="w-3 h-3" /> Resolve
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
