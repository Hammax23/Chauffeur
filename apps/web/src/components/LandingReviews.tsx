"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Star } from "lucide-react";

interface Review {
  author: string;
  rating: number;
  text: string;
  relativeTime: string;
  profilePhoto: string;
}
interface ReviewsData {
  rating: number;
  totalReviews: number;
  reviews: Review[];
}

function useGoogleReviews() {
  const [data, setData] = useState<ReviewsData | null>(null);
  useEffect(() => {
    fetch("/api/google-reviews")
      .then((r) => r.json())
      .then((j: ReviewsData) => {
        if (j.reviews?.length) setData(j);
      })
      .catch(() => {});
  }, []);
  return data;
}

const Stars = ({ value, className = "h-4 w-4" }: { value: number; className?: string }) => (
  <span className="inline-flex gap-0.5">
    {[1, 2, 3, 4, 5].map((s) => (
      <Star key={s} className={`${className} ${s <= Math.round(value) ? "fill-[#C9A063] text-[#C9A063]" : "text-gray-300"}`} />
    ))}
  </span>
);

/** Compact rating chip for the hero. Renders nothing until live data loads. */
export function HeroRating() {
  const data = useGoogleReviews();
  if (!data) return null;
  return (
    <div className="inline-flex items-center gap-2.5 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs text-white backdrop-blur">
      <Stars value={data.rating} className="h-3.5 w-3.5" />
      <span className="font-semibold">{data.rating.toFixed(1)}</span>
      <span className="text-white/70">· {data.totalReviews} Google reviews</span>
    </div>
  );
}

const MIN_CARDS = 8;

export function ReviewsSection() {
  const data = useGoogleReviews();
  if (!data) return null;

  // Same curation as the home page reviews, but keep every review so the strip has plenty to scroll.
  const base = data.reviews
    .filter((r) => !r.author.toLowerCase().includes("zaid"))
    .sort((a, b) => (a.author.toLowerCase().includes("alexandra") ? -1 : b.author.toLowerCase().includes("alexandra") ? 1 : 0));
  // Repeat the set until it comfortably overfills the viewport, then render it twice for a seamless loop.
  const set = Array.from({ length: Math.max(base.length, MIN_CARDS) }, (_, i) => base[i % base.length]);
  const track = [...set, ...set];
  const seconds = set.length * 6;

  return (
    <section className="overflow-hidden border-y border-gray-200 bg-[#f2f1ee] py-20 sm:py-28">
      <style>{`
        @keyframes landing-reviews-rtl { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        .landing-reviews-track { animation: landing-reviews-rtl ${seconds}s linear infinite; }
        .landing-reviews:hover .landing-reviews-track { animation-play-state: paused; }
        @media (prefers-reduced-motion: reduce) { .landing-reviews-track { animation: none; } }
      `}</style>

      <div className="mx-auto max-w-[1200px] px-6 sm:px-8 lg:px-12">
        <div className="mx-auto mb-12 max-w-3xl text-center sm:mb-14">
          <span className="text-xs font-bold uppercase tracking-[0.24em] text-[#C9A063]">Ratings &amp; reviews</span>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-gray-950 sm:text-4xl md:text-5xl">
            Trusted by <span className="text-[#C9A063]">travellers</span> across Canada
          </h2>
          <p className="mt-5 text-base font-light leading-7 text-gray-600">See what real clients say about their SARJ Worldwide experience.</p>
        </div>
      </div>

      <div className="mx-auto flex max-w-[1400px] flex-col gap-5 px-6 sm:px-8 lg:flex-row lg:px-12">
        <div className="flex flex-shrink-0 flex-col items-center justify-center rounded-2xl bg-black p-8 text-center text-white lg:w-[280px]">
          <div className="text-6xl font-bold">{data.rating.toFixed(1)}</div>
          <div className="mt-3">
            <Stars value={data.rating} className="h-5 w-5" />
          </div>
          <p className="mt-3 text-xs text-white/60">Based on {data.totalReviews} Google reviews</p>
          <Link href="/reservation" className="mt-6 rounded-full bg-[#C9A063] px-7 py-3 text-xs font-bold uppercase tracking-[0.14em] text-black transition hover:bg-white">
            Book now
          </Link>
        </div>

        {/* Reviews scroll continuously from right to left; hover pauses */}
        <div
          className="landing-reviews relative min-w-0 flex-1 overflow-hidden"
          style={{ maskImage: "linear-gradient(to right, transparent, #000 4%, #000 96%, transparent)", WebkitMaskImage: "linear-gradient(to right, transparent, #000 4%, #000 96%, transparent)" }}
        >
          <div className="landing-reviews-track flex w-max gap-5">
            {track.map((r, i) => (
              <article
                key={`${r.author}-${i}`}
                aria-hidden={i >= set.length}
                className="flex w-[300px] flex-shrink-0 flex-col items-center rounded-2xl border border-gray-200 bg-white p-7 text-center"
              >
                <Stars value={r.rating} />
                <p className="mt-4 line-clamp-5 flex-1 text-sm font-light leading-7 text-gray-600">“{r.text || "Great experience!"}”</p>
                <div className="mt-6 flex w-full flex-col items-center gap-2 border-t border-gray-100 pt-5">
                  <span className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-black text-sm font-bold text-[#C9A063]">
                    {r.profilePhoto ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={r.profilePhoto} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      r.author.charAt(0)
                    )}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-gray-950">{r.author}</p>
                    <p className="text-xs text-gray-400">{r.relativeTime}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
