"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ExternalLink, Loader2 } from "lucide-react";

export default function SeoSitemapPage() {
  const [settings, setSettings] = useState<{ siteUrl?: string; sitemapEnabled?: boolean }>({});
  const [pages, setPages] = useState<{ path: string; includeInSitemap: boolean; score: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/seopanel/settings", { credentials: "include" }).then((r) => r.json()),
      fetch("/api/seopanel/pages", { credentials: "include" }).then((r) => r.json()),
    ]).then(([settingsData, pagesData]) => {
      if (settingsData.success) setSettings(settingsData.settings);
      if (pagesData.success) setPages(pagesData.pages.filter((p: { includeInSitemap: boolean }) => p.includeInSitemap));
    }).finally(() => setLoading(false));
  }, []);

  const siteUrl = settings.siteUrl || "https://sarjworldwide.ca";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sitemap Configuration</h1>
          <p className="text-gray-500 text-sm mt-1">Pages included in your XML sitemap</p>
        </div>
        <a href="/sitemap.xml" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-2 border border-gray-200 bg-white rounded-xl text-sm font-medium hover:bg-gray-50">
          <ExternalLink className="w-4 h-4" />
          View sitemap.xml
        </a>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
        <div className="flex items-center gap-4 mb-4">
          <span className={`px-3 py-1 rounded-full text-xs font-bold ${settings.sitemapEnabled ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
            {settings.sitemapEnabled ? "Sitemap Active" : "Sitemap Disabled"}
          </span>
          <span className="text-sm text-gray-500">URL: <code className="bg-gray-100 px-2 py-0.5 rounded">{siteUrl}/sitemap.xml</code></span>
        </div>
        <p className="text-sm text-gray-600">
          Submit this URL to <strong>Google Search Console</strong> and <strong>Bing Webmaster Tools</strong>.
          Per-page priority and change frequency can be set in each page&apos;s Technical SEO tab.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-emerald-600" /></div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">{pages.length} Pages in Sitemap</h2>
          </div>
          <div className="divide-y divide-gray-50 max-h-[500px] overflow-y-auto">
            {pages.map((page) => (
              <div key={page.path} className="flex items-center justify-between px-6 py-3 hover:bg-gray-50">
                <div>
                  <p className="text-sm font-mono text-gray-800">{siteUrl}{page.path === "/" ? "" : page.path}</p>
                </div>
                <Link href={`/seopanel/pages/edit?path=${encodeURIComponent(page.path)}`} className="text-xs text-emerald-600 hover:underline">
                  Edit priority
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
