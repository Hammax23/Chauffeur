import { notFound } from "next/navigation";
import TopNav from "@/components/TopNav";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CityServicePageContent from "@/components/CityServicePageContent";
import { getRegionBySlug, getRegionDisplayName, getAllRegionSlugs } from "@/data/regions";
import type { Metadata } from "next";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return getAllRegionSlugs().map((slug) => ({ slug }));
}

const BASE_URL = "https://luxride-chauffeur.vercel.app";

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const region = getRegionBySlug(slug);
  if (!region) return { title: "Cities We Service" };
  const name = getRegionDisplayName(slug);
  const url = `${BASE_URL}/cities-we-serve/${slug}`;
  return {
    title: `Luxury Limo Service in ${name}`,
    description: `SARJ Worldwide chauffeur service in ${name}. Airport transfers, executive chauffeur, wedding transport. Reserve now.`,
    keywords: [`${name} chauffeur`, `SARJ Worldwide ${name}`, `${name} chauffeur service`, "airport transfer chauffeur"],
    openGraph: {
      title: `Chauffeur Service in ${name} | SARJ Worldwide Chauffeur Services`,
      description: `SARJ Worldwide chauffeur in ${name}. Airport transfers, corporate, weddings.`,
      url,
      siteName: "SARJ Worldwide Chauffeur Services",
      type: "website",
    },
    twitter: { card: "summary_large_image", title: `Chauffeur Service in ${name} | SARJ Worldwide Chauffeur Services` },
    alternates: { canonical: url },
  };
}

export default async function CityServicePage({ params }: PageProps) {
  const { slug } = await params;
  const region = getRegionBySlug(slug);
  if (!region) notFound();

  const name = getRegionDisplayName(slug);
  const url = `${BASE_URL}/cities-we-serve/${slug}`;

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Home", "item": BASE_URL },
      { "@type": "ListItem", "position": 2, "name": "Cities We Service", "item": `${BASE_URL}/cities-we-serve` },
      { "@type": "ListItem", "position": 3, "name": name, "item": url },
    ],
  };

  return (
    <main className="min-h-screen bg-black">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <TopNav />
      <Navbar />
      <div className="pt-[130px] md:pt-[145px]">
        <CityServicePageContent name={name} slug={slug} />
      </div>
      <Footer />
    </main>
  );
}
