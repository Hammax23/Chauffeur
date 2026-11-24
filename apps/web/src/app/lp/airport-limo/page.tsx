import type { Metadata } from "next";
import LandingPage, { featureIcons, stepIcons, type LandingPageContent } from "@/components/LandingPage";
import { pearsonComparison } from "@/data/landing-comparison";

export const metadata: Metadata = {
  title: "Toronto Pearson Airport Limo Service | SARJ Worldwide",
  description:
    "Book a limo from Toronto Pearson (YYZ). Late-model limousines and black cars, fixed upfront pricing, flight tracking and free wait time. Reserve online in under a minute.",
  alternates: { canonical: "/lp/airport-limo" },
  robots: { index: false, follow: true },
};

const content: LandingPageContent = {
  eyebrow: "Airport limo",
  headline: "Airport Limo Service",
  headlineAccent: "Toronto Pearson (YYZ)",
  intro: "Arrive in a limousine, not a taxi queue. Your chauffeur meets you at arrivals with a flat rate agreed before you travel.",
  heroPoster: "/cover-poster.jpg",
  pickupPlaceholder: "Pickup or airport",
  heroPoints: ["Fixed price", "Flight tracking", "Free wait time", "Licensed chauffeurs", "24/7"],
  features: [
    { icon: featureIcons.support, title: "Meet and greet", note: "Waiting at arrivals with luggage help" },
    { icon: featureIcons.rates, title: "Flat rate", note: "No meter, no surge pricing" },
    { icon: featureIcons.flight, title: "Flight tracking", note: "Early or late, we adjust" },
    { icon: featureIcons.licensed, title: "Professional chauffeurs", note: "Licensed, vetted, in uniform" },
  ],
  stepsTitle: ["Booked in", "three simple steps"],
  steps: [
    { icon: stepIcons.trip, title: "Tell us your trip", body: "Enter pickup, destination, date and time to see your price instantly." },
    { icon: stepIcons.confirm, title: "Confirm your booking", body: "Choose your vehicle and confirm online. Your confirmation arrives by email right away." },
    { icon: stepIcons.ride, title: "Ride with confidence", body: "Your chauffeur arrives early, tracks your flight and takes care of the rest." },
  ],
  routesTitle: ["Pearson airport limo to", "popular places"],
  routesIntro: "Your chauffeur meets you at arrivals and takes you straight there. Choose a route to start your booking.",
  routesFrom: "Toronto Pearson (YYZ)",
  comparison: pearsonComparison,
  fleetVehicles: [
    {
      id: "escalade-stretch-limo",
      name: "Cadillac Escalade Limousine",
      description: "A black Escalade limousine with a full-length lounge cabin, ideal for airport arrivals with a group.",
      image: "/fleet/limo-escalade-stretch.webp",
      seating: "Up to 14 passengers",
      luggage: "Ample luggage space",
      category: "Limo",
    },
    {
      id: "hummer-h2-limo",
      name: "Hummer H2 Limousine",
      description: "A bold Hummer limousine that makes an entrance, with a spacious party-ready interior.",
      image: "/fleet/limo-hummer-h2.png",
      seating: "Up to 14 passengers",
      luggage: "Ample luggage space",
      category: "Limo",
    },
    {
      id: "lincoln-stretch-limo",
      name: "Lincoln Limousine",
      description: "A classic black limousine for polished, comfortable airport transfers.",
      image: "/fleet/limo-lincoln-stretch.webp",
      seating: "Up to 8 passengers",
      luggage: "Ample luggage space",
      category: "Limo",
    },
  ],
  routes: [
    { from: "Toronto Pearson (YYZ)", to: "Downtown Toronto", km: "≈ 28 km", time: "≈ 35 min" },
    { from: "Toronto Pearson (YYZ)", to: "Niagara Falls", km: "≈ 125 km", time: "≈ 1 hr 30 min" },
    { from: "Toronto Pearson (YYZ)", to: "Oakville", km: "≈ 35 km", time: "≈ 30 min" },
    { from: "Toronto Pearson (YYZ)", to: "Hamilton", km: "≈ 75 km", time: "≈ 55 min" },
  ],
};

export default function AirportLimoLandingPage() {
  return <LandingPage content={content} />;
}
