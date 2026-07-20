"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ALL_BLOG_CATEGORIES,
  type BlogCategory,
  type BlogPostView,
} from "@/lib/blog-types";
import {
  ArrowRight,
  BookOpen,
  Calendar,
  Clock,
  Filter,
  Layers,
  Search,
  Sparkles,
  Tag,
  TrendingUp,
  X,
} from "lucide-react";
import TopNav from "@/components/TopNav";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const categoryColors: Record<BlogCategory, string> = {
  Fleet: "bg-[#C9A063]/15 text-[#C9A063] border-[#C9A063]/30",
  "Travel Tips": "bg-blue-500/10 text-blue-300 border-blue-400/30",
  Company: "bg-emerald-500/10 text-emerald-300 border-emerald-400/30",
  Industry: "bg-violet-500/10 text-violet-300 border-violet-400/30",
  Service: "bg-amber-500/10 text-amber-300 border-amber-400/30",
  Events: "bg-rose-500/10 text-rose-300 border-rose-400/30",
};

const categoryColorsLight: Record<BlogCategory, string> = {
  Fleet: "bg-[#C9A063]/10 text-[#C9A063] border-[#C9A063]/25",
  "Travel Tips": "bg-blue-50 text-blue-700 border-blue-200",
  Company: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Industry: "bg-violet-50 text-violet-700 border-violet-200",
  Service: "bg-amber-50 text-amber-700 border-amber-200",
  Events: "bg-rose-50 text-rose-700 border-rose-200",
};

interface BlogListingProps {
  articles: BlogPostView[];
  categoryCounts: Record<BlogCategory, number>;
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export default function BlogListing({ articles, categoryCounts }: BlogListingProps) {
  const sortedArticles = articles;
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<BlogCategory | "All">("All");

  const hasActiveFilters = activeCategory !== "All" || searchQuery.trim().length > 0;
  const featuredArticle = !hasActiveFilters
    ? sortedArticles.find((article) => article.isFeatured) || sortedArticles[0]
    : null;

  const filteredArticles = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return sortedArticles.filter((article) => {
      const matchesCategory = activeCategory === "All" || article.category === activeCategory;
      const matchesSearch =
        !query ||
        article.title.toLowerCase().includes(query) ||
        article.excerpt.toLowerCase().includes(query) ||
        article.category.toLowerCase().includes(query);
      return matchesCategory && matchesSearch;
    });
  }, [sortedArticles, searchQuery, activeCategory]);

  const gridArticles =
    !hasActiveFilters && featuredArticle
      ? filteredArticles.filter((article) => article.id !== featuredArticle.id)
      : filteredArticles;

  const stats = [
    { value: `${articles.length}+`, label: "Expert articles", icon: BookOpen },
    { value: String(ALL_BLOG_CATEGORIES.length), label: "Topic categories", icon: Layers },
    { value: "Weekly", label: "Fresh insights", icon: Sparkles },
    { value: "Global", label: "Industry coverage", icon: TrendingUp },
  ];

  return (
    <main className="min-h-screen bg-[#fafafa]">
      <TopNav />
      <Navbar />

      <section className="relative pt-[160px] md:pt-[180px] pb-20 sm:pb-24 md:pb-28 bg-gradient-to-br from-gray-900 via-gray-800 to-black overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(201,160,99,0.12)_0%,transparent_55%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.02)_25%,rgba(255,255,255,0.02)_50%,transparent_50%,transparent_75%,rgba(255,255,255,0.02)_75%)] bg-[length:60px_60px]" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-px bg-gradient-to-r from-transparent via-[#C9A063]/40 to-transparent" />

        <div className="relative max-w-7xl mx-auto px-6 sm:px-8 md:px-12 text-center">
          <div className="inline-flex items-center gap-2.5 px-6 py-3 rounded-full bg-white/10 backdrop-blur-sm border border-[#C9A063]/30 shadow-lg mb-8">
            <div className="w-2 h-2 rounded-full bg-gradient-to-r from-[#C9A063] to-[#B8935A] animate-pulse" />
            <span className="text-[#C9A063] text-[13px] sm:text-[14px] font-bold tracking-[0.2em] uppercase">
              SARJ Worldwide Blog
            </span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white tracking-tight mb-6">
            Insights for the
            <span className="block mt-1 pb-2 bg-gradient-to-r from-[#C9A063] via-[#E8C98A] to-[#C9A063] bg-clip-text text-transparent">
              Discerning Traveller
            </span>
          </h1>

          <p className="text-gray-300 text-sm sm:text-base md:text-lg max-w-3xl mx-auto leading-relaxed font-light">
            Expert perspectives on luxury chauffeur travel, fleet innovations, corporate mobility,
            and the trends shaping premium ground transportation worldwide.
          </p>
        </div>
      </section>

      <section className="relative -mt-12 sm:-mt-14 z-20">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 md:px-12">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            {stats.map(({ value, label, icon: Icon }) => (
              <div
                key={label}
                className="group flex flex-col items-center sm:flex-row sm:items-center gap-3 sm:gap-4 p-5 sm:p-6 rounded-2xl bg-white border border-gray-100 shadow-lg shadow-gray-200/60 hover:shadow-xl hover:shadow-[#C9A063]/10 hover:border-[#C9A063]/25 transition-all duration-300"
              >
                <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-[#f8f6f2] flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform duration-300">
                  <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-[#C9A063]" strokeWidth={1.5} />
                </div>
                <div className="text-center sm:text-left">
                  <p className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">{value}</p>
                  <p className="text-[12px] sm:text-[13px] text-gray-500 font-medium">{label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {!hasActiveFilters && featuredArticle && (
        <section className="pt-14 sm:pt-16 md:pt-20 pb-4">
          <div className="max-w-7xl mx-auto px-6 sm:px-8 md:px-12">
            <div className="mb-6 sm:mb-8">
              <p className="text-[#C9A063] text-[12px] sm:text-[13px] font-bold tracking-[0.2em] uppercase mb-1">
                Featured Story
              </p>
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">Editor&apos;s Pick</h2>
            </div>

            <Link
              href={`/news/${featuredArticle.slug}`}
              className="group block rounded-3xl overflow-hidden bg-white border border-gray-100 shadow-xl shadow-gray-200/50 hover:shadow-2xl hover:shadow-[#C9A063]/15 hover:border-[#C9A063]/20 transition-all duration-500"
            >
              <div className="grid grid-cols-1 lg:grid-cols-2">
                <div className="relative aspect-[16/10] lg:aspect-auto lg:min-h-[420px] overflow-hidden">
                  <Image
                    src={featuredArticle.image}
                    alt={featuredArticle.title}
                    fill
                    sizes="(max-width: 1024px) 100vw, 50vw"
                    className="object-cover group-hover:scale-105 transition-transform duration-700"
                    priority
                  />
                  <div className="absolute top-5 left-5">
                    <span className={`inline-block px-3.5 py-1.5 rounded-lg text-[12px] font-semibold border backdrop-blur-sm ${categoryColors[featuredArticle.category]}`}>
                      {featuredArticle.category}
                    </span>
                  </div>
                </div>
                <div className="p-8 sm:p-10 lg:p-12 flex flex-col justify-center">
                  <div className="flex flex-wrap items-center gap-4 text-gray-500 text-[13px] mb-5">
                    <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4" />{formatDate(featuredArticle.date)}</span>
                    <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" />{featuredArticle.readTime}</span>
                  </div>
                  <h3 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 tracking-tight mb-4 group-hover:text-[#C9A063] transition-colors">{featuredArticle.title}</h3>
                  <p className="text-gray-600 text-[15px] sm:text-[16px] leading-relaxed mb-8 line-clamp-3">{featuredArticle.excerpt}</p>
                  <span className="inline-flex items-center gap-2 text-[#C9A063] font-semibold text-[15px]">Read full article <ArrowRight className="w-4 h-4" /></span>
                </div>
              </div>
            </Link>
          </div>
        </section>
      )}

      <section className="py-10 sm:py-12 md:py-16">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 md:px-12">
          <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-10 xl:gap-12">
            <div>
              <div className="rounded-2xl bg-white border border-gray-100 shadow-md p-5 sm:p-6 mb-8">
                <div className="flex flex-col lg:flex-row lg:items-center gap-4 lg:gap-6">
                  <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search articles, topics, or keywords..."
                      className="w-full pl-11 pr-10 py-3 rounded-xl border border-gray-200 bg-gray-50/80 text-gray-900 text-[14px] focus:outline-none focus:ring-2 focus:ring-[#C9A063]/30"
                    />
                    {searchQuery && (
                      <button type="button" onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600" aria-label="Clear search">
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-gray-500 text-[13px] font-medium">
                    <Filter className="w-4 h-4" />
                    <span>{filteredArticles.length} article{filteredArticles.length !== 1 ? "s" : ""}</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 mt-5">
                  <button type="button" onClick={() => setActiveCategory("All")} className={`px-4 py-2 rounded-full text-[13px] font-semibold border ${activeCategory === "All" ? "bg-[#C9A063] text-white border-[#C9A063]" : "bg-white text-gray-600 border-gray-200"}`}>All Topics</button>
                  {ALL_BLOG_CATEGORIES.map((category) => (
                    <button key={category} type="button" onClick={() => setActiveCategory(category)} className={`px-4 py-2 rounded-full text-[13px] font-semibold border ${activeCategory === category ? "bg-[#C9A063] text-white border-[#C9A063]" : "bg-white text-gray-600 border-gray-200"}`}>{category}</button>
                  ))}
                </div>
              </div>

              {gridArticles.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-7">
                  {gridArticles.map((article) => (
                    <Link key={article.id} href={`/news/${article.slug}`} className="group flex flex-col rounded-2xl bg-white border border-gray-100 shadow-md overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all">
                      <div className="relative aspect-[16/10] overflow-hidden">
                        <Image src={article.image} alt={article.title} fill sizes="(max-width: 768px) 100vw, 50vw" className="object-cover group-hover:scale-105 transition-transform duration-500" />
                        <div className="absolute top-4 left-4">
                          <span className={`inline-block px-3 py-1.5 rounded-lg text-[11px] font-semibold border ${categoryColorsLight[article.category]}`}>{article.category}</span>
                        </div>
                      </div>
                      <div className="flex flex-col flex-1 p-6 sm:p-7">
                        <div className="flex gap-3 text-gray-400 text-[12px] mb-3">
                          <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" />{formatDate(article.date)}</span>
                          <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" />{article.readTime}</span>
                        </div>
                        <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-3 line-clamp-2 group-hover:text-[#C9A063] transition-colors">{article.title}</h3>
                        <p className="text-gray-600 text-[14px] leading-relaxed line-clamp-3 flex-1">{article.excerpt}</p>
                        <span className="mt-5 inline-flex items-center gap-2 text-[#C9A063] font-semibold text-[13px]">Continue reading <ArrowRight className="w-4 h-4" /></span>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl bg-white border border-gray-100 shadow-md p-12 text-center">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">No articles found</h3>
                  <button type="button" onClick={() => { setSearchQuery(""); setActiveCategory("All"); }} className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#C9A063] text-white font-semibold text-[14px]">Clear filters</button>
                </div>
              )}
            </div>

            <aside className="space-y-6 xl:sticky xl:top-36 xl:self-start">
              <div className="rounded-2xl bg-white border border-gray-100 shadow-md p-6">
                <div className="flex items-center gap-2 mb-5"><Tag className="w-4 h-4 text-[#C9A063]" /><h3 className="text-[15px] font-bold text-gray-900">Browse by Topic</h3></div>
                <ul className="space-y-2">
                  {ALL_BLOG_CATEGORIES.map((category) => (
                    <li key={category}>
                      <button type="button" onClick={() => setActiveCategory(category)} className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-[14px] ${activeCategory === category ? "bg-[#C9A063]/10 text-[#C9A063] font-semibold" : "text-gray-600 hover:bg-gray-50"}`}>
                        <span>{category}</span>
                        <span className="text-[12px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">{categoryCounts[category]}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-2xl bg-white border border-gray-100 shadow-md p-6">
                <h3 className="text-[15px] font-bold text-gray-900 mb-5">Latest Posts</h3>
                <ul className="space-y-4">
                  {sortedArticles.slice(0, 4).map((article) => (
                    <li key={article.id}>
                      <Link href={`/news/${article.slug}`} className="group flex gap-3 items-start">
                        <div className="relative w-16 h-16 rounded-xl overflow-hidden flex-shrink-0">
                          <Image src={article.image} alt={article.title} fill sizes="64px" className="object-cover" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[13px] font-semibold text-gray-900 line-clamp-2 group-hover:text-[#C9A063]">{article.title}</p>
                          <p className="text-[11px] text-gray-400 mt-1">{formatDate(article.date)}</p>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="relative rounded-2xl overflow-hidden border border-[#C9A063]/20 bg-gradient-to-br from-gray-900 via-gray-800 to-black p-6 sm:p-7">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(201,160,99,0.15)_0%,transparent_60%)]" />
                <div className="relative">
                  <p className="text-[#C9A063] text-[11px] font-bold tracking-[0.2em] uppercase mb-2">Premium Service</p>
                  <h3 className="text-lg font-bold text-white mb-3 tracking-tight">Ready for your next journey?</h3>
                  <p className="text-gray-400 text-[13px] leading-relaxed mb-5">
                    Book a chauffeur, request a quote, or speak with our 24/7 concierge team.
                  </p>
                  <div className="flex flex-col gap-2.5">
                    <Link href="/reservation" className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#C9A063] text-white font-semibold text-[13px] hover:bg-[#B8935A] transition-colors">
                      Book a ride <ArrowRight className="w-4 h-4" />
                    </Link>
                    <Link href="/quote" className="inline-flex items-center justify-center px-5 py-3 rounded-xl border border-white/20 text-white font-semibold text-[13px] hover:bg-white/10 transition-colors">
                      Get a quote
                    </Link>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </section>

      <section className="pb-16 sm:pb-20 md:pb-24">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 md:px-12">
          <div className="relative rounded-3xl overflow-hidden border border-[#C9A063]/20 bg-gradient-to-br from-[#C9A063]/[0.08] via-white to-[#C9A063]/[0.04] shadow-xl shadow-[#C9A063]/10">
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#C9A063]/40 to-transparent" />
            <div className="relative py-14 sm:py-16 md:py-20 text-center px-6 sm:px-10">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 tracking-tight mb-4">
                Experience luxury chauffeur travel
              </h2>
              <p className="text-gray-600 text-[15px] sm:text-[16px] max-w-2xl mx-auto mb-8 leading-relaxed">
                From airport transfers to corporate events and weddings, SARJ Worldwide delivers elegance, reliability, and world-class service on every journey.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-4">
                <Link href="/reservation" className="group inline-flex items-center justify-center gap-2 px-10 py-4 rounded-full bg-[#C9A063] text-white font-semibold shadow-lg shadow-[#C9A063]/25 hover:bg-[#B8935A] active:scale-[0.98] transition-all duration-200">
                  Reserve now <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </Link>
                <Link href="/contact" className="inline-flex items-center justify-center gap-2 px-8 py-4 border-2 border-gray-200 text-gray-700 font-semibold rounded-xl hover:border-[#C9A063] hover:text-[#C9A063] transition-all duration-300">
                  Contact us
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
