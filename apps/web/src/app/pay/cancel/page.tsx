"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { XCircle } from "lucide-react";

function CancelInner() {
  const params = useSearchParams();
  const bookingId = params.get("bookingId");

  return (
    <div className="w-full max-w-md rounded-2xl bg-white border border-gray-200 shadow-sm p-8 text-center">
      <XCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
      <h1 className="text-xl font-bold text-gray-900 mb-2">Payment cancelled</h1>
      <p className="text-gray-600 text-sm">
        No charge was made.
        {bookingId ? (
          <>
            {" "}
            Booking <span className="font-mono text-[#C9A063]">{bookingId}</span> is still unpaid.
          </>
        ) : null}{" "}
        You can close this tab and use the payment link again when ready.
      </p>
    </div>
  );
}

export default function ReservationPayCancelPage() {
  return (
    <div className="min-h-screen bg-[#f2f2f7] flex items-center justify-center p-6">
      <Suspense fallback={<p className="text-gray-500">Loading…</p>}>
        <CancelInner />
      </Suspense>
    </div>
  );
}
