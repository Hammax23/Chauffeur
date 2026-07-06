"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";

const STORAGE_KEY = "sarj_cta_popup_dismissed_v1";
const DELAY_MS = 3000;
const PHONE_TEL = "tel:+14168935779";
const PHONE_DISPLAY = "416-893-5779";

const EXCLUDED_PREFIXES = ["/admin", "/seopanel", "/operational-manager", "/driver"];

export default function CtaPopup() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [entered, setEntered] = useState(false);

  const isExcluded = EXCLUDED_PREFIXES.some((prefix) => pathname?.startsWith(prefix));

  const dismiss = useCallback(() => {
    setEntered(false);
    setTimeout(() => setIsOpen(false), 250);
    try {
      sessionStorage.setItem(STORAGE_KEY, "1");
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (isExcluded) return;

    try {
      if (sessionStorage.getItem(STORAGE_KEY) === "1") return;
    } catch {
      /* ignore */
    }

    const timer = window.setTimeout(() => {
      setIsOpen(true);
      requestAnimationFrame(() => setEntered(true));
    }, DELAY_MS);

    return () => window.clearTimeout(timer);
  }, [isExcluded, pathname]);

  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") dismiss();
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen, dismiss]);

  if (!isOpen || isExcluded) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cta-popup-title"
    >
      {/* Backdrop */}
      <button
        type="button"
        className={`absolute inset-0 bg-black/55 backdrop-blur-[2px] transition-opacity duration-300 ${
          entered ? "opacity-100" : "opacity-0"
        }`}
        onClick={dismiss}
        aria-label="Close popup"
      />

      {/* Modal */}
      <div
        className={`relative w-full max-w-[540px] bg-white rounded-xl sm:rounded-2xl shadow-2xl shadow-black/25 transition-all duration-300 ease-out ${
          entered ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-[0.97] translate-y-3"
        }`}
      >
        {/* Close */}
        <button
          type="button"
          onClick={dismiss}
          className="absolute top-4 right-4 z-10 flex items-center justify-center w-9 h-9 rounded-md border border-gray-200 bg-white text-gray-500 hover:text-gray-800 hover:border-gray-300 hover:bg-gray-50 transition-colors"
          aria-label="Close"
        >
          <X className="w-4 h-4" strokeWidth={2} />
        </button>

        <div className="px-8 sm:px-10 pt-10 sm:pt-12 pb-8 sm:pb-10 text-center">
          {/* Title */}
          <h2
            id="cta-popup-title"
            className="text-2xl sm:text-[26px] font-bold text-gray-900 tracking-tight mb-1"
          >
            Get In Touch
          </h2>
          <div className="w-14 h-[3px] bg-[#C9A063] mx-auto mb-6 sm:mb-7 rounded-full" />

          {/* Body */}
          <p className="text-gray-600 text-[14px] sm:text-[15px] leading-relaxed mb-8 sm:mb-9 max-w-md mx-auto">
            We would love to hear from you whether you require a quote or have an inquiry about our
            services. Call us today or contact{" "}
            <strong className="font-semibold text-gray-800">SARJ Worldwide Chauffeur Services</strong>{" "}
            for fast assistance and all your questions related to airport transfers, corporate travel,
            weddings, and premium chauffeur service.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 sm:gap-4">
            <a
              href={PHONE_TEL}
              onClick={dismiss}
              className="inline-flex items-center justify-center px-8 sm:px-10 py-3.5 sm:py-4 rounded-lg bg-[#C9A063] text-white font-semibold text-[15px] sm:text-base shadow-md shadow-[#C9A063]/25 hover:bg-[#B8935A] active:scale-[0.98] transition-all duration-200 min-w-[140px]"
            >
              Call Now
            </a>
            <Link
              href="/reservation"
              onClick={dismiss}
              className="inline-flex items-center justify-center px-8 sm:px-10 py-3.5 sm:py-4 rounded-lg bg-gray-900 text-white font-semibold text-[15px] sm:text-base shadow-md shadow-black/20 hover:bg-black active:scale-[0.98] transition-all duration-200 min-w-[140px]"
            >
              Book Now
            </Link>
          </div>

          <p className="mt-5 text-[12px] text-gray-400">
            Available 24/7 · {PHONE_DISPLAY}
          </p>
        </div>
      </div>
    </div>
  );
}
