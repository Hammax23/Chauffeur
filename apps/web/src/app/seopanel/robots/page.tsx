"use client";

import { useState, useEffect } from "react";
import { Save, Loader2, CheckCircle2, ExternalLink } from "lucide-react";

const textareaCls = "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/30 min-h-[200px] resize-y";

export default function SeoRobotsPage() {
  const [extraRules, setExtraRules] = useState("");
  const [siteUrl, setSiteUrl] = useState("https://sarjworldwide.ca");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/seopanel/settings", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setExtraRules(d.settings.robotsExtraRules || "");
          setSiteUrl(d.settings.siteUrl || "https://sarjworldwide.ca");
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    await fetch("/api/seopanel/settings", {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ robotsExtraRules: extraRules }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const preview = `User-agent: *
Allow: /

Sitemap: ${siteUrl}/sitemap.xml

# Blocked paths
Disallow: /api/
Disallow: /_next/
Disallow: /admin/
Disallow: /seopanel/
Disallow: /operational-manager/

${extraRules}`.trim();

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-emerald-600" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Robots.txt Editor</h1>
          <p className="text-gray-500 text-sm mt-1">Control search engine crawler access</p>
        </div>
        <div className="flex gap-2">
          <a href="/robots.txt" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-2 border border-gray-200 bg-white rounded-xl text-sm font-medium hover:bg-gray-50">
            <ExternalLink className="w-4 h-4" />
            Live robots.txt
          </a>
          <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 disabled:opacity-60">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            {saved ? "Saved!" : "Save Rules"}
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <h2 className="font-semibold text-gray-900 mb-2">Additional Rules</h2>
          <p className="text-xs text-gray-500 mb-4">Add custom Disallow/Allow rules below. Core rules are managed automatically.</p>
          <textarea
            className={textareaCls}
            value={extraRules}
            onChange={(e) => setExtraRules(e.target.value)}
            placeholder={"# Example:\nDisallow: /private-page\nAllow: /public-page"}
          />
        </div>
        <div className="bg-gray-900 rounded-2xl p-6 shadow-sm">
          <h2 className="font-semibold text-emerald-400 mb-4 text-sm uppercase tracking-wider">Live Preview</h2>
          <pre className="text-green-400 text-xs font-mono whitespace-pre-wrap leading-relaxed">{preview}</pre>
        </div>
      </div>
    </div>
  );
}
