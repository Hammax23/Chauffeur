"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Search, Loader2, Edit, Filter } from "lucide-react";

interface PageRow {
  path: string;
  pageLabel: string;
  pageType: string;
  pageTypeLabel: string;
  title: string | null;
  metaDescription: string | null;
  focusKeyword: string | null;
  robotsIndex: boolean;
  includeInSitemap: boolean;
  score: number;
  hasOverride: boolean;
}

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 80 ? "bg-emerald-100 text-emerald-700" :
    score >= 50 ? "bg-amber-100 text-amber-700" :
    "bg-red-100 text-red-700";
  return <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${color}`}>{score}</span>;
}

export default function SeoPagesList() {
  const [pages, setPages] = useState<PageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");

  const fetchPages = useCallback(async () => {
    const params = new URLSearchParams();
    if (search) params.set("q", search);
    if (typeFilter) params.set("type", typeFilter);
    const res = await fetch(`/api/seopanel/pages?${params}`, { credentials: "include" });
    const data = await res.json();
    if (data.success) setPages(data.pages);
    setLoading(false);
  }, [search, typeFilter]);

  useEffect(() => {
    const timer = setTimeout(fetchPages, 300);
    return () => clearTimeout(timer);
  }, [fetchPages]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Page SEO Manager</h1>
        <p className="text-gray-500 text-sm mt-1">Edit title, meta description, OG tags, schema & robots for every page</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search pages..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="pl-10 pr-8 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
          >
            <option value="">All Types</option>
            <option value="static">Static</option>
            <option value="service">Service</option>
            <option value="city">City</option>
            <option value="legal">Legal</option>
            <option value="utility">Utility</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Page</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden md:table-cell">Title</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden lg:table-cell">Type</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-600">Score</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-600">Index</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600">Edit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {pages.map((page) => (
                  <tr key={page.path} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{page.pageLabel}</p>
                      <p className="text-xs text-gray-400 font-mono">{page.path}</p>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell max-w-xs truncate text-gray-600">
                      {page.title || <span className="text-red-400 italic">Missing</span>}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">{page.pageTypeLabel}</span>
                    </td>
                    <td className="px-4 py-3 text-center"><ScoreBadge score={page.score} /></td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-xs font-medium ${page.robotsIndex ? "text-emerald-600" : "text-red-500"}`}>
                        {page.robotsIndex ? "Index" : "Noindex"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/seopanel/pages/edit?path=${encodeURIComponent(page.path)}`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-medium hover:bg-emerald-100"
                      >
                        <Edit className="w-3.5 h-3.5" />
                        Edit
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
