"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, Save, CheckCircle2, AlertCircle } from "lucide-react";
import SeoImageUpload from "@/components/SeoImageUpload";
import RichTextEditor from "@/components/RichTextEditor";

type Tab = "basic" | "social" | "technical" | "schema" | "content" | "advanced";

interface PageData {
  path: string;
  pageLabel: string | null;
  title: string | null;
  metaDescription: string | null;
  keywords: string | null;
  canonicalUrl: string | null;
  focusKeyword: string | null;
  h1: string | null;
  ogTitle: string | null;
  ogDescription: string | null;
  ogImage: string | null;
  twitterTitle: string | null;
  twitterDescription: string | null;
  twitterImage: string | null;
  robotsIndex: boolean;
  robotsFollow: boolean;
  noarchive: boolean;
  nosnippet: boolean;
  includeInSitemap: boolean;
  sitemapPriority: number | null;
  sitemapChangeFreq: string | null;
  schemaJson: unknown;
  breadcrumbLabel: string | null;
  headerScripts: string | null;
  bodyScripts: string | null;
  bodyContentHtml: string | null;
  bodyContentPosition: string;
  internalNotes: string | null;
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

const inputCls = "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500";
const textareaCls = `${inputCls} resize-y min-h-[80px]`;

function PageEditorContent() {
  const searchParams = useSearchParams();
  const path = searchParams.get("path") || "/";
  const [tab, setTab] = useState<Tab>("basic");
  const [form, setForm] = useState<PageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [schemaText, setSchemaText] = useState("");

  useEffect(() => {
    const encoded = encodeURIComponent(path);
    fetch(`/api/seopanel/pages/${encoded}`, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setForm(d.page);
          setSchemaText(d.page.schemaJson ? JSON.stringify(d.page.schemaJson, null, 2) : "");
        }
      })
      .finally(() => setLoading(false));
  }, [path]);

  const set = (key: keyof PageData, value: unknown) => {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const handleSave = async () => {
    if (!form) return;
    setSaving(true);
    setMessage(null);
    let schemaJson = null;
    if (schemaText.trim()) {
      try {
        schemaJson = JSON.parse(schemaText);
      } catch {
        setMessage({ type: "err", text: "Invalid JSON in schema field" });
        setSaving(false);
        return;
      }
    }
    const res = await fetch(`/api/seopanel/pages/${encodeURIComponent(path)}`, {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, schemaJson }),
    });
    const data = await res.json();
    if (data.success) {
      setMessage({ type: "ok", text: "Page SEO saved successfully" });
      setForm(data.page);
    } else {
      setMessage({ type: "err", text: data.error || "Save failed" });
    }
    setSaving(false);
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: "basic", label: "Basic SEO" },
    { id: "social", label: "Social / OG" },
    { id: "technical", label: "Technical" },
    { id: "schema", label: "Schema" },
    { id: "content", label: "Content" },
    { id: "advanced", label: "Advanced" },
  ];

  if (loading || !form) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  const titleLen = form.title?.length ?? 0;
  const descLen = form.metaDescription?.length ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/seopanel/pages" className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-900">{form.pageLabel || path}</h1>
          <p className="text-sm text-gray-400 font-mono">{path}</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 disabled:opacity-60"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Changes
        </button>
      </div>

      {message && (
        <div className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm ${
          message.type === "ok" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
        }`}>
          {message.type === "ok" ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {message.text}
        </div>
      )}

      {/* Google Preview */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Google Search Preview</p>
        <p className="text-blue-700 text-lg hover:underline cursor-pointer truncate">{form.title || "Missing Title"}</p>
        <p className="text-emerald-700 text-sm font-mono truncate">{form.canonicalUrl || `https://sarjworldwide.ca${path === "/" ? "" : path}`}</p>
        <p className="text-gray-600 text-sm mt-1 line-clamp-2">{form.metaDescription || "Missing meta description"}</p>
      </div>

      <div className="flex gap-1 border-b border-gray-200 overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              tab === t.id ? "border-emerald-600 text-emerald-700" : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-5">
        {tab === "basic" && (
          <>
            <Field label="Page Label" hint="Internal name for this page">
              <input className={inputCls} value={form.pageLabel ?? ""} onChange={(e) => set("pageLabel", e.target.value)} />
            </Field>
            <Field label={`Title Tag (${titleLen}/60)`} hint="Recommended: 50-60 characters">
              <input className={inputCls} value={form.title ?? ""} onChange={(e) => set("title", e.target.value)} maxLength={70} />
              <div className={`h-1 mt-1 rounded ${titleLen > 60 ? "bg-red-400" : titleLen > 30 ? "bg-emerald-400" : "bg-amber-400"}`} style={{ width: `${Math.min(100, (titleLen / 60) * 100)}%` }} />
            </Field>
            <Field label={`Meta Description (${descLen}/160)`} hint="Recommended: 120-160 characters">
              <textarea className={textareaCls} value={form.metaDescription ?? ""} onChange={(e) => set("metaDescription", e.target.value)} maxLength={320} rows={3} />
              <div className={`h-1 mt-1 rounded ${descLen > 160 ? "bg-red-400" : descLen > 100 ? "bg-emerald-400" : "bg-amber-400"}`} style={{ width: `${Math.min(100, (descLen / 160) * 100)}%` }} />
            </Field>
            <Field label="Focus Keyword" hint="Primary keyword for this page">
              <input className={inputCls} value={form.focusKeyword ?? ""} onChange={(e) => set("focusKeyword", e.target.value)} />
            </Field>
            <Field label="Keywords" hint="Comma-separated keywords">
              <input className={inputCls} value={form.keywords ?? ""} onChange={(e) => set("keywords", e.target.value)} />
            </Field>
            <Field label="H1 Heading" hint="Main heading on the page (for reference)">
              <input className={inputCls} value={form.h1 ?? ""} onChange={(e) => set("h1", e.target.value)} />
            </Field>
            <Field label="Canonical URL">
              <input className={inputCls} value={form.canonicalUrl ?? ""} onChange={(e) => set("canonicalUrl", e.target.value)} placeholder={`https://sarjworldwide.ca${path === "/" ? "" : path}`} />
            </Field>
          </>
        )}

        {tab === "social" && (
          <>
            <Field label="OG Title" hint="Leave empty to use page title">
              <input className={inputCls} value={form.ogTitle ?? ""} onChange={(e) => set("ogTitle", e.target.value)} />
            </Field>
            <Field label="OG Description">
              <textarea className={textareaCls} value={form.ogDescription ?? ""} onChange={(e) => set("ogDescription", e.target.value)} rows={2} />
            </Field>
            <SeoImageUpload
              value={form.ogImage ?? ""}
              onChange={(url) => set("ogImage", url)}
              label="OG Image (1200×630 recommended)"
              folder="seo-og"
            />
            <Field label="Twitter Title">
              <input className={inputCls} value={form.twitterTitle ?? ""} onChange={(e) => set("twitterTitle", e.target.value)} />
            </Field>
            <Field label="Twitter Description">
              <textarea className={textareaCls} value={form.twitterDescription ?? ""} onChange={(e) => set("twitterDescription", e.target.value)} rows={2} />
            </Field>
            <SeoImageUpload
              value={form.twitterImage ?? ""}
              onChange={(url) => set("twitterImage", url)}
              label="Twitter Image"
              folder="seo-twitter"
            />
          </>
        )}

        {tab === "technical" && (
          <>
            <div className="grid sm:grid-cols-2 gap-4">
              {[
                { key: "robotsIndex" as const, label: "Allow Indexing (index)" },
                { key: "robotsFollow" as const, label: "Allow Following Links (follow)" },
                { key: "noarchive" as const, label: "No Archive (noarchive)" },
                { key: "nosnippet" as const, label: "No Snippet (nosnippet)" },
                { key: "includeInSitemap" as const, label: "Include in Sitemap" },
              ].map((toggle) => (
                <label key={toggle.key} className="flex items-center gap-3 p-3 border border-gray-100 rounded-xl cursor-pointer hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={!!form[toggle.key]}
                    onChange={(e) => set(toggle.key, e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-600"
                  />
                  <span className="text-sm font-medium text-gray-700">{toggle.label}</span>
                </label>
              ))}
            </div>
            <Field label="Sitemap Priority (0.0 - 1.0)">
              <input type="number" step="0.1" min="0" max="1" className={inputCls} value={form.sitemapPriority ?? ""} onChange={(e) => set("sitemapPriority", e.target.value ? parseFloat(e.target.value) : null)} />
            </Field>
            <Field label="Sitemap Change Frequency">
              <select className={inputCls} value={form.sitemapChangeFreq ?? ""} onChange={(e) => set("sitemapChangeFreq", e.target.value || null)}>
                <option value="">Use global default</option>
                <option value="always">always</option>
                <option value="hourly">hourly</option>
                <option value="daily">daily</option>
                <option value="weekly">weekly</option>
                <option value="monthly">monthly</option>
                <option value="yearly">yearly</option>
                <option value="never">never</option>
              </select>
            </Field>
            <Field label="Breadcrumb Label">
              <input className={inputCls} value={form.breadcrumbLabel ?? ""} onChange={(e) => set("breadcrumbLabel", e.target.value)} />
            </Field>
          </>
        )}

        {tab === "schema" && (
          <Field label="JSON-LD Structured Data" hint="Paste valid JSON-LD schema for this page">
            <textarea
              className={`${textareaCls} font-mono text-xs min-h-[300px]`}
              value={schemaText}
              onChange={(e) => setSchemaText(e.target.value)}
              placeholder={'{\n  "@context": "https://schema.org",\n  "@type": "Service",\n  "name": "..."\n}'}
            />
          </Field>
        )}

        {tab === "content" && (
          <>
            <Field
              label="Body Content Position"
              hint="Where to inject this content on the page (via SeoPageBodyExtras)."
            >
              <select
                className={inputCls}
                value={form.bodyContentPosition ?? "bottom"}
                onChange={(e) => set("bodyContentPosition", e.target.value)}
              >
                <option value="top">Top of page (after header)</option>
                <option value="bottom">Bottom of page (before footer)</option>
              </select>
            </Field>
            <Field
              label="Body Content (SEO)"
              hint="Use this for internal linking and image alt text. Content is sanitized for safety."
            >
              <RichTextEditor
                value={form.bodyContentHtml ?? ""}
                onChange={(html) => set("bodyContentHtml", html)}
                placeholder="Add content, internal links, and images with alt text…"
              />
            </Field>
          </>
        )}

        {tab === "advanced" && (
          <>
            <Field label="Header Scripts" hint="Scripts injected in <head> for this page only">
              <textarea className={`${textareaCls} font-mono text-xs`} value={form.headerScripts ?? ""} onChange={(e) => set("headerScripts", e.target.value)} rows={4} />
            </Field>
            <Field label="Body Scripts" hint="Scripts injected before </body>">
              <textarea className={`${textareaCls} font-mono text-xs`} value={form.bodyScripts ?? ""} onChange={(e) => set("bodyScripts", e.target.value)} rows={4} />
            </Field>
            <Field label="Internal Notes" hint="Notes for SEO team (not public)">
              <textarea className={textareaCls} value={form.internalNotes ?? ""} onChange={(e) => set("internalNotes", e.target.value)} rows={3} />
            </Field>
          </>
        )}
      </div>
    </div>
  );
}

export default function SeoPageEdit() {
  return (
    <Suspense fallback={<div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-emerald-600" /></div>}>
      <PageEditorContent />
    </Suspense>
  );
}
