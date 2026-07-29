"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle, Loader2, AlertCircle } from "lucide-react";

function SuccessInner() {
  const params = useSearchParams();
  const sessionId = params.get("session_id") || "";
  const rideId = params.get("rideId") || "";
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");
  const [message, setMessage] = useState("Confirming payment…");
  const [fare, setFare] = useState<number | null>(null);
  const [fee, setFee] = useState<number | null>(null);
  const [code, setCode] = useState("");

  useEffect(() => {
    if (!sessionId) {
      setStatus("error");
      setMessage("Missing Stripe session.");
      return;
    }

    fetch("/api/concierge/rides/confirm-checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, rideId }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (!data.success) {
          setStatus("error");
          setMessage(data.error || "Could not confirm payment");
          return;
        }
        setStatus("ok");
        setMessage("Payment successful — guest App pay recorded with 5% platform fee.");
        setFare(data.ride?.fare ?? null);
        setFee(data.ride?.platformFee ?? null);
        setCode(data.ride?.requestCode || "");
      })
      .catch(() => {
        setStatus("error");
        setMessage("Network error confirming payment");
      });
  }, [sessionId, rideId]);

  return (
    <div className="w-full max-w-md rounded-2xl bg-[#151515] border border-white/10 p-8 text-center">
      {status === "loading" && (
        <>
          <Loader2 className="w-10 h-10 text-[#C9A063] animate-spin mx-auto mb-4" />
          <p className="text-white/80">{message}</p>
        </>
      )}
      {status === "ok" && (
        <>
          <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-white mb-2">Paid</h1>
          <p className="text-white/70 text-sm mb-4">{message}</p>
          {code ? <p className="text-[#C9A063] font-mono text-sm mb-2">{code}</p> : null}
          {fare != null ? (
            <p className="text-white/60 text-sm">
              Fare ${fare.toFixed(2)} · Platform fee ${Number(fee || 0).toFixed(2)}
            </p>
          ) : null}
          <p className="text-white/40 text-xs mt-6">You can close this tab and return to the app.</p>
        </>
      )}
      {status === "error" && (
        <>
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-white mb-2">Payment issue</h1>
          <p className="text-white/70 text-sm">{message}</p>
        </>
      )}
    </div>
  );
}

export default function ConciergePaySuccessPage() {
  return (
    <div className="min-h-screen bg-[#0b0b0b] flex items-center justify-center p-6">
      <Suspense
        fallback={
          <div className="text-white/70 flex items-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-[#C9A063]" /> Loading…
          </div>
        }
      >
        <SuccessInner />
      </Suspense>
    </div>
  );
}
