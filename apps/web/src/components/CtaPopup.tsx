"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";

const STORAGE_KEY = "sarj_cta_popup_dismissed_v1";
const DELAY_MS = 3000;
const PHONE_TEL = "tel:+14168935779";
const PHONE_DISPLAY = "+1 416-893-5779";

const EXCLUDED_PREFIXES = ["/admin", "/seopanel", "/operational-manager", "/driver"];

export default function CtaPopup() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [entered, setEntered] = useState(false);

  const isExcluded = EXCLUDED_PREFIXES.some((prefix) => pathname?.startsWith(prefix));

  const dismiss = useCallback(() => {
    setEntered(false);
    setTimeout(() => setIsOpen(false), 280);
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
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setEntered(true));
      });
    }, DELAY_MS);

    return () => window.clearTimeout(timer);
  }, [isExcluded, pathname]);

  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") dismiss();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, dismiss]);

  if (!isOpen || isExcluded) return null;

  return (
    <div
      className="fixed z-[200] bottom-4 right-4 left-4 sm:left-auto sm:bottom-6 sm:right-6 w-auto sm:w-[360px] pointer-events-none"
      role="dialog"
      aria-modal="false"
      aria-labelledby="cta-popup-title"
    >
      <div
        className={`pointer-events-auto relative w-full max-h-[min(80dvh,28rem)] overflow-y-auto bg-white rounded-xl border border-gray-200 shadow-[0_16px_48px_rgba(0,0,0,0.18)] transition-all duration-300 ease-out ${
          entered
            ? "opacity-100 translate-x-0 translate-y-0"
            : "opacity-0 translate-y-4 sm:translate-y-0 sm:translate-x-8"
        }`}
      >
        <button
          type="button"
          onClick={dismiss}
          className="absolute top-2.5 right-2.5 z-10 flex items-center justify-center w-8 h-8 rounded-md border border-gray-200 bg-white text-gray-500 hover:text-gray-800 hover:border-gray-300 hover:bg-gray-50 transition-colors"
          aria-label="Close"
        >
          <X className="w-3.5 h-3.5" strokeWidth={2} />
        </button>

        <div className="px-5 pt-6 pb-5 text-center">
          <h2
            id="cta-popup-title"
            className="text-lg font-bold text-gray-900 tracking-tight mb-1 pr-6"
          >
            Get In Touch
          </h2>
          <div className="w-10 h-[2.5px] bg-[#C9A063] mx-auto mb-4 rounded-full" />

          <p className="text-gray-600 text-[13px] leading-relaxed mb-5 mx-auto">
            We would love to hear from you whether you require a quote or have an inquiry about our
            services. Call us today or contact{" "}
            <strong className="font-semibold text-gray-800">SARJ Worldwide Chauffeur Services</strong>{" "}
            for fast assistance and all your questions related to airport transfers, corporate travel,
            weddings, and premium chauffeur service.
          </p>

          <div className="flex flex-col sm:flex-row items-stretch justify-center gap-2.5">
            <a
              href={PHONE_TEL}
              onClick={dismiss}
              className="inline-flex flex-1 items-center justify-center px-5 py-2.5 rounded-lg bg-[#C9A063] text-white font-semibold text-sm shadow-md shadow-[#C9A063]/25 hover:bg-[#B8935A] active:scale-[0.98] transition-all duration-200"
            >
              Call Now
            </a>
            <Link
              href="/reservation"
              onClick={dismiss}
              className="inline-flex flex-1 items-center justify-center px-5 py-2.5 rounded-lg bg-gray-900 text-white font-semibold text-sm shadow-md shadow-black/20 hover:bg-black active:scale-[0.98] transition-all duration-200"
            >
              Book Now
            </Link>
          </div>

          <p className="mt-3.5 text-[11px] text-gray-400">
            Available 24/7 · {PHONE_DISPLAY}
          </p>
        </div>
      </div>
    </div>
  );
}
