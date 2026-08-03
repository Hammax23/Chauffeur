import Link from "next/link";
import { ArrowRight } from "lucide-react";

/** Discreet mid-page promo — not a hero takeover. */
export default function TiffPromoStrip() {
  return (
    <section
      className="relative border-y border-[#C9A063]/20 bg-gradient-to-r from-[#1a1a1a] via-[#141414] to-[#1a1a1a]"
      aria-label="TIFF 2026 chauffeur"
    >
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#C9A063]/40 to-transparent" />
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-3.5 sm:py-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <p className="text-[13px] sm:text-[14px] text-white/90 font-light tracking-wide">
            <span className="text-[#C9A063] font-semibold tracking-[0.12em] uppercase text-[11px] sm:text-[12px] mr-2.5">
              TIFF week
            </span>
            <span className="text-white/50">·</span>
            <span className="ml-2.5">Sept 10–20 · Cars for Pearson, King West hotels &amp; venues</span>
          </p>
          <Link
            href="/tiff-chauffeur"
            className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#C9A063] hover:text-[#D4B07A] transition-colors flex-shrink-0 self-start sm:self-auto"
          >
            Plan TIFF rides
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </section>
  );
}
