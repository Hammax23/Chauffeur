"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

/**
 * Canada Remembrance Day (Nov 11) — discreet mark beside the logo.
 * Visible Nov 1–14 so it stays timely without sitting year-round.
 */
function isRemembranceWindow(d = new Date()) {
  const month = d.getMonth(); // 0-indexed
  const day = d.getDate();
  return month === 10 && day >= 1 && day <= 14;
}

export default function RemembranceDayTribute() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(isRemembranceWindow());
  }, []);

  if (!visible) return null;

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
