import Link from "next/link";
import {
  PlaneTakeoff,
  Clock,
  MapPin,
  Building2,
  ArrowRight,
  Check,
} from "lucide-react";
import TopNav from "@/components/TopNav";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo-metadata";

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadata("/tiff-chauffeur", {
    title: "TIFF 2026 Chauffeur Service in Toronto | SARJ Worldwide",
    description:
      "Book a private chauffeur for TIFF 2026 in Toronto (Sept 10–20). YYZ airport pickups, King West hotel runs, and hourly cars between Lightbox, Roy Thomson Hall, and other venues.",
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
    question: "Are you part of TIFF or an official sponsor?",
    answer:
      "No. SARJ Worldwide is a private chauffeur company. We are not owned by, sponsored by, or speaking for the Toronto International Film Festival.",
  },
  {
    question: "When do cars actually fill up for TIFF?",
    answer:
      "Opening weekend and evening premieres go first. If you need a sedan or SUV for Sept 10–13 nights, book as soon as your flights and hotel are locked — waiting until the week of is a gamble.",
  },
  {
    question: "Can you pick us up at Pearson after we land?",
    answer:
      "Yes. Use an airport transfer booking, add your flight details, and choose meet & greet if you want the chauffeur inside arrivals with a name sign. We cover YYZ to downtown hotels and straight to venues.",
  },
  {
    question: "Hourly or point-to-point — which one for a festival night?",
    answer:
      "One hotel → venue → hotel run is usually point-to-point. Two or more venues, or you don’t know the exact order yet, book hourly. Minimums apply; ask when you reserve if you’re unsure.",
  },
  {
    question: "What if the film runs long or we miss the car?",
    answer:
      "Text or call the number on your confirmation. For airports we already track the flight. For venues, a quick update lets us hold or reposition instead of marking you as a no-show.",
  },
];

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map((faq) => ({
    "@type": "Question",
    name: faq.question,
    acceptedAnswer: {
      "@type": "Answer",
      text: faq.answer,
    },
  })),
};

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
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
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

      <section className="relative pt-[108px] md:pt-[120px] overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('/heropics/airport2.png')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/75 via-black/65 to-[#0a0a0a]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(201,160,99,0.18),_transparent_55%)]" />

        <div className="relative z-10 max-w-[1100px] mx-auto px-6 sm:px-8 md:px-12 py-16 sm:py-20 md:py-24">
          <p className="text-[#C9A063] text-[12px] sm:text-[13px] font-semibold tracking-[0.22em] uppercase mb-4">
            SARJ Worldwide
          </p>
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-[3.25rem] font-bold text-white tracking-tight max-w-3xl leading-[1.1] mb-5">
            A private car for TIFF week in Toronto
          </h1>
          <p className="text-white/75 text-[15px] sm:text-[17px] max-w-xl leading-relaxed font-light mb-8">
            Festival dates are Sept 10–20, 2026. We handle Pearson arrivals, hotel runs on King West,
            and hourly cars when your night jumps between theatres.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <Link
              href={RESERVE_HREF}
              className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-full bg-[#C9A063] text-[#1a1a1a] text-[14px] font-semibold hover:bg-[#B8935A] transition-colors"
            >
              Book a car
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href={QUOTE_HREF}
              className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-full border border-white/25 text-white text-[14px] font-medium hover:border-[#C9A063]/60 hover:text-[#C9A063] transition-colors"
            >
              Ask for a quote
            </Link>
          </div>
        </div>
      </section>

      {/* Why Choose — matches TIFF promo layout, SARJ brand */}
      <section className="py-14 sm:py-16 md:py-20 bg-black">
        <div className="max-w-[1000px] mx-auto px-6 sm:px-8 md:px-12">
          <div className="text-center mb-10 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl md:text-[2rem] font-bold text-white tracking-tight">
              Why Choose Our{" "}
              <span className="relative inline-block text-white">
                TIFF
                <span className="absolute left-1/2 -translate-x-1/2 -bottom-1.5 w-10 h-0.5 bg-[#C9A063]" />
              </span>{" "}
              Chauffeur Service?
            </h2>
            <p className="mt-6 text-white/75 text-[14px] sm:text-[15px] leading-relaxed max-w-2xl mx-auto font-light">
              Luxury transport for TIFF week in Toronto — licensed chauffeurs, executive vehicles,
              and bookings built around your screenings, hotels, and Pearson flights.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
            {[
              {
                title: "Professional Chauffeurs",
                body: "Our drivers know festival traffic on King West, when streets close for red carpets, and how to get you curb-side without the scramble.",
              },
              {
                title: "Luxury Executive Fleet",
                body: "Sedans and premium SUVs with space for luggage from YYZ, quiet cabins between venues, and a look that fits premieres — not a random rideshare.",
              },
              {
                title: "Flexible Festival Transportation",
                body: "Morning press, afternoon Market meetings, late premieres, after-parties — we set the car around your TIFF schedule, including hourly as-directed.",
              },
              {
                title: "Reliable Downtown Travel",
                body: "Entertainment District, Lightbox, Roy Thomson Hall, Scotiabank Theatre, MTCC, and the hotels around them — routes we run every September.",
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

      <section className="py-14 sm:py-16 md:py-20 bg-white">
        <div className="max-w-[1100px] mx-auto px-6 sm:px-8 md:px-12">
          <span className="inline-block text-[12px] font-bold tracking-[0.2em] uppercase text-[#C9A063] mb-3">
            Why people book ahead
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight mb-4 max-w-2xl">
            After a gala lets out, rideshare apps are the worst part of the night
          </h2>
          <p className="text-gray-600 text-[15px] sm:text-[16px] leading-relaxed max-w-2xl mb-10 font-light">
            We’ve driven TIFF weeks before. King Street gets taped off, phones die in the crowd, and
            surge pricing spikes the second everyone leaves Roy Thomson Hall together. A car that was
            already assigned to you — with a driver who has your hotel address — is simply calmer.
          </p>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-3xl">
            {[
              "Evening cars for opening weekend go quickest",
              "YYZ flights tracked so delays don’t strand you",
              "Low-profile pickups when you don’t want a curb circus",
              "One team from the airport through the last drop",
            ].map((item) => (
              <li key={item} className="flex items-start gap-3 text-[14px] sm:text-[15px] text-gray-700">
                <span className="mt-0.5 w-5 h-5 rounded-full bg-[#C9A063]/15 flex items-center justify-center flex-shrink-0">
                  <Check className="w-3 h-3 text-[#C9A063]" strokeWidth={2.5} />
                </span>
                {item}
              </li>
            ))}
          </ul>
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

      <section className="py-14 sm:py-16 md:py-20 bg-white">
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

      <section className="py-14 sm:py-16 md:py-20 bg-white">
        <div className="max-w-[800px] mx-auto px-6 sm:px-8 md:px-12">
          <span className="inline-block text-[12px] font-bold tracking-[0.2em] uppercase text-[#C9A063] mb-3">
            FAQ
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight mb-8">
            Straight answers
          </h2>
          <div className="space-y-6">
            {faqs.map((faq) => (
              <div key={faq.question} className="border-b border-gray-100 pb-6">
                <h3 className="text-[15px] sm:text-[16px] font-semibold text-gray-900 mb-2">
                  {faq.question}
                </h3>
                <p className="text-gray-600 text-[14px] sm:text-[15px] leading-relaxed font-light">
                  {faq.answer}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-14 sm:py-16 bg-[#fafafa] border-t border-gray-100">
        <div className="max-w-[1100px] mx-auto px-6 sm:px-8 md:px-12 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight mb-3">
            Got your TIFF dates locked?
          </h2>
          <p className="text-gray-600 text-[15px] max-w-lg mx-auto mb-8 font-light">
            Reserve online, or send a quote if you need several days / hourly blocks. Put “TIFF
            2026” in the notes so the desk knows you’re in festival traffic.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
            <Link
              href={RESERVE_HREF}
              className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-full bg-[#1a1a1a] text-white text-[14px] font-semibold hover:bg-black transition-colors"
            >
              Reserve now
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href={QUOTE_HREF}
              className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-full border border-gray-300 text-gray-900 text-[14px] font-medium hover:border-[#C9A063] hover:text-[#C9A063] transition-colors"
            >
              Get a quote
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
