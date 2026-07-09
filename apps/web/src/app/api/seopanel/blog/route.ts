import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { verifySeoPanelAuth } from "@/lib/seo-auth";
import { sanitizeInput } from "@/lib/sanitize";
import { sanitizeBlogHtml } from "@/lib/blog-content";
import { logSeoAudit } from "@/lib/seo-audit";
import { getClientIP } from "@/lib/seo-auth";
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
    const contentFormat = body.contentFormat === "html" ? "html" : "plain";
    const rawContent = String(body.content || "").trim();
    const content = contentFormat === "html" ? sanitizeBlogHtml(rawContent) : sanitizeInput(rawContent);
    const contentText = content.replace(/<[^>]+>/g, "").trim();
    const category = sanitizeInput(String(body.category || "")).trim();
    const imageUrl = sanitizeInput(String(body.imageUrl || "")).trim();
    const author = sanitizeInput(String(body.author || "SARJ Worldwide Team")).trim();
    const status = ["draft", "published", "archived"].includes(body.status) ? body.status : "draft";
    const isFeatured = Boolean(body.isFeatured);
    const seoTitle = body.seoTitle != null ? sanitizeInput(String(body.seoTitle)).trim() : "";
    const seoDescription = body.seoDescription != null ? sanitizeInput(String(body.seoDescription)).trim() : "";
    const canonicalUrl = body.canonicalUrl != null ? sanitizeInput(String(body.canonicalUrl)).trim() : "";
    const focusKeyword = body.focusKeyword != null ? sanitizeInput(String(body.focusKeyword)).trim() : "";
    const robotsIndex = typeof body.robotsIndex === "boolean" ? body.robotsIndex : true;
    const robotsFollow = typeof body.robotsFollow === "boolean" ? body.robotsFollow : true;
    const imageAlt = body.imageAlt != null ? sanitizeInput(String(body.imageAlt)).trim() : "";
    const imageTitle = body.imageTitle != null ? sanitizeInput(String(body.imageTitle)).trim() : "";
    const imageCaption = body.imageCaption != null ? sanitizeInput(String(body.imageCaption)).trim() : "";
    const imageFileName = body.imageFileName != null ? sanitizeInput(String(body.imageFileName)).trim() : "";
    const extraSchemaJson = body.extraSchemaJson ?? null;

    let slug = sanitizeInput(String(body.slug || "")).trim() || slugifyTitle(title);
    slug = slugifyTitle(slug);

    if (!title || !excerpt || !contentText || !category || !imageUrl) {
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
        contentFormat,
        seoTitle: seoTitle || null,
        seoDescription: seoDescription || null,
        canonicalUrl: canonicalUrl || null,
        focusKeyword: focusKeyword || null,
        robotsIndex,
        robotsFollow,
        imageAlt: imageAlt || null,
        imageTitle: imageTitle || null,
        imageCaption: imageCaption || null,
        imageFileName: imageFileName || null,
        extraSchemaJson,
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
      await syncBlogPostSeoPage({
        slug: post.slug,
        title: post.title,
        excerpt: post.excerpt,
        imageUrl: post.imageUrl,
        seoTitle: post.seoTitle,
        seoDescription: post.seoDescription,
        canonicalUrl: post.canonicalUrl,
        focusKeyword: post.focusKeyword,
        robotsIndex: post.robotsIndex,
        robotsFollow: post.robotsFollow,
      });
    }

    revalidatePath("/news");
    revalidatePath(`/news/${post.slug}`);

    await logSeoAudit({
      action: "create",
      entityType: "blog",
      entityId: post.id,
      entityLabel: post.title,
      ipAddress: getClientIP(request),
    });

    return NextResponse.json({ success: true, post });
  } catch (error) {
    console.error("[SEO Blog Create]", error);
    const message = error instanceof Error ? error.message : "Failed to create blog post";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
