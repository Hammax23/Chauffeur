"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Briefcase, Droplets, Users, Wifi } from "lucide-react";
import { fleetData } from "@/data/fleet";

interface Vehicle {
  id: string;
  name: string;
  description: string;
  image: string;
  seating: string;
  luggage: string;
  price: number;
}

// One sedan, one SUV and the van, using the same vehicles and images as the fleet page.
const FEATURED = [
  { id: "mercedes-s-class", badge: "Executive sedan" },
  { id: "cadillac-escalade", badge: "Luxury SUV" },
  { id: "sprinter-van", badge: "Sprinter van" },
];

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

  const cards = FEATURED.map((f) => ({ ...f, v: vehicles.find((v) => v.id === f.id) })).filter(
    (c): c is typeof c & { v: Vehicle } => !!c.v
  );

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

        <div className="grid gap-6 md:grid-cols-3">
          {cards.map(({ v, badge }) => {
            const guests = num(v.seating, 3);
            return (
              <article
                key={v.id}
                className="group flex flex-col items-center rounded-2xl border border-gray-200 bg-white p-5 text-center transition duration-300 hover:-translate-y-1 hover:border-[#C9A063]/60 hover:shadow-xl"
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
                <p className="mt-1 whitespace-nowrap">
                  <span className="mr-1 text-[10px] uppercase tracking-wider text-gray-400">From</span>
                  <span className="text-lg font-bold text-gray-950">${v.price}</span>
                  <span className="text-xs text-gray-400">/hr</span>
                </p>
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
    </section>
  );
}
