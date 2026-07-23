import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import {
  getBlogPostBySlug,
  getPublishedBlogPosts,
  getRelatedBlogPosts,
  buildBlogPostingSchema,
  type BlogCategory,
} from "@/lib/blog";
import { getSeoSettings } from "@/lib/seo-config";
import { ArrowLeft, ArrowRight, Calendar, Clock, Tag, Facebook, Twitter, Linkedin, Instagram } from "lucide-react";
import TopNav from "@/components/TopNav";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo-metadata";
import { renderBlogContent } from "@/lib/blog-content";

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

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

export const revalidate = 60;

interface ArticlePageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const posts = await getPublishedBlogPosts();
  return posts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: ArticlePageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = await getBlogPostBySlug(slug);
  if (!article) return { title: "Article Not Found" };

  return buildPageMetadata(`/news/${slug}`, {
    title: (article.seoTitle?.trim() ? article.seoTitle.trim() : `${article.title} | SARJ Worldwide Blog`),
    description: (article.seoDescription?.trim() ? article.seoDescription.trim() : article.excerpt),
    keywords: [article.category, "SARJ Worldwide blog", "chauffeur insights", article.title],
  });
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  const { slug } = await params;
  const article = await getBlogPostBySlug(slug);
  if (!article) notFound();

  const relatedArticles = await getRelatedBlogPosts(slug, 3);
  const settings = await getSeoSettings();
  const blogSchema = buildBlogPostingSchema(article, settings.siteUrl);
  const rendered = renderBlogContent(article.content);

  return (
    <main className="min-h-screen bg-[#fafafa]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(blogSchema) }}
      />
      {article.extraSchemaJson != null && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(article.extraSchemaJson) }}
        />
      )}
      <TopNav />
      <Navbar />

      <section className="relative pt-[117px] md:pt-[132px] pb-16 md:pb-24">
        <div className="absolute inset-0 z-0">
          <Image
            src={article.image}
            alt={article.imageAlt?.trim() ? article.imageAlt.trim() : article.title}
            title={article.imageTitle?.trim() ? article.imageTitle.trim() : undefined}
            fill
            sizes="100vw"
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/80 to-gray-900/40" />
        </div>

        <div className="relative z-10 max-w-4xl mx-auto px-6 sm:px-8 md:px-12 pt-8 sm:pt-12 md:pt-16 pb-8 md:pb-12">
          <nav className="flex flex-wrap items-center gap-2 text-[13px] text-gray-300 mb-6">
            <Link href="/" className="hover:text-white transition-colors">Home</Link>
            <span className="text-gray-500">/</span>
            <Link href="/news" className="hover:text-white transition-colors">Blog</Link>
            <span className="text-gray-500">/</span>
            <span className="text-gray-400 line-clamp-1">{article.title}</span>
          </nav>

          <span className={`inline-block px-3.5 py-1.5 rounded-lg text-[12px] font-semibold border backdrop-blur-sm mb-5 ${categoryColors[article.category]}`}>
            {article.category}
          </span>

          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white tracking-tight mb-5 leading-tight">
            {article.title}
          </h1>

          <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-gray-300 text-[13px] sm:text-[14px]">
            <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4" />{formatDate(article.date)}</span>
            <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" />{article.readTime}</span>
            <span className="flex items-center gap-1.5"><Tag className="w-4 h-4" />{article.author}</span>
          </div>
        </div>
      </section>

      <section className="pb-12 sm:pb-16 relative z-20">
        <div className="max-w-4xl mx-auto px-6 sm:px-8 md:px-12">
          <div className="rounded-3xl bg-white border border-gray-100 shadow-xl p-8 sm:p-10 md:p-12 -mt-16 md:-mt-20">
            <p className="text-lg sm:text-xl text-gray-700 leading-relaxed font-light border-l-4 border-[#C9A063] pl-5 sm:pl-6 mb-8">
              {article.excerpt}
            </p>

            <div className="prose prose-gray max-w-none">
              {rendered.type === "html" ? (
                <div
                  className="text-gray-700 text-[16px] sm:text-[17px] leading-[1.8] [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:mt-8 [&_h2]:mb-4 [&_h3]:text-xl [&_h3]:font-semibold [&_h3]:mt-6 [&_h3]:mb-3 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:mb-2 [&_blockquote]:border-l-4 [&_blockquote]:border-[#C9A063] [&_blockquote]:pl-4 [&_blockquote]:italic"
                  dangerouslySetInnerHTML={{ __html: rendered.html ?? "" }}
                />
              ) : (
                rendered.paragraphs?.map((paragraph, index) => (
                  <p key={index} className="text-gray-700 text-[16px] sm:text-[17px] leading-[1.8] mb-6 last:mb-0">
                    {paragraph}
                  </p>
                ))
              )}
            </div>

            {article.imageCaption?.trim() && (
              <p className="mt-6 text-sm text-gray-500 italic">
                {article.imageCaption.trim()}
              </p>
            )}

            {/* Share Section */}
            <div className="mt-12 flex items-center gap-4 pt-8 border-t border-gray-100">
              <span className="text-[14px] font-bold text-gray-900 uppercase tracking-widest">Share</span>
              <div className="flex items-center gap-3">
                <a href={`https://www.facebook.com/sharer/sharer.php?u=${settings.siteUrl}/news/${article.slug}`} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-gray-50 border border-[#1877F2]/20 flex items-center justify-center text-[#1877F2] hover:bg-[#1877F2] hover:text-white transition-colors" title="Share on Facebook">
                  <Facebook className="w-4 h-4" />
                </a>
                <a href={`https://www.linkedin.com/shareArticle?mini=true&url=${settings.siteUrl}/news/${article.slug}&title=${encodeURIComponent(article.title)}`} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-gray-50 border border-[#0A66C2]/20 flex items-center justify-center text-[#0A66C2] hover:bg-[#0A66C2] hover:text-white transition-colors" title="Share on LinkedIn">
                  <Linkedin className="w-4 h-4" />
                </a>
                <a href={`https://pinterest.com/pin/create/button/?url=${settings.siteUrl}/news/${article.slug}&media=${settings.siteUrl}${article.image}&description=${encodeURIComponent(article.title)}`} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-gray-50 border border-[#E60023]/20 flex items-center justify-center text-[#E60023] hover:bg-[#E60023] hover:text-white transition-colors" title="Share on Pinterest">
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M12 0C5.373 0 0 5.372 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738.098.119.112.224.083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.631-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12 0-6.628-5.373-12-12-12z" />
                  </svg>
                </a>
                <a href={`https://www.instagram.com/?url=${settings.siteUrl}/news/${article.slug}`} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-gray-50 border border-[#E1306C]/20 flex items-center justify-center text-[#E1306C] hover:bg-[#E1306C] hover:text-white transition-colors" title="Share on Instagram">
                  <Instagram className="w-4 h-4" />
                </a>
              </div>
            </div>

            <div className="mt-8 pt-8 border-t border-gray-100 flex flex-wrap items-center justify-between gap-4">
              <Link href="/news" className="inline-flex items-center gap-2 text-gray-600 font-semibold text-[14px] hover:text-[#C9A063] transition-colors">
                <ArrowLeft className="w-4 h-4" />
                Back to Blog
              </Link>
              <div className="flex flex-wrap gap-3">
                <Link href="/reservation" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#C9A063] text-white font-semibold text-[14px] hover:bg-[#B8935A] transition-colors">
                  Book a ride <ArrowRight className="w-4 h-4" />
                </Link>
                <Link href="/quote" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-gray-200 text-gray-700 font-semibold text-[14px] hover:border-[#C9A063] hover:text-[#C9A063] transition-colors">
                  Get a quote
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {relatedArticles.length > 0 && (
        <section className="pb-16 sm:pb-20 md:pb-24">
          <div className="max-w-7xl mx-auto px-6 sm:px-8 md:px-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight mb-8">Related Articles</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-7">
              {relatedArticles.map((related) => (
                <Link key={related.id} href={`/news/${related.slug}`} className="group flex flex-col rounded-2xl bg-white border border-gray-100 shadow-md overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all">
                  <div className="relative aspect-[16/10] overflow-hidden">
                    <Image src={related.image} alt={related.title} fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover group-hover:scale-105 transition-transform duration-500" />
                    <div className="absolute top-4 left-4">
                      <span className={`inline-block px-3 py-1.5 rounded-lg text-[11px] font-semibold border ${categoryColorsLight[related.category]}`}>{related.category}</span>
                    </div>
                  </div>
                  <div className="p-6">
                    <p className="text-[12px] text-gray-400 mb-2">{formatDate(related.date)}</p>
                    <h3 className="text-lg font-bold text-gray-900 line-clamp-2 group-hover:text-[#C9A063] transition-colors">{related.title}</h3>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <Footer />
    </main>
  );
}
