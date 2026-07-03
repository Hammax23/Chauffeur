"use client";

import { useState, useEffect } from "react";
import { Loader2, Save, CheckCircle2, AlertCircle } from "lucide-react";

const inputCls = "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500";
const textareaCls = `${inputCls} resize-y min-h-[80px]`;

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-4">
      <h2 className="font-semibold text-gray-900 border-b border-gray-100 pb-3">{title}</h2>
      {children}
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {hint && <p className="text-xs text-gray-400 mb-2">{hint}</p>}
      {children}
    </div>
  );
}

export default function SeoGlobalSettings() {
  const [form, setForm] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    fetch("/api/seopanel/settings", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => { if (d.success) setForm(d.settings); })
      .finally(() => setLoading(false));
  }, []);

  const set = (key: string, value: unknown) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    const res = await fetch("/api/seopanel/settings", {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setMessage(data.success ? { type: "ok", text: "Global settings saved" } : { type: "err", text: data.error || "Save failed" });
    if (data.success) setForm(data.settings);
    setSaving(false);
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-emerald-600" /></div>;

  const str = (key: string) => String(form[key] ?? "");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Global SEO Settings</h1>
          <p className="text-gray-500 text-sm mt-1">Site-wide defaults applied to all pages</p>
        </div>
        <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 disabled:opacity-60">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save All
        </button>
      </div>

      {message && (
        <div className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm ${message.type === "ok" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
          {message.type === "ok" ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {message.text}
        </div>
      )}

      <Section title="Site Identity">
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Site URL"><input className={inputCls} value={str("siteUrl")} onChange={(e) => set("siteUrl", e.target.value)} /></Field>
          <Field label="Site Name"><input className={inputCls} value={str("siteName")} onChange={(e) => set("siteName", e.target.value)} /></Field>
          <Field label="Title Template" hint="Use %s for page title"><input className={inputCls} value={str("titleTemplate")} onChange={(e) => set("titleTemplate", e.target.value)} /></Field>
          <Field label="Default OG Image URL"><input className={inputCls} value={str("defaultOgImage")} onChange={(e) => set("defaultOgImage", e.target.value)} /></Field>
        </div>
        <Field label="Default Title"><input className={inputCls} value={str("defaultTitle")} onChange={(e) => set("defaultTitle", e.target.value)} /></Field>
        <Field label="Default Meta Description"><textarea className={textareaCls} value={str("defaultDescription")} onChange={(e) => set("defaultDescription", e.target.value)} rows={3} /></Field>
        <Field label="Default Keywords (comma-separated)"><input className={inputCls} value={str("defaultKeywords")} onChange={(e) => set("defaultKeywords", e.target.value)} /></Field>
      </Section>

      <Section title="Social Media">
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Twitter Handle"><input className={inputCls} value={str("twitterHandle")} onChange={(e) => set("twitterHandle", e.target.value)} placeholder="@sarjworldwide" /></Field>
          <Field label="Twitter Card Type">
            <select className={inputCls} value={str("twitterCardType")} onChange={(e) => set("twitterCardType", e.target.value)}>
              <option value="summary_large_image">summary_large_image</option>
              <option value="summary">summary</option>
            </select>
          </Field>
          <Field label="Facebook App ID"><input className={inputCls} value={str("facebookAppId")} onChange={(e) => set("facebookAppId", e.target.value)} /></Field>
        </div>
      </Section>

      <Section title="Search Engine Verification">
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Google Search Console"><input className={inputCls} value={str("googleVerification")} onChange={(e) => set("googleVerification", e.target.value)} placeholder="google-site-verification=..." /></Field>
          <Field label="Bing Webmaster"><input className={inputCls} value={str("bingVerification")} onChange={(e) => set("bingVerification", e.target.value)} /></Field>
          <Field label="Yandex"><input className={inputCls} value={str("yandexVerification")} onChange={(e) => set("yandexVerification", e.target.value)} /></Field>
          <Field label="Pinterest"><input className={inputCls} value={str("pinterestVerification")} onChange={(e) => set("pinterestVerification", e.target.value)} /></Field>
        </div>
      </Section>

      <Section title="Local Business (Organization)">
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Organization Name"><input className={inputCls} value={str("organizationName")} onChange={(e) => set("organizationName", e.target.value)} /></Field>
          <Field label="Logo URL"><input className={inputCls} value={str("organizationLogo")} onChange={(e) => set("organizationLogo", e.target.value)} /></Field>
          <Field label="Phone"><input className={inputCls} value={str("organizationPhone")} onChange={(e) => set("organizationPhone", e.target.value)} /></Field>
          <Field label="Email"><input className={inputCls} value={str("organizationEmail")} onChange={(e) => set("organizationEmail", e.target.value)} /></Field>
          <Field label="Street Address"><input className={inputCls} value={str("organizationAddress")} onChange={(e) => set("organizationAddress", e.target.value)} /></Field>
          <Field label="City"><input className={inputCls} value={str("organizationCity")} onChange={(e) => set("organizationCity", e.target.value)} /></Field>
          <Field label="Region/Province"><input className={inputCls} value={str("organizationRegion")} onChange={(e) => set("organizationRegion", e.target.value)} /></Field>
          <Field label="Postal Code"><input className={inputCls} value={str("organizationPostal")} onChange={(e) => set("organizationPostal", e.target.value)} /></Field>
        </div>
      </Section>

      <Section title="Sitemap Defaults">
        <div className="grid sm:grid-cols-3 gap-4">
          <Field label="Default Priority (0-1)"><input type="number" step="0.1" min="0" max="1" className={inputCls} value={str("defaultPriority")} onChange={(e) => set("defaultPriority", parseFloat(e.target.value))} /></Field>
          <Field label="Default Change Frequency">
            <select className={inputCls} value={str("defaultChangeFreq")} onChange={(e) => set("defaultChangeFreq", e.target.value)}>
              {["always","hourly","daily","weekly","monthly","yearly","never"].map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          </Field>
          <label className="flex items-center gap-3 p-3 border border-gray-100 rounded-xl cursor-pointer mt-6">
            <input type="checkbox" checked={!!form.sitemapEnabled} onChange={(e) => set("sitemapEnabled", e.target.checked)} className="w-4 h-4 text-emerald-600" />
            <span className="text-sm font-medium">Sitemap Enabled</span>
          </label>
        </div>
      </Section>
    </div>
  );
}
