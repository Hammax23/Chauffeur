"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Loader2,
  AlertCircle,
  Save,
  RefreshCw,
  FileText,
  Shield,
  Receipt,
  Eye,
} from "lucide-react";
import LegalRichTextEditor from "@/components/LegalRichTextEditor";

type LegalSlug = "privacy" | "terms" | "refund";

type DocState = {
  slug: LegalSlug;
  title: string;
  contentHtml: string;
  customCss: string;
  updatedAt?: string;
};

const TABS: { slug: LegalSlug; label: string; icon: typeof FileText }[] = [
  { slug: "privacy", label: "Privacy Policy", icon: Shield },
  { slug: "refund", label: "Refund Policy", icon: Receipt },
  { slug: "terms", label: "Terms & Conditions", icon: FileText },
];

const CSS_RESET_HINT = `.legal-body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #1C1C1E; font-size: 15px; line-height: 1.65; }
.legal-body h2 { font-size: 1.2em; font-weight: 800; margin: 1.35em 0 0.55em; line-height: 1.3; }
.legal-body p { margin: 0 0 0.85em; line-height: 1.65; }
.legal-body ul, .legal-body ol { margin: 0 0 1em; padding-left: 1.25em; }
.legal-body li { margin: 0.35em 0; line-height: 1.55; }
.legal-body table { width: 100%; border-collapse: collapse; margin: 0.75em 0 1em; }
.legal-body th, .legal-body td { border: 1px solid #E5E7EB; padding: 10px 12px; text-align: left; }
.legal-body th { background: #F3F4F6; font-weight: 700; }
.legal-body .legal-callout { background: rgba(201,160,99,0.12); border: 1px solid rgba(201,160,99,0.28); border-radius: 14px; padding: 14px 16px; margin: 0 0 1.25em; }`;

export default function AdminLegalDocsPage() {
  const [slug, setSlug] = useState<LegalSlug>("privacy");
  const [docs, setDocs] = useState<Partial<Record<LegalSlug, DocState>>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [preview, setPreview] = useState(false);

  const current = docs[slug];

  const fetchDocs = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const res = await fetch("/api/admin/legal-docs", { credentials: "include" });
      const data = await res.json();
      if (!data.success) {
        setError(data.error || "Failed to load");
        return;
      }
      const map: Partial<Record<LegalSlug, DocState>> = {};
      for (const d of data.documents || []) {
        map[d.slug as LegalSlug] = {
          slug: d.slug,
          title: d.title,
          contentHtml: d.contentHtml,
          customCss: d.customCss || CSS_RESET_HINT,
          updatedAt: d.updatedAt,
        };
      }
      setDocs(map);
    } catch {
      setError("Failed to connect");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchDocs();
  }, [fetchDocs]);

  const patch = (partial: Partial<DocState>) => {
    setDocs((prev) => ({
      ...prev,
      [slug]: { ...(prev[slug] as DocState), ...partial, slug },
    }));
  };

  const save = async () => {
    if (!current) return;
    try {
      setSaving(true);
      setError("");
      const res = await fetch(`/api/admin/legal-docs/${slug}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: current.title,
          contentHtml: current.contentHtml,
          customCss: current.customCss,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error || "Save failed");
        return;
      }
      setDocs((prev) => ({
        ...prev,
        [slug]: {
          slug,
          title: data.document.title,
          contentHtml: data.document.contentHtml,
          customCss: data.document.customCss || "",
          updatedAt: data.document.updatedAt,
        },
      }));
      setToast("Saved — app will show the new content on next open");
      setTimeout(() => setToast(""), 3500);
    } catch {
      setError("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#C9A063]" />
      </div>
    );
  }

  return (
    <div className="px-4 py-4 sm:px-5 sm:py-5 lg:px-6 lg:py-6">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
            App Legal Content
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Edit Privacy, Refund, and Terms shown inside the mobile app. Styling, line-height, and
            spacing are fully controllable.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void fetchDocs()}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <RefreshCw className="h-4 w-4" /> Reload
          </button>
          <button
            type="button"
            onClick={() => setPreview((p) => !p)}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <Eye className="h-4 w-4" /> {preview ? "Edit" : "Preview"}
          </button>
          <button
            type="button"
            disabled={saving || !current}
            onClick={() => void save()}
            className="inline-flex items-center gap-2 rounded-lg bg-[#1C1C1E] px-4 py-2 text-sm font-semibold text-white hover:bg-[#2C2C2E] disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save
          </button>
        </div>
      </div>

      {toast ? (
        <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {toast}
        </div>
      ) : null}
      {error ? (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" /> {error}
        </div>
      ) : null}

      <div className="mb-4 flex flex-wrap gap-2">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = slug === t.slug;
          return (
            <button
              key={t.slug}
              type="button"
              onClick={() => {
                setSlug(t.slug);
                setPreview(false);
              }}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
                active
                  ? "bg-[#C9A063] text-[#1a1a1a] shadow-sm"
                  : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              <Icon className="h-4 w-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {current ? (
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500">
              Screen title
            </label>
            <input
              value={current.title}
              onChange={(e) => patch({ title: e.target.value })}
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-900 outline-none focus:border-[#C9A063] focus:ring-2 focus:ring-[#C9A063]/20"
            />
            {current.updatedAt ? (
              <p className="mt-1.5 text-xs text-gray-400">
                Last saved {new Date(current.updatedAt).toLocaleString()}
              </p>
            ) : null}
          </div>

          {preview ? (
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
              <div className="border-b border-gray-100 bg-gray-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                App preview
              </div>
              <iframe
                title="preview"
                className="h-[560px] w-full bg-white"
                srcDoc={`<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"/><style>${current.customCss || CSS_RESET_HINT} body{margin:0;padding:16px;background:#F5F5F7}</style></head><body><div class="legal-body">${current.contentHtml}</div></body></html>`}
              />
            </div>
          ) : (
            <>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Content
                </label>
                <LegalRichTextEditor
                  key={slug}
                  value={current.contentHtml}
                  onChange={(html) => patch({ contentHtml: html })}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Custom CSS (line-height, spacing, colors)
                </label>
                <p className="mb-2 text-xs text-gray-400">
                  Applied inside the app. Target <code className="rounded bg-gray-100 px-1">.legal-body</code>{" "}
                  — e.g. <code className="rounded bg-gray-100 px-1">.legal-body p {"{"} line-height: 1.8; margin-bottom: 1em; {"}"}</code>
                </p>
                <textarea
                  value={current.customCss}
                  onChange={(e) => patch({ customCss: e.target.value })}
                  rows={12}
                  spellCheck={false}
                  className="w-full resize-y rounded-xl border border-gray-200 bg-[#0f1115] px-4 py-3 font-mono text-[12.5px] leading-relaxed text-sky-200 outline-none focus:border-[#C9A063]"
                />
                <button
                  type="button"
                  onClick={() => patch({ customCss: CSS_RESET_HINT })}
                  className="mt-2 text-xs font-medium text-[#C9A063] hover:underline"
                >
                  Reset CSS to defaults
                </button>
              </div>
            </>
          )}
        </div>
      ) : (
        <p className="text-sm text-gray-500">Document not loaded. Try Reload.</p>
      )}
    </div>
  );
}
