"use client";

import { useState, useEffect } from "react";
import { Save, Loader2, CheckCircle2 } from "lucide-react";

const inputCls = "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30";

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {hint && <p className="text-xs text-gray-400 mb-2">{hint}</p>}
      {children}
    </div>
  );
}

export default function SeoAnalyticsPage() {
  const [form, setForm] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/seopanel/settings", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setForm({
            ga4Id: d.settings.ga4Id || "",
            gtmId: d.settings.gtmId || "",
            facebookPixelId: d.settings.facebookPixelId || "",
            googleVerification: d.settings.googleVerification || "",
            bingVerification: d.settings.bingVerification || "",
          });
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
      body: JSON.stringify(form),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-emerald-600" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics & Tracking Tags</h1>
          <p className="text-gray-500 text-sm mt-1">GA4, GTM, Facebook Pixel & search console verification</p>
        </div>
        <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 disabled:opacity-60">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          {saved ? "Saved!" : "Save"}
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-5">
        <Field label="Google Analytics 4 (GA4) Measurement ID" hint="Format: G-XXXXXXXXXX">
          <input className={inputCls} value={form.ga4Id} onChange={(e) => setForm({ ...form, ga4Id: e.target.value })} placeholder="G-XXXXXXXXXX" />
        </Field>
        <Field label="Google Tag Manager Container ID" hint="Format: GTM-XXXXXXX">
          <input className={inputCls} value={form.gtmId} onChange={(e) => setForm({ ...form, gtmId: e.target.value })} placeholder="GTM-XXXXXXX" />
        </Field>
        <Field label="Facebook Pixel ID">
          <input className={inputCls} value={form.facebookPixelId} onChange={(e) => setForm({ ...form, facebookPixelId: e.target.value })} placeholder="1234567890" />
        </Field>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-5">
        <h2 className="font-semibold text-gray-900">Search Console Verification</h2>
        <Field label="Google Search Console Verification Code">
          <input className={inputCls} value={form.googleVerification} onChange={(e) => setForm({ ...form, googleVerification: e.target.value })} placeholder="google-site-verification content value" />
        </Field>
        <Field label="Bing Webmaster Verification Code">
          <input className={inputCls} value={form.bingVerification} onChange={(e) => setForm({ ...form, bingVerification: e.target.value })} />
        </Field>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 text-sm text-blue-800">
        <strong>Note:</strong> After saving GA4/GTM IDs, add the tracking scripts to your site via GTM or contact your developer to inject them in the root layout.
        Verification meta tags are applied automatically via the SEO metadata system.
      </div>
    </div>
  );
}
