"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import { services as staticServices } from "@/data/services";

type ServiceLink = { slug: string; title: string };

type ServicesNavDropdownProps = {
  variant?: "desktop" | "mobile";
  onNavigate?: () => void;
};

export default function ServicesNavDropdown({
  variant = "desktop",
  onNavigate,
}: ServicesNavDropdownProps) {
  const [open, setOpen] = useState(false);
  const [services, setServices] = useState<ServiceLink[]>(
    staticServices.map((s) => ({ slug: s.slug, title: s.title }))
  );

  useEffect(() => {
    fetch("/api/public/site-content")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data.services) && data.services.length > 0) {
          setServices(data.services.map((s: { slug: string; title: string }) => ({ slug: s.slug, title: s.title })));
        }
      })
      .catch(() => {});
  }, []);

  if (variant === "mobile") {
    return (
      <div>
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="flex w-full items-center justify-between px-4 py-2.5 text-base font-medium text-white"
          aria-expanded={open}
        >
          SERVICES
          <ChevronDown
            className={`w-4 h-4 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
            strokeWidth={2}
          />
        </button>

        {open && (
          <div className="pb-2 pl-6 pr-4 space-y-0.5">
            <Link
              href="/services"
              onClick={onNavigate}
              className="block py-2 text-sm text-[#C9A063] hover:text-[#dfc18a] transition-colors"
            >
              All Services
            </Link>
            {services.map((service) => (
              <Link
                key={service.slug}
                href={`/services/${service.slug}`}
                onClick={onNavigate}
                className="block py-2 text-sm text-gray-300 hover:text-white transition-colors"
              >
                {service.title}
              </Link>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        className={`inline-flex items-center gap-1 px-5 py-2.5 text-[16px] font-normal rounded-xl transition-all duration-300 whitespace-nowrap ${
          open
            ? "text-[#C9A063] bg-white/5"
            : "text-white/90 hover:text-[#C9A063] hover:bg-white/5"
        }`}
        aria-expanded={open}
        aria-haspopup="true"
      >
        SERVICES
        <ChevronDown
          className={`w-3.5 h-3.5 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          strokeWidth={2}
        />
      </button>

      {open && (
        <div className="absolute top-full left-0 pt-2 min-w-[240px]">
          <div className="rounded-xl border border-white/10 bg-black/95 backdrop-blur-xl shadow-lg py-2">
            <Link
              href="/services"
              className="block px-4 py-2 text-sm text-[#C9A063] hover:bg-white/5 transition-colors"
            >
              All Services
            </Link>
            <div className="my-1 border-t border-white/10" />
            {services.map((service) => (
              <Link
                key={service.slug}
                href={`/services/${service.slug}`}
                className="block px-4 py-2 text-sm text-white/85 hover:text-[#C9A063] hover:bg-white/5 transition-colors whitespace-nowrap"
              >
                {service.title}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
