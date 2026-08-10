import Link from "next/link";
import Image from "next/image";
import {
  PlaneTakeoff,
  Clock,
  MapPin,
  Building2,
  ArrowRight,
  Check,
  User,
} from "lucide-react";
import TopNav from "@/components/TopNav";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import VerticalBookingWidget from "@/components/VerticalBookingWidget";
import { GoogleMapsProvider } from "@/components/GoogleMapsProvider";
import FaqSection from "@/components/FaqSection";
import { Home } from "lucide-react";
import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo-metadata";

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadata("/tiff-chauffeur", {
    title: "TIFF 2026 Chauffeur Service in Toronto | SARJ Worldwide",
    description:
      "Book a private chauffeur for TIFF 2026 in Toronto. YYZ airport pickups, King West hotel runs, and hourly cars between Lightbox, Roy Thomson Hall, and other venues.",
    keywords: [
      "TIFF chauffeur Toronto",
      "TIFF 2026 private driver",
      "Toronto film festival car service",
      "airport transfer TIFF Toronto",
      "King West chauffeur",
      "YYZ to downtown chauffeur",
    ],
  });
}

const RESERVE_HREF =
  "/reservation?mode=hourly&serviceType=Hourly%20ride&note=TIFF%202026";
const AIRPORT_RESERVE_HREF =
  "/reservation?mode=distance&note=TIFF%202026%20%E2%80%94%20YYZ%20airport%20transfer";
const QUOTE_HREF = "/quote?service=hourly-as-directed&note=TIFF%202026";

const venues = [
  { name: "TIFF Bell Lightbox", area: "350 King St W" },
  { name: "Roy Thomson Hall", area: "60 Simcoe St" },
  { name: "Princess of Wales Theatre", area: "300 King St W" },
  { name: "Royal Alexandra Theatre", area: "260 King St W" },
  { name: "Scotiabank Theatre", area: "259 Richmond St W" },
  { name: "Metro Toronto Convention Centre", area: "Front St W — TIFF: The Market" },
];

const highlights = [
  {
    icon: PlaneTakeoff,
    title: "Pearson (YYZ) pickups",
    body: "We watch your flight number. If you’re late through customs, the car waits — you don’t restart the booking from scratch.",
  },
  {
    icon: MapPin,
    title: "Between venues",
    body: "Lightbox to Roy Thomson Hall is a short hop on paper; with street closures and crowds it’s not. We stage pickups so you’re not stuck on King Street with your hand up.",
  },
  {
    icon: Clock,
    title: "Hourly / as-directed",
    body: "Keep the same car for an evening of two or three screenings. Tell us roughly where you’re headed; the chauffeur stays with you between stops.",
  },
  {
    icon: Building2,
    title: "Hotels near King West",
    body: "Most guests stay around King, Wellington, Front, or University. We do hotel lobbies, side-street pickups, and late returns after parties wrap.",
  },
];

const faqs = [
  {
    question: "When does the Toronto International Film Festival take place in 2026?",
    answer:
      "TIFF 2026 runs September 10–20, marking the festival's 51st edition in downtown Toronto. The 11-day event brings premieres, screenings, and industry gatherings across the Entertainment District, making early transportation booking essential.",
  },
  {
    question: "How can I get Toronto Film Festival tickets?",
    answer:
      "TIFF Member packages go on sale August 21, with public tickets released August 31 via the festival's official ticketing partner. Individual screenings typically range from $25–$60. Once your tickets are confirmed, our chauffeur service ensures you reach each venue on time.",
  },
  {
    question: "What is the Toronto Film Festival submission deadline?",
    answer:
      "The standard submission deadline for the 2026 festival was May 8. Filmmakers and industry guests attending after their films are selected often rely on our TIFF Limousine Service for premiere nights and press events.",
  },
  {
    question: "How do I submit a film to the Toronto Film Festival?",
    answer:
      "Submissions are handled through FilmFreeway, TIFF's official submission platform. While we don't manage festival entries, we do provide transportation for filmmakers and crews once their projects are selected and events are scheduled.",
  },
  {
    question: "What vehicles are available for TIFF transportation?",
    answer:
      "Our fleet includes luxury SUVs such as the Cadillac Escalade, Chevrolet Suburban, and GMC Yukon, along with executive sedans and Lexus Hybrid Black models for a quieter ride. Guests traveling as a group can book Mercedes Sprinter vans or stretch limousines.",
  },
  {
    question: "Do you offer red carpet drop-off service?",
    answer:
      "Yes. We provide direct curbside drop-offs at major festival hubs, including Roy Thomson Hall and the Princess of Wales Theatre, so guests can step straight onto the red carpet without navigating festival crowds.",
  },
  {
    question: "Can you provide airport transfers during TIFF?",
    answer:
      "Yes. We offer direct pickups from both Toronto Pearson (YYZ) and Billy Bishop (YTZ), with flight tracking included so your chauffeur adjusts to any delays and is ready when you land.",
  },
  {
    question: "What is your on-call logistics service during the festival?",
    answer:
      "Our on-call logistics option provides hourly, as-needed driving and waiting service, ideal for navigating heavy downtown traffic and the road closures that come with festival season. Your chauffeur waits and adjusts as your schedule shifts.",
  },
  {
    question: "Can I book a group vehicle for my TIFF crew or delegation?",
    answer:
      "Yes. For production teams, sponsors, or larger delegations, our Mercedes Sprinter vans and stretch limousines keep everyone moving together between venues, hotels, and events.",
  },
  {
    question: "How early should I book TIFF transportation?",
    answer:
      "We recommend booking as soon as your festival schedule is confirmed. Demand for luxury vehicles rises quickly once TIFF tickets go on sale, especially for red carpet dates and opening weekend.",
  },
];

const breadcrumbJsonLd = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: "https://sarjworldwide.ca/" },
    {
      "@type": "ListItem",
      position: 2,
      name: "TIFF 2026 Chauffeur",
      item: "https://sarjworldwide.ca/tiff-chauffeur",
    },
  ],
};

const serviceJsonLd = {
  "@context": "https://schema.org",
  "@type": "Service",
  name: "TIFF 2026 Chauffeur Service Toronto",
  provider: {
    "@type": "LocalBusiness",
    name: "SARJ Worldwide",
    url: "https://sarjworldwide.ca",
  },
  areaServed: {
    "@type": "City",
    name: "Toronto",
  },
  description:
    "Private chauffeur for TIFF 2026 in Toronto: YYZ airport transfers and transport between King West hotels and festival venues.",
  url: "https://sarjworldwide.ca/tiff-chauffeur",
};

export default function TiffChauffeurPage() {
  return (
    <main className="min-h-screen bg-[#fafafa]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceJsonLd) }}
      />

      <TopNav />
      <Navbar />

      <section className="relative min-h-screen w-full">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('/tiff-hero.jpg')" }}
        />
        <div className="absolute inset-0 bg-black/60"></div>
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/60 to-[#0a0a0a]" />

        <div className="relative z-10 pt-[120px] lg:pt-[140px] pb-12 min-h-[100vh] flex items-center">
          <div className="max-w-[1400px] mx-auto w-full px-6 lg:px-12 grid grid-cols-1 xl:grid-cols-[1.2fr_0.8fr] gap-12 lg:gap-8 items-center">
            {/* Left Column: Text & CTA */}
            <div className="text-left">
              {/* Breadcrumbs */}
              <div className="flex items-center gap-2 text-white text-[15px] font-medium mb-3">
                <Home className="w-[18px] h-[18px]" />
                <Link href="/" className="hover:text-[#C9A063] transition-colors">Home</Link>
                <span className="text-[#C9A063]">»</span>
                <span className="text-[#C9A063]">TIFF Transportation</span>
              </div>
              <div className="w-16 h-[2px] bg-[#C9A063] mb-6"></div>

              {/* Heading */}
              <h1 className="text-white text-3xl sm:text-4xl md:text-5xl lg:text-[48px] font-bold leading-[1.15] mb-5 drop-shadow-lg">
                Toronto International Film Festival Limo & Chauffeur Service
              </h1>

              {/* Description */}
              <p className="text-white/95 text-[15px] sm:text-[16px] leading-[1.7] max-w-[750px] mb-8 font-normal drop-shadow-md">
                Arrive at the Toronto International Film Festival in style with a trusted TIFF festival car service in Toronto. Built for premieres, screenings, and industry events, our TIFF Limousine Service pairs professional chauffeurs with a luxury fleet of executive sedans and SUVs. VIP guests, filmmakers, and media rely on us to navigate downtown Toronto&apos;s Entertainment District with ease. From a single event to the full festival run, our Toronto International Film Festival chauffeur service delivers punctual, private transportation every time.
              </p>

              {/* CTA Button */}
              <Link href="/quote" className="inline-block bg-[#C9A063] hover:bg-[#b58c51] text-white px-8 py-3.5 rounded-[30px] font-semibold text-[15px] transition-all duration-300 shadow-lg">
                Get Instant Quote
              </Link>
            </div>

            {/* Right Column: Booking Widget */}
            <div className="flex flex-col items-center xl:items-end w-full">
              <GoogleMapsProvider>
                <VerticalBookingWidget />
              </GoogleMapsProvider>
              <div className="w-full max-w-[360px] text-center mt-4 text-[11px] text-white/70">
                <p className="mb-1.5">© 2026 Book Rides Online, Inc. All Rights Reserved</p>
                <div className="flex justify-center gap-4">
                  <Link href="/terms-of-service" className="hover:text-white transition-colors underline underline-offset-2">Terms &amp; Conditions</Link>
                  <Link href="/privacy-policy" className="hover:text-white transition-colors underline underline-offset-2">Privacy Policy</Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Premium TIFF Transportation Section */}
      <section className="py-16 sm:py-20 md:py-24 bg-white">
        <div className="max-w-[1200px] mx-auto px-6 sm:px-8 lg:px-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left: Image */}
            <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden shadow-2xl">
              <Image
                src="/tiff-red-carpet.jpg"
                alt="Toronto Film Festival Red Carpet"
                fill
                className="object-cover hover:scale-105 transition-transform duration-700"
              />
            </div>

            {/* Right: Content */}
            <div className="flex flex-col items-start text-left">
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 leading-tight mb-5 tracking-tight">
                Why You Need TIFF Transportation in Toronto
              </h2>
              <div className="w-16 h-1 bg-[#C9A063] mb-8"></div>

              <div className="text-gray-600 text-[15px] sm:text-[16px] leading-relaxed space-y-5 mb-8 font-light">
                <p>
                  Every September, the <strong className="font-semibold text-gray-900">Toronto International Film Festival</strong> fills the Entertainment District with premieres, screenings, and packed crowds. Road closures around King Street West and TIFF Bell Lightbox make downtown driving unpredictable during peak festival hours. Parking near festival venues becomes scarce, and rideshare wait times climb as demand spikes across the city.
                </p>
                <p>
                  A dedicated <Link href="/cities-we-serve/toronto-pearson" className="font-semibold text-gray-900 hover:text-[#C9A063] transition-colors">TIFF festival car service in Toronto</Link> removes that guesswork with pre-planned routes and local traffic knowledge. Our chauffeurs know venue entrances, hotel zones, and quiet side-street shortcuts that keep you moving when main roads slow down. That&apos;s why festival guests, media, and industry professionals turn to our TIFF Festival Toronto limo services for every event on their schedule. You arrive relaxed, on time, every time.
                </p>
              </div>

              <Link
                href="/contact"
                className="bg-[#C9A063] hover:bg-[#b58c51] text-white px-8 py-3.5 rounded-full font-medium text-[15px] transition-all duration-300 shadow-lg"
              >
                Contact Us
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Luxury Chauffeur TIFF Section (Image Right) */}
      <section className="py-16 sm:py-20 md:py-24 bg-[#fafafa]">
        <div className="max-w-[1200px] mx-auto px-6 sm:px-8 lg:px-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left: Content */}
            <div className="flex flex-col items-start text-left order-2 lg:order-1">
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 leading-tight mb-5 tracking-tight">
                TIFF Limousine Service for Every Guest.
              </h2>
              <div className="w-16 h-1 bg-[#C9A063] mb-8"></div>

              <div className="text-gray-600 text-[15px] sm:text-[16px] leading-relaxed space-y-5 mb-8 font-light">
                <p>
                  Our <strong className="font-semibold text-gray-900">TIFF Limousine Service</strong> welcomes every kind of festival visitor, not just one type of guest. Industry professionals, producers, distributors, and corporate sponsors rely on us for punctual travel between press events and private meetings. Everyday attendees book us too, wanting a stress-free ride to a red carpet premiere or evening screening.
                </p>
                <p>
                  From hotel transfers to after-parties and networking events, our chauffeurs handle every stop on a packed festival day. Whether you need a single ride or a full itinerary, our <strong className="font-semibold text-gray-900">Toronto International Film Festival limo service</strong> is built around your schedule, not the other way around. Every guest, from a first-time visitor to a returning sponsor, receives the same standard of comfort and professionalism.
                </p>
              </div>


            </div>

            {/* Right: Image */}
            <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden shadow-2xl order-1 lg:order-2">
              <Image
                src="/tiff-every-guest.jpg"
                alt="TIFF Limousine Service for Every Guest"
                fill
                className="object-cover hover:scale-105 transition-transform duration-700"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Why Choose — matches TIFF promo layout, SARJ brand */}
      <section className="py-14 sm:py-16 md:py-20 bg-black">
        <div className="max-w-[1000px] mx-auto px-6 sm:px-8 md:px-12">
          <div className="text-center mb-10 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl md:text-[2rem] font-bold text-white tracking-tight">
              Why Choose Sarj Worldwide&apos;s{" "}
              <span className="relative inline-block text-white">
                TIFF
                <span className="absolute left-1/2 -translate-x-1/2 -bottom-1.5 w-10 h-0.5 bg-[#C9A063]" />
              </span>{" "}
              Limousine Service?
            </h2>
            <p className="mt-6 text-white/75 text-[14px] sm:text-[15px] leading-relaxed max-w-2xl mx-auto font-light">
              Experience premium ground transportation crafted for the Toronto International Film Festival, backed by trained chauffeurs, a refined vehicle fleet, and service tailored to your schedule.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
            {[
              {
                title: "Professional Chauffeurs",
                body: "Our skilled chauffeurs provide polite, discreet, and on-time service, guiding you through Toronto's congested festival streets with ease and confidence.",
              },
              {
                title: "Luxury Executive Fleet",
                body: "Select from executive sedans and top-tier SUVs offering outstanding comfort, privacy, and sophistication for festival attendees and VIP guests alike.",
              },
              {
                title: "Flexible Festival Transportation",
                body: "From early press interviews to late-night screenings and exclusive parties, we tailor each ride to match your personal TIFF itinerary.",
              },
              {
                title: "Reliable Downtown Travel",
                body: (
                  <>
                    Learn more about our{" "}
                    <Link href="/" className="font-semibold text-white hover:text-[#C9A063] transition-colors">
                      SARJ Worldwide
                    </Link>{" "}
                    chauffeurs who know Toronto&apos;s Entertainment District, festival hotspots, hotels, and key venues inside out, keeping you moving smoothly throughout TIFF.
                  </>
                ),
              },
            ].map((card) => (
              <div
                key={card.title}
                className="rounded-2xl border border-[#C9A063]/55 bg-[#0a0a0a] p-6 sm:p-7"
              >
                <div className="w-8 h-8 rounded-full border border-[#C9A063] flex items-center justify-center mb-4">
                  <Check className="w-4 h-4 text-[#C9A063]" strokeWidth={2.5} />
                </div>
                <h3 className="text-[#C9A063] text-[16px] sm:text-[17px] font-semibold mb-2.5">
                  {card.title}
                </h3>
                <p className="text-white/80 text-[14px] sm:text-[15px] leading-relaxed font-light">
                  {card.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Experience TIFF Without Stress Section */}
      <section className="py-16 sm:py-20 md:py-24 bg-[#fafafa]">
        <div className="max-w-[1200px] mx-auto px-6 sm:px-8 lg:px-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left: Image */}
            <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden shadow-2xl">
              <Image
                src="/tiff-expect-service.jpg"
                alt="Chauffeur Welcoming Guest"
                fill
                className="object-cover hover:scale-105 transition-transform duration-700"
              />
            </div>

            {/* Right: Content */}
            <div className="flex flex-col items-start text-left">
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 leading-tight mb-5 tracking-tight">
                What to Expect from Our Chauffeur Service
              </h2>
              <div className="w-16 h-1 bg-[#C9A063] mb-8"></div>

              <div className="text-gray-600 text-[15px] sm:text-[16px] leading-relaxed space-y-5 mb-8 font-light">
                <p>
                  Every ride starts with a licensed, professional chauffeur who understands the pace of festival travel. Pickup times are confirmed in advance, and schedules stay flexible if a screening runs long or a red carpet event shifts. You choose between executive sedans or luxury SUVs, each kept clean, comfortable, and ready for city travel.
                </p>
                <p>
                  For VIP guests, media, and industry professionals, discretion matters as much as comfort, and our chauffeurs are trained to provide both. This is what a <Link href="/services/airport-transfers" className="font-semibold text-gray-900 hover:text-[#C9A063] transition-colors">Toronto International Film Festival chauffeur service</Link> should feel like: quiet, dependable, and built around your itinerary. We handle the driving and the details, so you can focus on the festival itself.
                </p>
              </div>

              <Link
                href="/fleet"
                className="bg-[#C9A063] hover:bg-[#b58c51] text-white px-8 py-3.5 rounded-full font-medium text-[15px] transition-all duration-300 shadow-lg"
              >
                Our Fleet
              </Link>
            </div>
          </div>
        </div>
      </section>



      <section className="py-14 sm:py-16 md:py-20 bg-[#fafafa]">
        <div className="max-w-[1100px] mx-auto px-6 sm:px-8 md:px-12">
          <span className="inline-block text-[12px] font-bold tracking-[0.2em] uppercase text-[#C9A063] mb-3">
            What we actually do
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight mb-10">
            Three trip types that cover most TIFF schedules
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-10">
            {highlights.map(({ icon: Icon, title, body }) => (
              <div key={title} className="flex gap-4">
                <div className="w-11 h-11 rounded-xl bg-white border border-gray-100 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-5 h-5 text-[#C9A063]" strokeWidth={1.5} />
                </div>
                <div>
                  <h3 className="text-[16px] sm:text-[17px] font-semibold text-gray-900 mb-1.5">
                    {title}
                  </h3>
                  <p className="text-gray-600 text-[14px] sm:text-[15px] leading-relaxed font-light">
                    {body}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-10 flex flex-wrap gap-4 text-[14px]">
            <Link
              href={AIRPORT_RESERVE_HREF}
              className="text-[#C9A063] font-semibold hover:underline underline-offset-4"
            >
              Book from YYZ
            </Link>
            <span className="text-gray-300">·</span>
            <Link
              href="/cities-we-serve/toronto-pearson"
              className="text-gray-700 font-medium hover:text-[#C9A063] transition-colors"
            >
              Pearson transfer details
            </Link>
            <span className="text-gray-300">·</span>
            <Link
              href="/services/hourly-chauffeur"
              className="text-gray-700 font-medium hover:text-[#C9A063] transition-colors"
            >
              Hourly chauffeur
            </Link>
          </div>
        </div>
      </section>



      <section className="py-14 sm:py-16 md:py-20 bg-[#fafafa] border-t border-gray-100">
        <div className="max-w-[1100px] mx-auto px-6 sm:px-8 md:px-12">
          <span className="inline-block text-[12px] font-bold tracking-[0.2em] uppercase text-[#C9A063] mb-3">
            Where you’ll be
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight mb-3">
            Venues we drop at most during TIFF
          </h2>
          <p className="text-gray-600 text-[15px] leading-relaxed max-w-2xl mb-8 font-light">
            This isn’t a film guide — just the addresses our chauffeurs hit on loop every September.
            Full schedule lives on tiff.net; we get you there on time.
          </p>
          <ul className="divide-y divide-gray-100 border-y border-gray-100">
            {venues.map((v) => (
              <li
                key={v.name}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 py-4"
              >
                <span className="text-[15px] font-medium text-gray-900">{v.name}</span>
                <span className="text-[13px] text-gray-500 tracking-wide">{v.area}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="py-14 sm:py-16 bg-[#0a0a0a] text-white">
        <div className="max-w-[1100px] mx-auto px-6 sm:px-8 md:px-12 flex flex-col md:flex-row md:items-end md:justify-between gap-8">
          <div className="max-w-xl">
            <span className="inline-block text-[12px] font-bold tracking-[0.2em] uppercase text-[#C9A063] mb-3">
              Vehicles
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-3">
              Sedans if you’re two people. SUVs if you’ve got luggage.
            </h2>
            <p className="text-white/60 text-[15px] leading-relaxed font-light">
              Tell us how many are travelling and whether you’re coming straight from Pearson with
              bags. We’ll match the car — no need to memorize the fleet list.
            </p>
          </div>
          <Link
            href="/fleet"
            className="inline-flex items-center gap-2 text-[#C9A063] text-[14px] font-semibold hover:underline underline-offset-4 flex-shrink-0"
          >
            See the fleet
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      <FaqSection data={faqs} />



      <Footer />
    </main>
  );
}
