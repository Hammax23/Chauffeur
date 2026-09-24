import prisma from "@/lib/prisma";
import {
  LEGAL_DEFAULT_CSS,
  LEGAL_DEFAULT_HTML,
  LEGAL_DEFAULT_TITLES,
  LEGAL_SLUGS,
  type LegalSlug,
} from "@/lib/legal-docs";

/** Ensure all three legal docs exist (upsert defaults). */
export async function ensureLegalDocuments() {
  await Promise.all(
    LEGAL_SLUGS.map((slug) =>
      prisma.legalDocument.upsert({
        where: { slug },
        create: {
          slug,
          title: LEGAL_DEFAULT_TITLES[slug],
          contentHtml: LEGAL_DEFAULT_HTML[slug],
          customCss: LEGAL_DEFAULT_CSS,
        },
        update: {},
      })
    )
  );
}

export async function getLegalDocument(slug: LegalSlug) {
  await ensureLegalDocuments();
  return prisma.legalDocument.findUnique({ where: { slug } });
}

export async function listLegalDocuments() {
  await ensureLegalDocuments();
  return prisma.legalDocument.findMany({
    orderBy: { slug: "asc" },
  });
}
