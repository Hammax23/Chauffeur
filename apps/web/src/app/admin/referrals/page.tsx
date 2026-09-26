"use client";

import { useCallback, useEffect, useState } from "react";
import { Users, Loader2, RefreshCw, Ban, CheckCircle2 } from "lucide-react";

type Attribution = {
  id: string;
  status: string;
  codeUsed: string;
  qualifiedAt: string | null;
  refereeFirstBookingId: string | null;
  adminNote: string | null;
  createdAt: string;
  referrer: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    referralCode: string | null;
  };
  referee: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };
};

type Reward = {
  id: string;
  amount: number;
  status: string;
  redeemedReservationId: string | null;
  redeemedAt: string | null;
  voidedAt: string | null;
  voidReason: string | null;
  createdAt: string;
  customer: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    referralCode: string | null;
  };
};

export default function AdminReferralsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [summary, setSummary] = useState({ PENDING: 0, QUALIFIED: 0, REJECTED: 0 });
  const [attributions, setAttributions] = useState<Attribution[]>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);

  const load = useCallback(async () => {
    try {
      setError("");
      const params = new URLSearchParams();
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      const res = await fetch(`/api/admin/referrals?${params}`, { credentials: "include" });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to load");
      setSummary(data.summary || { PENDING: 0, QUALIFIED: 0, REJECTED: 0 });
      setAttributions(data.attributions || []);
      setRewards(data.rewards || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    setLoading(true);
    void load();
  }, [load]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 2800);
    return () => clearTimeout(t);
  }, [toast]);

  const patch = async (body: Record<string, unknown>) => {
    const res = await fetch("/api/admin/referrals", {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.error || "Update failed");
    await load();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
            <Users className="h-6 w-6 text-[#C9A063]" />
            Referrals
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Track friend invites. Referrer unlocks a one-time $20 after 2 qualified paid trips.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setLoading(true);
            void load();
          }}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {toast ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-800">
          {toast}
        </div>
      ) : null}
      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-3">
        {(["PENDING", "QUALIFIED", "REJECTED"] as const).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setStatusFilter(k === statusFilter ? "ALL" : k)}
            className={`rounded-xl border px-4 py-3 text-left ${
              statusFilter === k
                ? "border-[#C9A063] bg-[#C9A063]/10"
                : "border-gray-200 bg-white"
            }`}
          >
            <div className="text-xs uppercase tracking-wide text-gray-500">{k}</div>
            <div className="text-2xl font-semibold text-gray-900">{summary[k]}</div>
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-4 py-3 text-sm font-medium text-gray-900">
          Attributions
        </div>
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-gray-500">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading…
          </div>
        ) : attributions.length === 0 ? (
          <div className="py-12 text-center text-sm text-gray-500">No attributions yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-gray-100 bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Referrer</th>
                  <th className="px-4 py-3 font-medium">Friend</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Created</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {attributions.map((a) => (
                  <tr key={a.id} className="hover:bg-gray-50/80">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">
                        {a.referrer.firstName} {a.referrer.lastName}
                      </div>
                      <div className="text-xs text-gray-500">{a.referrer.email}</div>
                      <div className="text-xs text-[#C9A063] font-semibold">{a.codeUsed}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">
                        {a.referee.firstName} {a.referee.lastName}
                      </div>
                      <div className="text-xs text-gray-500">{a.referee.phone || a.referee.email}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-medium uppercase text-gray-700">{a.status}</span>
                      {a.adminNote ? (
                        <div className="text-xs text-gray-400 mt-1">{a.adminNote}</div>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {new Date(a.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        {a.status === "PENDING" ? (
                          <>
                            <button
                              type="button"
                              title="Qualify"
                              className="rounded-lg p-2 text-emerald-600 hover:bg-emerald-50"
                              onClick={() =>
                                void patch({ action: "qualify_attribution", id: a.id })
                                  .then(() => setToast("Marked qualified"))
                                  .catch((e) =>
                                    setError(e instanceof Error ? e.message : "Failed")
                                  )
                              }
                            >
                              <CheckCircle2 className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              title="Reject"
                              className="rounded-lg p-2 text-red-500 hover:bg-red-50"
                              onClick={() =>
                                void patch({
                                  action: "reject_attribution",
                                  id: a.id,
                                  adminNote: "Rejected by admin",
                                })
                                  .then(() => setToast("Attribution rejected"))
                                  .catch((e) =>
                                    setError(e instanceof Error ? e.message : "Failed")
                                  )
                              }
                            >
                              <Ban className="h-4 w-4" />
                            </button>
                          </>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-4 py-3 text-sm font-medium text-gray-900">
          Rewards
        </div>
        {rewards.length === 0 ? (
          <div className="py-12 text-center text-sm text-gray-500">No rewards issued yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-gray-100 bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Customer</th>
                  <th className="px-4 py-3 font-medium">Amount</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rewards.map((r) => (
                  <tr key={r.id}>
                    <td className="px-4 py-3">
                      <div className="font-medium">
                        {r.customer.firstName} {r.customer.lastName}
                      </div>
                      <div className="text-xs text-gray-500">{r.customer.email}</div>
                    </td>
                    <td className="px-4 py-3">${Number(r.amount).toFixed(2)}</td>
                    <td className="px-4 py-3 text-xs uppercase font-medium">{r.status}</td>
                    <td className="px-4 py-3 text-right">
                      {r.status === "AVAILABLE" ? (
                        <button
                          type="button"
                          className="text-xs font-medium text-red-600 hover:underline"
                          onClick={() =>
                            void patch({
                              action: "void_reward",
                              id: r.id,
                              voidReason: "Voided by admin",
                            })
                              .then(() => setToast("Reward voided"))
                              .catch((e) =>
                                setError(e instanceof Error ? e.message : "Failed")
                              )
                          }
                        >
                          Void
                        </button>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
