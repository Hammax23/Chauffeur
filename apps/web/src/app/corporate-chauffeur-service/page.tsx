import Link from "next/link";
import {
  ArrowRight,
  BriefcaseBusiness,
  Building2,
  CalendarClock,
  CarFront,
  Check,
  CircleDollarSign,
  Clock3,
  Headphones,
  MapPinned,
  PlaneTakeoff,
  Route,
  ShieldCheck,
  UserRoundCheck,
  UsersRound,
} from "lucide-react";
import TopNav from "@/components/TopNav";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import FaqSection from "@/components/FaqSection";

const QUOTE_HREF =
  "/quote?service=corporate-business-travel&note=Corporate%20chauffeur%20service";

const useCases = [
  {
    icon: UserRoundCheck,
    title: "Client transportation",
    body: "Give visiting clients a polished arrival with a professional chauffeur and executive vehicle.",
  },
  {
    icon: UsersRound,
    title: "Employee transportation",
    body: "Reliable transfers for executives, teams, and employees travelling across the GTA.",
  },
  {
    icon: Building2,
    title: "Meetings",
    body: "Keep boardroom, hotel, office, and restaurant transfers running precisely to schedule.",
  },
  {
    icon: Route,
    title: "Roadshows",
    body: "One chauffeur, multiple stops, and flexible waiting time for demanding business itineraries.",
  },
  {
    icon: BriefcaseBusiness,
    title: "Conferences",
    body: "Coordinate individual guests or larger delegations with vehicles suited to every group size.",
  },
  {
    icon: CalendarClock,
    title: "Executive assistants",
    body: "A responsive transportation partner for changing calendars and last-minute requests.",
  },
];

const capabilities = [
  { icon: CarFront, title: "Multiple vehicles" },
  { icon: MapPinned, title: "Multiple pickup locations" },
  { icon: CircleDollarSign, title: "Monthly billing" },
  { icon: Headphones, title: "Dedicated account support" },
  { icon: Clock3, title: "Last-minute changes" },
  { icon: PlaneTakeoff, title: "Flight monitoring" },
];

const faqs = [
  {
    question: "Can SARJ Worldwide set up a corporate transportation account?",
    answer:
      "Yes. We can arrange a corporate account for recurring executive, employee, and client transportation, with one point of contact for trip coordination.",
  },
  {
    question: "Is monthly billing available for business clients?",
    answer:
      "Monthly billing and tailored invoicing may be arranged for approved corporate accounts. Our team will confirm the billing structure during account setup.",
  },
  {
    question: "Can you manage last-minute itinerary changes?",
    answer:
      "Yes. Our team can adjust pickup times, stops, passengers, and vehicle requirements when schedules change, subject to vehicle availability.",
  },
  {
    question: "Do airport transfers include flight monitoring?",
    answer:
      "Yes. We monitor flight status and adjust airport pickup timing for delays or early arrivals, helping executives and visiting clients move smoothly from the airport.",
  },
  {
    question: "Can we book several vehicles and pickup locations?",
    answer:
      "Yes. We coordinate multi-vehicle movements and pickups from different offices, hotels, airports, and venues across Toronto and the GTA.",
  },
];

export default function CorporateChauffeurServicePage() {
  return (
    <main className="min-h-screen bg-white">
      <TopNav />
      <Navbar />

      <section className="relative min-h-[720px] overflow-hidden bg-black">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('/corporate-section-1.jpg')" }}
        />
        <div className="absolute inset-0 bg-black/65" />
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/75 to-black/30" />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/30" />

        <div className="relative z-10 mx-auto flex min-h-[720px] max-w-[1280px] items-center px-6 pb-16 pt-[150px] sm:px-8 lg:px-12">
          <div className="max-w-[780px]">
            <div className="mb-6 inline-flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.28em] text-[#C9A063] sm:text-xs">
              <span className="h-px w-10 bg-[#C9A063]" />
              Executive transportation
            </div>
            <h1 className="max-w-[760px] text-4xl font-bold leading-[1.08] tracking-tight text-white sm:text-5xl md:text-6xl lg:text-[68px]">
              Corporate Chauffeur Service in{" "}
              <span className="text-[#C9A063]">Toronto &amp; the GTA</span>
            </h1>
            <p className="mt-7 max-w-[680px] text-base font-light leading-8 text-white/80 sm:text-lg">
              Professional chauffeur transportation for executives, clients,
              employees, meetings, conferences, and complex business schedules.
              One trusted team manages every pickup, stop, and change.
            </p>

            <div className="mt-9 flex flex-col gap-4 sm:flex-row">
              <Link
                href={QUOTE_HREF}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[#C9A063] px-7 py-4 text-sm font-bold text-black transition hover:bg-[#dfbd87]"
              >
                Request a corporate quote
                <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href="tel:+14168935779"
                className="inline-flex items-center justify-center rounded-full border border-white/40 px-7 py-4 text-sm font-semibold text-white transition hover:border-white hover:bg-white hover:text-black"
              >
                Call +1 416-893-5779
              </a>
            </div>

            <div className="mt-10 flex flex-wrap gap-x-7 gap-y-3 text-sm text-white/70">
              {["Professional chauffeurs", "Executive fleet", "24/7 support"].map(
                (item) => (
                  <span key={item} className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-[#C9A063]" />
                    {item}
                  </span>
                )
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#fafafa] py-20 sm:py-24">
        <div className="mx-auto max-w-[1200px] px-6 sm:px-8 lg:px-12">
          <div className="mx-auto mb-12 max-w-3xl text-center">
            <span className="text-xs font-bold uppercase tracking-[0.24em] text-[#C9A063]">
              Built around business
            </span>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-gray-950 sm:text-4xl md:text-5xl">
              Executive transportation for every schedule
            </h2>
            <p className="mt-5 text-base font-light leading-7 text-gray-600">
              From a single client pickup to a full day of meetings, SARJ
              Worldwide keeps business travel private, punctual, and organized.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {useCases.map(({ icon: Icon, title, body }) => (
              <article
                key={title}
                className="group rounded-2xl border border-gray-200 bg-white p-7 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-[#C9A063]/50 hover:shadow-xl"
              >
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-[#C9A063]/10">
                  <Icon className="h-6 w-6 text-[#C9A063]" strokeWidth={1.6} />
                </div>
                <h3 className="text-lg font-bold text-gray-950">{title}</h3>
                <p className="mt-3 text-sm font-light leading-6 text-gray-600">
                  {body}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-[#090909] py-20 text-white sm:py-24">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(201,160,99,0.16),transparent_38%)]" />
        <div className="relative mx-auto max-w-[1200px] px-6 sm:px-8 lg:px-12">
          <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
            <div>
              <span className="text-xs font-bold uppercase tracking-[0.24em] text-[#C9A063]">
                Corporate account support
              </span>
              <h2 className="mt-4 text-3xl font-bold leading-tight sm:text-4xl">
                The details handled by one transportation partner
              </h2>
              <p className="mt-5 max-w-lg text-base font-light leading-7 text-white/65">
                Give your team one reliable contact for vehicles, locations,
                billing, flight changes, and time-sensitive requests.
              </p>
              <Link
                href={QUOTE_HREF}
                className="mt-8 inline-flex items-center gap-2 text-sm font-bold text-[#C9A063] hover:text-[#dfbd87]"
              >
                Discuss your account needs
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {capabilities.map(({ icon: Icon, title }) => (
                <div
                  key={title}
                  className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-sm"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#C9A063]/45">
                    <Icon className="h-5 w-5 text-[#C9A063]" strokeWidth={1.6} />
                  </div>
                  <span className="text-sm font-semibold text-white/90">
                    {title}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 sm:py-24">
        <div className="mx-auto max-w-[1200px] px-6 sm:px-8 lg:px-12">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            <div
              className="min-h-[460px] rounded-3xl bg-cover bg-center shadow-2xl"
              style={{ backgroundImage: "url('/corporate-section-2.jpg')" }}
              role="img"
              aria-label="Corporate chauffeur service in Toronto"
            />
            <div>
              <span className="text-xs font-bold uppercase tracking-[0.24em] text-[#C9A063]">
                Why SARJ for business
              </span>
              <h2 className="mt-4 text-3xl font-bold tracking-tight text-gray-950 sm:text-4xl">
                A professional experience from booking to drop-off
              </h2>
              <div className="mt-8 space-y-7">
                {[
                  {
                    icon: MapPinned,
                    title: "Toronto and GTA coverage",
                    body: "Airport, hotel, office, venue, and long-distance transportation coordinated across the region.",
                  },
                  {
                    icon: ShieldCheck,
                    title: "Discreet professional chauffeurs",
                    body: "A polished, private service appropriate for executives, clients, and confidential schedules.",
                  },
                  {
                    icon: Headphones,
                    title: "One account for the whole team",
                    body: "Centralize requests and changes instead of arranging every business trip separately.",
                  },
                ].map(({ icon: Icon, title, body }) => (
                  <div key={title} className="flex gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#C9A063]/10">
                      <Icon className="h-5 w-5 text-[#C9A063]" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-950">{title}</h3>
                      <p className="mt-1.5 text-sm font-light leading-6 text-gray-600">
                        {body}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-6 pb-20 sm:px-8 sm:pb-24 lg:px-12">
        <div className="relative mx-auto max-w-[1200px] overflow-hidden rounded-3xl bg-[#C9A063] px-7 py-14 sm:px-12 lg:flex lg:items-center lg:justify-between lg:gap-12">
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full border border-black/10" />
          <div className="relative max-w-2xl">
            <span className="text-xs font-bold uppercase tracking-[0.22em] text-black/60">
              Corporate transportation, simplified
            </span>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-black sm:text-4xl">
              Tell us what your business schedule requires.
            </h2>
            <p className="mt-4 text-sm leading-6 text-black/70 sm:text-base">
              Request a tailored quote for recurring travel, executive airport
              transfers, roadshows, or multi-vehicle coordination.
            </p>
          </div>
          <Link
            href={QUOTE_HREF}
            className="relative mt-8 inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-black px-7 py-4 text-sm font-bold text-white transition hover:bg-gray-900 lg:mt-0"
          >
            Request a corporate quote
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <FaqSection data={faqs} />
      <Footer />
    </main>
  );
}
