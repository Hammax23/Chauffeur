"use client";
import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const Testimonial = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(4);

  const testimonials = [
    {
      quote: "The car was immaculate, and the chauffeur was extremely professional. Highly recommended.",
      name: "Oliver Ramos",
      title: "CEO",
      image: "/testimonial1.jpg"
    },
    {
      quote: "Perfect timing, excellent service, and complete peace of mind throughout the journey.",
      name: "George Donovan",
      title: "Corporate Director",
      image: "/testimonial2.jpg"
    },
    {
      quote: "An elegant experience that exceeded our expectations. We will definitely book again.",
      name: "Benjamin Davies",
      title: "Business Traveler",
      image: "/testimonial3.jpg"
    },
    {
      quote: "From booking to arrival, everything felt effortless and refined. Truly a first-class experience.",
      name: "Michael Hart",
      title: "Corporate Director",
      image: "/testimonial4.jpg"
    },
    {
      quote: "Exceptional attention to detail and a seamless experience from start to finish.",
      name: "Sarah Mitchell",
      title: "Executive",
      image: "/testimonial5.jpg"
    },
    {
      quote: "The level of professionalism and comfort exceeded all my expectations.",
      name: "James Wilson",
      title: "Business Owner",
      image: "/testimonial6.jpg"
    }
  ];

  useEffect(() => {
    const updateItemsPerPage = () => {
      if (window.innerWidth >= 1024) {
        setItemsPerPage(4);
      } else if (window.innerWidth >= 640) {
        setItemsPerPage(2);
      } else {
        setItemsPerPage(1);
      }
    };

    updateItemsPerPage();
    window.addEventListener('resize', updateItemsPerPage);
    return () => window.removeEventListener('resize', updateItemsPerPage);
  }, []);

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev === 0 ? Math.max(0, testimonials.length - itemsPerPage) : Math.max(0, prev - 1)));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev >= testimonials.length - itemsPerPage ? 0 : prev + 1));
  };

  const visibleTestimonials = testimonials.slice(currentIndex, currentIndex + itemsPerPage);

  return (
    <section className="relative py-12 sm:py-14 md:py-16 lg:py-20 bg-gradient-to-b from-black via-[#0a0a0a] to-black overflow-hidden">
      {/* Enhanced Background Effects */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute inset-0 bg-gradient-to-br from-[#C9A063]/10 via-transparent to-transparent animate-pulse"></div>
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#C9A063]/5 rounded-full blur-[100px]"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-[#C9A063]/5 rounded-full blur-[100px]"></div>
      </div>

      <div className="max-w-[1600px] mx-auto px-6 sm:px-8 md:px-12 relative z-10">
        {/* Header Section */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between mb-12 sm:mb-16 md:mb-20 gap-6">
          <div>
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/30 bg-white/5 backdrop-blur-sm mb-6 sm:mb-8">
              <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></div>
              <span className="text-white text-[12px] sm:text-[13px] font-normal tracking-widest uppercase">CLIENT TESTIMONIALS</span>
            </div>
            
            {/* Main Heading */}
            <h2 className="text-white text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-semibold leading-tight">
              Hear What Sets<br />Us Apart
            </h2>
          </div>

          {/* Navigation Arrows - Desktop */}
          <div className="hidden lg:flex items-center gap-3">
            <button
              onClick={handlePrev}
              disabled={currentIndex === 0}
              className="group w-14 h-14 rounded-full border border-white/20 hover:border-[#C9A063]/60 bg-white/5 hover:bg-[#C9A063]/20 backdrop-blur-md flex items-center justify-center transition-all duration-300 hover:scale-110 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:border-white/20 disabled:hover:bg-white/5 shadow-lg shadow-black/20"
            >
              <ChevronLeft className="w-6 h-6 text-white/80 group-hover:text-[#C9A063] transition-colors duration-300" strokeWidth={2.5} />
            </button>
            <button
              onClick={handleNext}
              disabled={currentIndex >= testimonials.length - itemsPerPage}
              className="group w-14 h-14 rounded-full border border-white/20 hover:border-[#C9A063]/60 bg-white/5 hover:bg-[#C9A063]/20 backdrop-blur-md flex items-center justify-center transition-all duration-300 hover:scale-110 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:border-white/20 disabled:hover:bg-white/5 shadow-lg shadow-black/20"
            >
              <ChevronRight className="w-6 h-6 text-white/80 group-hover:text-[#C9A063] transition-colors duration-300" strokeWidth={2.5} />
            </button>
          </div>
        </div>

        {/* Testimonials Grid with smooth transition */}
        <div className="relative">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
            {visibleTestimonials.map((testimonial, index) => (
              <div
                key={currentIndex + index}
                className="group relative bg-gradient-to-br from-white/[0.08] to-white/[0.02] backdrop-blur-md rounded-3xl border border-white/10 hover:border-[#C9A063]/40 p-8 transition-all duration-500 hover:scale-[1.03] hover:shadow-2xl hover:shadow-[#C9A063]/20 flex flex-col min-h-[320px]"
              >
                {/* Subtle inner glow on hover */}
                <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-[#C9A063]/0 to-[#C9A063]/0 group-hover:from-[#C9A063]/5 group-hover:to-transparent transition-all duration-500 pointer-events-none"></div>
                
                {/* Quote Icon */}
                <div className="mb-6 relative z-10">
                  <svg width="44" height="36" viewBox="0 0 40 32" fill="none" className="text-white/70 group-hover:text-[#C9A063]/80 transition-colors duration-500">
                    <path d="M0 32V16C0 7.168 5.504 0 16 0v8c-4.736 0-8 3.264-8 8v2h8v14H0zm24 0V16c0-8.832 5.504-16 16-16v8c-4.736 0-8 3.264-8 8v2h8v14H24z" fill="currentColor"/>
                  </svg>
                </div>

                {/* Quote Text */}
                <p className="text-white/90 text-[15px] sm:text-[16px] leading-relaxed mb-auto font-light relative z-10">
                  {testimonial.quote}
                </p>

                {/* Author Info */}
                <div className="flex items-center gap-3 mt-8 pt-6 border-t border-white/10 relative z-10">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#C9A063]/30 to-[#C9A063]/10 border border-[#C9A063]/20 overflow-hidden flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
                    <div className="w-full h-full bg-gradient-to-br from-gray-700 to-gray-800"></div>
                  </div>
                  <div>
                    <h4 className="text-white text-[15px] font-semibold tracking-wide">{testimonial.name}</h4>
                    <p className="text-gray-400 text-[13px] font-light tracking-wide">{testimonial.title}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="flex lg:hidden items-center justify-center gap-3 mt-10">
          <button
            onClick={handlePrev}
            disabled={currentIndex === 0}
            className="group w-12 h-12 rounded-full border border-white/20 hover:border-[#C9A063]/60 bg-white/5 hover:bg-[#C9A063]/20 backdrop-blur-md flex items-center justify-center transition-all duration-300 hover:scale-110 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 shadow-lg shadow-black/20"
          >
            <ChevronLeft className="w-5 h-5 text-white/80 group-hover:text-[#C9A063] transition-colors duration-300" strokeWidth={2.5} />
          </button>
          
          {/* Pagination Dots */}
          <div className="flex items-center gap-2 px-4">
            {Array.from({ length: Math.ceil(testimonials.length / itemsPerPage) }).map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx * itemsPerPage)}
                className={`transition-all duration-300 rounded-full ${
                  Math.floor(currentIndex / itemsPerPage) === idx
                    ? 'w-8 h-2 bg-[#C9A063]'
                    : 'w-2 h-2 bg-white/30 hover:bg-white/50'
                }`}
              />
            ))}
          </div>

          <button
            onClick={handleNext}
            disabled={currentIndex >= testimonials.length - itemsPerPage}
            className="group w-12 h-12 rounded-full border border-white/20 hover:border-[#C9A063]/60 bg-white/5 hover:bg-[#C9A063]/20 backdrop-blur-md flex items-center justify-center transition-all duration-300 hover:scale-110 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 shadow-lg shadow-black/20"
          >
            <ChevronRight className="w-5 h-5 text-white/80 group-hover:text-[#C9A063] transition-colors duration-300" strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </section>
  );
};

export default Testimonial;
