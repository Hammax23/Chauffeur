"use client";
import Link from "next/link";
import { Phone } from "lucide-react";

const TopNav = () => {
  return (
    <div className="fixed top-0 left-0 right-0 z-[60] bg-black/90 backdrop-blur-xl border-b border-white/10">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-8">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center h-[32px] gap-2">
          <div className="hidden sm:block" />

          <Link
            href="/tiff-chauffeur"
            className="flex items-center justify-center gap-2 text-center hover:opacity-90 transition-opacity min-w-0 px-1"
          >
            <span className="text-[#C9A063] text-[10px] sm:text-[11px] font-semibold tracking-[0.16em] uppercase shrink-0">
              News
            </span>
            <span className="text-white/25 text-[10px] shrink-0">|</span>
            <span className="text-white/85 text-[11px] sm:text-[12px] font-light tracking-wide truncate">
              TIFF 2026 · Book a car for Pearson &amp; King West
            </span>
          </Link>

          <div className="flex items-center justify-end gap-4 min-w-0">
            <span className="hidden sm:flex items-center gap-1.5 text-white/90">
              <Phone className="w-3 h-3 flex-shrink-0" strokeWidth={2} />
              <span className="text-[13px] font-semibold tracking-wide whitespace-nowrap">
                +1 (416) 893-5779
              </span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TopNav;
