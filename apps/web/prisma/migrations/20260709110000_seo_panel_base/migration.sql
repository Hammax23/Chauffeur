-- Base SEO panel tables (idempotent for environments that used prisma db push)

CREATE TABLE IF NOT EXISTS "SeoSettings" (
    "id" TEXT NOT NULL,
    "siteUrl" TEXT NOT NULL DEFAULT 'https://sarjworldwide.ca',
    "siteName" TEXT NOT NULL DEFAULT 'SARJ Worldwide Chauffeur Services',
    "titleTemplate" TEXT NOT NULL DEFAULT '%s | SARJ Worldwide Chauffeur',
    "defaultTitle" TEXT NOT NULL DEFAULT 'SARJ Worldwide Chauffeur Services | Premium Luxury Transportation',
    "defaultDescription" TEXT NOT NULL DEFAULT 'SARJ Worldwide chauffeur services. Airport transfers, corporate travel, weddings, VIP transport & city tours.',
    "defaultKeywords" TEXT,
    "defaultOgImage" TEXT,
    "twitterHandle" TEXT,
    "twitterCardType" TEXT NOT NULL DEFAULT 'summary_large_image',
    "googleVerification" TEXT,
    "bingVerification" TEXT,
    "yandexVerification" TEXT,
    "pinterestVerification" TEXT,
    "facebookAppId" TEXT,
    "ga4Id" TEXT,
    "gtmId" TEXT,
    "facebookPixelId" TEXT,
    "organizationName" TEXT,
    "organizationLogo" TEXT,
    "organizationPhone" TEXT,
    "organizationEmail" TEXT,
    "organizationAddress" TEXT,
    "organizationCity" TEXT,
    "organizationRegion" TEXT,
    "organizationPostal" TEXT,
    "organizationCountry" TEXT NOT NULL DEFAULT 'CA',
    "localBusinessSchema" JSONB,
    "websiteSchema" JSONB,
    "robotsExtraRules" TEXT,
    "sitemapEnabled" BOOLEAN NOT NULL DEFAULT true,
    "defaultChangeFreq" TEXT NOT NULL DEFAULT 'weekly',
    "defaultPriority" DOUBLE PRECISION NOT NULL DEFAULT 0.8,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SeoSettings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "SeoPage" (
    "id" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "pageType" TEXT NOT NULL DEFAULT 'static',
    "pageLabel" TEXT,
    "title" TEXT,
    "metaDescription" TEXT,
    "keywords" TEXT,
    "canonicalUrl" TEXT,
    "ogTitle" TEXT,
    "ogDescription" TEXT,
    "ogImage" TEXT,
    "twitterTitle" TEXT,
    "twitterDescription" TEXT,
    "twitterImage" TEXT,
    "h1" TEXT,
    "focusKeyword" TEXT,
    "robotsIndex" BOOLEAN NOT NULL DEFAULT true,
    "robotsFollow" BOOLEAN NOT NULL DEFAULT true,
    "noarchive" BOOLEAN NOT NULL DEFAULT false,
    "nosnippet" BOOLEAN NOT NULL DEFAULT false,
    "includeInSitemap" BOOLEAN NOT NULL DEFAULT true,
    "sitemapPriority" DOUBLE PRECISION,
    "sitemapChangeFreq" TEXT,
    "schemaJson" JSONB,
    "breadcrumbLabel" TEXT,
    "headerScripts" TEXT,
    "bodyScripts" TEXT,
    "internalNotes" TEXT,
    "lastAuditedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SeoPage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "SeoRedirect" (
    "id" TEXT NOT NULL,
    "sourcePath" TEXT NOT NULL,
    "destinationPath" TEXT NOT NULL,
    "redirectType" INTEGER NOT NULL DEFAULT 301,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SeoRedirect_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "BlogPost" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "excerpt" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "readTimeMinutes" INTEGER NOT NULL DEFAULT 3,
    "author" TEXT NOT NULL DEFAULT 'SARJ Worldwide Team',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BlogPost_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "SeoPage_path_key" ON "SeoPage"("path");
CREATE INDEX IF NOT EXISTS "SeoPage_pageType_idx" ON "SeoPage"("pageType");
CREATE INDEX IF NOT EXISTS "SeoPage_includeInSitemap_idx" ON "SeoPage"("includeInSitemap");

CREATE UNIQUE INDEX IF NOT EXISTS "SeoRedirect_sourcePath_key" ON "SeoRedirect"("sourcePath");
CREATE INDEX IF NOT EXISTS "SeoRedirect_isActive_idx" ON "SeoRedirect"("isActive");

CREATE UNIQUE INDEX IF NOT EXISTS "BlogPost_slug_key" ON "BlogPost"("slug");
CREATE INDEX IF NOT EXISTS "BlogPost_status_publishedAt_idx" ON "BlogPost"("status", "publishedAt");
CREATE INDEX IF NOT EXISTS "BlogPost_category_idx" ON "BlogPost"("category");
CREATE INDEX IF NOT EXISTS "BlogPost_isFeatured_idx" ON "BlogPost"("isFeatured");
