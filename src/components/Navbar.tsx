"use client";
import { Search, Phone, ChevronDown, Menu, X, Plane, Briefcase, MapPin, Clock, Heart, Camera, Shield, Car, Sparkles, Headphones } from 'lucide-react';
import { useState, useEffect } from 'react';

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
        <div className="flex items-center justify-between h-[85px]">
          <div className="flex items-center gap-12">
            <div className="flex items-center">
              <img 
                src="/logo.png" 
                alt="LuxRide Logo" 
                className="h-[70px] sm:h-[90px] w-auto lg:w-[200px] object-contain drop-shadow-lg"
              />
            </div>

            <div className="hidden lg:flex items-center gap-1">
              <button className="text-white/90 px-5 py-2.5 text-[15px] font-normal hover:text-[#C9A063] hover:bg-white/5 hover:backdrop-blur-sm rounded-xl transition-all duration-300 whitespace-nowrap">
                HOME
              </button>
              
              <button className="text-white/90 px-5 py-2.5 text-[15px] font-normal hover:text-[#C9A063] hover:bg-white/5 hover:backdrop-blur-sm rounded-xl transition-all duration-300 whitespace-nowrap">
                ABOUT
              </button>
              
              <button className="text-white/90 px-5 py-2.5 text-[15px] font-normal hover:text-[#C9A063] hover:bg-white/5 hover:backdrop-blur-sm rounded-xl transition-all duration-300 whitespace-nowrap">
                FLEET
              </button>
              
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
                        <div className="group/item hover:bg-white/70 hover:backdrop-blur-sm p-4 rounded-2xl transition-all duration-500 cursor-pointer border border-transparent hover:border-white/40 hover:shadow-[0_8px_30px_rgba(0,0,0,0.12)]">
                          <div className="flex items-start gap-4">
                            <div className="w-12 h-12 bg-gradient-to-br from-gray-700 to-gray-800 group-hover/item:from-[#C9A063] group-hover/item:to-[#A68B5B] rounded-xl flex items-center justify-center flex-shrink-0 shadow-md shadow-gray-800/15 group-hover/item:shadow-[#C9A063]/30 group-hover/item:scale-110 transition-all duration-500">
                              <Plane className="w-6 h-6 text-white" strokeWidth={1.5} />
                            </div>
                            <div className="flex-1">
                              <h3 className="text-gray-900 font-semibold text-[15px] mb-1.5 tracking-tight">Airport Transfer Services</h3>
                              <p className="text-gray-600 text-[12px] leading-relaxed font-light">Pickup & drop-off, flight tracking, meet & greet</p>
                            </div>
                          </div>
                        </div>

                        <div className="group/item hover:bg-white/70 hover:backdrop-blur-sm p-4 rounded-2xl transition-all duration-500 cursor-pointer border border-transparent hover:border-white/40 hover:shadow-[0_8px_30px_rgba(0,0,0,0.12)]">
                          <div className="flex items-start gap-4">
                            <div className="w-12 h-12 bg-gradient-to-br from-gray-700 to-gray-800 group-hover/item:from-[#C9A063] group-hover/item:to-[#A68B5B] rounded-xl flex items-center justify-center flex-shrink-0 shadow-md shadow-gray-800/15 group-hover/item:shadow-[#C9A063]/30 group-hover/item:scale-110 transition-all duration-500">
                              <Briefcase className="w-6 h-6 text-white" strokeWidth={1.5} />
                            </div>
                            <div className="flex-1">
                              <h3 className="text-gray-900 font-semibold text-[15px] mb-1.5 tracking-tight">Corporate / Business Travel</h3>
                              <p className="text-gray-600 text-[12px] leading-relaxed font-light">Executive chauffeur for meetings & conferences</p>
                            </div>
                          </div>
                        </div>

                        <div className="group/item hover:bg-white/70 hover:backdrop-blur-sm p-4 rounded-2xl transition-all duration-500 cursor-pointer border border-transparent hover:border-white/40 hover:shadow-[0_8px_30px_rgba(0,0,0,0.12)]">
                          <div className="flex items-start gap-4">
                            <div className="w-12 h-12 bg-gradient-to-br from-gray-700 to-gray-800 group-hover/item:from-[#C9A063] group-hover/item:to-[#A68B5B] rounded-xl flex items-center justify-center flex-shrink-0 shadow-md shadow-gray-800/15 group-hover/item:shadow-[#C9A063]/30 group-hover/item:scale-110 transition-all duration-500">
                              <MapPin className="w-6 h-6 text-white" strokeWidth={1.5} />
                            </div>
                            <div className="flex-1">
                              <h3 className="text-gray-900 font-semibold text-[15px] mb-1.5 tracking-tight">Point-to-Point Transfers</h3>
                              <p className="text-gray-600 text-[12px] leading-relaxed font-light">Luxury rides between hotels, offices & restaurants</p>
                            </div>
                          </div>
                        </div>

                        <div className="group/item hover:bg-white/70 hover:backdrop-blur-sm p-4 rounded-2xl transition-all duration-500 cursor-pointer border border-transparent hover:border-white/40 hover:shadow-[0_8px_30px_rgba(0,0,0,0.12)]">
                          <div className="flex items-start gap-4">
                            <div className="w-12 h-12 bg-gradient-to-br from-gray-700 to-gray-800 group-hover/item:from-[#C9A063] group-hover/item:to-[#A68B5B] rounded-xl flex items-center justify-center flex-shrink-0 shadow-md shadow-gray-800/15 group-hover/item:shadow-[#C9A063]/30 group-hover/item:scale-110 transition-all duration-500">
                              <Clock className="w-6 h-6 text-white" strokeWidth={1.5} />
                            </div>
                            <div className="flex-1">
                              <h3 className="text-gray-900 font-semibold text-[15px] mb-1.5 tracking-tight">Hourly / As-Directed Chauffeur</h3>
                              <p className="text-gray-600 text-[12px] leading-relaxed font-light">Flexible booking with multiple stops</p>
                            </div>
                          </div>
                        </div>

                        <div className="group/item hover:bg-white/70 hover:backdrop-blur-sm p-4 rounded-2xl transition-all duration-500 cursor-pointer border border-transparent hover:border-white/40 hover:shadow-[0_8px_30px_rgba(0,0,0,0.12)]">
                          <div className="flex items-start gap-4">
                            <div className="w-12 h-12 bg-gradient-to-br from-gray-700 to-gray-800 group-hover/item:from-[#C9A063] group-hover/item:to-[#A68B5B] rounded-xl flex items-center justify-center flex-shrink-0 shadow-md shadow-gray-800/15 group-hover/item:shadow-[#C9A063]/30 group-hover/item:scale-110 transition-all duration-500">
                              <Heart className="w-6 h-6 text-white" strokeWidth={1.5} />
                            </div>
                            <div className="flex-1">
                              <h3 className="text-gray-900 font-semibold text-[15px] mb-1.5 tracking-tight">Wedding & Special Events</h3>
                              <p className="text-gray-600 text-[12px] leading-relaxed font-light">Wedding cars, VIP transport, red carpet arrivals</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="p-10 space-y-3 bg-gradient-to-br from-gray-50/50 to-white/30">
                        <div className="group/item hover:bg-white/70 hover:backdrop-blur-sm p-4 rounded-2xl transition-all duration-500 cursor-pointer border border-transparent hover:border-white/40 hover:shadow-[0_8px_30px_rgba(0,0,0,0.12)]">
                          <div className="flex items-start gap-4">
                            <div className="w-12 h-12 bg-gradient-to-br from-gray-700 to-gray-800 group-hover/item:from-[#C9A063] group-hover/item:to-[#A68B5B] rounded-xl flex items-center justify-center flex-shrink-0 shadow-md shadow-gray-800/15 group-hover/item:shadow-[#C9A063]/30 group-hover/item:scale-110 transition-all duration-500">
                              <Camera className="w-6 h-6 text-white" strokeWidth={1.5} />
                            </div>
                            <div className="flex-1">
                              <h3 className="text-gray-900 font-semibold text-[15px] mb-1.5 tracking-tight">City Tours & Sightseeing</h3>
                              <p className="text-gray-600 text-[12px] leading-relaxed font-light">Guided luxury tours with flexible packages</p>
                            </div>
                          </div>
                        </div>

                        <div className="group/item hover:bg-white/70 hover:backdrop-blur-sm p-4 rounded-2xl transition-all duration-500 cursor-pointer border border-transparent hover:border-white/40 hover:shadow-[0_8px_30px_rgba(0,0,0,0.12)]">
                          <div className="flex items-start gap-4">
                            <div className="w-12 h-12 bg-gradient-to-br from-gray-700 to-gray-800 group-hover/item:from-[#C9A063] group-hover/item:to-[#A68B5B] rounded-xl flex items-center justify-center flex-shrink-0 shadow-md shadow-gray-800/15 group-hover/item:shadow-[#C9A063]/30 group-hover/item:scale-110 transition-all duration-500">
                              <Shield className="w-6 h-6 text-white" strokeWidth={1.5} />
                            </div>
                            <div className="flex-1">
                              <h3 className="text-gray-900 font-semibold text-[15px] mb-1.5 tracking-tight">VIP & Celebrity Transport</h3>
                              <p className="text-gray-600 text-[12px] leading-relaxed font-light">Discreet service with privacy & security focus</p>
                            </div>
                          </div>
                        </div>

                        <div className="group/item hover:bg-white/70 hover:backdrop-blur-sm p-4 rounded-2xl transition-all duration-500 cursor-pointer border border-transparent hover:border-white/40 hover:shadow-[0_8px_30px_rgba(0,0,0,0.12)]">
                          <div className="flex items-start gap-4">
                            <div className="w-12 h-12 bg-gradient-to-br from-gray-700 to-gray-800 group-hover/item:from-[#C9A063] group-hover/item:to-[#A68B5B] rounded-xl flex items-center justify-center flex-shrink-0 shadow-md shadow-gray-800/15 group-hover/item:shadow-[#C9A063]/30 group-hover/item:scale-110 transition-all duration-500">
                              <Car className="w-6 h-6 text-white" strokeWidth={1.5} />
                            </div>
                            <div className="flex-1">
                              <h3 className="text-gray-900 font-semibold text-[15px] mb-1.5 tracking-tight">Long-Distance / Intercity Travel</h3>
                              <p className="text-gray-600 text-[12px] leading-relaxed font-light">Comfortable door-to-door luxury rides</p>
                            </div>
                          </div>
                        </div>

                        <div className="group/item hover:bg-white/70 hover:backdrop-blur-sm p-4 rounded-2xl transition-all duration-500 cursor-pointer border border-transparent hover:border-white/40 hover:shadow-[0_8px_30px_rgba(0,0,0,0.12)]">
                          <div className="flex items-start gap-4">
                            <div className="w-12 h-12 bg-gradient-to-br from-gray-700 to-gray-800 group-hover/item:from-[#C9A063] group-hover/item:to-[#A68B5B] rounded-xl flex items-center justify-center flex-shrink-0 shadow-md shadow-gray-800/15 group-hover/item:shadow-[#C9A063]/30 group-hover/item:scale-110 transition-all duration-500">
                              <Sparkles className="w-6 h-6 text-white" strokeWidth={1.5} />
                            </div>
                            <div className="flex-1">
                              <h3 className="text-gray-900 font-semibold text-[15px] mb-1.5 tracking-tight">Luxury Fleet Options</h3>
                              <p className="text-gray-600 text-[12px] leading-relaxed font-light">Mercedes, BMW, Range Rover & Limousines</p>
                            </div>
                          </div>
                        </div>

                        <div className="group/item hover:bg-white/70 hover:backdrop-blur-sm p-4 rounded-2xl transition-all duration-500 cursor-pointer border border-transparent hover:border-white/40 hover:shadow-[0_8px_30px_rgba(0,0,0,0.12)]">
                          <div className="flex items-start gap-4">
                            <div className="w-12 h-12 bg-gradient-to-br from-gray-700 to-gray-800 group-hover/item:from-[#C9A063] group-hover/item:to-[#A68B5B] rounded-xl flex items-center justify-center flex-shrink-0 shadow-md shadow-gray-800/15 group-hover/item:shadow-[#C9A063]/30 group-hover/item:scale-110 transition-all duration-500">
                              <Headphones className="w-6 h-6 text-white" strokeWidth={1.5} />
                            </div>
                            <div className="flex-1">
                              <h3 className="text-gray-900 font-semibold text-[15px] mb-1.5 tracking-tight">Premium Services</h3>
                              <p className="text-gray-600 text-[12px] leading-relaxed font-light">WiFi, refreshments, child seats, 24/7 support</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    </div>
                    </div>
                  </div>
                )}
              </div>
              
              <button className="text-white/90 px-5 py-2.5 text-[15px] font-normal hover:text-[#C9A063] hover:bg-white/5 hover:backdrop-blur-sm rounded-xl transition-all duration-300 whitespace-nowrap">
                NEWS
              </button>
              
              <button className="text-white/90 px-5 py-2.5 text-[15px] font-normal hover:text-[#C9A063] hover:bg-white/5 hover:backdrop-blur-sm rounded-xl transition-all duration-300 whitespace-nowrap">
                PARTNERS
              </button>
              
              <button className="text-white/90 px-5 py-2.5 text-[15px] font-normal hover:text-[#C9A063] hover:bg-white/5 hover:backdrop-blur-sm rounded-xl transition-all duration-300 whitespace-nowrap">
                CONTACT
              </button>
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
        <div className="lg:hidden bg-black border-t border-gray-800">
          <div className="px-4 pt-2 pb-4 space-y-2">
            <button className="w-full text-white px-4 py-2.5 text-sm font-medium text-left">
              HOME
            </button>
            
            <button className="w-full text-white px-4 py-2.5 text-sm font-medium text-left">
              ABOUT
            </button>
            
            <button className="w-full text-white px-4 py-2.5 text-sm font-medium text-left">
              FLEET
            </button>
            
            <div>
              <button 
                className="flex items-center justify-between w-full text-white px-4 py-2.5 text-sm font-medium"
                onClick={() => setMobileServicesOpen(!mobileServicesOpen)}
              >
                <span>SERVICES</span>
                <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${mobileServicesOpen ? 'rotate-180' : ''}`} />
              </button>
              
              {mobileServicesOpen && (
                <div className="mt-3 space-y-1 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-lg rounded-2xl p-4 border border-white/20 shadow-xl">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col items-center gap-2 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all duration-300 cursor-pointer border border-white/10">
                      <div className="w-10 h-10 bg-gradient-to-br from-gray-700 to-gray-800 rounded-xl flex items-center justify-center shadow-lg">
                        <Plane className="w-5 h-5 text-white" strokeWidth={1.5} />
                      </div>
                      <span className="text-white text-[10px] font-medium text-center leading-tight">Airport Transfer</span>
                    </div>
                    
                    <div className="flex flex-col items-center gap-2 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all duration-300 cursor-pointer border border-white/10">
                      <div className="w-10 h-10 bg-gradient-to-br from-gray-700 to-gray-800 rounded-xl flex items-center justify-center shadow-lg">
                        <Briefcase className="w-5 h-5 text-white" strokeWidth={1.5} />
                      </div>
                      <span className="text-white text-[10px] font-medium text-center leading-tight">Corporate Travel</span>
                    </div>
                    
                    <div className="flex flex-col items-center gap-2 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all duration-300 cursor-pointer border border-white/10">
                      <div className="w-10 h-10 bg-gradient-to-br from-gray-700 to-gray-800 rounded-xl flex items-center justify-center shadow-lg">
                        <MapPin className="w-5 h-5 text-white" strokeWidth={1.5} />
                      </div>
                      <span className="text-white text-[10px] font-medium text-center leading-tight">Point-to-Point</span>
                    </div>
                    
                    <div className="flex flex-col items-center gap-2 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all duration-300 cursor-pointer border border-white/10">
                      <div className="w-10 h-10 bg-gradient-to-br from-gray-700 to-gray-800 rounded-xl flex items-center justify-center shadow-lg">
                        <Clock className="w-5 h-5 text-white" strokeWidth={1.5} />
                      </div>
                      <span className="text-white text-[10px] font-medium text-center leading-tight">Hourly Chauffeur</span>
                    </div>
                    
                    <div className="flex flex-col items-center gap-2 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all duration-300 cursor-pointer border border-white/10">
                      <div className="w-10 h-10 bg-gradient-to-br from-gray-700 to-gray-800 rounded-xl flex items-center justify-center shadow-lg">
                        <Heart className="w-5 h-5 text-white" strokeWidth={1.5} />
                      </div>
                      <span className="text-white text-[10px] font-medium text-center leading-tight">Wedding & Events</span>
                    </div>
                    
                    <div className="flex flex-col items-center gap-2 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all duration-300 cursor-pointer border border-white/10">
                      <div className="w-10 h-10 bg-gradient-to-br from-gray-700 to-gray-800 rounded-xl flex items-center justify-center shadow-lg">
                        <Camera className="w-5 h-5 text-white" strokeWidth={1.5} />
                      </div>
                      <span className="text-white text-[10px] font-medium text-center leading-tight">City Tours</span>
                    </div>
                    
                    <div className="flex flex-col items-center gap-2 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all duration-300 cursor-pointer border border-white/10">
                      <div className="w-10 h-10 bg-gradient-to-br from-gray-700 to-gray-800 rounded-xl flex items-center justify-center shadow-lg">
                        <Shield className="w-5 h-5 text-white" strokeWidth={1.5} />
                      </div>
                      <span className="text-white text-[10px] font-medium text-center leading-tight">VIP Transport</span>
                    </div>
                    
                    <div className="flex flex-col items-center gap-2 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all duration-300 cursor-pointer border border-white/10">
                      <div className="w-10 h-10 bg-gradient-to-br from-gray-700 to-gray-800 rounded-xl flex items-center justify-center shadow-lg">
                        <Car className="w-5 h-5 text-white" strokeWidth={1.5} />
                      </div>
                      <span className="text-white text-[10px] font-medium text-center leading-tight">Intercity Travel</span>
                    </div>
                    
                    <div className="flex flex-col items-center gap-2 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all duration-300 cursor-pointer border border-white/10">
                      <div className="w-10 h-10 bg-gradient-to-br from-gray-700 to-gray-800 rounded-xl flex items-center justify-center shadow-lg">
                        <Sparkles className="w-5 h-5 text-white" strokeWidth={1.5} />
                      </div>
                      <span className="text-white text-[10px] font-medium text-center leading-tight">Luxury Fleet</span>
                    </div>
                    
                    <div className="flex flex-col items-center gap-2 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all duration-300 cursor-pointer border border-white/10">
                      <div className="w-10 h-10 bg-gradient-to-br from-gray-700 to-gray-800 rounded-xl flex items-center justify-center shadow-lg">
                        <Headphones className="w-5 h-5 text-white" strokeWidth={1.5} />
                      </div>
                      <span className="text-white text-[10px] font-medium text-center leading-tight">Premium Services</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <button className="w-full text-white px-4 py-2.5 text-sm font-medium text-left">
              NEWS
            </button>
            
            <button className="w-full text-white px-4 py-2.5 text-sm font-medium text-left">
              PARTNERS
            </button>
            
            <button className="w-full text-white px-4 py-2.5 text-sm font-medium text-left">
              CONTACT
            </button>

            <div className="pt-3 mt-3 border-t border-gray-800 space-y-2">
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
