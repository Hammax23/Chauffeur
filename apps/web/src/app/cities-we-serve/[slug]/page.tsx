import { notFound } from "next/navigation";
import TopNav from "@/components/TopNav";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CityServicePageContent from "@/components/CityServicePageContent";
import { getCityBySlug, getCityDisplayName, getAllCitySlugs } from "@/lib/managed-cities";
import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo-metadata";
import { getSeoSettings, getSeoPageByPath } from "@/lib/seo-config";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const slugs = await getAllCitySlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const region = await getCityBySlug(slug);
  if (!region) return { title: "Cities We Service" };
  const name = await getCityDisplayName(slug);
  return buildPageMetadata(`/cities-we-serve/${slug}`, {
    title: `Chauffeur Service in ${name} | SARJ Worldwide`,
    description:
      region.description?.trim() ||
      `SARJ Worldwide chauffeur service in ${name}. Airport transfers, executive chauffeur, wedding transport. Reserve now.`,
    keywords: [
      `${name} chauffeur`,
      `SARJ Worldwide ${name}`,
      `${name} chauffeur service`,
      "airport transfer chauffeur",
    ],
  });
}

export default async function CityServicePage({ params }: PageProps) {
  const { slug } = await params;
  const region = await getCityBySlug(slug);
  if (!region) notFound();

  const name = await getCityDisplayName(slug);
  const [settings, seoPage] = await Promise.all([
    getSeoSettings(),
    getSeoPageByPath(`/cities-we-serve/${slug}`),
  ]);
  const baseUrl = settings.siteUrl.replace(/\/$/, "");
  const url = `${baseUrl}/cities-we-serve/${slug}`;
  const crumbName = seoPage?.breadcrumbLabel?.trim() || name;

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: baseUrl },
      {
        "@type": "ListItem",
        position: 2,
        name: "Cities We Service",
        item: `${baseUrl}/cities-we-serve`,
      },
      { "@type": "ListItem", position: 3, name: crumbName, item: url },
    ],
  };

  return (
    <main className="min-h-screen bg-black">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <TopNav />
      <Navbar />
      <div className="pt-[130px] md:pt-[145px]">
        <CityServicePageContent
          name={name}
          h1={seoPage?.h1}
          description={region.description}
        />
      </div>
      <Footer />
    </main>
  );
}
