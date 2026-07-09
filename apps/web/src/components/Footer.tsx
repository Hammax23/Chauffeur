"use client";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { Instagram, Facebook, Linkedin, Phone, Mail, MapPin } from 'lucide-react';
import { services as staticServices } from "@/data/services";

const HIDDEN_SLUGS = ["vip-transport", "intercity-travel", "luxury-fleet", "premium-services"];

const footerLinkClass =
  "group inline-flex items-center gap-2 text-gray-400 text-[13px] font-light hover:text-[#C9A063] transition-all duration-300";

const Footer = () => {
  const [footerServices, setFooterServices] = useState(
    staticServices
      .filter((s) => !HIDDEN_SLUGS.includes(s.slug))
      .map((s) => ({ slug: s.slug, title: s.title }))
  );

  useEffect(() => {
    fetch("/api/public/site-content")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data.services) && data.services.length > 0) {
          setFooterServices(
            data.services
              .filter((s: { slug: string }) => !HIDDEN_SLUGS.includes(s.slug))
              .map((s: { slug: string; title: string }) => ({ slug: s.slug, title: s.title }))
          );
        }
      })
      .catch(() => {});
  }, []);

  return (
    <footer className="relative bg-gradient-to-b from-[#0a0a0a] via-black to-[#0a0a0a] overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute inset-0 bg-gradient-to-r from-[#C9A063]/5 via-transparent to-[#C9A063]/5"></div>
      </div>

      {/* Top border with gradient */}
      <div className="border-t border-white/10"></div>
      
      <div className="max-w-[1400px] mx-auto px-6 sm:px-8 md:px-12 relative z-10">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 md:gap-8 lg:gap-10 py-4 sm:py-5 items-start">
          
          {/* Left Section - Brand */}
          <div className="space-y-3">
            {/* Logo with iOS effect */}
            <Link href="/" className="group block">
              <div className="relative inline-block">
                <div className="absolute inset-0 bg-[#C9A063]/20 rounded-lg blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <Image 
                  src="/logo1.png" 
                  alt="SARJ Worldwide Logo" 
                  width={150}
                  height={56}
                  className="h-10 sm:h-11 md:h-12 w-auto relative z-10 group-hover:scale-105 transition-transform duration-300"
                  unoptimized
                />
              </div>
            </Link>
            
            {/* Description */}
            <p className="text-gray-400 text-[13px] leading-relaxed max-w-[280px] font-light">
              Premier provider of executive transportation, specializing in airport transfers, special and corporate events.
            </p>
          </div>

          {/* Middle Section - Navigation */}
          <div>
            <h3 className="text-white text-[12px] font-semibold mb-3 tracking-widest uppercase flex items-center gap-2">
              <div className="w-1 h-1 rounded-full bg-[#C9A063]"></div>
              Quick Links
            </h3>
            <ul className="space-y-1">
              <li>
                <Link href="/" className={footerLinkClass}>
                  <span className="w-0 h-[1px] bg-[#C9A063] group-hover:w-4 transition-all duration-300"></span>
                  Home
                </Link>
              </li>
              <li>
                <Link href="/about" className={footerLinkClass}>
                  <span className="w-0 h-[1px] bg-[#C9A063] group-hover:w-4 transition-all duration-300"></span>
                  About
                </Link>
              </li>
              <li>
                <Link href="/fleet" className={footerLinkClass}>
                  <span className="w-0 h-[1px] bg-[#C9A063] group-hover:w-4 transition-all duration-300"></span>
                  Fleet
                </Link>
              </li>
              <li>
                <Link href="/news" className={footerLinkClass}>
                  <span className="w-0 h-[1px] bg-[#C9A063] group-hover:w-4 transition-all duration-300"></span>
                  Blog
                </Link>
              </li>
              <li>
                <Link href="/quote" className={footerLinkClass}>
                  <span className="w-0 h-[1px] bg-[#C9A063] group-hover:w-4 transition-all duration-300"></span>
                  Online Quote
                </Link>
              </li>
              <li>
                <Link href="/contact" className={footerLinkClass}>
                  <span className="w-0 h-[1px] bg-[#C9A063] group-hover:w-4 transition-all duration-300"></span>
                  Contact
                </Link>
              </li>
              <li>
                <Link href="/reservation" className={footerLinkClass}>
                  <span className="w-0 h-[1px] bg-[#C9A063] group-hover:w-4 transition-all duration-300"></span>
                  Online Reservation
                </Link>
              </li>
            </ul>
          </div>

          {/* Services */}
          <div>
            <h3 className="text-white text-[12px] font-semibold mb-3 tracking-widest uppercase flex items-center gap-2">
              <div className="w-1 h-1 rounded-full bg-[#C9A063]"></div>
              Services
            </h3>
            <ul className="space-y-1">
              <li>
                <Link href="/services" className={footerLinkClass}>
                  <span className="w-0 h-[1px] bg-[#C9A063] group-hover:w-4 transition-all duration-300"></span>
                  All Services
                </Link>
              </li>
              {footerServices.map((service) => (
                <li key={service.slug}>
                  <Link href={`/services/${service.slug}`} className={footerLinkClass}>
                    <span className="w-0 h-[1px] bg-[#C9A063] group-hover:w-4 transition-all duration-300"></span>
                    {service.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          {/* Right Section - Social Media */}
          <div>
            <h3 className="text-white text-[12px] font-semibold mb-3 tracking-widest uppercase flex items-center gap-2">
              <div className="w-1 h-1 rounded-full bg-[#C9A063]"></div>
              Follow Us
            </h3>
            <div className="flex items-center gap-2.5">
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                className="group relative w-9 h-9 rounded-full border border-white/20 hover:border-[#C9A063]/60 bg-white/5 hover:bg-[#C9A063]/10 backdrop-blur-sm flex items-center justify-center transition-all duration-300 hover:scale-110 shadow-lg shadow-black/20 hover:shadow-[#C9A063]/20"
              >
                <div className="absolute inset-0 rounded-full bg-[#C9A063]/0 group-hover:bg-[#C9A063]/5 transition-all duration-300"></div>
                <Facebook className="w-[18px] h-[18px] text-white/80 group-hover:text-[#C9A063] transition-colors duration-300 relative z-10" strokeWidth={1.5} fill="currentColor" />
              </a>
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                className="group relative w-9 h-9 rounded-full border border-white/20 hover:border-[#C9A063]/60 bg-white/5 hover:bg-[#C9A063]/10 backdrop-blur-sm flex items-center justify-center transition-all duration-300 hover:scale-110 shadow-lg shadow-black/20 hover:shadow-[#C9A063]/20"
              >
                <div className="absolute inset-0 rounded-full bg-[#C9A063]/0 group-hover:bg-[#C9A063]/5 transition-all duration-300"></div>
                <Instagram className="w-[18px] h-[18px] text-white/80 group-hover:text-[#C9A063] transition-colors duration-300 relative z-10" strokeWidth={1.5} />
              </a>
              <a
                href="https://linkedin.com"
                target="_blank"
                rel="noopener noreferrer"
                className="group relative w-9 h-9 rounded-full border border-white/20 hover:border-[#C9A063]/60 bg-white/5 hover:bg-[#C9A063]/10 backdrop-blur-sm flex items-center justify-center transition-all duration-300 hover:scale-110 shadow-lg shadow-black/20 hover:shadow-[#C9A063]/20"
              >
                <div className="absolute inset-0 rounded-full bg-[#C9A063]/0 group-hover:bg-[#C9A063]/5 transition-all duration-300"></div>
                <Linkedin className="w-[18px] h-[18px] text-white/80 group-hover:text-[#C9A063] transition-colors duration-300 relative z-10" strokeWidth={1.5} fill="currentColor" />
              </a>
            </div>

            {/* Contact details */}
            <div className="mt-5 sm:mt-6 space-y-3.5">
              <div className="group flex items-center gap-3">
                <div className="relative flex-shrink-0">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#C9A063] to-[#B8935A] flex items-center justify-center shadow-md shadow-[#C9A063]/20 group-hover:scale-105 transition-transform duration-300">
                    <Phone className="w-[15px] h-[15px] text-black" strokeWidth={2} />
                  </div>
                </div>
                <div>
                  <p className="text-white text-[14px] font-semibold mb-0.5">Phone Number</p>
                  <a href="tel:+14168935779" className="text-gray-400 text-[13px] font-light hover:text-[#C9A063] transition-colors">
                    416-893-5779
                  </a>
                </div>
              </div>

              <div className="group flex items-center gap-3">
                <div className="relative flex-shrink-0">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#C9A063] to-[#B8935A] flex items-center justify-center shadow-md shadow-[#C9A063]/20 group-hover:scale-105 transition-transform duration-300">
                    <Mail className="w-[15px] h-[15px] text-black" strokeWidth={2} />
                  </div>
                </div>
                <div>
                  <p className="text-white text-[14px] font-semibold mb-0.5">Write to us</p>
                  <a href="mailto:reserve@sarjworldwide.ca" className="text-gray-400 text-[13px] font-light hover:text-[#C9A063] transition-colors break-all">
                    reserve@sarjworldwide.ca
                  </a>
                </div>
              </div>

              <div className="group flex items-start gap-3">
                <div className="relative flex-shrink-0">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#C9A063] to-[#B8935A] flex items-center justify-center shadow-md shadow-[#C9A063]/20 group-hover:scale-105 transition-transform duration-300">
                    <MapPin className="w-[15px] h-[15px] text-black" strokeWidth={2} />
                  </div>
                </div>
                <div>
                  <p className="text-white text-[14px] font-semibold mb-0.5">Address</p>
                  <p className="text-gray-400 text-[13px] font-light leading-relaxed">
                    231 Oak Park Blvd, Oakville, ON L6H 7S8
                  </p>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="border-t border-white/10 py-2.5">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            {/* Copyright */}
            <p className="text-gray-400 text-[13px] font-light">
              © 2026 – All rights reserved by <span className="text-[#C9A063] font-normal">SARJ Worldwide</span>
            </p>

            {/* Links */}
            <div className="flex items-center gap-5">
              <Link 
                href="/terms-of-service" 
                className="group relative text-gray-400 text-[13px] font-light hover:text-[#C9A063] transition-colors duration-300"
              >
                <span className="relative">
                  Terms of Service
                  <span className="absolute -bottom-1 left-0 w-0 h-[1px] bg-[#C9A063] group-hover:w-full transition-all duration-300"></span>
                </span>
              </Link>
              <span className="text-gray-600 text-[13px]">•</span>
              <Link 
                href="/privacy-policy" 
                className="group relative text-gray-400 text-[13px] font-light hover:text-[#C9A063] transition-colors duration-300"
              >
                <span className="relative">
                  Privacy Policy
                  <span className="absolute -bottom-1 left-0 w-0 h-[1px] bg-[#C9A063] group-hover:w-full transition-all duration-300"></span>
                </span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
