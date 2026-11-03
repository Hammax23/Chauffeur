"use client";

import { useEffect, useState } from "react";
import ReservationThankYou, { THANK_YOU_STORAGE_KEY, type ThankYouProps } from "@/components/ReservationThankYou";

export default function ReservationThankYouPage() {
  const [summary, setSummary] = useState<ThankYouProps | null>(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(THANK_YOU_STORAGE_KEY);
      if (raw) {
        setSummary(JSON.parse(raw));
        return;
      }
    } catch {}
    // No booking in this session (direct visit or refresh after closing the tab).
    window.location.replace("/reservation");
  }, []);

  // Conversion event for Google Ads / GA4, fired once per booking (survives refresh via sessionStorage).
  useEffect(() => {
    if (!summary?.bookingId) return;
    const key = `reservation_conversion_${summary.bookingId}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {}
    const w = window as unknown as { dataLayer?: unknown[]; gtag?: (...args: unknown[]) => void };
    const payload = {
      transaction_id: summary.bookingId,
      payment_method: summary.paymentMethod,
      service: summary.serviceLabel,
    };
    w.dataLayer = w.dataLayer || [];
    w.dataLayer.push({ event: "reservation_completed", ...payload });
    w.gtag?.("event", "reservation_completed", payload);
  }, [summary]);

  if (!summary) return <main className="min-h-screen bg-[#0a0a0a]" />;
  return <ReservationThankYou {...summary} />;
}
