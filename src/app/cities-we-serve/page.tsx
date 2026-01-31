import TopNav from "@/components/TopNav";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CitiesWeServiceContent from "@/components/CitiesWeServiceContent";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cities We Service",
  description:
    "Luxury chauffeur services available in over 1000 cities worldwide. Canada, United States, Europe, Asia, Middle East, and more.",
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
