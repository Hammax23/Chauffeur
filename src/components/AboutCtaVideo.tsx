"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useRef, useEffect } from "react";

export default function AboutCtaVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.load();
    }
  }, []);

  return (
    <section className="py-14 sm:py-16 md:py-20">
      <div className="max-w-[1100px] mx-auto px-6 sm:px-8 md:px-12">
        <div className="relative rounded-2xl overflow-hidden border border-[#C9A063]/25 shadow-xl shadow-gray-200/50 min-h-[380px]">
          <video
            ref={videoRef}
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
            className="absolute inset-0 w-full h-full object-cover"
          >
            <source src="/howitswork.mp4" type="video/mp4" />
          </video>
          <div className="absolute inset-0 bg-black/50" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(201,160,99,0.08)_0%,_transparent_50%)] pointer-events-none" />
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#C9A063]/50 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#C9A063]/50 to-transparent" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-32 bg-[#C9A063]/5 rounded-full blur-3xl -translate-y-1/2" />
          <div className="relative py-14 sm:py-16 md:py-20 text-center px-6 sm:px-10 z-10">
            <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-white/90 border border-[#C9A063]/30 shadow-sm mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-[#C9A063] animate-pulse" />
              <span className="text-[12px] font-semibold tracking-[0.2em] uppercase text-[#8B7355]">Get Started</span>
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-[2.5rem] font-bold text-white tracking-tight mb-4 leading-tight drop-shadow-lg">
              Ready to experience luxury?
            </h2>
            <p className="text-white/90 text-[15px] sm:text-[16px] max-w-xl mx-auto mb-10 leading-relaxed font-light drop-shadow-md">
              Book your ride today or explore our services. Our team is here to make every journey
              exceptional.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-5">
              <Link
                href="/reservation"
                className="group inline-flex items-center justify-center gap-2.5 px-10 py-4 rounded-full bg-[#C9A063] text-white font-semibold shadow-sm hover:bg-[#B8935A] active:scale-[0.98] transition-all duration-200"
              >
                Book a ride
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform duration-200" strokeWidth={2.5} />
              </Link>
              <Link
                href="/services"
                className="inline-flex items-center justify-center gap-2 px-9 py-4 border-2 border-white/60 text-white font-semibold rounded-xl hover:border-[#C9A063] hover:bg-white hover:text-gray-900 transition-all duration-300"
              >
                Our services
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
