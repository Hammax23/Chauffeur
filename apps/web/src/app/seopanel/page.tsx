"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  FileText, AlertTriangle, ArrowRightLeft, Map, TrendingUp,
  Loader2, RefreshCw, ExternalLink, CheckCircle2,
} from "lucide-react";

interface Stats {
  totalPages: number;
  pagesWithOverrides: number;
  missingTitles: number;
  missingDescriptions: number;
  missingOgImages: number;
  noindexPages: number;
  activeRedirects: number;
  averageSeoScore: number;
  sitemapEnabled: boolean;
  siteUrl: string;
}

interface PageRow {
  path: string;
  pageLabel: string;
  score: number;
  missingTitle: boolean;
  missingDescription: boolean;
}

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 80 ? "bg-emerald-100 text-emerald-700" :
    score >= 50 ? "bg-amber-100 text-amber-700" :
    "bg-red-100 text-red-700";
  return <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${color}`}>{score}</span>;
}

export default function SeoDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [lowScorePages, setLowScorePages] = useState<PageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const fetchData = useCallback(async (autoSync = false) => {
    try {
      if (autoSync) {
        await fetch("/api/seopanel/pages", { method: "POST", credentials: "include" });
      }
      const res = await fetch("/api/seopanel/dashboard", { credentials: "include" });
      const data = await res.json();
      if (data.success) {
        setStats(data.stats);
        setLowScorePages(data.pages || []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(true); }, [fetchData]);

  const handleSync = async () => {
    setSyncing(true);
    await fetch("/api/seopanel/pages", { method: "POST", credentials: "include" });
    await fetchData(false);
    setSyncing(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 animate-spin text-emerald-600" />
      </div>
    );
  }

  const statCards = [
    { label: "Total Pages", value: stats?.totalPages ?? 0, icon: FileText, color: "text-blue-600 bg-blue-50" },
    { label: "Avg SEO Score", value: `${stats?.averageSeoScore ?? 0}%`, icon: TrendingUp, color: "text-emerald-600 bg-emerald-50" },
    { label: "Missing Titles", value: stats?.missingTitles ?? 0, icon: AlertTriangle, color: "text-amber-600 bg-amber-50" },
    { label: "Missing Descriptions", value: stats?.missingDescriptions ?? 0, icon: AlertTriangle, color: "text-orange-600 bg-orange-50" },
    { label: "Active Redirects", value: stats?.activeRedirects ?? 0, icon: ArrowRightLeft, color: "text-purple-600 bg-purple-50" },
    { label: "Noindex Pages", value: stats?.noindexPages ?? 0, icon: Map, color: "text-red-600 bg-red-50" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">SEO Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">Site health overview for {stats?.siteUrl}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 disabled:opacity-60"
          >
            {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Sync Pages
          </button>
          <a
            href={stats?.siteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 border border-gray-200 bg-white rounded-xl text-sm font-medium hover:bg-gray-50"
          >
            <ExternalLink className="w-4 h-4" />
            View Site
          </a>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${card.color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <p className="text-2xl font-bold text-gray-900">{card.value}</p>
              <p className="text-xs text-gray-500 mt-1">{card.label}</p>
            </div>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Pages Needing Attention</h2>
            <p className="text-xs text-gray-500">Lowest SEO scores — fix these first</p>
          </div>
          <div className="divide-y divide-gray-50">
            {lowScorePages.map((page) => (
              <Link
                key={page.path}
                href={`/seopanel/pages/edit?path=${encodeURIComponent(page.path)}`}
                className="flex items-center justify-between px-6 py-3 hover:bg-gray-50 transition-colors"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">{page.pageLabel}</p>
                  <p className="text-xs text-gray-400 font-mono">{page.path}</p>
                </div>
                <ScoreBadge score={page.score} />
              </Link>
            ))}
            {lowScorePages.length === 0 && (
              <p className="px-6 py-8 text-center text-gray-400 text-sm">All pages look good!</p>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="space-y-3">
            {[
              { href: "/seopanel/pages", label: "Manage All Page SEO", desc: "Titles, descriptions, OG tags" },
              { href: "/seopanel/global", label: "Global Settings", desc: "Site defaults & verification" },
              { href: "/seopanel/redirects", label: "URL Redirects", desc: "301/302 redirect rules" },
              { href: "/seopanel/schema", label: "Structured Data", desc: "JSON-LD schema markup" },
              { href: "/seopanel/sitemap", label: "Sitemap Config", desc: "Priority & change frequency" },
              { href: "/seopanel/robots", label: "Robots.txt", desc: "Crawler directives" },
            ].map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-emerald-200 hover:bg-emerald-50/50 transition-all"
              >
                <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-gray-900">{action.label}</p>
                  <p className="text-xs text-gray-500">{action.desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
