"use client";

import Link from "next/link";
import Image from "next/image";

interface CityServicePageContentProps {
  name: string;
  slug: string;
}

const CityServicePageContent = ({ name, slug }: CityServicePageContentProps) => {
  return (
    <section className="bg-black text-white">
      {/* Hero - video background (HowItWorks video from public) */}
      <div className="relative w-full min-h-[320px] sm:min-h-[380px] md:min-h-[420px] flex items-center justify-center overflow-hidden">
        <video
          autoPlay
          muted
          loop
          playsInline
          className="absolute inset-0 w-full h-full object-cover brightness-[0.5]"
          aria-hidden
        >
          <source src="/howitswork.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-black/50" />
        <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight uppercase drop-shadow-lg">
            Best Luxury Limo Service in {name}
          </h1>
          <Link
            href="/quote"
            className="inline-block mt-6 sm:mt-8 relative py-3.5 px-8 rounded-xl overflow-hidden text-center
              bg-gradient-to-b from-[#9A8059] via-[#8B7355] to-[#6B5644]
              hover:from-[#8B7355] hover:via-[#7A6549] hover:to-[#5C4A3A]
              active:scale-[0.98]
              text-white text-[14px] sm:text-[15px] font-semibold tracking-[0.1em] uppercase
              transition-all duration-300 ease-out
              border border-[#A68B5B]/40 border-t-white/20
              shadow-[0_1px_0_0_rgba(255,255,255,0.15)_inset,0_4px_20px_rgba(139,115,85,0.3)]
              hover:shadow-[0_1px_0_0_rgba(255,255,255,0.2)_inset,0_6px_28px_rgba(139,115,85,0.4)]"
          >
            <span className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" aria-hidden />
            <span className="relative">Reserve Now</span>
          </Link>
        </div>
      </div>

      {/* First content block */}
      <div className="max-w-[900px] mx-auto px-4 sm:px-6 md:px-8 py-12 sm:py-16 md:py-20">
        <p className="text-white/95 text-[15px] sm:text-[16px] md:text-[17px] leading-relaxed mb-5">
          If LuxRide knows anything about {name}, it&apos;s that this region deserves nothing less than
          world-class luxury chauffeured transportation—whether you&apos;re here for business, breathtaking
          scenery, major events, or simply the finest in hospitality. We bring the same premium fleet,
          professional chauffeurs, and seamless service that define us globally.
        </p>
        <p className="text-white/95 text-[15px] sm:text-[16px] md:text-[17px] leading-relaxed">
          Choose the best luxury limo and sedan service for memorable, personalized experiences and
          reliable limo transportation from the airport. Explore our{" "}
          <Link href="/services/corporate-travel" className="text-[#C9A063] underline underline-offset-2 hover:text-[#D4AF6A] transition-colors">
            executive car services
          </Link>{" "}
          and let us take care of every mile.
        </p>
      </div>

      {/* Cityscape / region image - cities2 from public */}
      <div className="relative w-full bg-black">
        <div className="h-px bg-black" aria-hidden />
        <div className="relative w-full h-[280px] sm:h-[340px] md:h-[420px] bg-gray-900">
          <Image
            src="/cities2.jpg"
            alt={`Luxury chauffeur service in ${name}`}
            fill
            className="object-cover object-center"
            sizes="100vw"
          />
        </div>
        <div className="bg-black py-6 sm:py-8 px-4 sm:px-6 text-center">
          <p className="text-white text-xl sm:text-2xl md:text-3xl font-bold tracking-tight uppercase">
            Airport Limo Service in {name}
          </p>
        </div>
      </div>

      {/* Second content block */}
      <div className="max-w-[900px] mx-auto px-4 sm:px-6 md:px-8 py-12 sm:py-16 md:py-20">
        <h2 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight uppercase mb-6 sm:mb-8">
          Airport Limo Service in {name}
        </h2>
        <p className="text-white/95 text-[15px] sm:text-[16px] md:text-[17px] leading-relaxed mb-5">
          We are committed to safe and discreet transportation with our best fleet of luxury
          vehicles and chauffeurs trained to provide exceptional customer service and hospitality—we
          like to call it &quot;Chauffeured Hospitality.&quot; With a global footprint in over 1000 cities
          worldwide, the same standards apply wherever you travel.
        </p>
        <p className="text-white/95 text-[15px] sm:text-[16px] md:text-[17px] leading-relaxed mb-5">
          Our Airport Concierge service includes expedited trips through security and access to VIP
          airport lounges, so you can leave the stress of commercial air travel behind and step
          straight into comfort.
        </p>
        <p className="text-white/95 text-[15px] sm:text-[16px] md:text-[17px] leading-relaxed">
          Book your luxury limo airport service in {name} today. Learn more about our{" "}
          <Link href="/services" className="text-[#C9A063] underline underline-offset-2 hover:text-[#D4AF6A] transition-colors">
            luxury car services
          </Link>{" "}
          and{" "}
          <Link href="/services/wedding-events" className="text-[#C9A063] underline underline-offset-2 hover:text-[#D4AF6A] transition-colors">
            wedding limo service
          </Link>
          . We love {name}, and we look forward to seeing you soon.
        </p>
      </div>
    </section>
  );
};

export default CityServicePageContent;
