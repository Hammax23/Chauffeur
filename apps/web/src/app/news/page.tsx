import BlogListing from "@/components/BlogListing";
import { getPublishedBlogPosts, getCategoryCountsFromPosts } from "@/lib/blog";

export const revalidate = 60;

export default async function BlogPage() {
  const articles = await getPublishedBlogPosts();
  const categoryCounts = getCategoryCountsFromPosts(articles);

  return <BlogListing articles={articles} categoryCounts={categoryCounts} />;
}
