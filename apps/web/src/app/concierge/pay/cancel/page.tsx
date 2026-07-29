"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { XCircle } from "lucide-react";

function CancelInner() {
  const params = useSearchParams();
  const rideId = params.get("rideId");

  return (
    <div className="w-full max-w-md rounded-2xl bg-[#151515] border border-white/10 p-8 text-center">
      <XCircle className="w-12 h-12 text-amber-400 mx-auto mb-4" />
      <h1 className="text-xl font-bold text-white mb-2">Payment cancelled</h1>
      <p className="text-white/70 text-sm">
        No charge was made. Close this tab and try again from the Concierge app
        {rideId ? ` (ride ${rideId.slice(0, 8)}…)` : ""}.
      </p>
    </div>
  );
}

export default function ConciergePayCancelPage() {
  return (
    <div className="min-h-screen bg-[#0b0b0b] flex items-center justify-center p-6">
      <Suspense fallback={<p className="text-white/60">Loading…</p>}>
        <CancelInner />
      </Suspense>
    </div>
  );
}
