import type { Metadata } from "next";
import LandingPage, { featureIcons, stepIcons, type LandingPageContent } from "@/components/LandingPage";

export const metadata: Metadata = {
  title: "Corporate Chauffeur Transfers Toronto | SARJ Worldwide",
  description:
    "Executive chauffeur transportation for clients, employees and events across Toronto and the GTA. Monthly billing, dedicated account support, 24/7 service.",
  robots: { index: false, follow: true },
};

const content: LandingPageContent = {
  eyebrow: "Corporate transportation",
  headline: "Corporate Chauffeur Service in",
  headlineAccent: "Toronto & the GTA",
  intro:
    "Punctual, discreet executive transportation for your clients, teams and events. One trusted partner manages every pickup, stop and last-minute change.",
  heroPoster: "/cover-poster.jpg",
  pickupPlaceholder: "Office or hotel address",
  heroPoints: ["Monthly billing for approved corporate accounts", "Dedicated account support and last-minute changes", "Licensed, professional chauffeurs, 24/7"],
  features: [
    { icon: featureIcons.billing, title: "Corporate accounts", note: "Monthly billing" },
    { icon: featureIcons.flight, title: "Flight monitoring", note: "For visiting clients" },
    { icon: featureIcons.licensed, title: "Licensed chauffeurs", note: "Professional & vetted" },
    { icon: featureIcons.support, title: "24/7 service", note: "Always available" },
  ],
  stepsTitle: ["Business travel in", "three simple steps"],
  steps: [
    { icon: stepIcons.trip, title: "Tell us your needs", body: "Share your route, schedule and passenger count, for one trip or a recurring schedule." },
    { icon: stepIcons.confirm, title: "Confirm your booking", body: "Choose your vehicle and confirm online, or set up a corporate account with our team." },
    { icon: stepIcons.ride, title: "Travel with confidence", body: "Your chauffeur arrives on time, and we manage every change to your itinerary." },
  ],
  routesTitle: ["From downtown Toronto to", "key business stops"],
  routesIntro: "Reliable transfers between offices, airports and meetings. Choose a route to start your booking.",
  routesFrom: "Downtown Toronto",
  routes: [
    { to: "Toronto Pearson (YYZ)", km: "≈ 28 km", time: "≈ 35 min" },
    { to: "Billy Bishop Airport (YTZ)", km: "≈ 4 km", time: "≈ 12 min" },
    { to: "Mississauga", km: "≈ 30 km", time: "≈ 35 min" },
    { to: "Hamilton", km: "≈ 70 km", time: "≈ 1 hr" },
  ],
};

export default function CorporateTransferLandingPage() {
  return <LandingPage content={content} />;
}
