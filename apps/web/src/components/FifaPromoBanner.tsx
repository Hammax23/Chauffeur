"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Sparkles, Trophy } from "lucide-react";

const FIFA_PROMO_STORAGE_KEY = "sarj_fifa_promo_dismissed_v2";

/**
 * Top-left promo (below logo / navbar) — horizontal enterprise strip.
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
      className="fixed top-[132px] md:top-[152px] left-4 md:left-8 z-40 pointer-events-none max-w-[calc(100vw-2rem)] md:max-w-[420px]"
      aria-live="polite"
    >
      <div
        className={`pointer-events-auto transition-all duration-500 ease-out ${
          entered ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2"
        }`}
      >
        <div
          className="relative flex overflow-hidden rounded-2xl border border-white/[0.12] bg-[#0A1120]/94 backdrop-blur-xl"
          style={{
            boxShadow:
              "0 16px 48px rgba(0,0,0,0.45), 0 0 0 1px rgba(201,160,99,0.2), inset 0 1px 0 rgba(255,255,255,0.06)",
          }}
        >
          {/* Visual — left */}
          <div className="relative h-[92px] w-[108px] shrink-0 sm:w-[118px] sm:h-[96px]">
            <Image
              src="/fifa.png"
              alt=""
              fill
              className="object-cover object-center"
              sizes="120px"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-transparent to-[#0A1120]/90" />
            <div className="absolute left-2 top-2 flex items-center gap-1 rounded-full border border-[#C9A063]/35 bg-[#0A1120]/80 px-2 py-0.5 backdrop-blur-sm">
              <Sparkles className="h-2.5 w-2.5 text-[#C9A063]" />
              <span className="text-[8px] font-semibold uppercase tracking-[0.18em] text-[#E2B772]">
                Offer
              </span>
            </div>
          </div>

          {/* Copy + CTA — center/right */}
          <div className="flex min-w-0 flex-1 flex-col justify-center py-3 pl-3 pr-10 sm:pr-11">
            <div className="mb-1 flex items-center gap-1.5">
              <Trophy className="h-3 w-3 shrink-0 text-[#C9A063]" strokeWidth={1.75} />
              <p className="truncate text-[9px] font-semibold uppercase tracking-[0.2em] text-[#C9A063]/90">
                FIFA 2026 · Canada
              </p>
            </div>
            <p className="text-[15px] font-semibold leading-tight text-white sm:text-base">
              <span className="text-[#E2B772]">15% off</span>
              <span className="font-normal text-white/55"> chauffeur service</span>
            </p>
            <Link
              href="/reservation?promo=FIFA2026"
              className="group mt-2 inline-flex w-fit items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[#C9A063] transition hover:text-[#E2B772]"
            >
              Reserve now
              <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>

          <button
            type="button"
            onClick={dismiss}
            className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full border border-white/12 bg-black/35 text-white/80 backdrop-blur-sm transition hover:bg-black/55"
            aria-label="Dismiss offer"
          >
            <span className="text-[12px] leading-none font-light">×</span>
          </button>
        </div>
      </div>
    </div>
  );
}
