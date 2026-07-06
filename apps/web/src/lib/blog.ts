import prisma from "@/lib/prisma";
import { newsArticles } from "@/data/news";
import { normalizeSeoPath } from "@/lib/seo-pages";
import {
  ALL_BLOG_CATEGORIES,
  type BlogCategory,
  type BlogPostStatus,
  type BlogPostView,
  isValidBlogCategory,
} from "@/lib/blog-types";

export type { BlogCategory, BlogPostStatus, BlogPostView } from "@/lib/blog-types";
export { ALL_BLOG_CATEGORIES, isValidBlogCategory, getCategoryCountsFromPosts } from "@/lib/blog-types";

function parseReadTimeMinutes(readTime: string): number {
  const match = readTime.match(/(\d+)/);
  return match ? Number(match[1]) : 3;
}

function formatReadTime(minutes: number): string {
  return `${Math.max(1, minutes)} min read`;
}

function toBlogPostView(post: {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  category: string;
  imageUrl: string;
  readTimeMinutes: number;
  author: string;
  isFeatured: boolean;
  status: string;
  publishedAt: Date | null;
  createdAt: Date;
}): BlogPostView {
  const dateSource = post.publishedAt ?? post.createdAt;
  return {
    id: post.id,
    slug: post.slug,
    title: post.title,
    excerpt: post.excerpt,
    content: post.content,
    category: post.category as BlogCategory,
    date: dateSource.toISOString().slice(0, 10),
    image: post.imageUrl,
    readTime: formatReadTime(post.readTimeMinutes),
    author: post.author,
    isFeatured: post.isFeatured,
    status: post.status as BlogPostStatus,
  };
}

function staticFallbackPosts(): BlogPostView[] {
  return newsArticles.map((article) => ({
    id: article.id,
    slug: article.slug,
    title: article.title,
    excerpt: article.excerpt,
    content: article.content,
    category: article.category,
    date: article.date,
    image: article.image,
    readTime: article.readTime,
    author: "SARJ Worldwide Team",
    isFeatured: false,
    status: "published" as const,
  }));
}

async function hasAnyBlogPostsInDb(): Promise<boolean> {
  if (!process.env.DATABASE_URL?.trim()) return false;
  try {
    const count = await prisma.blogPost.count();
    return count > 0;
  } catch {
    return false;
  }
}

export function estimateReadTimeMinutes(content: string): number {
  const words = content.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}

export function slugifyTitle(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function getPublishedBlogPosts(): Promise<BlogPostView[]> {
  if (!process.env.DATABASE_URL?.trim()) {
    return staticFallbackPosts();
  }

  try {
    const hasPosts = await hasAnyBlogPostsInDb();
    if (!hasPosts) return staticFallbackPosts();

    const posts = await prisma.blogPost.findMany({
      where: { status: "published" },
      orderBy: [{ isFeatured: "desc" }, { publishedAt: "desc" }, { createdAt: "desc" }],
    });

    return posts.map(toBlogPostView);
  } catch {
    return staticFallbackPosts();
  }
}

export async function getAllBlogPostsForPanel(): Promise<BlogPostView[]> {
  if (!process.env.DATABASE_URL?.trim()) return [];

  const posts = await prisma.blogPost.findMany({
    orderBy: [{ isFeatured: "desc" }, { publishedAt: "desc" }, { createdAt: "desc" }],
  });

  return posts.map(toBlogPostView);
}

export async function getBlogPostBySlug(slug: string): Promise<BlogPostView | null> {
  if (!process.env.DATABASE_URL?.trim()) {
    return staticFallbackPosts().find((p) => p.slug === slug) ?? null;
  }

  try {
    const post = await prisma.blogPost.findUnique({ where: { slug } });
    if (post) {
      if (post.status !== "published") return null;
      return toBlogPostView(post);
    }

    const hasPosts = await hasAnyBlogPostsInDb();
    if (hasPosts) return null;

    return staticFallbackPosts().find((p) => p.slug === slug) ?? null;
  } catch {
    return staticFallbackPosts().find((p) => p.slug === slug) ?? null;
  }
}

export async function getBlogPostByIdForPanel(id: string) {
  if (!process.env.DATABASE_URL?.trim()) return null;
  return prisma.blogPost.findUnique({ where: { id } });
}

export async function getRelatedBlogPosts(slug: string, limit = 3): Promise<BlogPostView[]> {
  const posts = await getPublishedBlogPosts();
  const current = posts.find((p) => p.slug === slug);
  if (!current) return posts.slice(0, limit);

  return posts
    .filter((p) => p.slug !== slug)
    .sort((a, b) => {
      const aMatch = a.category === current.category ? 1 : 0;
      const bMatch = b.category === current.category ? 1 : 0;
      if (aMatch !== bMatch) return bMatch - aMatch;
      return b.date.localeCompare(a.date);
    })
    .slice(0, limit);
}

export async function syncBlogPostSeoPage(post: {
  slug: string;
  title: string;
  excerpt: string;
  imageUrl?: string;
}) {
  if (!process.env.DATABASE_URL?.trim()) return;

  const path = normalizeSeoPath(`/news/${post.slug}`);
  const existing = await prisma.seoPage.findUnique({ where: { path } });

  await prisma.seoPage.upsert({
    where: { path },
    create: {
      path,
      pageType: "blog",
      pageLabel: post.title,
      title: `${post.title} | SARJ Worldwide Blog`,
      metaDescription: post.excerpt,
      ogTitle: post.title,
      ogDescription: post.excerpt,
      ogImage: post.imageUrl ?? null,
      h1: post.title,
      includeInSitemap: true,
      robotsIndex: true,
    },
    update: {
      pageLabel: post.title,
      robotsIndex: true,
      includeInSitemap: true,
      ...(existing?.title ? {} : { title: `${post.title} | SARJ Worldwide Blog` }),
      ...(existing?.metaDescription ? {} : { metaDescription: post.excerpt }),
      ...(existing?.ogImage || !post.imageUrl ? {} : { ogImage: post.imageUrl }),
    },
  });
}

export async function unpublishBlogPostSeo(slug: string) {
  if (!process.env.DATABASE_URL?.trim()) return;

  const path = normalizeSeoPath(`/news/${slug}`);
  await prisma.seoPage.updateMany({
    where: { path },
    data: {
      robotsIndex: false,
      includeInSitemap: false,
    },
  });
}

export function buildBlogPostingSchema(article: BlogPostView, siteUrl = "https://sarjworldwide.ca") {
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: article.title,
    description: article.excerpt,
    image: [article.image],
    datePublished: article.date,
    author: {
      "@type": "Organization",
      name: article.author,
    },
    publisher: {
      "@type": "Organization",
      name: "SARJ Worldwide Chauffeur Services",
      logo: {
        "@type": "ImageObject",
        url: `${siteUrl.replace(/\/$/, "")}/logo1.png`,
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `${siteUrl.replace(/\/$/, "")}/news/${article.slug}`,
    },
  };
}

export async function getBlogPanelStats(): Promise<{
  total: number;
  published: number;
  draft: number;
  archived: number;
}> {
  if (!process.env.DATABASE_URL?.trim()) {
    return { total: 0, published: 0, draft: 0, archived: 0 };
  }

  const [total, published, draft, archived] = await Promise.all([
    prisma.blogPost.count(),
    prisma.blogPost.count({ where: { status: "published" } }),
    prisma.blogPost.count({ where: { status: "draft" } }),
    prisma.blogPost.count({ where: { status: "archived" } }),
  ]);

  return { total, published, draft, archived };
}

export async function handleBlogSlugChange(oldSlug: string, newSlug: string) {
  if (!process.env.DATABASE_URL?.trim() || oldSlug === newSlug) return;

  const sourcePath = normalizeSeoPath(`/news/${oldSlug}`);
  const destinationPath = normalizeSeoPath(`/news/${newSlug}`);

  await prisma.seoRedirect.upsert({
    where: { sourcePath },
    create: {
      sourcePath,
      destinationPath,
      redirectType: 301,
      notes: `Auto-redirect after blog slug change`,
    },
    update: {
      destinationPath,
      isActive: true,
    },
  });
}

export async function seedBlogPostsFromStatic(): Promise<{ created: number; skipped: number }> {
  if (!process.env.DATABASE_URL?.trim()) {
    throw new Error("DATABASE_URL is not configured");
  }

  let created = 0;
  let skipped = 0;

  for (const article of newsArticles) {
    const existing = await prisma.blogPost.findUnique({ where: { slug: article.slug } });
    if (existing) {
      skipped++;
      continue;
    }

    const post = await prisma.blogPost.create({
      data: {
        slug: article.slug,
        title: article.title,
        excerpt: article.excerpt,
        content: article.content,
        category: article.category,
        imageUrl: article.image,
        readTimeMinutes: parseReadTimeMinutes(article.readTime),
        author: "SARJ Worldwide Team",
        status: "published",
        publishedAt: new Date(`${article.date}T12:00:00.000Z`),
      },
    });

    await syncBlogPostSeoPage({
      slug: post.slug,
      title: post.title,
      excerpt: post.excerpt,
      imageUrl: post.imageUrl,
    });

    created++;
  }

  return { created, skipped };
}

export async function getDiscoveredBlogPages(): Promise<
  { path: string; pageType: "blog"; pageLabel: string; defaultTitle?: string; defaultDescription?: string }[]
> {
  if (!process.env.DATABASE_URL?.trim()) {
    return newsArticles.map((article) => ({
      path: `/news/${article.slug}`,
      pageType: "blog" as const,
      pageLabel: article.title,
      defaultTitle: `${article.title} | SARJ Worldwide Blog`,
      defaultDescription: article.excerpt,
    }));
  }

  try {
    const hasPosts = await hasAnyBlogPostsInDb();
    if (!hasPosts) {
      return newsArticles.map((article) => ({
        path: `/news/${article.slug}`,
        pageType: "blog" as const,
        pageLabel: article.title,
        defaultTitle: `${article.title} | SARJ Worldwide Blog`,
        defaultDescription: article.excerpt,
      }));
    }

    const posts = await prisma.blogPost.findMany({
      where: { status: "published" },
      select: { slug: true, title: true, excerpt: true },
      orderBy: { publishedAt: "desc" },
    });

    return posts.map((post) => ({
      path: `/news/${post.slug}`,
      pageType: "blog" as const,
      pageLabel: post.title,
      defaultTitle: `${post.title} | SARJ Worldwide Blog`,
      defaultDescription: post.excerpt,
    }));
  } catch {
    return [];
  }
}
