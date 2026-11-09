"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

/**
 * Canada Remembrance Day (Nov 11) — discreet commemorative mark.
 * Visible Nov 1–14 so it stays timely without sitting year-round.
 */
function isRemembranceWindow(d = new Date()) {
  const month = d.getMonth(); // 0-indexed
  const day = d.getDate();
  return month === 10 && day >= 1 && day <= 14;
}

type Props = {
  variant?: "footer" | "nav";
};

export default function RemembranceDayTribute({ variant = "footer" }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(isRemembranceWindow());
  }, []);

  if (!visible) return null;

  if (variant === "nav") {
    return (
      <div
        className="flex items-center shrink-0"
        title="Remembrance Day — Lest We Forget"
      >
        <div className="rounded-lg bg-white px-1.5 py-1 shadow-sm shadow-black/25 ring-1 ring-white/20">
          <Image
            src="/images/lest-we-forget-poppy.png"
            alt="Lest We Forget — Remembrance Day"
            width={56}
            height={48}
            className="h-[36px] sm:h-[42px] md:h-[48px] w-auto object-contain"
            priority={false}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="border-t border-white/10 py-5">
      <div className="flex flex-col items-center justify-center gap-2 text-center">
        <div className="rounded-xl bg-white px-5 py-3 shadow-[0_8px_30px_rgba(0,0,0,0.35)] ring-1 ring-white/10">
          <Image
            src="/images/lest-we-forget-poppy.png"
            alt="Lest We Forget — Remembrance Day"
            width={180}
            height={140}
            className="h-[88px] sm:h-[100px] w-auto object-contain mx-auto"
            priority={false}
          />
        </div>
        <p className="text-[11px] sm:text-[12px] text-white/45 font-light tracking-[0.14em] uppercase">
          Remembrance Day · November 11
        </p>
      </div>
    </div>
  );
}
