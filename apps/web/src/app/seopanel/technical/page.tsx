"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { CheckCircle2, XCircle, AlertTriangle, Loader2, ExternalLink } from "lucide-react";

interface CheckItem {
  label: string;
  status: "pass" | "fail" | "warn";
  detail: string;
  href?: string;
}

export default function SeoTechnicalPage() {
  const [checks, setChecks] = useState<CheckItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/seopanel/dashboard", { credentials: "include" }).then((r) => r.json()),
      fetch("/api/seopanel/settings", { credentials: "include" }).then((r) => r.json()),
      fetch("/api/seopanel/redirects", { credentials: "include" }).then((r) => r.json()),
    ]).then(([dash, settings, redirects]) => {
      const s = dash.success ? dash.stats : {};
      const cfg = settings.success ? settings.settings : {};
      const items: CheckItem[] = [
        {
          label: "HTTPS Site URL",
          status: cfg.siteUrl?.startsWith("https://") ? "pass" : "fail",
          detail: cfg.siteUrl || "Not configured",
          href: "/seopanel/global",
        },
        {
          label: "Default Meta Title",
          status: cfg.defaultTitle?.length >= 30 ? "pass" : "warn",
          detail: cfg.defaultTitle ? `${cfg.defaultTitle.length} chars` : "Missing",
          href: "/seopanel/global",
        },
        {
          label: "Default Meta Description",
          status: cfg.defaultDescription?.length >= 120 ? "pass" : "warn",
          detail: cfg.defaultDescription ? `${cfg.defaultDescription.length} chars` : "Missing",
          href: "/seopanel/global",
        },
        {
          label: "Default OG Image",
          status: cfg.defaultOgImage ? "pass" : "fail",
          detail: cfg.defaultOgImage || "Not set — social shares will look poor",
          href: "/seopanel/global",
        },
        {
          label: "XML Sitemap",
          status: cfg.sitemapEnabled ? "pass" : "fail",
          detail: cfg.sitemapEnabled ? "Enabled at /sitemap.xml" : "Disabled",
          href: "/seopanel/sitemap",
        },
        {
          label: "Google Search Console",
          status: cfg.googleVerification ? "pass" : "warn",
          detail: cfg.googleVerification ? "Verified" : "Not verified — add verification code",
          href: "/seopanel/analytics",
        },
        {
          label: "Pages Missing Titles",
          status: (s.missingTitles ?? 0) === 0 ? "pass" : "fail",
          detail: `${s.missingTitles ?? 0} pages need titles`,
          href: "/seopanel/pages",
        },
        {
          label: "Pages Missing Descriptions",
          status: (s.missingDescriptions ?? 0) === 0 ? "pass" : "fail",
          detail: `${s.missingDescriptions ?? 0} pages need descriptions`,
          href: "/seopanel/pages",
        },
        {
          label: "Average SEO Score",
          status: (s.averageSeoScore ?? 0) >= 70 ? "pass" : (s.averageSeoScore ?? 0) >= 50 ? "warn" : "fail",
          detail: `${s.averageSeoScore ?? 0}% across ${s.totalPages ?? 0} pages`,
          href: "/seopanel/pages",
        },
        {
          label: "Structured Data",
          status: cfg.localBusinessSchema ? "pass" : "warn",
          detail: cfg.localBusinessSchema ? "LocalBusiness schema configured" : "Add LocalBusiness JSON-LD",
          href: "/seopanel/schema",
        },
        {
          label: "URL Redirects",
          status: "pass",
          detail: `${redirects.success ? redirects.redirects.length : 0} redirects configured`,
          href: "/seopanel/redirects",
        },
        {
          label: "Robots.txt",
          status: "pass",
          detail: "Dynamic robots.txt at /robots.txt",
          href: "/seopanel/robots",
        },
      ];
      setChecks(items);
    }).finally(() => setLoading(false));
  }, []);

  const passCount = checks.filter((c) => c.status === "pass").length;
  const Icon = ({ status }: { status: string }) => {
    if (status === "pass") return <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
    if (status === "warn") return <AlertTriangle className="w-5 h-5 text-amber-500" />;
    return <XCircle className="w-5 h-5 text-red-500" />;
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-emerald-600" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Technical SEO Audit</h1>
        <p className="text-gray-500 text-sm mt-1">Automated checklist — {passCount}/{checks.length} checks passing</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
        <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-500 rounded-full transition-all"
            style={{ width: `${checks.length ? (passCount / checks.length) * 100 : 0}%` }}
          />
        </div>
        <p className="text-center text-sm text-gray-500 mt-2">{Math.round((passCount / checks.length) * 100)}% health score</p>
      </div>

      <div className="space-y-3">
        {checks.map((check) => (
          <div key={check.label} className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-4 shadow-sm">
            <Icon status={check.status} />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 text-sm">{check.label}</p>
              <p className="text-xs text-gray-500 truncate">{check.detail}</p>
            </div>
            {check.href && (
              <Link href={check.href} className="text-xs text-emerald-600 hover:underline flex items-center gap-1 shrink-0">
                Fix <ExternalLink className="w-3 h-3" />
              </Link>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
