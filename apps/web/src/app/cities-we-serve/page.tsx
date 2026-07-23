import TopNav from "@/components/TopNav";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CitiesWeServiceContent from "@/components/CitiesWeServiceContent";
import { getAllCities } from "@/lib/managed-cities";
import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo-metadata";

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadata("/cities-we-serve", {
    title: "Cities We Service | SARJ Worldwide Chauffeur Services",
    description: "SARJ Worldwide chauffeur services in 1000+ cities. Canada, United States, Europe, Asia, Middle East. Premium chauffeur hire worldwide.",
    keywords: ["SARJ Worldwide cities", "chauffeur cities", "Toronto chauffeur", "London chauffeur", "chauffeur service worldwide", "airport transfer chauffeur"],
  });
}

export default async function CitiesWeServePage() {
  const cities = await getAllCities();
  return (
    <main className="min-h-screen bg-black">
      <TopNav />
      <Navbar />
      <div className="pt-[108px] md:pt-[120px]">
        <CitiesWeServiceContent cities={cities.map((c) => ({ slug: c.slug, label: c.label }))} />
      </div>
      <Footer />
    </main>
  );
}
