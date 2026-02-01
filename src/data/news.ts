export type NewsCategory = "Fleet" | "Travel Tips" | "Company" | "Industry" | "Service" | "Events";

export interface NewsArticle {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  category: NewsCategory;
  date: string;
  image: string;
  readTime: string;
}

export const newsArticles: NewsArticle[] = [
  {
    id: "1",
    slug: "mercedes-eqs-joins-luxury-fleet",
    title: "Mercedes-Benz EQS Joins Our Luxury Fleet",
    excerpt:
      "We are excited to announce the addition of the all-electric Mercedes-Benz EQS to our premium fleet. Experience silent, sustainable luxury with cutting-edge technology and zero emissions on your next airport transfer or corporate journey.",
    content:
      "The Mercedes-Benz EQS represents the pinnacle of electric luxury sedans. With its sleek design, expansive Hyperscreen display, and whisper-quiet cabin, it is the perfect choice for executives and discerning travellers who value both comfort and sustainability. Our chauffeurs have completed comprehensive training to ensure every EQS ride meets the same impeccable standards you expect from SARJ Worldwide. Book an EQS for your next airport transfer, corporate meeting, or special occasion.",
    category: "Fleet",
    date: "2026-01-15",
    image: "https://images.unsplash.com/photo-1617814076367-b759c7d7e738?w=800&auto=format&fit=crop",
    readTime: "3 min read",
  },
  {
    id: "2",
    slug: "airport-transfer-tips-stress-free-travel",
    title: "5 Airport Transfer Tips for a Stress-Free Journey",
    excerpt:
      "From booking ahead to using meet & greet services, here are five practical tips to make your airport pickup or drop-off smooth and stress-free. Perfect for business travellers and families alike.",
    content:
      "Book in advance to lock in your preferred vehicle and avoid last-minute surges. Use a chauffeur service with real-time flight tracking so your driver adjusts to delays or early arrivals. Opt for meet & greet at arrivals for a seamless handover, especially when travelling with luggage or family. Choose a service that includes a complimentary wait window—typically 60 minutes from touchdown—so you never feel rushed through customs. Finally, confirm your pick-up point and driver contact details the night before to eliminate any day-of confusion.",
    category: "Travel Tips",
    date: "2026-01-12",
    image: "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=800&auto=format&fit=crop",
    readTime: "4 min read",
  },
  {
    id: "3",
    slug: "sarj-worldwide-expands-global-footprint",
    title: "SARJ Worldwide Expands Global Footprint to 12 Major Cities",
    excerpt:
      "SARJ Worldwide is proud to announce the expansion of our chauffeur services to 12 major cities across North America, Europe, and Asia. Whether you are in London, Dubai, or New York, the same premium chauffeur experience awaits.",
    content:
      "Our expansion reflects growing demand for reliable, elegant chauffeur services worldwide. Each new city is supported by a curated local fleet, rigorously trained chauffeurs, and the same 24/7 concierge support our clients depend on. From airport transfers and corporate travel to weddings and VIP events, SARJ Worldwide now offers a consistent, premium chauffeur experience wherever you go. We look forward to serving you in more destinations in the years ahead.",
    category: "Company",
    date: "2026-01-10",
    image: "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800&auto=format&fit=crop",
    readTime: "3 min read",
  },
  {
    id: "4",
    slug: "wedding-chauffeur-planning-guide",
    title: "Wedding Chauffeur Planning: A Complete Guide",
    excerpt:
      "Planning wedding transport? From bridal cars to guest shuttles, red-carpet arrivals, and coordinating with your venue—here is everything you need to know to make your big day run smoothly.",
    content:
      "Start by booking your bridal and groom cars at least two to three months ahead, especially for peak wedding seasons. Decide whether you need one luxury sedan or a fleet for the bridal party and guests. Red-carpet and step-and-repeat setups require precise timing—work with your chauffeur provider to align with your planner and venue. Consider decorative options such as ribbons, flowers, or custom styling to match your theme. Lastly, confirm pick-up and drop-off times, rest stops for photography, and a backup plan for weather or delays. A dedicated wedding coordinator from your chauffeur team can simplify all of this.",
    category: "Service",
    date: "2026-01-08",
    image: "https://images.unsplash.com/photo-1519741497674-611481863552?w=800&auto=format&fit=crop",
    readTime: "5 min read",
  },
  {
    id: "5",
    slug: "luxury-travel-trends-2026",
    title: "Luxury Travel Trends Shaping 2026",
    excerpt:
      "From electric vehicles and sustainability to personalised experiences and seamless tech integration—explore the key trends defining luxury chauffeur services in 2026 and how SARJ Worldwide is staying ahead.",
    content:
      "Sustainability continues to drive fleet decisions, with more clients choosing electric and hybrid options for corporate and leisure travel. Personalisation is also front and centre: custom itineraries, preferred vehicles, and bespoke amenities are now standard expectations. Technology plays a bigger role than ever—real-time tracking, seamless booking, and integrated travel management systems make chauffeur services more accessible and reliable. At SARJ Worldwide, we are investing in each of these areas to ensure our clients enjoy the best of what modern luxury chauffeur travel has to offer.",
    category: "Industry",
    date: "2026-01-05",
    image: "https://images.unsplash.com/photo-1445019980597-93fa8acb246c?w=800&auto=format&fit=crop",
    readTime: "4 min read",
  },
  {
    id: "6",
    slug: "corporate-travel-best-practices",
    title: "Corporate Travel Best Practices: Why Chauffeurs Matter",
    excerpt:
      "Executive travel is more than getting from A to B. Discover how professional chauffeur services support productivity, confidentiality, and first impressions—and why leading firms choose SARJ Worldwide chauffeur services for their teams.",
    content:
      "Time spent in transit can be productive when you have a dedicated chauffeur. Prepare for meetings, take calls, or simply recharge in a quiet, premium environment. Discretion and professionalism are non-negotiable for C-suite and high-profile travellers; our drivers are trained in corporate etiquette and confidentiality. Consistent, branded transport also reinforces your company's image when picking up clients or partners. Multi-stop itineraries, corporate billing, and last-minute changes are all part of our corporate offering—designed to make business travel as smooth and efficient as possible.",
    category: "Travel Tips",
    date: "2026-01-03",
    image: "https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=800&auto=format&fit=crop",
    readTime: "4 min read",
  },
  {
    id: "7",
    slug: "vip-transport-privacy-security",
    title: "VIP Transport: Privacy, Security, and What to Expect",
    excerpt:
      "What does VIP chauffeur service actually involve? From unmarked vehicles and NDAs to dedicated account managers and secure protocols—we break down how we protect your privacy and ensure a seamless experience.",
    content:
      "VIP and celebrity transport demands the highest standards of discretion and security. We offer unmarked, low-profile vehicles upon request, and our drivers are vetted and trained in confidentiality. NDA and custom agreements can be arranged for high-profile clients. A dedicated account manager coordinates bookings, routing, and special requirements so you have a single point of contact. Secure protocols cover everything from pick-up and drop-off locations to communication channels. Whether you are a executive, public figure, or talent, we are committed to ensuring your travel remains private, comfortable, and stress-free.",
    category: "Service",
    date: "2025-12-28",
    image: "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=800&auto=format&fit=crop",
    readTime: "4 min read",
  },
  {
    id: "8",
    slug: "range-rover-suv-premium-comfort",
    title: "Why the Range Rover SUV Is a Client Favourite",
    excerpt:
      "The Range Rover has become one of the most requested vehicles in our fleet. Discover what makes it ideal for airport transfers, family travel, and executive trips—and when to choose it over a sedan.",
    content:
      "The Range Rover combines commanding presence with sumptuous interiors and all-terrain capability. Clients often choose it for airport runs with extra luggage, family trips, or when they simply prefer a higher seating position and more cabin space. The rear cabin offers ample legroom and comfort, making it perfect for longer journeys or multi-stop corporate itineraries. We maintain our Range Rovers to the highest standards, so every ride delivers the refinement and reliability you expect. Whether you are heading to the airport, a countryside estate, or a downtown meeting, the Range Rover remains a versatile and luxurious choice.",
    category: "Fleet",
    date: "2025-12-22",
    image: "https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=800&auto=format&fit=crop",
    readTime: "3 min read",
  },
  {
    id: "9",
    slug: "holiday-season-booking-tips",
    title: "Holiday Season Chauffeur Booking: Plan Ahead",
    excerpt:
      "The holiday season is one of the busiest periods for luxury chauffeur services. Book early, consider peak surcharges, and plan for weather—our tips to secure the best experience during the festive period.",
    content:
      "Demand for chauffeur services spikes around Thanksgiving, Christmas, and New Year. Booking two to four weeks in advance helps secure your preferred vehicle and avoid last-minute availability issues. Be aware that some operators apply peak or seasonal surcharges during these periods; transparent pricing upfront avoids surprises. Weather can disrupt travel, so choose a provider with robust contingency plans and clear communication. Finally, if you are planning wedding transport, corporate events, or airport transfers during the holidays, confirm dates and times early and stay in touch with your concierge as your plans evolve.",
    category: "Travel Tips",
    date: "2025-12-18",
    image: "https://images.unsplash.com/photo-1512389142860-9c449e58aab4?w=800&auto=format&fit=crop",
    readTime: "4 min read",
  },
  {
    id: "10",
    slug: "24-7-concierge-support-how-we-help",
    title: "24/7 Concierge Support: How We Help Around the Clock",
    excerpt:
      "Our concierge team is available 24/7 for bookings, changes, and support. Learn how we handle last-minute requests, flight delays, and special arrangements—so you can travel with complete peace of mind.",
    content:
      "Whether you need to book a ride at 3 a.m., adjust a pickup due to a delayed flight, or add a stop at the last moment, our concierge team is there to help. We monitor flights for airport transfers and proactively update your driver, so you rarely need to call. For corporate clients, we support multi-leg itineraries, billing queries, and recurring bookings. Special requests—from child seats to accessibility needs—are handled with care. We believe luxury service should be seamless and stress-free, and our 24/7 support is a key part of that promise.",
    category: "Company",
    date: "2025-12-14",
    image: "https://images.unsplash.com/photo-1557804506-669a67965ba0?w=800&auto=format&fit=crop",
    readTime: "3 min read",
  },
];

export function getArticleBySlug(slug: string): NewsArticle | undefined {
  return newsArticles.find((a) => a.slug === slug);
}

export function getLatestArticles(limit = 6): NewsArticle[] {
  return [...newsArticles].sort((a, b) => b.date.localeCompare(a.date)).slice(0, limit);
}
