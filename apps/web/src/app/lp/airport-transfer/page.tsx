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
  comparison: {
    eyebrow: "Home to terminal",
    title: ["Skip the parking lot,", "arrive at the curb"],
    intro:
      "Driving yourself to Pearson means the drive, the parking lot, the shuttle and the walk to check-in. A SARJ chauffeur takes you from home straight to your terminal, about 40 minutes sooner.",
    points: [
      { title: "About 35 minutes, door to curb", body: "No parking lot, no shuttle and no walk to check-in. You step out right at your terminal." },
      { title: "Curbside drop-off", body: "Your chauffeur takes you to the door of Terminal 1 or Terminal 3 and helps with your luggage." },
      { title: "Fixed upfront price", body: "Tolls, taxes and airport fees are included, with no parking bill and no surge pricing." },
      { title: "Flight tracking", body: "We watch your flight, so early or late arrivals never leave you waiting." },
    ],
    image: {
      src: "/home-to-pearson-terminal-v2.webp",
      alt: "Driving and parking at Toronto Pearson (about 1 h 15 min) versus a SARJ Worldwide chauffeur with curbside drop-off (about 35 min)",
      width: 1560,
      height: 941,
    },
    start: "Home",
    end: "Pearson terminal",
    routes: [
      {
        name: "Drive and park",
        sub: "Self-drive, long-term lot and shuttle",
        total: "≈ 1 hr 15 min",
        stops: [
          { label: "Drive to airport", time: "≈ 35 min" },
          { label: "Park and shuttle", time: "≈ 30 min" },
          { label: "Walk to check-in", time: "≈ 10 min" },
        ],
      },
      {
        name: "SARJ chauffeur",
        sub: "Private car, direct to your terminal",
        total: "≈ 35 min",
        highlight: true,
        stops: [],
        direct: "Enjoy the ride",
      },
    ],
  },
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
