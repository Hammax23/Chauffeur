import dynamic from "next/dynamic";
import TopNav from "@/components/TopNav";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import { GoogleMapsProvider } from "@/components/GoogleMapsProvider";
import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo-metadata";

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadata("/");
}

// Lazy load below-the-fold components for faster initial load
const DiscoverFleet = dynamic(() => import("@/components/DiscoverFleet"), {
  loading: () => <div className="min-h-[400px]" />,
});
const PremiumServices = dynamic(() => import("@/components/PremiumServices"));
const WhyChoose = dynamic(() => import("@/components/WhyChoose"));
const BookingProcess = dynamic(() => import("@/components/BookingProcess"));
const GlobalFootprint = dynamic(() => import("@/components/GlobalFootprint"));
// const LuxuryRide = dynamic(() => import("@/components/LuxuryRide"));
const GoogleReviews = dynamic(() => import("@/components/GoogleReviews"));
const PopularRoutes = dynamic(() => import("@/components/PopularRoutes"));
const FaqSection = dynamic(() => import("@/components/FaqSection"));
const Footer = dynamic(() => import("@/components/Footer"));
const FloatingContact = dynamic(() => import("@/components/FloatingContact"));

export default function Home() {
  return (
    <GoogleMapsProvider>
    <main className="min-h-screen">
      <TopNav />
      <Navbar />
      <HeroSection />
      <DiscoverFleet />
      <PremiumServices />
      <WhyChoose />
      <BookingProcess />
      <GlobalFootprint />
      <PopularRoutes />
      {/* <LuxuryRide /> */}
      <GoogleReviews />
      <FaqSection />
      <Footer />
      <FloatingContact />
    </main>
    </GoogleMapsProvider>
  );
}
