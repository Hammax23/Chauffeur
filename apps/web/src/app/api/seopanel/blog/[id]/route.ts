import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { verifySeoPanelAuth } from "@/lib/seo-auth";
import { sanitizeInput } from "@/lib/sanitize";
import {
  estimateReadTimeMinutes,
  getBlogPostByIdForPanel,
  handleBlogSlugChange,
  isValidBlogCategory,
  slugifyTitle,
  syncBlogPostSeoPage,
  unpublishBlogPostSeo,
} from "@/lib/blog";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifySeoPanelAuth(request);
  if (!auth.authenticated) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const post = await getBlogPostByIdForPanel(id);
  if (!post) {
    return NextResponse.json({ success: false, error: "Post not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true, post });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifySeoPanelAuth(request);
  if (!auth.authenticated) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const existing = await getBlogPostByIdForPanel(id);
    if (!existing) {
      return NextResponse.json({ success: false, error: "Post not found" }, { status: 404 });
    }

    const body = await request.json();
    const title = body.title != null ? sanitizeInput(String(body.title)).trim() : existing.title;
    const excerpt = body.excerpt != null ? sanitizeInput(String(body.excerpt)).trim() : existing.excerpt;
    const content = body.content != null ? sanitizeInput(String(body.content)).trim() : existing.content;
    const category = body.category != null ? sanitizeInput(String(body.category)).trim() : existing.category;
    const imageUrl = body.imageUrl != null ? sanitizeInput(String(body.imageUrl)).trim() : existing.imageUrl;
    const author = body.author != null ? sanitizeInput(String(body.author)).trim() : existing.author;
    const status = body.status != null
      ? (["draft", "published", "archived"].includes(body.status) ? body.status : existing.status)
      : existing.status;
    const isFeatured = typeof body.isFeatured === "boolean" ? body.isFeatured : existing.isFeatured;

    let slug = body.slug != null
      ? slugifyTitle(sanitizeInput(String(body.slug)).trim())
      : existing.slug;

    if (!title || !excerpt || !content || !category || !imageUrl) {
      return NextResponse.json({ success: false, error: "Required fields cannot be empty" }, { status: 400 });
    }

    if (!isValidBlogCategory(category)) {
      return NextResponse.json({ success: false, error: "Invalid category" }, { status: 400 });
    }

    if (slug !== existing.slug) {
      const slugTaken = await prisma.blogPost.findFirst({ where: { slug, NOT: { id } } });
      if (slugTaken) {
        return NextResponse.json({ success: false, error: "Slug already in use" }, { status: 400 });
      }
      await handleBlogSlugChange(existing.slug, slug);
    }

    const readTimeMinutes =
      typeof body.readTimeMinutes === "number" && body.readTimeMinutes > 0
        ? body.readTimeMinutes
        : estimateReadTimeMinutes(content);

    let publishedAt = existing.publishedAt;
    if (status === "published" && !publishedAt) {
      publishedAt = body.publishedAt ? new Date(body.publishedAt) : new Date();
    } else if (body.publishedAt) {
      publishedAt = new Date(body.publishedAt);
    } else if (status !== "published") {
      publishedAt = null;
    }

    const post = await prisma.blogPost.update({
      where: { id },
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
        sortOrder: typeof body.sortOrder === "number" ? body.sortOrder : existing.sortOrder,
      },
    });

    if (status === "published") {
      await syncBlogPostSeoPage({ slug: post.slug, title: post.title, excerpt: post.excerpt, imageUrl: post.imageUrl });
    } else {
      await unpublishBlogPostSeo(post.slug);
    }

    revalidatePath("/news");
    revalidatePath(`/news/${existing.slug}`);
    revalidatePath(`/news/${post.slug}`);

    return NextResponse.json({ success: true, post });
  } catch (error) {
    console.error("[SEO Blog Update]", error);
    return NextResponse.json({ success: false, error: "Failed to update blog post" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifySeoPanelAuth(request);
  if (!auth.authenticated) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const existing = await getBlogPostByIdForPanel(id);
    if (!existing) {
      return NextResponse.json({ success: false, error: "Post not found" }, { status: 404 });
    }

    await unpublishBlogPostSeo(existing.slug);
    await prisma.blogPost.delete({ where: { id } });

    revalidatePath("/news");
    revalidatePath(`/news/${existing.slug}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[SEO Blog Delete]", error);
    return NextResponse.json({ success: false, error: "Failed to delete blog post" }, { status: 500 });
  }
}
