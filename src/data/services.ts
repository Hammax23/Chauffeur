export type ServiceIconKey =
  | "Plane"
  | "Briefcase"
  | "MapPin"
  | "Clock"
  | "Heart"
  | "Camera"
  | "Shield"
  | "Car"
  | "Sparkles"
  | "Headphones";

export interface Service {
  slug: string;
  title: string;
  shortDesc: string;
  description: string;
  features: string[];
  icon: ServiceIconKey;
}

export const services: Service[] = [
  {
    slug: "airport-transfers",
    title: "Airport Transfer Services",
    shortDesc: "Stress-free arrivals & departures with meet & greet, flight tracking & premium comfort",
    description:
      "Skip the queues and chaos—arrive or depart in complete comfort with our premium airport transfer service. We monitor your flight in real time, so whether you land early or late, your chauffeur is ready. Enjoy meet & greet at arrivals, seamless luggage handling, and a relaxed ride in our luxury fleet. Perfect for business travellers, families, and anyone who values a flawless start or end to their journey.",
    features: [
      "Meet & greet with name board at arrivals",
      "Real-time flight monitoring—we adjust to delays",
      "Complimentary 60-minute wait from touchdown",
      "Luggage assistance & door-to-door handling",
      "24/7 availability at all major airports",
      "Premium sedans, SUVs & executive vans",
    ],
    icon: "Plane",
  },
  {
    slug: "corporate-travel",
    title: "Corporate / Business Travel",
    shortDesc: "Executive chauffeur service for meetings, conferences & impeccable first impressions",
    description:
      "Make every business trip count with our executive chauffeur service. Arrive at meetings, conferences, and client sites in style—our professional drivers understand that punctuality and discretion are non-negotiable. Work, prepare, or simply relax in our premium vehicles while we handle traffic and logistics. Corporate billing, multi-stop itineraries, and last-minute bookings are all part of our commitment to supporting your success.",
    features: [
      "Executive fleet—Mercedes S-Class, BMW 7 Series & more",
      "Multi-stop itineraries for back-to-back meetings",
      "Discreet, professional drivers trained in corporate etiquette",
      "Corporate billing & tailored invoicing",
      "Last-minute & recurring bookings welcomed",
      "Complimentary WiFi & charging on request",
    ],
    icon: "Briefcase",
  },
  {
    slug: "point-to-point-transfers",
    title: "Point-to-Point Transfers",
    shortDesc: "Door-to-door luxury between hotels, offices, restaurants & any destination",
    description:
      "Whether you are heading from your hotel to a restaurant, your office to a client, or between any two venues—our point-to-point transfer service delivers punctual, comfortable, and hassle-free travel. Transparent fixed pricing means no surprises; just a smooth ride in our luxury fleet. Same-day bookings are always welcome, and every journey is treated with the same attention to detail and professionalism.",
    features: [
      "Fixed, transparent pricing—no hidden fees",
      "Hotel, office, restaurant & venue drops nationwide",
      "Same-day & advance bookings available",
      "Premium sedans and SUVs for every occasion",
      "Punctual pickups with live driver tracking",
      "Luggage space & comfort amenities included",
    ],
    icon: "MapPin",
  },
  {
    slug: "hourly-chauffeur",
    title: "Hourly / As-Directed Chauffeur",
    shortDesc: "Flexible chauffeur hire by the hour—multiple stops, errands, meetings & sightseeing",
    description:
      "Need a chauffeur for a few hours or the full day? Our hourly and as-directed service puts you in control. Run errands, hit multiple meetings, explore the city, or simply enjoy having a dedicated driver at your disposal. Your chauffeur stays with you for the entire booking—no rush, no extra per-stop charges. Ideal for busy professionals, special outings, and anyone who values flexibility without compromising on luxury.",
    features: [
      "2-hour minimum; extend anytime during your trip",
      "Unlimited stops within your booked time",
      "Flexible routing—you direct, we drive",
      "Extended wait time at venues on request",
      "Ideal for meetings, errands, tours & events",
      "Premium vehicles with WiFi & charging",
    ],
    icon: "Clock",
  },
  {
    slug: "wedding-events",
    title: "Wedding & Special Events",
    shortDesc: "Bridal cars, red-carpet arrivals & flawless transport for your big day",
    description:
      "Your wedding and special events deserve nothing less than perfection. From the bridal car to groom transport, guest shuttles, and red-carpet arrivals—we provide luxury vehicles and seamless coordination so you can focus on the moment. Decorative options, ribbon colours, and chauffeur attire can be tailored to match your theme. Our team works closely with planners and venues to ensure every pickup and drop-off runs like clockwork.",
    features: [
      "Bridal & groom cars—classic and contemporary options",
      "Red-carpet service & step-and-repeat coordination",
      "Decorative ribbons, flowers & themed styling",
      "Dedicated event coordinator for the day",
      "Guest shuttle & multi-vehicle packages",
      "Flexible timings aligned with your schedule",
    ],
    icon: "Heart",
  },
  {
    slug: "city-tours",
    title: "City Tours & Sightseeing",
    shortDesc: "Luxury guided tours—custom routes, photo stops & half or full-day packages",
    description:
      "Discover the city in comfort and style with our luxury sightseeing tours. Customisable itineraries, photo stops at iconic landmarks, and the flexibility to go at your pace—all from the comfort of our premium vehicles. Whether you are a first-time visitor or hosting VIP guests, our experienced drivers know the best routes and hidden gems. Half-day, full-day, and multi-day packages are available, with optional multi-language support.",
    features: [
      "Custom tour routes designed around your interests",
      "Half-day, full-day & multi-day packages",
      "Photo stops at landmarks & scenic spots",
      "Multi-language support on request",
      "Knowledgeable chauffeurs with local insight",
      "Luxury sedans & SUVs for small groups",
    ],
    icon: "Camera",
  },
  {
    slug: "vip-transport",
    title: "VIP & Celebrity Transport",
    shortDesc: "Discreet, secure & confidential—tailored for high-profile clients",
    description:
      "When privacy and security are paramount, our VIP and celebrity transport service delivers. Unmarked vehicles, rigorously vetted chauffeurs, and strict confidentiality protocols ensure you travel without attention. We offer dedicated account managers, NDA-backed arrangements, and secure protocols for high-profile individuals, executives, and talent. Every detail—from routing to timing—is handled with discretion and precision.",
    features: [
      "NDA & confidentiality agreements available",
      "Unmarked, low-profile vehicles on request",
      "Dedicated account manager for regular clients",
      "Secure protocols & vetted professional drivers",
      "Flexible pick-up and drop-off for privacy",
      "24/7 availability for last-minute requirements",
    ],
    icon: "Shield",
  },
  {
    slug: "intercity-travel",
    title: "Long-Distance / Intercity Travel",
    shortDesc: "Comfortable door-to-door luxury between cities—business, relocation & leisure",
    description:
      "Travel between cities without the hassle of flights or trains. Our long-distance chauffeur service offers door-to-door luxury for business trips, relocations, weekend getaways, or special occasions. Relax in our premium vehicles with ample luggage space, climate control, and optional WiFi. Rest stops are arranged as needed, and we ensure you reach your destination refreshed and on time. Cross-city and interstate journeys are our specialty.",
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
    icon: "Sparkles",
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
    icon: "Headphones",
  },
];

export function getServiceBySlug(slug: string): Service | undefined {
  return services.find((s) => s.slug === slug);
}

export function getAllServiceSlugs(): string[] {
  return services.map((s) => s.slug);
}
