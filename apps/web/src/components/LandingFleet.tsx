"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Briefcase, Droplets, Users, Wifi } from "lucide-react";
import { fleetData } from "@/data/fleet";

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

// Shown first (in this order); every other vehicle follows in the carousel.
const FEATURED_IDS = ["cadillac-xts", "chevrolet-suburban", "cadillac-escalade"];

const BADGES: Record<string, string> = {
  Sedan: "Luxury sedan",
  SUV: "Luxury SUV",
  Van: "Luxury van",
  Executive: "Executive",
  Coach: "Coach",
};

const num = (s: string, fallback: number) => parseInt(s.match(/\d+/)?.[0] ?? "", 10) || fallback;

export default function LandingFleet() {
  const [vehicles, setVehicles] = useState<Vehicle[]>(fleetData as Vehicle[]);

  useEffect(() => {
    fetch("/api/fleet")
      .then((r) => r.json())
      .then((d) => {
        if (d.success && Array.isArray(d.vehicles) && d.vehicles.length) setVehicles(d.vehicles);
      })
      .catch(() => {});
  }, []);

  const rank = (id: string) => {
    const i = FEATURED_IDS.indexOf(id);
    return i === -1 ? FEATURED_IDS.length : i;
  };
  const cards = [...vehicles].sort((x, y) => rank(x.id) - rank(y.id));

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

        <div
          data-fleet-track
          className="flex snap-x snap-mandatory gap-6 overflow-x-auto scroll-smooth px-1 pb-8 pt-3 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {cards.map((v) => {
            const badge = BADGES[v.category ?? ""] ?? "Luxury";
            const guests = num(v.seating, 3);
            return (
              <article
                key={v.id}
                className="group flex w-full shrink-0 snap-start flex-col items-center rounded-2xl md:w-[calc((100%-3rem)/3)] border border-gray-200 bg-white p-5 text-center transition duration-300 hover:-translate-y-1 hover:border-[#C9A063]/60 hover:shadow-xl"
              >
                <div className="relative flex h-52 w-full items-center justify-center overflow-hidden rounded-xl bg-gradient-to-b from-gray-50 to-gray-100">
                  <span className="absolute left-3 top-3 z-10 rounded-full bg-black px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white">
                    {badge}
                  </span>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={v.image}
                    alt={v.name}
                    className={`transition duration-500 group-hover:scale-105 ${
                      /\.png(\?|$)/i.test(v.image) ? "max-h-44 w-full object-contain" : "absolute inset-0 h-full w-full object-cover"
                    }`}
                  />
                </div>

                <h3 className="mt-5 text-lg font-bold text-gray-950">{v.name}</h3>
                <p className="mt-1 text-xs font-semibold text-[#B8935A]">Best for 1–{guests} guests</p>
                <p className="mt-3 flex-1 text-sm font-light leading-6 text-gray-600">{v.description}</p>

                <ul className="mt-5 flex w-full flex-wrap justify-center gap-x-4 gap-y-2 border-t border-gray-100 pt-4 text-xs text-gray-500">
                  <li className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5 text-[#C9A063]" />{guests} guests</li>
                  <li className="flex items-center gap-1.5"><Briefcase className="h-3.5 w-3.5 text-[#C9A063]" />{num(v.luggage, 2)} bags</li>
                  <li className="flex items-center gap-1.5"><Wifi className="h-3.5 w-3.5 text-[#C9A063]" />Wi-Fi</li>
                  <li className="flex items-center gap-1.5"><Droplets className="h-3.5 w-3.5 text-[#C9A063]" />Water</li>
                </ul>

                <Link
                  href={`/reservation?mode=distance&vehicleId=${encodeURIComponent(v.id)}`}
                  className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-black py-3.5 text-[11px] font-bold uppercase tracking-[0.16em] text-white transition hover:bg-[#C9A063] hover:text-black"
                >
                  Book now
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </article>
            );
          })}
        </div>
        </div>
      </div>
    </section>
  );
}
