import dynamic from "next/dynamic";
import TopNav from "@/components/TopNav";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";

// Lazy load below-the-fold components for faster initial load
const DiscoverFleet = dynamic(() => import("@/components/DiscoverFleet"), {
  loading: () => <div className="min-h-[400px]" />,
});
const WhyChoose = dynamic(() => import("@/components/WhyChoose"));
const GlobalFootprint = dynamic(() => import("@/components/GlobalFootprint"));
// const LuxuryRide = dynamic(() => import("@/components/LuxuryRide"));
const ContactInfo = dynamic(() => import("@/components/ContactInfo"));
const Footer = dynamic(() => import("@/components/Footer"));
const FloatingContact = dynamic(() => import("@/components/FloatingContact"));

export default function Home() {
  return (
    <main className="min-h-screen">
      <TopNav />
      <Navbar />
      <HeroSection />
      <DiscoverFleet />
      <WhyChoose />
      <GlobalFootprint />
      {/* <LuxuryRide /> */}
      <ContactInfo />
      <Footer />
      <FloatingContact />
    </main>
  );
}
