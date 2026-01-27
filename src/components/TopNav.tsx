"use client";
import { Mail, Phone, Facebook, Instagram, Linkedin } from 'lucide-react';

const TopNav = () => {
  return (
    <div className="fixed top-0 left-0 right-0 z-[60] bg-black/90 backdrop-blur-xl border-b border-white/10">
      <div className="max-w-[1600px] mx-auto px-8">
        <div className="flex items-center justify-between h-[45px]">
          <div className="flex items-center gap-6">
            <a 
              href="mailto:info@luxride.com" 
              className="flex items-center gap-2 text-white/90 hover:text-[#C9A063] transition-all duration-300 group"
            >
              <div className="w-7 h-7 rounded-full bg-white/10 group-hover:bg-[#C9A063]/20 border border-white/10 group-hover:border-[#C9A063]/30 flex items-center justify-center transition-all duration-300 backdrop-blur-sm">
                <Mail className="w-3.5 h-3.5" strokeWidth={2} />
              </div>
              <span className="text-[13px] font-light tracking-wide">info@luxride.com</span>
            </a>
            
            <div className="hidden sm:block w-px h-4 bg-white/20"></div>
            
            <a 
              href="tel:+1800900122" 
              className="hidden sm:flex items-center gap-2 text-white/90 hover:text-[#C9A063] transition-all duration-300 group"
            >
              <div className="w-7 h-7 rounded-full bg-white/10 group-hover:bg-[#C9A063]/20 border border-white/10 group-hover:border-[#C9A063]/30 flex items-center justify-center transition-all duration-300 backdrop-blur-sm">
                <Phone className="w-3.5 h-3.5" strokeWidth={2} />
              </div>
              <span className="text-[13px] font-light tracking-wide">+1 (800) 900-122</span>
            </a>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-white/70 text-[12px] font-light tracking-wider hidden md:block">
              Available 24/7 • Premium Service
            </span>
            
            <div className="hidden sm:block w-px h-4 bg-white/20"></div>
            
            <div className="flex items-center gap-2">
              <a 
                href="https://facebook.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="group relative"
              >
                <div className="w-8 h-8 rounded-full bg-white/10 group-hover:bg-[#C9A063]/20 flex items-center justify-center transition-all duration-300 group-hover:scale-110 border border-white/10 group-hover:border-[#C9A063]/40 backdrop-blur-sm shadow-sm shadow-black/20">
                  <Facebook className="w-3.5 h-3.5 text-white/80 group-hover:text-[#C9A063] transition-all duration-300" strokeWidth={2} fill="currentColor" />
                </div>
              </a>
              
              <a 
                href="https://instagram.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="group relative"
              >
                <div className="w-8 h-8 rounded-full bg-white/10 group-hover:bg-[#C9A063]/20 flex items-center justify-center transition-all duration-300 group-hover:scale-110 border border-white/10 group-hover:border-[#C9A063]/40 backdrop-blur-sm shadow-sm shadow-black/20">
                  <Instagram className="w-3.5 h-3.5 text-white/80 group-hover:text-[#C9A063] transition-all duration-300" strokeWidth={2} />
                </div>
              </a>
              
              <a 
                href="https://linkedin.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="group relative"
              >
                <div className="w-8 h-8 rounded-full bg-white/10 group-hover:bg-[#C9A063]/20 flex items-center justify-center transition-all duration-300 group-hover:scale-110 border border-white/10 group-hover:border-[#C9A063]/40 backdrop-blur-sm shadow-sm shadow-black/20">
                  <Linkedin className="w-3.5 h-3.5 text-white/80 group-hover:text-[#C9A063] transition-all duration-300" strokeWidth={2} fill="currentColor" />
                </div>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TopNav;
