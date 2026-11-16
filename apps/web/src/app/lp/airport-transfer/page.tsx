import type { Metadata } from "next";
import LandingPage, { featureIcons, stepIcons, type LandingPageContent } from "@/components/LandingPage";

export const metadata: Metadata = {
  title: "Airport Transfer Toronto Pearson (YYZ) | SARJ Worldwide",
  description:
    "Private chauffeur airport transfers to and from Toronto Pearson, Billy Bishop, Hamilton and Buffalo. Flight tracking, meet and greet, fixed upfront pricing.",
  robots: { index: false, follow: true },
};

const content: LandingPageContent = {
  eyebrow: "Airport transfers",
  headline: "Airport Chauffeur Service in",
  headlineAccent: "Toronto & the GTA",
  intro:
    "Your chauffeur tracks your flight, meets you at arrivals and takes you straight to your destination. Fixed upfront pricing and no waiting for a ride.",
  heroPoster: "/cover-poster.jpg",
  pickupPlaceholder: "Pickup or airport",
  heroPoints: ["Fixed upfront pricing, no hidden fees", "Flight tracking and complimentary wait time", "Licensed, professional chauffeurs, 24/7"],
  features: [
    { icon: featureIcons.rates, title: "Flat rates", note: "No hidden fees" },
    { icon: featureIcons.flight, title: "Flight tracking", note: "Free airport wait" },
    { icon: featureIcons.licensed, title: "Licensed chauffeurs", note: "Professional & vetted" },
    { icon: featureIcons.support, title: "24/7 service", note: "Always available" },
  ],
  stepsTitle: ["Booked in", "three simple steps"],
  steps: [
    { icon: stepIcons.trip, title: "Tell us your trip", body: "Enter pickup, destination, date and time to see your price instantly." },
    { icon: stepIcons.confirm, title: "Confirm your booking", body: "Choose your vehicle and confirm online. Your confirmation arrives by email right away." },
    { icon: stepIcons.ride, title: "Ride with confidence", body: "Your chauffeur arrives early, tracks your flight and takes care of the rest." },
  ],
  routesTitle: ["From Toronto Pearson to", "popular places"],
  routesIntro: "Your chauffeur meets you at arrivals and takes you straight there. Choose a route to start your booking.",
  routesFrom: "Toronto Pearson (YYZ)",
  routes: [
    { from: "Toronto Pearson (YYZ)", to: "Downtown Toronto", km: "≈ 28 km", time: "≈ 35 min" },
    { from: "Downtown Toronto", to: "Niagara Falls", km: "≈ 130 km", time: "≈ 1 hr 30 min" },
    { from: "Downtown Toronto", to: "Muskoka", km: "≈ 170 km", time: "≈ 2 hr" },
    { from: "Toronto Pearson (YYZ)", to: "Hamilton", km: "≈ 75 km", time: "≈ 55 min" },
  ],
};

export default function AirportTransferLandingPage() {
  return <LandingPage content={content} />;
}
