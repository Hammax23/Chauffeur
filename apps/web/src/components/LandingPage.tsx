import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BadgeDollarSign,
  Building2,
  CalendarCheck,
  Check,
  Clock,
  Mail,
  MapPin,
  MapPinned,
  Phone,
  Plane,
  Route,
  ShieldCheck,
  Timer,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { GoogleMapsProvider } from "@/components/GoogleMapsProvider";
import LandingBookingForm from "@/components/LandingBookingForm";
import LandingFleet from "@/components/LandingFleet";
import { HeroRating, ReviewsSection } from "@/components/LandingReviews";

export type LandingPageContent = {
  eyebrow: string;
  headline: string;
  headlineAccent: string;
  intro: string;
  heroPoster: string;
  pickupPlaceholder?: string;
  heroPoints: string[];
  features: { icon: LucideIcon; title: string; note: string }[];
  stepsTitle: [string, string];
  steps: { icon: LucideIcon; title: string; body: string }[];
  routesTitle: [string, string];
  routesIntro: string;
  routesFrom: string;
  routes: { from?: string; to: string; km: string; time: string }[];
};

const PHONE_DISPLAY = "+1 (416) 893-5779";
const PHONE_HREF = "tel:+14168935779";
const EMAIL = "reserve@sarjworldwide.ca";
const ADDRESS = "231 Oak Park Blvd, Oakville, ON L6H 7S8";

/** Icons the route files pick from, so they stay plain data. */
export const featureIcons = { rates: BadgeDollarSign, flight: Plane, licensed: ShieldCheck, support: Clock, billing: Building2 };
export const stepIcons = { trip: MapPin, confirm: CalendarCheck, ride: Route };

const GOLD_CIRCLE = "bg-gradient-to-br from-[#C9A063] to-[#B8935A]";

/** Logo cropped to its visible area (the PNG has transparent padding) so it aligns exactly; height classes set the size. */
function CroppedLogo({ className }: { className: string }) {
  return (
    <span className={`relative block aspect-[514/282] overflow-hidden ${className}`}>
      <Image
        src="/logo1.png"
        alt="SARJ Worldwide Chauffeur Services Logo"
        width={823}
        height={322}
        priority
        className="absolute max-w-none"
        style={{ width: "160.1%", height: "auto", left: "-28.4%", top: "-6.4%" }}
      />
    </span>
  );
}

function Heading({ eyebrow, lead, accent, intro, dark }: { eyebrow: string; lead: string; accent: string; intro?: string; dark?: boolean }) {
  return (
    <div className="mx-auto mb-12 max-w-3xl text-center sm:mb-14">
      <span className="text-xs font-bold uppercase tracking-[0.24em] text-[#C9A063]">{eyebrow}</span>
      <h2 style={{ textWrap: "balance" }} className={`mt-4 text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl ${dark ? "text-white" : "text-gray-950"}`}>
        {lead} <span className="text-[#C9A063]">{accent}</span>
      </h2>
      {intro && <p className={`mt-5 text-base font-light leading-7 ${dark ? "text-white/65" : "text-gray-600"}`}>{intro}</p>}
    </div>
  );
}

export default function LandingPage({ content }: { content: LandingPageContent }) {
  const contactCards = [
    { icon: Phone, label: "Call us", value: PHONE_DISPLAY, href: PHONE_HREF },
    { icon: Mail, label: "Email", value: EMAIL, href: `mailto:${EMAIL}` },
    { icon: MapPinned, label: "Office", value: ADDRESS },
    { icon: Timer, label: "Availability", value: "24/7 bookings and support" },
  ];

  return (
    <GoogleMapsProvider>
      <main className="min-h-screen bg-white pb-14 lg:pb-0">
        {/* Header (logo and buttons) and hero: same cover video and booking bar as the home page, centered */}
        <header className="absolute inset-x-0 top-0 z-30">
          <div className="mx-auto flex h-[76px] max-w-[1600px] items-center justify-between px-4 md:h-[88px] md:px-8">
            <Link href="/" aria-label="SARJ Worldwide home" className="flex shrink-0 items-center">
              <CroppedLogo className="h-[45px] sm:h-[52px] md:h-[65px]" />
            </Link>
            <div className="flex items-center gap-3">
              <a
                href={PHONE_HREF}
                className="hidden items-center gap-2 rounded-full border border-white/25 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white hover:text-black sm:flex"
              >
                <Phone className="h-4 w-4" />
                {PHONE_DISPLAY}
              </a>
              <Link href="/reservation" className="rounded-full bg-white px-5 py-2.5 text-xs font-bold uppercase tracking-[0.12em] text-black transition hover:bg-[#C9A063]">
                Book now
              </Link>
            </div>
          </div>
        </header>

        <section className="relative flex min-h-[100svh] w-full items-center overflow-hidden bg-black">
          <video autoPlay loop muted playsInline preload="auto" poster={content.heroPoster} className="absolute inset-0 h-full w-full object-cover">
            <source src="/cover.mp4" type="video/mp4" />
          </video>
          <div className="absolute inset-0 bg-black/60" />

          <div className="relative z-10 mx-auto flex w-full max-w-[1100px] flex-col items-center px-5 pb-8 pt-[100px] text-center sm:px-8 sm:pb-10 sm:pt-[112px]">
            <HeroRating />
            <p className="mb-3 mt-5 hidden text-sm font-normal tracking-wide text-white/90 sm:block md:text-base">{content.eyebrow}</p>
            <h1 style={{ textWrap: "balance" }} className="mt-4 max-w-[860px] text-2xl font-bold leading-tight text-white sm:mt-0 sm:text-3xl md:text-4xl xl:text-5xl">
              {content.headline} <span className="block text-[#C9A063]">{content.headlineAccent}</span>
            </h1>
            <p className="mt-4 hidden max-w-[700px] text-sm leading-relaxed text-white sm:block md:text-base lg:text-lg">{content.intro}</p>

            <div className="mt-6 w-full sm:mt-8">
              <LandingBookingForm pickupPlaceholder={content.pickupPlaceholder} />
            </div>

            <ul className="mt-6 hidden flex-wrap justify-center gap-x-7 gap-y-2 text-sm text-white/85 sm:flex">
              {content.heroPoints.map((p) => (
                <li key={p} className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-[#C9A063]" strokeWidth={3} />
                  {p}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Feature strip */}
        <section className="border-b border-gray-200 bg-white">
          <ul className="mx-auto grid max-w-[1200px] grid-cols-2 gap-x-6 gap-y-8 px-6 py-10 sm:px-8 md:grid-cols-4 lg:px-12">
            {content.features.map(({ icon: Icon, title, note }) => (
              <li key={title} className="flex flex-col items-center gap-3 text-center">
                <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-black text-[#C9A063]">
                  <Icon className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-gray-950">{title}</p>
                  <p className="text-xs text-gray-500">{note}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* How it works */}
        <section className="border-b border-gray-200 bg-[#f2f1ee] py-20 sm:py-28">
          <div className="mx-auto max-w-[1100px] px-6 sm:px-8 lg:px-12">
            <Heading eyebrow="How it works" lead={content.stepsTitle[0]} accent={content.stepsTitle[1]} intro="No calls, no waiting. Get a price and confirm your ride in under a minute." />
            <ol className="grid gap-5 md:grid-cols-3">
              {content.steps.map(({ icon: Icon, title, body }, i) => (
                <li key={title} className="relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-8 text-center">
                  <span className="pointer-events-none absolute left-5 top-3 text-6xl font-bold text-gray-100">0{i + 1}</span>
                  <span className="relative mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-black text-[#C9A063]">
                    <Icon className="h-6 w-6" />
                  </span>
                  <h3 className="relative text-lg font-bold text-gray-950">{title}</h3>
                  <p className="relative mx-auto mt-3 max-w-[280px] text-sm font-light leading-7 text-gray-600">{body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <LandingFleet />

        {/* Popular routes */}
        <section className="relative overflow-hidden bg-black py-20 sm:py-28">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_55%_at_50%_0%,rgba(201,160,99,0.16),transparent_70%)]" />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#C9A063]/50 to-transparent" />

          <div className="relative mx-auto max-w-[1200px] px-6 sm:px-8 lg:px-12">
            <div className="mx-auto mb-12 max-w-3xl text-center sm:mb-14">
              <div className="mb-4 flex items-center justify-center gap-3">
                <span className="h-px w-8 bg-gradient-to-r from-transparent to-[#C9A063]/70 sm:w-12" />
                <span className="text-xs font-bold uppercase tracking-[0.24em] text-[#C9A063]">Popular routes</span>
                <span className="h-px w-8 bg-gradient-to-l from-transparent to-[#C9A063]/70 sm:w-12" />
              </div>
              <h2 style={{ textWrap: "balance" }} className="text-3xl font-bold tracking-tight text-white sm:text-4xl md:text-[44px] md:leading-[1.1]">
                {content.routesTitle[0]} <span className="text-[#C9A063]">{content.routesTitle[1]}</span>
              </h2>
              <p className="mx-auto mt-5 max-w-xl text-base font-light leading-7 text-white/60">{content.routesIntro}</p>
            </div>

            <div className="grid items-stretch gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {content.routes.map((r) => (
                <Link
                  key={`${r.from ?? content.routesFrom}-${r.to}`}
                  href={`/reservation?mode=distance&pickup=${encodeURIComponent(r.from ?? content.routesFrom)}&dropoff=${encodeURIComponent(r.to)}`}
                  className="group relative flex flex-col items-center overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.07] to-white/[0.02] p-6 pt-7 text-center transition duration-300 hover:-translate-y-1.5 hover:border-[#C9A063]/60 hover:shadow-[0_24px_60px_-20px_rgba(201,160,99,0.35)]"
                >
                  <span className="absolute inset-x-0 top-0 h-0.5 origin-center scale-x-0 bg-gradient-to-r from-transparent via-[#C9A063] to-transparent transition-transform duration-500 group-hover:scale-x-100" />

                  {/* From */}
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/40">From</p>
                  <p className="mt-1.5 text-[13px] font-medium text-white/75">{r.from ?? content.routesFrom}</p>

                  {/* Connector */}
                  <div className="my-3 flex flex-col items-center" aria-hidden>
                    <span className="h-2 w-2 rounded-full border border-[#C9A063] bg-black" />
                    <span className="h-7 w-px bg-gradient-to-b from-[#C9A063] to-[#C9A063]/10" />
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#C9A063] to-[#B8935A] text-black shadow-lg shadow-[#C9A063]/30 transition-transform duration-300 group-hover:scale-110">
                      <MapPin className="h-4 w-4" strokeWidth={2.5} />
                    </span>
                  </div>

                  {/* To */}
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#C9A063]">To</p>
                  <h3 className="mt-1.5 flex min-h-[56px] items-center justify-center text-lg font-bold leading-snug text-white">{r.to}</h3>

                  {/* Stats */}
                  <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 text-xs text-white/75">
                      <Route className="h-3.5 w-3.5 text-[#C9A063]" />
                      {r.km}
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 text-xs text-white/75">
                      <Clock className="h-3.5 w-3.5 text-[#C9A063]" />
                      {r.time}
                    </span>
                  </div>

                  {/* CTA */}
                  <span className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-white py-3.5 text-[11px] font-bold uppercase tracking-[0.16em] text-black transition duration-300 group-hover:bg-gradient-to-r group-hover:from-[#C9A063] group-hover:to-[#D4AF6F]">
                    Book this route
                    <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" strokeWidth={2.5} />
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <ReviewsSection />

        {/* Contact */}
        <section className="bg-white py-20 sm:py-28">
          <div className="mx-auto max-w-[1200px] px-6 sm:px-8 lg:px-12">
            <Heading eyebrow="Contact" lead="Questions?" accent="Talk to us" intro="Our team is available around the clock to help plan your trip." />
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {contactCards.map(({ icon: Icon, label, value, href }) => {
                const body = (
                  <>
                    <span className="flex h-12 w-12 items-center justify-center rounded-full bg-black text-[#C9A063]">
                      <Icon className="h-5 w-5" />
                    </span>
                    <p className="mt-5 text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400">{label}</p>
                    <p className="mt-2 break-words text-sm font-semibold text-gray-950">{value}</p>
                  </>
                );
                const cls = "flex flex-col items-center rounded-2xl border border-gray-200 bg-white p-7 text-center transition";
                return href ? (
                  <a key={label} href={href} className={`${cls} hover:-translate-y-1 hover:border-[#C9A063]/60 hover:shadow-lg`}>{body}</a>
                ) : (
                  <div key={label} className={cls}>{body}</div>
                );
              })}
            </div>
          </div>
        </section>

        <footer className="relative bg-black">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#C9A063]/60 to-transparent" />
          <div className="mx-auto flex max-w-[1200px] flex-col items-center justify-between gap-5 px-6 py-8 sm:px-8 md:flex-row lg:px-12">
            <Link href="/" aria-label="SARJ Worldwide home" className="flex-shrink-0">
              <CroppedLogo className="h-[72px]" />
            </Link>
            <div className="flex flex-col items-center gap-1.5 text-center text-xs text-white/50 md:items-end md:text-right">
              <p>&copy; {new Date().getFullYear()} SARJ Worldwide Chauffeur Services. All rights reserved.</p>
              <p>
                <Link href="/privacy-policy" className="transition hover:text-[#C9A063]">Privacy Policy</Link>
                <span className="mx-2 text-white/25">|</span>
                <Link href="/terms-of-service" className="transition hover:text-[#C9A063]">Terms &amp; Conditions</Link>
              </p>
            </div>
          </div>
        </footer>

        <style>{`@media (max-width:1023px){[data-floating-contact]{bottom:76px !important}}`}</style>

        {/* Sticky mobile action bar */}
        <div className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-2 border-t border-white/10 bg-black/95 backdrop-blur lg:hidden">
          <a href={PHONE_HREF} className="flex items-center justify-center gap-2 py-4 text-sm font-semibold text-white">
            <Phone className="h-4 w-4 text-[#C9A063]" />
            Call now
          </a>
          <Link href="/reservation" className="flex items-center justify-center bg-[#C9A063] py-4 text-sm font-bold text-black">
            Book now
          </Link>
        </div>
      </main>
    </GoogleMapsProvider>
  );
}
