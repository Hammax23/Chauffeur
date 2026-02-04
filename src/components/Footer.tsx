"use client";
import Link from "next/link";
import Image from "next/image";
import { Crown, Instagram, Facebook, Linkedin } from 'lucide-react';

const Footer = () => {
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
        <div className="grid grid-cols-1 md:grid-cols-[1.5fr_1fr_1fr] gap-8 md:gap-12 lg:gap-16 py-10 sm:py-12 md:py-14 items-start">
          
          {/* Left Section - Brand */}
          <div className="space-y-5">
            {/* Logo with iOS effect */}
            <Link href="/" className="group block">
              <div className="relative inline-block">
                <div className="absolute inset-0 bg-[#C9A063]/20 rounded-lg blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <Image 
                  src="/logo1.png" 
                  alt="SARJ Worldwide Logo" 
                  width={160}
                  height={45}
                  className="h-[45px] w-auto relative z-10 group-hover:scale-105 transition-transform duration-300"
                  unoptimized
                />
              </div>
            </Link>
            
            {/* Description */}
            <p className="text-gray-400 text-[14px] leading-relaxed max-w-[280px] font-light">
              Premium rides crafted with elegance, reliability, and world-class service standards.
            </p>
          </div>

          {/* Middle Section - Navigation */}
          <div>
            <h3 className="text-white text-[13px] font-semibold mb-5 tracking-widest uppercase flex items-center gap-2">
              <div className="w-1 h-1 rounded-full bg-[#C9A063]"></div>
              Navigation
            </h3>
            <ul className="space-y-3">
              <li>
                <Link 
                  href="/" 
                  className="group inline-flex items-center gap-2 text-gray-400 text-[14px] font-light hover:text-[#C9A063] transition-all duration-300"
                >
                  <span className="w-0 h-[1px] bg-[#C9A063] group-hover:w-4 transition-all duration-300"></span>
                  Home
                </Link>
              </li>
              <li>
                <Link 
                  href="/about" 
                  className="group inline-flex items-center gap-2 text-gray-400 text-[14px] font-light hover:text-[#C9A063] transition-all duration-300"
                >
                  <span className="w-0 h-[1px] bg-[#C9A063] group-hover:w-4 transition-all duration-300"></span>
                  About
                </Link>
              </li>
              <li>
                <Link 
                  href="/fleet" 
                  className="group inline-flex items-center gap-2 text-gray-400 text-[14px] font-light hover:text-[#C9A063] transition-all duration-300"
                >
                  <span className="w-0 h-[1px] bg-[#C9A063] group-hover:w-4 transition-all duration-300"></span>
                  Fleet
                </Link>
              </li>
              <li>
                <Link 
                  href="/services" 
                  className="group inline-flex items-center gap-2 text-gray-400 text-[14px] font-light hover:text-[#C9A063] transition-all duration-300"
                >
                  <span className="w-0 h-[1px] bg-[#C9A063] group-hover:w-4 transition-all duration-300"></span>
                  Services
                </Link>
              </li>
              <li>
                <Link 
                  href="/quote" 
                  className="group inline-flex items-center gap-2 text-gray-400 text-[14px] font-light hover:text-[#C9A063] transition-all duration-300"
                >
                  <span className="w-0 h-[1px] bg-[#C9A063] group-hover:w-4 transition-all duration-300"></span>
                  Online Quote
                </Link>
              </li>
              <li>
                <Link 
                  href="/contact" 
                  className="group inline-flex items-center gap-2 text-gray-400 text-[14px] font-light hover:text-[#C9A063] transition-all duration-300"
                >
                  <span className="w-0 h-[1px] bg-[#C9A063] group-hover:w-4 transition-all duration-300"></span>
                  Contact
                </Link>
              </li>
              <li>
                <Link 
                  href="/reservation" 
                  className="group inline-flex items-center gap-2 text-gray-400 text-[14px] font-light hover:text-[#C9A063] transition-all duration-300"
                >
                  <span className="w-0 h-[1px] bg-[#C9A063] group-hover:w-4 transition-all duration-300"></span>
                  Online Reservation
                </Link>
              </li>
            </ul>
          </div>

          {/* Right Section - Social Media */}
          <div>
            <h3 className="text-white text-[13px] font-semibold mb-5 tracking-widest uppercase flex items-center gap-2">
              <div className="w-1 h-1 rounded-full bg-[#C9A063]"></div>
              Follow Us
            </h3>
            <div className="flex items-center gap-2.5">
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                className="group relative w-11 h-11 rounded-full border border-white/20 hover:border-[#C9A063]/60 bg-white/5 hover:bg-[#C9A063]/10 backdrop-blur-sm flex items-center justify-center transition-all duration-300 hover:scale-110 shadow-lg shadow-black/20 hover:shadow-[#C9A063]/20"
              >
                <div className="absolute inset-0 rounded-full bg-[#C9A063]/0 group-hover:bg-[#C9A063]/5 transition-all duration-300"></div>
                <Facebook className="w-[18px] h-[18px] text-white/80 group-hover:text-[#C9A063] transition-colors duration-300 relative z-10" strokeWidth={1.5} fill="currentColor" />
              </a>
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                className="group relative w-11 h-11 rounded-full border border-white/20 hover:border-[#C9A063]/60 bg-white/5 hover:bg-[#C9A063]/10 backdrop-blur-sm flex items-center justify-center transition-all duration-300 hover:scale-110 shadow-lg shadow-black/20 hover:shadow-[#C9A063]/20"
              >
                <div className="absolute inset-0 rounded-full bg-[#C9A063]/0 group-hover:bg-[#C9A063]/5 transition-all duration-300"></div>
                <Instagram className="w-[18px] h-[18px] text-white/80 group-hover:text-[#C9A063] transition-colors duration-300 relative z-10" strokeWidth={1.5} />
              </a>
              <a
                href="https://linkedin.com"
                target="_blank"
                rel="noopener noreferrer"
                className="group relative w-11 h-11 rounded-full border border-white/20 hover:border-[#C9A063]/60 bg-white/5 hover:bg-[#C9A063]/10 backdrop-blur-sm flex items-center justify-center transition-all duration-300 hover:scale-110 shadow-lg shadow-black/20 hover:shadow-[#C9A063]/20"
              >
                <div className="absolute inset-0 rounded-full bg-[#C9A063]/0 group-hover:bg-[#C9A063]/5 transition-all duration-300"></div>
                <Linkedin className="w-[18px] h-[18px] text-white/80 group-hover:text-[#C9A063] transition-colors duration-300 relative z-10" strokeWidth={1.5} fill="currentColor" />
              </a>
            </div>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="border-t border-white/10 py-5">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            {/* Copyright */}
            <p className="text-gray-400 text-[13px] font-light">
              © 2026 – All rights reserved by <span className="text-[#C9A063] font-normal">SARJ Worldwide</span>
            </p>

            {/* Links */}
            <div className="flex items-center gap-5">
              <a 
                href="#terms" 
                className="group relative text-gray-400 text-[13px] font-light hover:text-[#C9A063] transition-colors duration-300"
              >
                <span className="relative">
                  Terms of Service
                  <span className="absolute -bottom-1 left-0 w-0 h-[1px] bg-[#C9A063] group-hover:w-full transition-all duration-300"></span>
                </span>
              </a>
              <span className="text-gray-600 text-[13px]">•</span>
              <a 
                href="#privacy" 
                className="group relative text-gray-400 text-[13px] font-light hover:text-[#C9A063] transition-colors duration-300"
              >
                <span className="relative">
                  Privacy Policy
                  <span className="absolute -bottom-1 left-0 w-0 h-[1px] bg-[#C9A063] group-hover:w-full transition-all duration-300"></span>
                </span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
