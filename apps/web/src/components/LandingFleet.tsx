"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Briefcase, Users } from "lucide-react";
import { fleetData, fleetDisplayName as displayName } from "@/data/fleet";

interface Vehicle {
  id: string;
  name: string;
  description: string;
  image: string;
  seating: string;
  luggage: string;
  price: number;
  category?: string;
}

export interface LandingFleetVehicle {
  id: string;
  name: string;
  description: string;
  image: string;
  seating: string;
  luggage: string;
  category?: string;
}

// Shown first (in this order); every other vehicle follows in the carousel.
const FEATURED_IDS = ["cadillac-xts", "chevrolet-suburban", "cadillac-escalade"];

/** Landing-page wording for vehicles whose seating / luggage should read differently than the fleet data. */
const CAPACITY_OVERRIDES: Record<string, { seating: string; luggage: string }> = {
  "sprinter-van": { seating: "14 maximum, 14 comfortable", luggage: "14 large" },
};

const BADGES: Record<string, string> = {
  Sedan: "Luxury sedan",
  SUV: "Luxury SUV",
  Van: "Luxury van",
  Executive: "Executive",
  Coach: "Coach",
  Limo: "Limousine",
};

export default function LandingFleet({ vehicles: custom }: { vehicles?: LandingFleetVehicle[] }) {
  const [active, setActive] = useState(0);
  const [vehicles, setVehicles] = useState<Vehicle[]>(fleetData as Vehicle[]);

  useEffect(() => {
    if (custom) return;
    fetch("/api/fleet")
      .then((r) => r.json())
      .then((d) => {
        if (d.success && Array.isArray(d.vehicles) && d.vehicles.length) setVehicles(d.vehicles);
      })
      .catch(() => {});
  }, [custom]);

  const rank = (id: string) => {
    const i = FEATURED_IDS.indexOf(id);
    return i === -1 ? FEATURED_IDS.length : i;
  };
  const cards: Vehicle[] = custom ? custom.map((c) => ({ ...c, price: 0 })) : [...vehicles].sort((x, y) => rank(x.id) - rank(y.id));

  const scrollByCard = (e: React.MouseEvent<HTMLButtonElement>, dir: 1 | -1) => {
    const el = e.currentTarget.parentElement?.querySelector<HTMLDivElement>("[data-fleet-track]");
    if (!el) return;
    const card = el.querySelector("article");
    const step = card ? card.getBoundingClientRect().width + 24 : el.clientWidth / 3;
    el.scrollBy({ left: dir * step * (window.innerWidth >= 768 ? 3 : 1), behavior: "smooth" });
  };

  return (
    <section id="fleet" className="bg-white py-20 sm:py-28">
      <div className="mx-auto max-w-[1200px] px-6 sm:px-8 lg:px-12">
        <div className="mx-auto mb-12 max-w-3xl text-center sm:mb-14">
          <span className="text-xs font-bold uppercase tracking-[0.24em] text-[#C9A063]">Our fleet</span>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-gray-950 sm:text-4xl md:text-5xl">
            Choose your <span className="text-[#C9A063]">vehicle</span>
          </h2>
          <p className="mt-5 text-base font-light leading-7 text-gray-600">
            Immaculate, late-model vehicles with a professional chauffeur, ready for any trip.
          </p>
        </div>

        <div className="relative">
          {!custom && (
            <>
          <button
            type="button"
            onClick={(e) => scrollByCard(e, -1)}
            aria-label="Previous vehicles"
            className="absolute -left-3 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-950 shadow-lg transition hover:bg-[#C9A063] hover:text-black lg:-left-6"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={(e) => scrollByCard(e, 1)}
            aria-label="Next vehicles"
            className="absolute -right-3 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-950 shadow-lg transition hover:bg-[#C9A063] hover:text-black lg:-right-6"
          >
            <ArrowRight className="h-5 w-5" />
          </button>

            </>
          )}

        <div
          data-fleet-track
          onScroll={custom ? (e) => { const el = e.currentTarget; const card = el.querySelector("article"); if (card) setActive(Math.round(el.scrollLeft / (card.getBoundingClientRect().width + 16))); } : undefined}
          className={custom ? "flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth px-1 pb-4 pt-3 [-ms-overflow-style:none] [scrollbar-width:none] md:grid md:grid-cols-3 md:gap-6 md:overflow-visible md:pb-8 [&::-webkit-scrollbar]:hidden" : "flex snap-x snap-mandatory gap-6 overflow-x-auto scroll-smooth px-1 pb-8 pt-3 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"}
        >
          {cards.map((v) => {
            const badge = BADGES[v.category ?? ""] ?? "Luxury";
            const seating = CAPACITY_OVERRIDES[v.id]?.seating ?? v.seating;
            const luggage = CAPACITY_OVERRIDES[v.id]?.luggage ?? v.luggage;
            return (
              <article
                key={v.id}
                className={`group flex w-full flex-col items-center rounded-2xl border border-gray-200 bg-white p-5 text-center transition duration-300 hover:-translate-y-1 hover:border-[#C9A063]/60 hover:shadow-xl ${custom ? "shrink-0 snap-center md:shrink" : "shrink-0 snap-start md:w-[calc((100%-3rem)/3)]"}`}
              >
                <div className="relative flex h-52 w-full items-center justify-center overflow-hidden rounded-xl bg-gradient-to-b from-gray-50 to-gray-100">
                  <span className="absolute left-3 top-3 z-10 rounded-full bg-black px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white">
                    {badge}
                  </span>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={v.image}
                    alt={displayName(v.name)}
                    className={`transition duration-500 group-hover:scale-105 ${
                      /\.(png|webp)(\?|$)/i.test(v.image) ? "max-h-44 w-full object-contain" : "absolute inset-0 h-full w-full object-cover"
                    }`}
                  />
                </div>

                <h3 className="mt-5 w-full text-left text-lg font-bold text-gray-950">{displayName(v.name)}</h3>
                <p className="mt-2 w-full flex-1 text-left text-sm font-light leading-6 text-gray-600">{v.description}</p>

                <div className="mt-5 w-full space-y-3 text-left">
                  <div className="flex items-start gap-3">
                    <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-[#C9A063]/10">
                      <Users className="h-4 w-4 text-[#C9A063]" strokeWidth={2} />
                    </span>
                    <div>
                      <span className="text-[11px] font-semibold uppercase tracking-wide text-[#6B5636]">Seating</span>
                      <p className="text-sm font-medium text-gray-700">{seating}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-[#C9A063]/10">
                      <Briefcase className="h-4 w-4 text-[#C9A063]" strokeWidth={2} />
                    </span>
                    <div>
                      <span className="text-[11px] font-semibold uppercase tracking-wide text-[#6B5636]">Luggage</span>
                      <p className="text-sm font-medium text-gray-700">{luggage}</p>
                    </div>
                  </div>
                </div>

                <Link
                  href={custom ? "/quote" : `/reservation?mode=distance&vehicleId=${encodeURIComponent(v.id)}`}
                  className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-black py-3.5 text-[11px] font-bold uppercase tracking-[0.16em] text-white transition hover:bg-[#C9A063] hover:text-black"
                >
                  {custom ? "Get a quote" : "Book now"}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </article>
            );
          })}
        </div>
        {custom && (
          <div className="mb-4 flex items-center justify-center gap-1 md:hidden">
            {cards.map((v, i) => (
              <button
                key={v.id}
                type="button"
                aria-label={`Go to vehicle ${i + 1}`}
                onClick={(e) => {
                  const track = e.currentTarget.closest("section")?.querySelector<HTMLDivElement>("[data-fleet-track]");
                  const card = track?.querySelector("article");
                  if (track && card) track.scrollTo({ left: i * (card.getBoundingClientRect().width + 16), behavior: "smooth" });
                }}
                className="flex h-6 items-center justify-center px-1"
              >
                <span className={`block h-2 rounded-full transition-all duration-300 ${i === active ? "w-6 bg-[#C9A063]" : "w-2 bg-gray-300"}`} />
              </button>
            ))}
          </div>
        )}
        </div>
      </div>
    </section>
  );
}
