"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Search,
  Loader2,
  AlertCircle,
  Star,
  MessageSquareText,
  Users,
  X,
  Car,
  RefreshCw,
  ExternalLink,
} from "lucide-react";

type DriverSummary = {
  id: string;
  driverCode: string | null;
  name: string;
  photo: string | null;
  vehiclePlate: string | null;
  liveRating: number | null;
  reviewCount: number;
  averageStars: number | null;
};

type TripReviewRow = {
  id: string;
  bookingId: string;
  stars: number;
  comment: string | null;
  createdAt: string;
  customer: {
    id: string;
    name: string;
    email: string;
    phone: string;
  };
  driver: {
    id: string;
    driverCode: string;
    name: string;
    email: string;
    phone: string;
    photo: string | null;
    rating: number;
    vehicle: string;
    vehiclePlate: string;
  };
  trip: {
    serviceDate: string;
    serviceTime: string;
    pickupShort: string;
    dropoffShort: string;
    status: string;
  };
};

type Summary = {
  totalReviews: number;
  averageStars: number | null;
  driversWithReviews: number;
};

function Stars({ value, size = 14 }: { value: number; size?: number }) {
  const n = Math.max(0, Math.min(5, Math.round(value)));
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${n} of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          style={{ width: size, height: size }}
          className={i <= n ? "fill-[#C9A063] text-[#C9A063]" : "text-gray-300"}
        />
      ))}
    </span>
  );
}

function formatWhen(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

export default function AdminTripReviewsPage() {
  const [initialLoad, setInitialLoad] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [globalSummary, setGlobalSummary] = useState<Summary | null>(null);
  const [filteredTotal, setFilteredTotal] = useState<number | null>(null);
  const [drivers, setDrivers] = useState<DriverSummary[]>([]);
  const [reviews, setReviews] = useState<TripReviewRow[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);
  const [commentsOnly, setCommentsOnly] = useState(false);
  const [lowStarsOnly, setLowStarsOnly] = useState(false);
  const requestIdRef = useRef(0);
  const hasLoadedOnceRef = useRef(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(searchQuery.trim()), 280);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const load = useCallback(
    async (opts?: { cursor?: string; append?: boolean }) => {
      const reqId = ++requestIdRef.current;
      try {
        if (opts?.append) setLoadingMore(true);
        else if (hasLoadedOnceRef.current) setRefreshing(true);
        setError("");

        const params = new URLSearchParams();
        params.set("limit", "40");
        if (opts?.cursor) params.set("cursor", opts.cursor);
        if (selectedDriverId) params.set("driverId", selectedDriverId);
        if (debouncedQ) params.set("q", debouncedQ);
        if (commentsOnly) params.set("hasComment", "1");
        if (lowStarsOnly) params.set("maxStars", "2");

        const res = await fetch(`/api/admin/trip-reviews?${params}`, {
          credentials: "include",
        });
        const data = await res.json();
        if (reqId !== requestIdRef.current) return;

        if (!data.success) {
          setError(data.error || "Failed to load reviews");
          return;
        }

        setFilteredTotal(data.summary?.totalReviews ?? null);
        if (!selectedDriverId && !debouncedQ && !commentsOnly && !lowStarsOnly) {
          setGlobalSummary(data.summary || null);
        }
        setDrivers(data.drivers || []);
        setNextCursor(data.nextCursor || null);
        setReviews((prev) =>
          opts?.append ? [...prev, ...(data.reviews || [])] : data.reviews || []
        );
      } catch {
        if (reqId === requestIdRef.current) setError("Failed to connect to server");
      } finally {
        if (reqId === requestIdRef.current) {
          hasLoadedOnceRef.current = true;
          setInitialLoad(false);
          setRefreshing(false);
          setLoadingMore(false);
        }
      }
    },
    [selectedDriverId, debouncedQ, commentsOnly, lowStarsOnly]
  );

  // Load global headline once (unfiltered)
  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/admin/trip-reviews?limit=1", {
          credentials: "include",
        });
        const data = await res.json();
        if (data.success && data.summary) setGlobalSummary(data.summary);
      } catch {
        /* ignore — main load will surface errors */
      }
    })();
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const visibleReviews = reviews;

  const selectedDriver = useMemo(
    () => drivers.find((d) => d.id === selectedDriverId) || null,
    [drivers, selectedDriverId]
  );

  const filterActive = !!selectedDriverId || !!debouncedQ || commentsOnly || lowStarsOnly;

  const clearFilters = () => {
    setSelectedDriverId(null);
    setSearchQuery("");
    setDebouncedQ("");
    setCommentsOnly(false);
    setLowStarsOnly(false);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 tracking-tight">
            Trip Reviews
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Open, search, or tap a chauffeur — see who rated them and what they wrote.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={refreshing || initialLoad}
          className="inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Global summary — always platform-wide */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <div className="rounded-xl border border-gray-200/80 bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
            Total reviews
          </p>
          <p className="text-2xl font-bold text-gray-900 mt-1 tabular-nums">
            {globalSummary?.totalReviews ?? "—"}
          </p>
        </div>
        <div className="rounded-xl border border-gray-200/80 bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
            Average rating
          </p>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-2xl font-bold text-gray-900 tabular-nums">
              {globalSummary?.averageStars != null
                ? globalSummary.averageStars.toFixed(1)
                : "—"}
            </p>
            {globalSummary?.averageStars != null ? (
              <Stars value={globalSummary.averageStars} size={15} />
            ) : null}
          </div>
        </div>
        <div className="rounded-xl border border-gray-200/80 bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
            Drivers reviewed
          </p>
          <p className="text-2xl font-bold text-gray-900 mt-1 tabular-nums">
            {globalSummary?.driversWithReviews ?? "—"}
          </p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-5 lg:items-start">
        {/* Drivers sidebar */}
        <aside className="lg:w-[300px] shrink-0 lg:sticky lg:top-6">
          <div className="rounded-xl border border-gray-200/80 bg-white overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
              <Users className="w-4 h-4 text-[#C9A063]" />
              <h2 className="text-sm font-semibold text-gray-900">By chauffeur</h2>
            </div>
            <button
              type="button"
              onClick={() => setSelectedDriverId(null)}
              className={`w-full text-left px-4 py-3 text-sm border-b border-gray-50 transition-colors ${
                !selectedDriverId
                  ? "bg-[#C9A063]/10 text-gray-900 font-semibold"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              All drivers
            </button>
            <div className="max-h-[min(420px,55vh)] overflow-y-auto">
              {drivers.length === 0 && !initialLoad ? (
                <p className="px-4 py-6 text-sm text-gray-400 text-center">No reviews yet</p>
              ) : (
                drivers.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() =>
                      setSelectedDriverId((prev) => (prev === d.id ? null : d.id))
                    }
                    className={`w-full text-left px-4 py-3 flex items-center gap-3 border-b border-gray-50 transition-colors ${
                      selectedDriverId === d.id
                        ? "bg-[#C9A063]/10"
                        : "hover:bg-gray-50"
                    }`}
                  >
                    {d.photo ? (
                      <Image
                        src={d.photo}
                        alt=""
                        width={36}
                        height={36}
                        className="w-9 h-9 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500">
                        {(d.name[0] || "D").toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-gray-900 truncate">{d.name}</p>
                      <p className="text-[11px] text-gray-400 truncate">
                        {d.reviewCount} review{d.reviewCount === 1 ? "" : "s"}
                        {d.averageStars != null ? ` · ${d.averageStars.toFixed(1)}★` : ""}
                      </p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </aside>

        {/* Reviews feed */}
        <section className="flex-1 min-w-0">
          <div className="rounded-xl border border-gray-200/80 bg-white overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
            <div className="p-4 border-b border-gray-100 space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search name, booking ID, or comment…"
                  className="w-full pl-9 pr-9 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A063]/30 focus:border-[#C9A063]"
                />
                {searchQuery ? (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                    aria-label="Clear search"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                ) : null}
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setLowStarsOnly((v) => !v)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                    lowStarsOnly
                      ? "bg-red-50 text-red-700 ring-1 ring-red-200"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  <Star className="w-3.5 h-3.5" />
                  Low ratings (1–2★)
                </button>
                <button
                  type="button"
                  onClick={() => setCommentsOnly((v) => !v)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                    commentsOnly
                      ? "bg-[#C9A063]/15 text-[#8B6914] ring-1 ring-[#C9A063]/40"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  <MessageSquareText className="w-3.5 h-3.5" />
                  With comments
                </button>
                {filterActive ? (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium text-gray-500 hover:bg-gray-100"
                  >
                    <X className="w-3.5 h-3.5" />
                    Clear filters
                  </button>
                ) : null}
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                {refreshing ? (
                  <span className="inline-flex items-center gap-1.5 text-gray-400">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Updating…
                  </span>
                ) : (
                  <span className="tabular-nums">
                    {filteredTotal ?? visibleReviews.length} review
                    {(filteredTotal ?? visibleReviews.length) === 1 ? "" : "s"}
                    {filterActive ? " matching filters" : ""}
                  </span>
                )}
                {selectedDriverId ? (
                  <button
                    type="button"
                    onClick={() => setSelectedDriverId(null)}
                    className="inline-flex items-center gap-1.5 font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 px-2.5 py-1 rounded-full transition-colors"
                  >
                    {selectedDriver?.name || "Driver"}
                    <X className="w-3.5 h-3.5" />
                  </button>
                ) : null}
              </div>
            </div>

            {initialLoad ? (
              <div className="flex items-center justify-center py-20 text-gray-400 gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                Loading reviews…
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center gap-3 py-16 text-red-600 text-sm">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  {error}
                </div>
                <button
                  type="button"
                  onClick={() => void load()}
                  className="text-sm font-semibold text-gray-700 underline"
                >
                  Try again
                </button>
              </div>
            ) : visibleReviews.length === 0 ? (
              <div className="py-16 px-6 text-center">
                <div className="mx-auto w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center mb-3">
                  <MessageSquareText className="w-5 h-5 text-gray-300" />
                </div>
                <p className="text-sm font-medium text-gray-600">
                  {filterActive ? "No reviews match these filters" : "No trip reviews yet"}
                </p>
                <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
                  {filterActive
                    ? "Try clearing filters, or pick another chauffeur."
                    : "When customers rate completed trips, they will show up here."}
                </p>
                {filterActive ? (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="mt-4 text-sm font-semibold text-[#8B6914] underline"
                  >
                    Clear filters
                  </button>
                ) : null}
              </div>
            ) : (
              <ul
                className={`divide-y divide-gray-100 transition-opacity duration-200 ${
                  refreshing ? "opacity-60" : "opacity-100"
                }`}
              >
                {visibleReviews.map((r) => (
                  <li key={r.id} className="p-4 sm:p-5 hover:bg-gray-50/70 transition-colors">
                    <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4">
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        {r.driver.photo ? (
                          <Image
                            src={r.driver.photo}
                            alt=""
                            width={44}
                            height={44}
                            className="w-11 h-11 rounded-full object-cover shrink-0 ring-1 ring-black/5"
                          />
                        ) : (
                          <div className="w-11 h-11 rounded-full bg-[#C9A063]/15 flex items-center justify-center shrink-0">
                            <Car className="w-5 h-5 text-[#C9A063]" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                            <p className="text-sm font-semibold text-gray-900">
                              {r.driver.name}
                            </p>
                            <Stars value={r.stars} />
                            <span className="text-xs font-semibold text-gray-500 tabular-nums">
                              {r.stars}/5
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            From{" "}
                            <span className="font-medium text-gray-800">{r.customer.name}</span>
                            {r.customer.email ? (
                              <span className="text-gray-400"> · {r.customer.email}</span>
                            ) : null}
                            {r.customer.phone ? (
                              <span className="text-gray-400"> · {r.customer.phone}</span>
                            ) : null}
                          </p>
                          <div className="flex flex-wrap items-center gap-2 mt-1.5">
                            <Link
                              href={`/admin/reservations?q=${encodeURIComponent(r.bookingId)}`}
                              className="inline-flex items-center gap-1 font-mono text-[11px] text-gray-600 bg-gray-100 hover:bg-gray-200 px-2 py-0.5 rounded-md transition-colors"
                              title="Open in reservations"
                            >
                              {r.bookingId}
                              <ExternalLink className="w-3 h-3 opacity-60" />
                            </Link>
                            <span className="text-[11px] text-gray-400">
                              {r.trip.serviceDate || "—"}
                              {r.trip.serviceTime ? ` · ${r.trip.serviceTime}` : ""}
                            </span>
                          </div>
                          <p className="text-[11px] text-gray-400 mt-1 truncate">
                            {r.trip.pickupShort} → {r.trip.dropoffShort}
                          </p>

                          {r.comment ? (
                            <div className="mt-3 rounded-lg bg-[#fafafa] border border-gray-100 px-3 py-2.5">
                              <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1">
                                <MessageSquareText className="w-3.5 h-3.5" />
                                Comment
                              </div>
                              <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
                                {r.comment}
                              </p>
                            </div>
                          ) : (
                            <p className="mt-2 text-xs italic text-gray-400">
                              Stars only — no written comment
                            </p>
                          )}
                        </div>
                      </div>
                      <p className="text-[11px] text-gray-400 sm:text-right shrink-0 sm:pt-0.5 tabular-nums">
                        {formatWhen(r.createdAt)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {nextCursor ? (
              <div className="p-4 border-t border-gray-100 flex justify-center">
                <button
                  type="button"
                  disabled={loadingMore}
                  onClick={() => void load({ cursor: nextCursor, append: true })}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-[#8B6914] bg-[#C9A063]/15 hover:bg-[#C9A063]/25 disabled:opacity-50 transition-colors"
                >
                  {loadingMore ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Load more
                </button>
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );
}
