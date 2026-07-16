export type ServiceIconKey =
  | "PlaneTakeoff"
  | "Building2"
  | "Route"
  | "Timer"
  | "Gem"
  | "Landmark"
  | "Handshake"
  | "ShieldCheck"
  | "Car"
  | "CarFront"
  | "PhoneCall";

export interface Service {
  slug: string;
  title: string;
  heroTitle?: string;
  shortDesc: string;
  description: string;
  features: string[];
  icon: ServiceIconKey;
}

export const services: Service[] = [
  {
    slug: "airport-transfers",
    title: "Airport Transfer",
    heroTitle: "Private Airport Transfer and Limo Service",
    shortDesc: "Premium comfort for arrivals and departures.",
    description:
      "Sarj Worldwide offers private airport transfer and airport limo service with confirmed pickup, real-time flight tracking, and professional chauffeurs.",
    features: [
      "Meet & greet with name board at arrivals",
      "Real-time flight monitoring—we adjust to delays",
      "Complimentary 60-minute wait from touchdown",
      "Luggage assistance & door-to-door handling",
      "24/7 availability at all major airports",
      "Premium sedans, SUVs & executive vans",
    ],
    icon: "PlaneTakeoff",
  },
  {
    slug: "corporate-travel",
    title: "Corporate / Business Travel",
    heroTitle: "Corporate Car Service and Executive Travel",
    shortDesc: "Executive chauffeur service for impeccable first impressions",
    description:
      "Sarj Worldwide offers corporate car service and executive car service built around your meetings, client visits, and business schedule.",
    features: [
      "Executive fleet—Mercedes S-Class, BMW 7 Series & more",
      "Multi-stop itineraries for back-to-back meetings",
      "Discreet, professional drivers trained in corporate etiquette",
      "Corporate billing & tailored invoicing",
      "Last-minute & recurring bookings welcomed",
      "Complimentary WiFi & charging on request",
    ],
    icon: "Building2",
  },
  {
    slug: "point-to-point-transfers",
    title: "Point-to-Point Transfers",
    heroTitle: "Point-to-Point Car Service Across Canada",
    shortDesc: "Door-to-door luxury between hotels, offices, restaurants & any destination",
    description:
      "Sarj Worldwide offers point-to-point car service for a single, direct trip between your pickup location and destination.",
    features: [
      "Fixed, transparent pricing—no hidden fees",
      "Hotel, office, restaurant & venue drops nationwide",
      "Same-day & advance bookings available",
      "Premium sedans and SUVs for every occasion",
      "Punctual pickups with live driver tracking",
      "Luggage space & comfort amenities included",
    ],
    icon: "Route",
  },
  {
    slug: "hourly-chauffeur",
    title: "Hourly / As-Directed",
    heroTitle: "Your Chauffeur, On Your Schedule",
    shortDesc: "Flexible transportation tailored to your dynamic schedule",
    description:
      "Sarj Worldwide offers hourly chauffeur service and hourly limo rental, keeping a private vehicle and driver available for your day.",
    features: [
      "2-hour minimum; extend anytime during your trip",
      "Unlimited stops within your booked time",
      "Flexible routing—you direct, we drive",
      "Extended wait time at venues on request",
      "Ideal for meetings, errands, tours & events",
      "Premium vehicles with WiFi & charging",
    ],
    icon: "Timer",
  },
  {
    slug: "wedding-events",
    title: "Wedding Events",
    heroTitle: "A Car That Matches the Day",
    shortDesc: "Flawless luxury transportation for your special day",
    description:
      "Sarj Worldwide offers wedding limousine services and wedding vehicle hire, with licensed chauffeurs and a fleet built for the day.",
    features: [
      "Bridal & groom cars—classic and contemporary options",
      "Red-carpet service & step-and-repeat coordination",
      "Decorative ribbons, flowers & themed styling",
      "Dedicated event coordinator for the day",
      "Guest shuttle & multi-vehicle packages",
      "Flexible timings aligned with your schedule",
    ],
    icon: "Gem",
  },
  {
    slug: "meet-greet",
    title: "Airport Meet & Greet",
    heroTitle: "Professional Airport Meet & Greet Service for a Smooth Arrival",
    shortDesc: "Personalized assistance from the gate to your vehicle",
    description:
      "SARJ Worldwide's chauffeurs wait right at your arrival gate, track your flight, and walk you straight to the car.",
    features: [
      "Name board meet at arrivals or curb-side departures",
      "Luggage assistance from gate to vehicle",
      "YYZ & YTZ airport coverage",
      "Coordinated with your chauffeur pickup",
      "Flight monitoring for timely meet-up",
      "Discreet, professional airport agents",
    ],
    icon: "Handshake",
  },
  {
    slug: "vip-transport",
    title: "VIP & Celebrity Transport",
    heroTitle: "Private VIP Chauffeur Service for Discreet Luxury Travel",
    shortDesc: "Discreet, secure & confidential—tailored for high-profile clients",
    description:
      "Private chauffeur transportation for executives, celebrities, and travellers seeking privacy, punctuality, luxury vehicles, and professional service from pickup to arrival.",
    features: [
      "NDA & confidentiality agreements available",
      "Unmarked, low-profile vehicles on request",
      "Dedicated account manager for regular clients",
      "Secure protocols & vetted professional drivers",
      "Flexible pick-up and drop-off for privacy",
      "24/7 availability for last-minute requirements",
    ],
    icon: "ShieldCheck",
  },
  {
    slug: "intercity-travel",
    title: "Long-Distance / Intercity Travel",
    heroTitle: "Long Distance Chauffeur for Private City-to-City Travel",
    shortDesc: "Book private city-to-city transportation with professional drivers",
    description:
      "Book private city-to-city transportation with professional drivers, scheduled pickups, comfortable vehicles, and direct travel planned around your timing and destination.",
    features: [
      "Cross-city & interstate door-to-door travel",
      "Rest stops and refreshment breaks as needed",
      "Generous luggage capacity for extended stays",
      "Climate control, WiFi & comfort amenities",
      "Transparent pricing with no surprise charges",
      "Sedans, SUVs & executive vans for your group size",
    ],
    icon: "Car",
  },
  {
    slug: "luxury-fleet",
    title: "Luxury Fleet Options",
    shortDesc: "Mercedes, BMW, Range Rover, Cadillac & limousines—curated for every occasion",
    description:
      "Choose from our meticulously maintained fleet of luxury vehicles. From sleek Mercedes-Benz and BMW sedans to robust Range Rovers, Cadillacs, and limousines—each model is selected for comfort, style, and reliability. Whether you need an executive sedan for a meeting, an SUV for a family trip, or a limousine for a celebration, we match the right vehicle to your occasion. Complimentary amenities and optional child seats ensure every passenger travels in comfort.",
    features: [
      "Sedans, SUVs, limousines & people carriers",
      "Mercedes-Benz, BMW, Range Rover, Cadillac & more",
      "Rigorous maintenance & hygiene standards",
      "Complimentary bottled water & WiFi",
      "Child seats & accessibility options on request",
      "Tailored to group size and occasion",
    ],
    icon: "CarFront",
  },
  {
    slug: "premium-services",
    title: "Premium Services",
    shortDesc: "WiFi, refreshments, child seats & 24/7 concierge—every detail covered",
    description:
      "Elevate every journey with our premium add-ons and round-the-clock concierge support. In-car WiFi and charging keep you connected; bottled water and light refreshments add a touch of comfort. Child seats, extra luggage capacity, and special requests are accommodated wherever possible. Our 24/7 support line is there for bookings, changes, and assistance—so you can travel with complete peace of mind, every time.",
    features: [
      "In-car WiFi & USB charging points",
      "Bottled water & light refreshments",
      "Child seats & booster seats on request",
      "24/7 concierge support for bookings & changes",
      "Special requests considered—just ask",
      "Consistent luxury across every ride",
    ],
    icon: "PhoneCall",
  },
];

export function getServiceBySlug(slug: string): Service | undefined {
  return services.find((s) => s.slug === slug);
}

export function getAllServiceSlugs(): string[] {
  return services.map((s) => s.slug);
}
