"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Sparkles, Trophy } from "lucide-react";

const FIFA_PROMO_STORAGE_KEY = "sarj_fifa_promo_dismissed_v2";

/**
 * Top-left promo (below logo / navbar) — responsive on mobile, larger on desktop.
 */
export default function FifaPromoBanner() {
  const [isVisible, setIsVisible] = useState(false);
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(FIFA_PROMO_STORAGE_KEY) === "1") return;
    } catch {
      /* ignore */
    }
    setIsVisible(true);
    const t = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(t);
  }, []);

  const dismiss = () => {
    setEntered(false);
    setTimeout(() => setIsVisible(false), 280);
    try {
      sessionStorage.setItem(FIFA_PROMO_STORAGE_KEY, "1");
    } catch {
      /* ignore */
    }
  };

  if (!isVisible) return null;

  return (
    <div
      className="fixed top-[128px] z-40 pointer-events-none inset-x-3 sm:inset-x-auto sm:left-4 sm:max-w-[calc(100vw-2rem)] md:left-8 md:top-[152px] md:max-w-[480px]"
      aria-live="polite"
    >
      <div
        className={`pointer-events-auto transition-all duration-500 ease-out ${
          entered ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2"
        }`}
      >
        <div
          className="relative flex min-h-[112px] items-stretch overflow-hidden rounded-xl border border-white/[0.12] bg-[#0A1120]/94 backdrop-blur-xl sm:min-h-[148px] sm:rounded-2xl md:min-h-[162px]"
          style={{
            boxShadow:
              "0 16px 48px rgba(0,0,0,0.45), 0 0 0 1px rgba(201,160,99,0.2), inset 0 1px 0 rgba(255,255,255,0.06)",
          }}
        >
          {/* Visual — left (width scales on mobile) */}
          <div className="relative w-[32%] min-w-[96px] max-w-[120px] shrink-0 sm:w-[148px] sm:max-w-none md:w-[168px]">
            <Image
              src="/fifa.png"
              alt=""
              fill
              className="object-cover object-center"
              sizes="(max-width: 640px) 30vw, 168px"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-transparent to-[#0A1120]/90" />
            <div className="absolute left-2 top-2 flex items-center gap-1 rounded-full border border-[#C9A063]/35 bg-[#0A1120]/80 px-2 py-0.5 backdrop-blur-sm sm:left-2.5 sm:top-2.5 sm:px-2.5 sm:py-1">
              <Sparkles className="h-2.5 w-2.5 text-[#C9A063] sm:h-3 sm:w-3" />
              <span className="text-[7px] font-semibold uppercase tracking-[0.14em] text-[#E2B772] sm:text-[9px] sm:tracking-[0.18em]">
                Offer
              </span>
            </div>
          </div>

          {/* Copy + CTA */}
          <div className="flex min-w-0 flex-1 flex-col justify-center py-3.5 pl-3 pr-10 sm:py-5 sm:pl-4 sm:pr-11 md:py-6 md:pl-5 md:pr-14">
            <div className="mb-1.5 flex items-center gap-1.5 sm:mb-2 sm:gap-2">
              <Trophy className="h-3.5 w-3.5 shrink-0 text-[#C9A063] sm:h-4 sm:w-4" strokeWidth={1.75} />
              <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-[#C9A063]/90 sm:text-[11px] sm:tracking-[0.2em]">
                FIFA 2026 · Canada
              </p>
            </div>
            <p className="text-[15px] font-semibold leading-snug text-white sm:text-[18px] md:text-[20px]">
              <span className="text-[#E2B772]">15% off</span>
              <span className="font-normal text-white/55"> chauffeur service</span>
            </p>
            <Link
              href="/reservation?promo=FIFA2026"
              className="group mt-2.5 inline-flex w-fit items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-[#C9A063] transition hover:text-[#E2B772] sm:mt-3.5 sm:gap-2 sm:text-[12px] sm:tracking-[0.12em]"
            >
              Reserve now
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 sm:h-4 sm:w-4" />
            </Link>
          </div>

          <button
            type="button"
            onClick={dismiss}
            className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full border border-white/12 bg-black/35 text-white/80 backdrop-blur-sm transition hover:bg-black/55 sm:right-3 sm:top-3 sm:h-9 sm:w-9"
            aria-label="Dismiss offer"
          >
            <span className="text-[12px] leading-none font-light">×</span>
          </button>
        </div>
      </div>
    </div>
  );
}
