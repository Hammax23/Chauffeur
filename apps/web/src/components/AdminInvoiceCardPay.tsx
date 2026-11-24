"use client";

import { useMemo, useState } from "react";
import {
  PaymentElement,
  useStripe,
  useElements,
  Elements,
} from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { Loader2, CreditCard } from "lucide-react";

const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "";
const stripePromise = publishableKey ? loadStripe(publishableKey) : null;

function CardForm({
  onSuccess,
  onError,
}: {
  onSuccess: (paymentIntentId: string) => void;
  onError: (msg: string) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements || busy) return;
    setBusy(true);
    setMsg("");
    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/admin/billing`,
      },
      redirect: "if_required",
    });
    if (error) {
      const m = error.message || "Payment failed";
      setMsg(m);
      onError(m);
      setBusy(false);
      return;
    }
    if (paymentIntent?.status === "succeeded") {
      setMsg("Payment successful");
      onSuccess(paymentIntent.id);
      setBusy(false);
      return;
    }
    setMsg(`Status: ${paymentIntent?.status || "unknown"}`);
    setBusy(false);
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="flex items-center gap-2 mb-3 text-sm font-semibold text-gray-900">
          <CreditCard className="w-4 h-4 text-[#C9A063]" />
          Enter card
        </div>
        <PaymentElement options={{ layout: "tabs" }} />
      </div>
      {msg && (
        <p
          className={`text-sm ${
            msg.includes("successful") ? "text-emerald-700" : "text-rose-700"
          }`}
        >
          {msg}
        </p>
      )}
      <button
        type="submit"
        disabled={!stripe || !elements || busy}
        className="w-full sm:w-auto px-4 py-2.5 rounded-lg text-sm font-semibold bg-gray-900 text-white disabled:opacity-40"
      >
        {busy ? (
          <span className="inline-flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Charging…
          </span>
        ) : (
          "Charge card"
        )}
      </button>
    </form>
  );
}

export default function AdminInvoiceCardPay({
  clientSecret,
  onSuccess,
  onError,
}: {
  clientSecret: string;
  onSuccess: (paymentIntentId: string) => void;
  onError: (msg: string) => void;
}) {
  const options = useMemo(
    () => ({
      clientSecret,
      appearance: {
        theme: "stripe" as const,
        variables: {
          colorPrimary: "#C9A063",
          borderRadius: "12px",
        },
      },
    }),
    [clientSecret]
  );

  if (!stripePromise) {
    return (
      <p className="text-sm text-rose-700">
        Missing NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
      </p>
    );
  }

  return (
    <Elements stripe={stripePromise} options={options} key={clientSecret}>
      <CardForm onSuccess={onSuccess} onError={onError} />
    </Elements>
  );
}
