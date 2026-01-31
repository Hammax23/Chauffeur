import TopNav from "@/components/TopNav";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
// import Companies from "@/components/Companies";
// import OurFleet from "@/components/OurFleet";
import HowItWorks from "@/components/HowItWorks";
import DiscoverFleet from "@/components/DiscoverFleet";
import WhyChoose from "@/components/WhyChoose";
import GlobalFootprint from "@/components/GlobalFootprint";
// import Testimonial from "@/components/Testimonial";
import LuxuryRide from "@/components/LuxuryRide";
import ContactInfo from "@/components/ContactInfo";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <main className="min-h-screen">
      <TopNav />
      <Navbar />
     <HeroSection />
      
      <DiscoverFleet />
      <WhyChoose />
      {/* <OurFleet /> */}
     
       
      {/* <HowItWorks /> */}
      <GlobalFootprint />
      
      {/* <Testimonial /> */}
      {/* <Companies /> */}
      <LuxuryRide />
      <ContactInfo />
      <Footer />
     
    </main>
  );
}
