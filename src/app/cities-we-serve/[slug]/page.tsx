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

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const region = getRegionBySlug(slug);
  if (!region) return { title: "Cities We Service" };
  const name = getRegionDisplayName(slug);
  return {
    title: `Luxury Limo Service in ${name}`,
    description: `Best luxury limo and chauffeur service in ${name}. Airport transfers, executive car service, wedding transport. Reserve now.`,
  };
}

export default async function CityServicePage({ params }: PageProps) {
  const { slug } = await params;
  const region = getRegionBySlug(slug);
  if (!region) notFound();

  const name = getRegionDisplayName(slug);

  return (
    <main className="min-h-screen bg-black">
      <TopNav />
      <Navbar />
      <div className="pt-[130px] md:pt-[145px]">
        <CityServicePageContent name={name} slug={slug} />
      </div>
      <Footer />
    </main>
  );
}
