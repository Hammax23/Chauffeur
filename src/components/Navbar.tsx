"use client";
import Link from "next/link";
import { Search, Phone, ChevronDown, Menu, X, Plane, Briefcase, MapPin, Clock, Heart, Camera, Shield, Car, Sparkles, Headphones } from 'lucide-react';
import { useState, useEffect } from 'react';
import { services, type ServiceIconKey } from '@/data/services';

const iconMap: Record<ServiceIconKey, React.ElementType> = {
  Plane, Briefcase, MapPin, Clock, Heart, Camera, Shield, Car, Sparkles, Headphones,
};

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [servicesOpen, setServicesOpen] = useState(false);
  const [mobileServicesOpen, setMobileServicesOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav className={`fixed top-[45px] left-0 right-0 z-50 transition-all duration-700 ease-out ${
      scrolled 
        ? 'bg-black/70 backdrop-blur-2xl shadow-[0_8px_32px_rgba(0,0,0,0.4)] border-b border-white/5' 
        : 'bg-black/60 backdrop-blur-xl'
    }`}>
      <div className="max-w-[1600px] mx-auto px-8">
        <div className="flex items-center justify-between h-[85px] md:h-[100px]">
          <div className="flex items-center gap-12">
            <Link href="/" className="flex items-center">
              <img 
                src="/logo1.png" 
                alt="SARJ Worldwide Chauffeur Services Logo" 
                className="h-[50px] sm:h-[50px] w-auto object-contain drop-shadow-lg"
              />
            </Link>

            <div className="hidden lg:flex items-center gap-1">
              <Link href="/" className="text-white/90 px-5 py-2.5 text-[15px] font-normal hover:text-[#C9A063] hover:bg-white/5 hover:backdrop-blur-sm rounded-xl transition-all duration-300 whitespace-nowrap">
                HOME
              </Link>
              
              <Link href="/about" className="text-white/90 px-5 py-2.5 text-[15px] font-normal hover:text-[#C9A063] hover:bg-white/5 hover:backdrop-blur-sm rounded-xl transition-all duration-300 whitespace-nowrap">
                ABOUT
              </Link>
              
              <Link href="/fleet" className="text-white/90 px-5 py-2.5 text-[15px] font-normal hover:text-[#C9A063] hover:bg-white/5 hover:backdrop-blur-sm rounded-xl transition-all duration-300 whitespace-nowrap">
                FLEET
              </Link>
              
              <div className="relative"
                onMouseEnter={() => setServicesOpen(true)}
                onMouseLeave={() => setServicesOpen(false)}
              >
                <button className="flex items-center gap-1 text-white/90 px-5 py-2.5 text-[15px] font-normal hover:text-[#C9A063] hover:bg-white/5 hover:backdrop-blur-sm rounded-xl transition-all duration-300 whitespace-nowrap group">
                  <span>SERVICES</span>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-300 ${servicesOpen ? 'rotate-180' : ''}`} strokeWidth={2.5} />
                </button>

                {servicesOpen && (
                  <div className="absolute top-full left-1/2 -translate-x-1/2 pt-4 w-[920px]">
                    <div className="relative">
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-6 h-6 bg-gradient-to-br from-white/95 to-white/90 backdrop-blur-2xl rotate-45 z-10 shadow-lg"></div>
                      <div className="absolute -top-[11px] left-1/2 -translate-x-1/2 w-6 h-6 bg-white/20 backdrop-blur-sm rotate-45 z-[9]"></div>
                    <div className="relative bg-white/90 backdrop-blur-3xl rounded-3xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.4)] border border-white/30 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-500">
                    <div className="grid grid-cols-2 divide-x divide-gray-100/50">
                      <div className="p-10 space-y-3">
                        {services.slice(0, 5).map((s) => {
                          const Icon = iconMap[s.icon];
                          return (
                            <Link key={s.slug} href={`/services/${s.slug}`} className="block group/item hover:bg-white/70 hover:backdrop-blur-sm p-4 rounded-2xl transition-all duration-500 cursor-pointer border border-transparent hover:border-white/40 hover:shadow-[0_8px_30px_rgba(0,0,0,0.12)]">
                              <div className="flex items-start gap-4">
                                <div className="w-12 h-12 bg-gradient-to-br from-gray-700 to-gray-800 group-hover/item:from-[#C9A063] group-hover/item:to-[#A68B5B] rounded-xl flex items-center justify-center flex-shrink-0 shadow-md shadow-gray-800/15 group-hover/item:shadow-[#C9A063]/30 group-hover/item:scale-110 transition-all duration-500">
                                  <Icon className="w-6 h-6 text-white" strokeWidth={1.5} />
                                </div>
                                <div className="flex-1">
                                  <h3 className="text-gray-900 font-semibold text-[15px] mb-1.5 tracking-tight">{s.title}</h3>
                                  <p className="text-gray-600 text-[12px] leading-relaxed font-light">{s.shortDesc}</p>
                                </div>
                              </div>
                            </Link>
                          );
                        })}
                      </div>
                      <div className="p-10 space-y-3 bg-gradient-to-br from-gray-50/50 to-white/30">
                        {services.slice(5, 10).map((s) => {
                          const Icon = iconMap[s.icon];
                          return (
                            <Link key={s.slug} href={`/services/${s.slug}`} className="block group/item hover:bg-white/70 hover:backdrop-blur-sm p-4 rounded-2xl transition-all duration-500 cursor-pointer border border-transparent hover:border-white/40 hover:shadow-[0_8px_30px_rgba(0,0,0,0.12)]">
                              <div className="flex items-start gap-4">
                                <div className="w-12 h-12 bg-gradient-to-br from-gray-700 to-gray-800 group-hover/item:from-[#C9A063] group-hover/item:to-[#A68B5B] rounded-xl flex items-center justify-center flex-shrink-0 shadow-md shadow-gray-800/15 group-hover/item:shadow-[#C9A063]/30 group-hover/item:scale-110 transition-all duration-500">
                                  <Icon className="w-6 h-6 text-white" strokeWidth={1.5} />
                                </div>
                                <div className="flex-1">
                                  <h3 className="text-gray-900 font-semibold text-[15px] mb-1.5 tracking-tight">{s.title}</h3>
                                  <p className="text-gray-600 text-[12px] leading-relaxed font-light">{s.shortDesc}</p>
                                </div>
                              </div>
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                    </div>
                    </div>
                  </div>
                )}
              </div>
              
              <Link href="/news" className="text-white/90 px-5 py-2.5 text-[15px] font-normal hover:text-[#C9A063] hover:bg-white/5 hover:backdrop-blur-sm rounded-xl transition-all duration-300 whitespace-nowrap">
                NEWS
              </Link>
              
              <Link href="/quote" className="text-white/90 px-5 py-2.5 text-[15px] font-normal hover:text-[#C9A063] hover:bg-white/5 hover:backdrop-blur-sm rounded-xl transition-all duration-300 whitespace-nowrap">
                ONLINE QUOTE
              </Link>
              
              <Link href="/contact" className="text-white/90 px-5 py-2.5 text-[15px] font-normal hover:text-[#C9A063] hover:bg-white/5 hover:backdrop-blur-sm rounded-xl transition-all duration-300 whitespace-nowrap">
                CONTACT
              </Link>
              
              <Link href="/quote" className="text-white/90 px-5 py-2.5 text-[15px] font-normal hover:text-[#C9A063] hover:bg-white/5 hover:backdrop-blur-sm rounded-xl transition-all duration-300 whitespace-nowrap">
                ONLINE RESERVATION
              </Link>
            </div>
          </div>

          <div className="hidden lg:flex items-center gap-4">
            {/* <button className="text-white hover:bg-white/10 p-2 rounded-lg transition-all duration-300 hover:scale-110">
              <Search className="w-5 h-5" strokeWidth={2} />
            </button> */}
            
            {/* <div className="flex items-center gap-1.5 text-white whitespace-nowrap px-3 py-2 rounded-lg hover:bg-white/10 transition-all duration-300 cursor-pointer">
              <Phone className="w-[17px] h-[17px]" strokeWidth={2} />
              <span className="text-[16px] font-medium">+1800900122</span>
            </div> */}
            
            {/* <button className="flex items-center gap-1.5 text-white text-[16px] font-medium hover:bg-white/10 px-3 py-2 rounded-lg transition-all duration-300 whitespace-nowrap">
              <div className="w-6 h-4 rounded-sm overflow-hidden shadow-md">
                <img
                  src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 60 30'%3E%3Crect width='60' height='30' fill='%23012169'/%3E%3Cpath d='M0,0 L60,30 M60,0 L0,30' stroke='%23FFF' stroke-width='6'/%3E%3Cpath d='M0,0 L60,30 M60,0 L0,30' stroke='%23C8102E' stroke-width='4' clip-path='inset(0)'/%3E%3Cpath d='M30,0 v30 M0,15 h60' stroke='%23FFF' stroke-width='10'/%3E%3Cpath d='M30,0 v30 M0,15 h60' stroke='%23C8102E' stroke-width='6'/%3E%3C/svg%3E"
                  alt="UK Flag"
                  className="w-full h-full object-cover"
                />
              </div>
              <span>En</span>
              <ChevronDown className="w-3.5 h-3.5" strokeWidth={2.5} />
            </button> */}
            
            <button className="text-white/90 px-6 py-2.5 text-[16px] font-medium hover:bg-white/5 hover:backdrop-blur-sm rounded-xl transition-all duration-300 whitespace-nowrap border border-transparent hover:border-white/20">
              Login
            </button>
            
            <button className="bg-gradient-to-r from-white to-gray-100 text-black px-7 py-2.5 rounded-full text-[16px] font-semibold hover:from-gray-100 hover:to-white hover:scale-105 transition-all duration-300 whitespace-nowrap shadow-[0_4px_20px_rgba(255,255,255,0.3)] hover:shadow-[0_6px_30px_rgba(255,255,255,0.4)]">
              Register
            </button>
          </div>

          <button
            className="lg:hidden text-white"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {isMenuOpen && (
        <div className="lg:hidden bg-black border-t border-gray-800 max-h-[calc(100vh-110px)] overflow-y-auto overflow-x-hidden overscroll-contain touch-pan-y">
          <div className="px-4 pt-2 pb-[calc(4rem+env(safe-area-inset-bottom,0px))] space-y-2 min-h-0">
            <Link href="/" onClick={() => setIsMenuOpen(false)} className="block w-full text-white px-4 py-2.5 text-sm font-medium text-left">
              HOME
            </Link>
            
            <Link href="/about" onClick={() => setIsMenuOpen(false)} className="block w-full text-white px-4 py-2.5 text-sm font-medium text-left">
              ABOUT
            </Link>
            
            <Link href="/fleet" onClick={() => setIsMenuOpen(false)} className="block w-full text-white px-4 py-2.5 text-sm font-medium text-left">
              FLEET
            </Link>
            
            <div className="border-b border-white/10 pb-5">
              <button 
                className="flex items-center justify-between w-full text-white px-4 py-3 text-sm font-semibold tracking-wide rounded-xl hover:bg-white/5 active:bg-white/10 transition-colors duration-200"
                onClick={() => setMobileServicesOpen(!mobileServicesOpen)}
                aria-expanded={mobileServicesOpen}
                aria-haspopup="true"
              >
                <span>SERVICES</span>
                <ChevronDown className={`w-4 h-4 transition-transform duration-300 flex-shrink-0 ml-2 ${mobileServicesOpen ? 'rotate-180' : ''}`} strokeWidth={2.5} />
              </button>
              
              <div 
                className={`overflow-hidden transition-all duration-300 ease-out ${mobileServicesOpen ? 'max-h-[min(58vh,620px)] opacity-100 mt-2' : 'max-h-0 opacity-0 mt-0'}`}
                role="region"
                aria-label="Services menu"
              >
                <div className={`space-y-1.5 pl-1 pr-2 pb-6 ${mobileServicesOpen ? 'max-h-[min(54vh,580px)] overflow-y-auto overscroll-contain' : ''}`}>
                  {services.map((s) => {
                    const Icon = iconMap[s.icon];
                    return (
                      <Link
                        key={s.slug}
                        href={`/services/${s.slug}`}
                        onClick={() => setMobileServicesOpen(false)}
                        className="flex items-center gap-3 py-3 px-3 rounded-xl bg-white/5 hover:bg-white/10 active:bg-white/15 border border-white/10 hover:border-[#C9A063]/40 transition-all duration-200 group"
                      >
                        <div className="w-10 h-10 flex-shrink-0 bg-gradient-to-br from-gray-700 to-gray-800 group-hover:from-[#C9A063] group-hover:to-[#A68B5B] rounded-xl flex items-center justify-center shadow-md transition-all duration-200">
                          <Icon className="w-5 h-5 text-white" strokeWidth={1.5} />
                        </div>
                        <span className="text-white text-[13px] font-medium leading-snug flex-1 min-w-0">{s.title}</span>
                        <ChevronDown className="w-4 h-4 text-white/50 -rotate-90 flex-shrink-0 group-hover:text-[#C9A063] transition-colors" strokeWidth={2} />
                      </Link>
                    );
                  })}
                  <Link
                    href="/services"
                    onClick={() => setMobileServicesOpen(false)}
                    className="flex items-center justify-center gap-2 py-3 px-3 rounded-xl bg-[#C9A063]/20 hover:bg-[#C9A063]/30 border border-[#C9A063]/30 text-[#C9A063] text-[13px] font-semibold mt-3 transition-all duration-200"
                  >
                    View all services
                    <ChevronDown className="w-4 h-4 -rotate-90" strokeWidth={2} />
                  </Link>
                </div>
              </div>
            </div>
            
            <Link href="/news" onClick={() => setIsMenuOpen(false)} className="block w-full text-white px-4 py-2.5 text-sm font-medium text-left">
              NEWS
            </Link>
            
            <Link href="/quote" onClick={() => setIsMenuOpen(false)} className="block w-full text-white px-4 py-2.5 text-sm font-medium text-left">
              ONLINE QUOTE
            </Link>
            
            <Link href="/contact" onClick={() => setIsMenuOpen(false)} className="block w-full text-white px-4 py-2.5 text-sm font-medium text-left">
              CONTACT
            </Link>
            
            <Link href="/quote" onClick={() => setIsMenuOpen(false)} className="block w-full text-white px-4 py-2.5 text-sm font-medium text-left">
              ONLINE RESERVATION
            </Link>

            <div className="pt-3 mt-3 pb-2 border-t border-gray-800 space-y-2">
              <div className="flex items-center gap-2 text-white px-4">
                <Phone className="w-4 h-4" />
                <span className="text-sm">+1800900122</span>
              </div>
              
              <button className="w-full text-white px-4 py-2.5 text-sm font-medium">
                Login
              </button>
              
              <button className="w-full bg-white text-black px-4 py-2.5 rounded-md text-sm font-semibold">
                Sign Up
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
