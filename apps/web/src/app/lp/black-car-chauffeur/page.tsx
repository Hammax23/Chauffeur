import type { Metadata } from "next";
import LandingPage, { featureIcons, stepIcons, type LandingPageContent } from "@/components/LandingPage";

export const metadata: Metadata = {
  title: "Black Car and Chauffeur Service Toronto | SARJ Worldwide",
  description:
    "Professional black car and chauffeur service in Toronto and the GTA. Airport, corporate and city rides in luxury vehicles with licensed chauffeurs. Book online.",
  alternates: { canonical: "/lp/black-car-chauffeur" },
  robots: { index: false, follow: true },
};

const content: LandingPageContent = {
  eyebrow: "Black car and chauffeur",
  headline: "Black Car and Chauffeur Service in",
  headlineAccent: "Toronto and the GTA",
  intro: "Luxury sedans and SUVs with a professional chauffeur, for airport pickups, business travel and special occasions.",
  heroPoster: "/cover-poster.jpg",
  pickupPlaceholder: "Pickup address or airport",
  heroPoints: ["Licensed and vetted chauffeurs", "Late-model luxury vehicles", "Fixed pricing", "24/7"],
  features: [
    { icon: featureIcons.licensed, title: "Licensed chauffeurs", note: "Professional, in business attire" },
    { icon: featureIcons.flight, title: "Late-model vehicles", note: "Clean, with Wi-Fi and water" },
    { icon: featureIcons.rates, title: "Fixed pricing", note: "Upfront or a clear hourly rate" },
    { icon: featureIcons.support, title: "24/7 support", note: "By phone and WhatsApp" },
  ],
  stepsTitle: ["Luxury car service for", "every trip"],
  steps: [
    { icon: stepIcons.trip, title: "Airport transfers", body: "Pearson (YYZ) and Billy Bishop pickups with flight tracking." },
    { icon: stepIcons.confirm, title: "Corporate travel", body: "Reliable rides for executives and clients, with email confirmation." },
    { icon: stepIcons.ride, title: "Hourly chauffeur", body: "A car and chauffeur at your disposal by the hour. Also for weddings, dinners and shows across the GTA." },
  ],
  routesTitle: ["Popular routes across", "Toronto and the GTA"],
  routesIntro: "Airport, city and out-of-town rides with a professional chauffeur. Choose a route to start your booking.",
  routesFrom: "Downtown Toronto",
  routes: [
    { from: "Toronto Pearson (YYZ)", to: "Downtown Toronto", km: "≈ 28 km", time: "≈ 35 min" },
    { from: "Downtown Toronto", to: "Niagara Falls", km: "≈ 130 km", time: "≈ 1 hr 30 min" },
    { from: "Downtown Toronto", to: "Muskoka", km: "≈ 170 km", time: "≈ 2 hr" },
    { from: "Toronto Pearson (YYZ)", to: "Hamilton", km: "≈ 75 km", time: "≈ 55 min" },
  ],
};

export default function BlackCarChauffeurLandingPage() {
  return <LandingPage content={content} />;
}
