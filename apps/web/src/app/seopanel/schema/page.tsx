"use client";

import { useState, useEffect } from "react";
import { Save, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

const textareaCls = "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/30 min-h-[300px] resize-y";

const DEFAULT_LOCAL_BUSINESS = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  name: "SARJ Worldwide Chauffeur Services",
  url: "https://sarjworldwide.ca",
  logo: "https://sarjworldwide.ca/logo1.png",
  description: "Premium luxury chauffeur services. Airport transfers, corporate travel, weddings & VIP transport.",
  telephone: "+1-XXX-XXX-XXXX",
  email: "reserve@sarjworldwide.ca",
  address: {
    "@type": "PostalAddress",
    addressCountry: "CA",
  },
  priceRange: "$$$",
  openingHoursSpecification: {
    "@type": "OpeningHoursSpecification",
    dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
    opens: "00:00",
    closes: "23:59",
  },
};

export default function SeoSchemaPage() {
  const [localBusiness, setLocalBusiness] = useState("");
  const [website, setWebsite] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    fetch("/api/seopanel/settings", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setLocalBusiness(
            d.settings.localBusinessSchema
              ? JSON.stringify(d.settings.localBusinessSchema, null, 2)
              : JSON.stringify(DEFAULT_LOCAL_BUSINESS, null, 2)
          );
          setWebsite(
            d.settings.websiteSchema
              ? JSON.stringify(d.settings.websiteSchema, null, 2)
              : JSON.stringify({
                  "@context": "https://schema.org",
                  "@type": "WebSite",
                  name: "SARJ Worldwide Chauffeur Services",
                  url: "https://sarjworldwide.ca",
                }, null, 2)
          );
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const localBusinessSchema = localBusiness.trim() ? JSON.parse(localBusiness) : null;
      const websiteSchema = website.trim() ? JSON.parse(website) : null;
      const res = await fetch("/api/seopanel/settings", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ localBusinessSchema, websiteSchema }),
      });
      const data = await res.json();
      setMessage(data.success ? { type: "ok", text: "Schema markup saved" } : { type: "err", text: data.error });
    } catch {
      setMessage({ type: "err", text: "Invalid JSON — please fix syntax errors" });
    }
    setSaving(false);
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-emerald-600" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Structured Data (JSON-LD)</h1>
          <p className="text-gray-500 text-sm mt-1">Global schema markup injected on all pages</p>
        </div>
        <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 disabled:opacity-60">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Schema
        </button>
      </div>

      {message && (
        <div className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm ${message.type === "ok" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
          {message.type === "ok" ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {message.text}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-4">
        <h2 className="font-semibold text-gray-900">LocalBusiness Schema</h2>
        <p className="text-xs text-gray-500">Used for Google Business / local SEO rich results</p>
        <textarea className={textareaCls} value={localBusiness} onChange={(e) => setLocalBusiness(e.target.value)} />
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-4">
        <h2 className="font-semibold text-gray-900">WebSite Schema</h2>
        <p className="text-xs text-gray-500">Site-level schema with search action (sitelinks search box)</p>
        <textarea className={textareaCls} value={website} onChange={(e) => setWebsite(e.target.value)} />
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm text-amber-800">
        <strong>Per-page schema:</strong> Edit individual page JSON-LD in{" "}
        <a href="/seopanel/pages" className="underline font-medium">Page SEO → Schema tab</a>.
        Validate at{" "}
        <a href="https://search.google.com/test/rich-results" target="_blank" rel="noopener noreferrer" className="underline">Google Rich Results Test</a>.
      </div>
    </div>
  );
}
