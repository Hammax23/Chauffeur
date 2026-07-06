import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { verifySeoPanelAuth } from "@/lib/seo-auth";
import { sanitizeInput } from "@/lib/sanitize";
import {
  ALL_BLOG_CATEGORIES,
  estimateReadTimeMinutes,
  getAllBlogPostsForPanel,
  isValidBlogCategory,
  seedBlogPostsFromStatic,
  slugifyTitle,
  syncBlogPostSeoPage,
} from "@/lib/blog";

export async function GET(request: NextRequest) {
  const auth = await verifySeoPanelAuth(request);
  if (!auth.authenticated) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") ?? "";
    const q = searchParams.get("q")?.toLowerCase() ?? "";

    let posts = await getAllBlogPostsForPanel();

    if (status) posts = posts.filter((p) => p.status === status);
    if (q) {
      posts = posts.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.slug.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q)
      );
    }

    return NextResponse.json({
      success: true,
      posts,
      categories: ALL_BLOG_CATEGORIES,
      total: posts.length,
    });
  } catch (error) {
    console.error("[SEO Blog List]", error);
    return NextResponse.json({ success: false, error: "Failed to load blog posts" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await verifySeoPanelAuth(request);
  if (!auth.authenticated) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();

    if (body.action === "seed") {
      const result = await seedBlogPostsFromStatic();
      revalidatePath("/news");
      return NextResponse.json({ success: true, ...result, message: `Imported ${result.created} articles` });
    }

    const title = sanitizeInput(String(body.title || "")).trim();
    const excerpt = sanitizeInput(String(body.excerpt || "")).trim();
    const content = sanitizeInput(String(body.content || "")).trim();
    const category = sanitizeInput(String(body.category || "")).trim();
    const imageUrl = sanitizeInput(String(body.imageUrl || "")).trim();
    const author = sanitizeInput(String(body.author || "SARJ Worldwide Team")).trim();
    const status = ["draft", "published", "archived"].includes(body.status) ? body.status : "draft";
    const isFeatured = Boolean(body.isFeatured);

    let slug = sanitizeInput(String(body.slug || "")).trim() || slugifyTitle(title);
    slug = slugifyTitle(slug);

    if (!title || !excerpt || !content || !category || !imageUrl) {
      return NextResponse.json({ success: false, error: "Title, excerpt, content, category, and image are required" }, { status: 400 });
    }

    if (!isValidBlogCategory(category)) {
      return NextResponse.json({ success: false, error: "Invalid category" }, { status: 400 });
    }

    const existingSlug = await prisma.blogPost.findUnique({ where: { slug } });
    if (existingSlug) {
      return NextResponse.json({ success: false, error: "Slug already exists" }, { status: 400 });
    }

    const readTimeMinutes =
      typeof body.readTimeMinutes === "number" && body.readTimeMinutes > 0
        ? body.readTimeMinutes
        : estimateReadTimeMinutes(content);

    const publishedAt =
      status === "published"
        ? body.publishedAt
          ? new Date(body.publishedAt)
          : new Date()
        : null;

    const post = await prisma.blogPost.create({
      data: {
        slug,
        title,
        excerpt,
        content,
        category,
        imageUrl,
        author,
        status,
        isFeatured,
        readTimeMinutes,
        publishedAt,
        sortOrder: typeof body.sortOrder === "number" ? body.sortOrder : 0,
      },
    });

    if (status === "published") {
      await syncBlogPostSeoPage({ slug: post.slug, title: post.title, excerpt: post.excerpt, imageUrl: post.imageUrl });
    }

    revalidatePath("/news");
    revalidatePath(`/news/${post.slug}`);

    return NextResponse.json({ success: true, post });
  } catch (error) {
    console.error("[SEO Blog Create]", error);
    const message = error instanceof Error ? error.message : "Failed to create blog post";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
