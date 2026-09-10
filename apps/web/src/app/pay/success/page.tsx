"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle, Loader2, AlertCircle } from "lucide-react";

function SuccessInner() {
  const params = useSearchParams();
  const sessionId = params.get("session_id") || "";
  const bookingId = params.get("bookingId") || "";
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");
  const [message, setMessage] = useState("Confirming payment…");
  const [total, setTotal] = useState<number | null>(null);
  const [code, setCode] = useState("");

  useEffect(() => {
    if (!sessionId) {
      setStatus("error");
      setMessage("Missing Stripe session.");
      return;
    }

    fetch("/api/reservation/confirm-checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, bookingId }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (!data.success) {
          setStatus("error");
          setMessage(data.error || "Could not confirm payment");
          return;
        }
        setStatus("ok");
        setMessage("Payment successful. Your reservation is marked as paid.");
        setTotal(data.reservation?.total ?? null);
        setCode(data.reservation?.bookingId || bookingId);
      })
      .catch(() => {
        setStatus("error");
        setMessage("Network error confirming payment");
      });
  }, [sessionId, bookingId]);

  return (
    <div className="w-full max-w-md rounded-2xl bg-white border border-gray-200 shadow-sm p-8 text-center">
      {status === "loading" && (
        <>
          <Loader2 className="w-10 h-10 text-[#C9A063] animate-spin mx-auto mb-4" />
          <p className="text-gray-600">{message}</p>
        </>
      )}
      {status === "ok" && (
        <>
          <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">Payment received</h1>
          <p className="text-gray-600 text-sm mb-4">{message}</p>
          {code ? <p className="text-[#C9A063] font-mono text-sm mb-2">{code}</p> : null}
          {total != null ? (
            <p className="text-gray-500 text-sm">${Number(total).toFixed(2)} CAD</p>
          ) : null}
          <p className="text-gray-400 text-xs mt-6">You can close this tab.</p>
        </>
      )}
      {status === "error" && (
        <>
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">Payment issue</h1>
          <p className="text-gray-600 text-sm">{message}</p>
        </>
      )}
    </div>
  );
}

export default function ReservationPaySuccessPage() {
  return (
    <div className="min-h-screen bg-[#f2f2f7] flex items-center justify-center p-6">
      <Suspense
        fallback={
          <div className="text-gray-600 flex items-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-[#C9A063]" /> Loading…
          </div>
        }
      >
        <SuccessInner />
      </Suspense>
    </div>
  );
}
