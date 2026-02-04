import TopNav from "@/components/TopNav";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import DiscoverFleet from "@/components/DiscoverFleet";
import WhyChoose from "@/components/WhyChoose";
import GlobalFootprint from "@/components/GlobalFootprint";
import LuxuryRide from "@/components/LuxuryRide";
import ContactInfo from "@/components/ContactInfo";
import Footer from "@/components/Footer";
import FloatingContact from "@/components/FloatingContact";

export default function Home() {
  return (
    <main className="min-h-screen">
      <TopNav />
      <Navbar />
      <HeroSection />
      <DiscoverFleet />
      <WhyChoose />
      <GlobalFootprint />
      <LuxuryRide />
      <ContactInfo />
      <Footer />
      <FloatingContact />
    </main>
  );
}
