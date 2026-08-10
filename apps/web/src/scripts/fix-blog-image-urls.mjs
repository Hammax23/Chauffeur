/**
 * Script to fix HTML-encoded image URLs in existing blog posts
 * Run with: node src/scripts/fix-blog-image-urls.mjs
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function decodeHtmlEntities(str) {
  if (!str) return str;
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&#x2F;/g, "/")
    .replace(/&#47;/g, "/")
    .replace(/&#96;/g, "`");
}

async function fixBlogImageUrls() {
  console.log("Starting fix for HTML-encoded blog image URLs...\n");

  const posts = await prisma.blogPost.findMany({
    select: {
      id: true,
      title: true,
      imageUrl: true,
      canonicalUrl: true,
    },
  });

  console.log(`Found ${posts.length} blog posts to check\n`);

  let fixed = 0;

  for (const post of posts) {
    const needsFix = post.imageUrl.includes("&#x2F;") || post.imageUrl.includes("&#47;") || 
                     (post.canonicalUrl && (post.canonicalUrl.includes("&#x2F;") || post.canonicalUrl.includes("&#47;")));

    if (needsFix) {
      const decodedImageUrl = decodeHtmlEntities(post.imageUrl);
      const decodedCanonicalUrl = post.canonicalUrl ? decodeHtmlEntities(post.canonicalUrl) : post.canonicalUrl;

      console.log(`Fixing: ${post.title}`);
      console.log(`  Old imageUrl: ${post.imageUrl}`);
      console.log(`  New imageUrl: ${decodedImageUrl}`);
      if (post.canonicalUrl && post.canonicalUrl !== decodedCanonicalUrl) {
        console.log(`  Old canonicalUrl: ${post.canonicalUrl}`);
        console.log(`  New canonicalUrl: ${decodedCanonicalUrl}`);
      }

      await prisma.blogPost.update({
        where: { id: post.id },
        data: {
          imageUrl: decodedImageUrl,
          canonicalUrl: decodedCanonicalUrl,
        },
      });

      fixed++;
      console.log(`  ✓ Fixed\n`);
    }
  }

  console.log(`\nDone! Fixed ${fixed} out of ${posts.length} blog posts.`);
  await prisma.$disconnect();
}

fixBlogImageUrls()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Error:", error);
    process.exit(1);
  });
