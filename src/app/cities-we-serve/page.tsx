import TopNav from "@/components/TopNav";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CitiesWeServiceContent from "@/components/CitiesWeServiceContent";
import type { Metadata } from "next";

const BASE_URL = "https://luxride-chauffeur.vercel.app";

export const metadata: Metadata = {
  title: "Cities We Service",
  description:
    "SARJ Worldwide chauffeur services in 1000+ cities. Canada, United States, Europe, Asia, Middle East. Premium chauffeur hire worldwide.",
  keywords: ["SARJ Worldwide cities", "chauffeur cities", "Toronto chauffeur", "London chauffeur", "chauffeur service worldwide", "airport transfer chauffeur"],
  openGraph: {
    title: "Cities We Service | SARJ Worldwide Chauffeur Services",
    description: "Chauffeur services in 1000+ cities. Canada, USA, Europe, Asia, Middle East.",
    url: `${BASE_URL}/cities-we-serve`,
    siteName: "SARJ Worldwide Chauffeur Services",
    type: "website",
  },
  twitter: { card: "summary_large_image", title: "Cities We Service | SARJ Worldwide Chauffeur Services" },
  alternates: { canonical: `${BASE_URL}/cities-we-serve` },
};

export default function CitiesWeServePage() {
  return (
    <main className="min-h-screen bg-black">
      <TopNav />
      <Navbar />
      <div className="pt-[130px] md:pt-[145px]">
        <CitiesWeServiceContent />
      </div>
      <Footer />
    </main>
  );
}
