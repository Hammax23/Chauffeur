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

  if (!summary) return <main className="min-h-screen bg-[#0a0a0a]" />;
  return <ReservationThankYou {...summary} />;
}
