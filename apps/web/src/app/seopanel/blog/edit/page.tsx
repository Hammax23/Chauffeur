"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Save, ExternalLink, FileText } from "lucide-react";
import { ALL_BLOG_CATEGORIES } from "@/lib/blog-types";
import RichTextEditor from "@/components/RichTextEditor";
import SeoImageUpload from "@/components/SeoImageUpload";

const inputCls = "w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500";
const labelCls = "block text-sm font-medium text-gray-700 mb-1.5";

function BlogEditorForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const postId = searchParams.get("id");
  const isNew = !postId;

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [content, setContent] = useState("");
  const [contentFormat, setContentFormat] = useState<"html" | "plain">("html");
  const [category, setCategory] = useState<string>(ALL_BLOG_CATEGORIES[0]);
  const [imageUrl, setImageUrl] = useState("");
  const [imageAlt, setImageAlt] = useState("");
  const [imageTitle, setImageTitle] = useState("");
  const [imageCaption, setImageCaption] = useState("");
  const [imageFileName, setImageFileName] = useState("");
  const [author, setAuthor] = useState("SARJ Worldwide Team");
  const [status, setStatus] = useState("draft");
  const [isFeatured, setIsFeatured] = useState(false);
  const [readTimeMinutes, setReadTimeMinutes] = useState(3);
  const [publishedAt, setPublishedAt] = useState("");
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDescription, setSeoDescription] = useState("");
  const [canonicalUrl, setCanonicalUrl] = useState("");
  const [focusKeyword, setFocusKeyword] = useState("");
  const [robotsIndex, setRobotsIndex] = useState(true);
  const [robotsFollow, setRobotsFollow] = useState(true);
  const [extraSchemaText, setExtraSchemaText] = useState("");

  useEffect(() => {
    if (!postId) return;

    const loadPost = async () => {
      const res = await fetch(`/api/seopanel/blog/${postId}`, { credentials: "include" });
      const data = await res.json();
      if (!data.success) {
        setError(data.error || "Failed to load post");
        setLoading(false);
        return;
      }

      const post = data.post;
      setTitle(post.title);
      setSlug(post.slug);
      setExcerpt(post.excerpt);
      setContent(post.content);
      setContentFormat(post.contentFormat === "plain" ? "plain" : "html");
      setCategory(post.category);
      setImageUrl(post.imageUrl);
      setImageAlt(post.imageAlt || "");
      setImageTitle(post.imageTitle || "");
      setImageCaption(post.imageCaption || "");
      setImageFileName(post.imageFileName || "");
      setAuthor(post.author);
      setStatus(post.status);
      setIsFeatured(post.isFeatured);
      setReadTimeMinutes(post.readTimeMinutes);
      setPublishedAt(post.publishedAt ? new Date(post.publishedAt).toISOString().slice(0, 10) : "");
      setSeoTitle(post.seoTitle || "");
      setSeoDescription(post.seoDescription || "");
      setCanonicalUrl(post.canonicalUrl || "");
      setFocusKeyword(post.focusKeyword || "");
      setRobotsIndex(post.robotsIndex ?? true);
      setRobotsFollow(post.robotsFollow ?? true);
      setExtraSchemaText(post.extraSchemaJson ? JSON.stringify(post.extraSchemaJson, null, 2) : "");
      setLoading(false);
    };

    loadPost();
  }, [postId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    const payload = {
      title,
      slug,
      excerpt,
      content,
      contentFormat,
      category,
      imageUrl,
      imageAlt,
      imageTitle,
      imageCaption,
      imageFileName,
      author,
      status,
      isFeatured,
      readTimeMinutes,
      publishedAt: publishedAt || undefined,
      seoTitle,
      seoDescription,
      canonicalUrl,
      focusKeyword,
      robotsIndex,
      robotsFollow,
      extraSchemaJson: extraSchemaText.trim()
        ? (() => {
            try {
              return JSON.parse(extraSchemaText);
            } catch {
              return null;
            }
          })()
        : null,
    };

    const res = await fetch(isNew ? "/api/seopanel/blog" : `/api/seopanel/blog/${postId}`, {
      method: isNew ? "POST" : "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!data.success) {
      setError(data.error || "Failed to save");
      setSaving(false);
      return;
    }

    setSuccess("Article saved successfully");
    setSaving(false);

    if (isNew && data.post?.id) {
      router.replace(`/seopanel/blog/edit?id=${data.post.id}`);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Link href="/seopanel/blog" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-emerald-600 mb-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Blog Manager
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">{isNew ? "New Article" : "Edit Article"}</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          {!isNew && slug && status === "published" && (
            <Link
              href={`/news/${slug}`}
              target="_blank"
              className="inline-flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <ExternalLink className="w-4 h-4" />
              Preview Live
            </Link>
          )}
          {!isNew && slug && status !== "published" && (
            <span className="inline-flex items-center gap-2 px-4 py-2.5 border border-amber-200 bg-amber-50 rounded-xl text-sm text-amber-800">
              Draft — publish to preview on live site
            </span>
          )}
          {!isNew && slug && (
            <Link
              href={`/seopanel/pages/edit?path=${encodeURIComponent(`/news/${slug}`)}`}
              className="inline-flex items-center gap-2 px-4 py-2.5 border border-blue-200 bg-blue-50 rounded-xl text-sm font-medium text-blue-700 hover:bg-blue-100"
            >
              <FileText className="w-4 h-4" />
              Edit SEO
            </Link>
          )}
        </div>
      </div>

      {error && <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>}
      {success && <div className="px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm">{success}</div>}

      <form onSubmit={handleSave} className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6">
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-5">
            <div>
              <label className={labelCls}>Title *</label>
              <input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} required />
            </div>
            <div>
              <label className={labelCls}>Slug *</label>
              <input
                className={`${inputCls} font-mono`}
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="auto-generated-from-title"
                required
              />
              <p className="text-xs text-gray-400 mt-1">URL: /news/{slug || "your-slug"}</p>
            </div>
            <div>
              <label className={labelCls}>Excerpt *</label>
              <textarea
                className={`${inputCls} min-h-[100px]`}
                value={excerpt}
                onChange={(e) => setExcerpt(e.target.value)}
                required
              />
              <p className="text-xs text-gray-400 mt-1">{excerpt.length} characters — used for meta description default</p>
            </div>

            <div className="pt-3 border-t border-gray-100">
              <h2 className="font-semibold text-gray-900 mb-4">SEO Settings</h2>
              <div className="space-y-4">
                <div>
                  <label className={labelCls}>Meta Title</label>
                  <input
                    className={inputCls}
                    value={seoTitle}
                    onChange={(e) => setSeoTitle(e.target.value)}
                    placeholder={`${title || "Article Title"} | SARJ Worldwide Blog`}
                  />
                  <p className="text-xs text-gray-400 mt-1">Leave empty to auto-generate from the article title.</p>
                </div>
                <div>
                  <label className={labelCls}>Meta Description</label>
                  <textarea
                    className={`${inputCls} min-h-[90px]`}
                    value={seoDescription}
                    onChange={(e) => setSeoDescription(e.target.value)}
                    placeholder={excerpt || "Short summary used in Google snippet"}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>Focus Keyword</label>
                    <input
                      className={inputCls}
                      value={focusKeyword}
                      onChange={(e) => setFocusKeyword(e.target.value)}
                      placeholder="e.g. Toronto airport chauffeur"
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Canonical URL</label>
                    <input
                      className={`${inputCls} font-mono`}
                      value={canonicalUrl}
                      onChange={(e) => setCanonicalUrl(e.target.value)}
                      placeholder={`https://sarjworldwide.ca/news/${slug || "your-slug"}`}
                    />
                  </div>
                </div>
                <div className="flex flex-wrap gap-5">
                  <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={robotsIndex}
                      onChange={(e) => setRobotsIndex(e.target.checked)}
                      className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    Robots: index
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={robotsFollow}
                      onChange={(e) => setRobotsFollow(e.target.checked)}
                      className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    Robots: follow
                  </label>
                </div>
                <div>
                  <label className={labelCls}>Extra Schema JSON (optional)</label>
                  <textarea
                    className={`${inputCls} min-h-[140px] font-mono`}
                    value={extraSchemaText}
                    onChange={(e) => setExtraSchemaText(e.target.value)}
                    placeholder='{\n  \"@context\": \"https://schema.org\",\n  \"@type\": \"FAQPage\",\n  \"mainEntity\": []\n}'
                  />
                  <p className="text-xs text-gray-400 mt-1">Paste valid JSON. This will be injected on the article page.</p>
                </div>
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className={labelCls}>Content *</label>
                <select
                  className="text-xs border border-gray-200 rounded-lg px-2 py-1"
                  value={contentFormat}
                  onChange={(e) => setContentFormat(e.target.value as "html" | "plain")}
                >
                  <option value="html">Rich Text</option>
                  <option value="plain">Plain Text</option>
                </select>
              </div>
              {contentFormat === "html" ? (
                <RichTextEditor
                  value={content}
                  onChange={setContent}
                  placeholder="Write your article..."
                />
              ) : (
                <textarea
                  className={`${inputCls} min-h-[320px]`}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  required
                />
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-4">
            <h2 className="font-semibold text-gray-900">Publish Settings</h2>

            <div>
              <label className={labelCls}>Status</label>
              <select className={inputCls} value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </select>
            </div>

            <div>
              <label className={labelCls}>Category *</label>
              <select className={inputCls} value={category} onChange={(e) => setCategory(e.target.value)} required>
                {ALL_BLOG_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelCls}>Published Date</label>
              <input
                type="date"
                className={inputCls}
                value={publishedAt}
                onChange={(e) => setPublishedAt(e.target.value)}
              />
            </div>

            <div>
              <label className={labelCls}>Author</label>
              <input className={inputCls} value={author} onChange={(e) => setAuthor(e.target.value)} />
            </div>

            <div>
              <label className={labelCls}>Read Time (minutes)</label>
              <input
                type="number"
                min={1}
                className={inputCls}
                value={readTimeMinutes}
                onChange={(e) => setReadTimeMinutes(Number(e.target.value))}
              />
            </div>

            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={isFeatured}
                onChange={(e) => setIsFeatured(e.target.checked)}
                className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
              />
              Featured article
            </label>

            <button
              type="submit"
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 disabled:opacity-60"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {isNew ? "Create Article" : "Save Changes"}
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-4">
            <h2 className="font-semibold text-gray-900">Featured Image</h2>
            <SeoImageUpload
              value={imageUrl}
              onChange={setImageUrl}
              label="Featured Image"
              folder="blog"
              required
            />
            <div className="grid grid-cols-1 gap-4 pt-2">
              <div>
                <label className={labelCls}>Image Alt Text</label>
                <input
                  className={inputCls}
                  value={imageAlt}
                  onChange={(e) => setImageAlt(e.target.value)}
                  placeholder="Describe the image for accessibility + SEO"
                />
              </div>
              <div>
                <label className={labelCls}>Image Title</label>
                <input
                  className={inputCls}
                  value={imageTitle}
                  onChange={(e) => setImageTitle(e.target.value)}
                  placeholder="Optional image title attribute"
                />
              </div>
              <div>
                <label className={labelCls}>Caption</label>
                <input
                  className={inputCls}
                  value={imageCaption}
                  onChange={(e) => setImageCaption(e.target.value)}
                  placeholder="Optional caption shown under the image"
                />
              </div>
              <div>
                <label className={labelCls}>Image File Name</label>
                <input
                  className={`${inputCls} font-mono`}
                  value={imageFileName}
                  onChange={(e) => setImageFileName(e.target.value)}
                  placeholder="e.g. toronto-airport-chauffeur.jpg"
                />
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}

export default function SeoBlogEditPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-emerald-600" /></div>}>
      <BlogEditorForm />
    </Suspense>
  );
}
