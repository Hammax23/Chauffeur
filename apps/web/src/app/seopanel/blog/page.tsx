"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Plus,
  Search,
  Loader2,
  Edit,
  Trash2,
  ExternalLink,
  FileText,
  Download,
  Star,
} from "lucide-react";

interface BlogPostRow {
  id: string;
  slug: string;
  title: string;
  category: string;
  status: string;
  date: string;
  isFeatured: boolean;
}

const inputCls = "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30";

function StatusBadge({ status }: { status: string }) {
  const styles =
    status === "published"
      ? "bg-emerald-100 text-emerald-700"
      : status === "draft"
        ? "bg-amber-100 text-amber-700"
        : "bg-gray-100 text-gray-600";
  return <span className={`px-2 py-0.5 rounded-full text-xs font-bold capitalize ${styles}`}>{status}</span>;
}

export default function SeoBlogPage() {
  const [posts, setPosts] = useState<BlogPostRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [seeding, setSeeding] = useState(false);
  const [message, setMessage] = useState("");

  const fetchPosts = useCallback(async () => {
    const params = new URLSearchParams();
    if (search) params.set("q", search);
    if (statusFilter) params.set("status", statusFilter);
    const res = await fetch(`/api/seopanel/blog?${params}`, { credentials: "include" });
    const data = await res.json();
    if (data.success) setPosts(data.posts);
    setLoading(false);
  }, [search, statusFilter]);

  useEffect(() => {
    const timer = setTimeout(fetchPosts, 300);
    return () => clearTimeout(timer);
  }, [fetchPosts]);

  const handleSeed = async () => {
    if (!confirm("Import all existing static blog articles into the database?")) return;
    setSeeding(true);
    setMessage("");
    const res = await fetch("/api/seopanel/blog", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "seed" }),
    });
    const data = await res.json();
    setMessage(data.success ? data.message : data.error || "Import failed");
    setSeeding(false);
    fetchPosts();
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;
    await fetch(`/api/seopanel/blog/${id}`, { method: "DELETE", credentials: "include" });
    fetchPosts();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Blog Manager</h1>
          <p className="text-gray-500 text-sm mt-1">
            Create, edit, publish, and manage all blog articles. SEO settings per article are in Page SEO.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleSeed}
            disabled={seeding}
            className="inline-flex items-center gap-2 px-4 py-2.5 border border-gray-200 bg-white rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
          >
            {seeding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Import Existing Articles
          </button>
          <Link
            href="/seopanel/blog/edit"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700"
          >
            <Plus className="w-4 h-4" />
            New Article
          </Link>
        </div>
      </div>

      {message && (
        <div className="px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm">
          {message}
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search articles..."
            className={`${inputCls} pl-10`}
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className={inputCls}
        >
          <option value="">All Status</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Title</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Category</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-600">Status</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Date</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {posts.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-gray-500">
                      No blog posts yet. Click &quot;Import Existing Articles&quot; or create a new one.
                    </td>
                  </tr>
                ) : (
                  posts.map((post) => (
                    <tr key={post.id} className="hover:bg-gray-50/80">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {post.isFeatured && <Star className="w-4 h-4 text-amber-500 fill-amber-500" />}
                          <div>
                            <p className="font-medium text-gray-900 line-clamp-1">{post.title}</p>
                            <p className="text-xs text-gray-400 font-mono">/news/{post.slug}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{post.category}</td>
                      <td className="px-4 py-3 text-center">
                        <StatusBadge status={post.status} />
                      </td>
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{post.date}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {post.status === "published" ? (
                            <Link
                              href={`/news/${post.slug}`}
                              target="_blank"
                              className="p-2 text-gray-400 hover:text-emerald-600 rounded-lg hover:bg-emerald-50"
                              title="Preview live article"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </Link>
                          ) : (
                            <span
                              className="p-2 text-gray-300 cursor-not-allowed"
                              title="Publish the article to preview on the live site"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </span>
                          )}
                          <Link
                            href={`/seopanel/pages/edit?path=${encodeURIComponent(`/news/${post.slug}`)}`}
                            className="p-2 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50"
                            title="Edit SEO"
                          >
                            <FileText className="w-4 h-4" />
                          </Link>
                          <Link
                            href={`/seopanel/blog/edit?id=${post.id}`}
                            className="p-2 text-gray-400 hover:text-emerald-600 rounded-lg hover:bg-emerald-50"
                            title="Edit Article"
                          >
                            <Edit className="w-4 h-4" />
                          </Link>
                          <button
                            type="button"
                            onClick={() => handleDelete(post.id, post.title)}
                            className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="rounded-2xl bg-white border border-gray-100 p-5 text-sm text-gray-600">
        <p className="font-semibold text-gray-900 mb-2">SEO workflow for blog articles</p>
        <ul className="space-y-1 list-disc list-inside">
          <li>Create or edit article content here in Blog Manager</li>
          <li>Set status to <strong>Published</strong> to make it live on the website</li>
          <li>Use the SEO icon to edit title, meta description, OG tags, schema, and robots per article</li>
          <li>Blog listing page SEO is managed at <Link href="/seopanel/pages/edit?path=%2Fnews" className="text-emerald-600 hover:underline">/news Page SEO</Link></li>
        </ul>
      </div>
    </div>
  );
}
