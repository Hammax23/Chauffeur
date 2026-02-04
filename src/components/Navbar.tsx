"use client";
import Link from "next/link";
import Image from "next/image";
import { Phone, Menu, X } from 'lucide-react';
import { useState, useEffect } from 'react';

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    // Use passive listener for better scroll performance
    window.addEventListener('scroll', handleScroll, { passive: true });
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
              <Image 
                src="/logo1.png" 
                alt="SARJ Worldwide Chauffeur Services Logo" 
                width={250}
                height={100}
                className="object-contain object-left"
                style={{ width: '300px', height: '100px' }}
              />
            </Link>

            <div className="hidden lg:flex items-center gap-1">
              <Link href="/" className="text-white/90 px-5 py-2.5 text-[16px] font-normal hover:text-[#C9A063] hover:bg-white/5 hover:backdrop-blur-sm rounded-xl transition-all duration-300 whitespace-nowrap">
                HOME
              </Link>
              
              <Link href="/about" className="text-white/90 px-5 py-2.5 text-[16px] font-normal hover:text-[#C9A063] hover:bg-white/5 hover:backdrop-blur-sm rounded-xl transition-all duration-300 whitespace-nowrap">
                ABOUT
              </Link>
              
              <Link href="/fleet" className="text-white/90 px-5 py-2.5 text-[16px] font-normal hover:text-[#C9A063] hover:bg-white/5 hover:backdrop-blur-sm rounded-xl transition-all duration-300 whitespace-nowrap">
                FLEET
              </Link>
              
              <Link href="/services" className="text-white/90 px-5 py-2.5 text-[16px] font-normal hover:text-[#C9A063] hover:bg-white/5 hover:backdrop-blur-sm rounded-xl transition-all duration-300 whitespace-nowrap">
                SERVICES
              </Link>
              
              <Link href="/quote" className="text-white/90 px-5 py-2.5 text-[16px] font-normal hover:text-[#C9A063] hover:bg-white/5 hover:backdrop-blur-sm rounded-xl transition-all duration-300 whitespace-nowrap">
                ONLINE QUOTE
              </Link>
              
              <Link href="/contact" className="text-white/90 px-5 py-2.5 text-[16px] font-normal hover:text-[#C9A063] hover:bg-white/5 hover:backdrop-blur-sm rounded-xl transition-all duration-300 whitespace-nowrap">
                CONTACT
              </Link>
              
              <Link href="/reservation" className="text-white/90 px-5 py-2.5 text-[16px] font-normal hover:text-[#C9A063] hover:bg-white/5 hover:backdrop-blur-sm rounded-xl transition-all duration-300 whitespace-nowrap">
                ONLINE RESERVATION
              </Link>
            </div>
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
            <Link href="/" onClick={() => setIsMenuOpen(false)} className="block w-full text-white px-4 py-2.5 text-base font-medium text-left">
              HOME
            </Link>
            
            <Link href="/about" onClick={() => setIsMenuOpen(false)} className="block w-full text-white px-4 py-2.5 text-base font-medium text-left">
              ABOUT
            </Link>
            
            <Link href="/fleet" onClick={() => setIsMenuOpen(false)} className="block w-full text-white px-4 py-2.5 text-base font-medium text-left">
              FLEET
            </Link>
            
            <Link href="/services" onClick={() => setIsMenuOpen(false)} className="block w-full text-white px-4 py-2.5 text-base font-medium text-left">
              SERVICES
            </Link>
            
            <Link href="/quote" onClick={() => setIsMenuOpen(false)} className="block w-full text-white px-4 py-2.5 text-base font-medium text-left">
              ONLINE QUOTE
            </Link>
            
            <Link href="/contact" onClick={() => setIsMenuOpen(false)} className="block w-full text-white px-4 py-2.5 text-base font-medium text-left">
              CONTACT
            </Link>
            
            <Link href="/reservation" onClick={() => setIsMenuOpen(false)} className="block w-full text-white px-4 py-2.5 text-base font-medium text-left">
              ONLINE RESERVATION
            </Link>

            <div className="pt-3 mt-3 pb-2 border-t border-gray-800">
              <div className="flex items-center gap-2 text-white px-4">
                <Phone className="w-4 h-4" />
                <span className="text-sm">+1800900122</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
