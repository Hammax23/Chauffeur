import type { NewsCategory } from "@/data/news";

export type BlogCategory = NewsCategory;
export type BlogPostStatus = "draft" | "published" | "archived";

export const ALL_BLOG_CATEGORIES: BlogCategory[] = [
  "Fleet",
  "Travel Tips",
  "Company",
  "Industry",
  "Service",
  "Events",
];

export interface BlogPostView {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  contentFormat?: "plain" | "html";
  seoTitle?: string | null;
  seoDescription?: string | null;
  canonicalUrl?: string | null;
  focusKeyword?: string | null;
  robotsIndex?: boolean;
  robotsFollow?: boolean;
  imageAlt?: string | null;
  imageTitle?: string | null;
  imageCaption?: string | null;
  imageFileName?: string | null;
  extraSchemaJson?: unknown | null;
  category: BlogCategory;
  date: string;
  image: string;
  readTime: string;
  author: string;
  isFeatured: boolean;
  status: BlogPostStatus;
}

export function isValidBlogCategory(category: string): category is BlogCategory {
  return ALL_BLOG_CATEGORIES.includes(category as BlogCategory);
}

export function getCategoryCountsFromPosts(posts: BlogPostView[]): Record<BlogCategory, number> {
  const counts = Object.fromEntries(ALL_BLOG_CATEGORIES.map((c) => [c, 0])) as Record<BlogCategory, number>;
  for (const post of posts) {
    if (counts[post.category] !== undefined) counts[post.category] += 1;
  }
  return counts;
}
