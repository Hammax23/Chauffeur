"use client";
import React from 'react';

const Companies = () => {
  const companies = [
    { name: "Mercedes-Benz", logo: "mercedes.png" },
    { name: "BMW", logo: "bmw.png" },
    { name: "Audi", logo: "audi.png" },
    { name: "Rolls-Royce", logo: "rollsroyce.png" },
    { name: "Bentley", logo: "bentley.png" },
    { name: "Porsche", logo: "porche.png" },
    { name: "Tesla", logo: "tesla.png" },
    { name: "Cadillac", logo: "cadillac.png" },
    { name : "farrari", logo: "ferrari.png" }
  ];

  return (
    <section className="py-20 bg-white overflow-hidden">
      <div className="max-w-[1600px] mx-auto px-8">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2.5 px-6 py-3 rounded-full bg-white backdrop-blur-xl border border-[#C9A063]/30 shadow-xl shadow-[#C9A063]/10 mb-6 sm:mb-8 hover:shadow-2xl hover:shadow-[#C9A063]/20 transition-all duration-300">
            <div className="w-2 h-2 rounded-full bg-gradient-to-r from-[#C9A063] to-[#B8935A] animate-pulse shadow-lg shadow-[#C9A063]/50"></div>
            <span className="text-gray-800 text-[13px] sm:text-[14px] font-bold tracking-[0.2em] uppercase">OUR PARTNERS</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4 tracking-tight">Premium Luxury Brands</h2>
          <p className="text-gray-600 text-[16px] font-light">Experience excellence with the world&apos;s most prestigious automotive brands</p>
        </div>

        <div className="relative">
          <div className="absolute left-0 top-0 bottom-0 w-40 bg-gradient-to-r from-white via-white/80 to-transparent z-10"></div>
          <div className="absolute right-0 top-0 bottom-0 w-40 bg-gradient-to-l from-white via-white/80 to-transparent z-10"></div>
          
          <div className="flex overflow-hidden">
            <div className="flex animate-scroll">
              {companies.map((company, index) => (
                <div
                  key={index}
                  className="flex-shrink-0 w-64 h-32 mx-5 flex items-center justify-center bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 border border-gray-100 hover:border-[#C9A063]/40 group hover:bg-white"
                >
                  <div className="flex items-center justify-center p-8">
                    <img 
                      src={company.logo} 
                      alt={company.name}
                      className="h-16 w-auto max-w-[180px] object-contain transition-all duration-500 opacity-50 group-hover:opacity-100 group-hover:scale-110 filter grayscale group-hover:grayscale-0 drop-shadow-lg"
                      loading="eager"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        const target = e.currentTarget as HTMLImageElement;
                        target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 60"%3E%3Ctext x="50%25" y="50%25" font-family="Arial, sans-serif" font-size="18" font-weight="bold" fill="%23666" text-anchor="middle" dominant-baseline="middle"%3E' + encodeURIComponent(company.name) + '%3C/text%3E%3C/svg%3E';
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="flex animate-scroll" aria-hidden="true">
              {companies.map((company, index) => (
                <div
                  key={`duplicate-${index}`}
                  className="flex-shrink-0 w-64 h-32 mx-5 flex items-center justify-center bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 border border-gray-100 hover:border-[#C9A063]/40 group hover:bg-white"
                >
                  <div className="flex items-center justify-center p-8">
                    <img 
                      src={company.logo} 
                      alt={company.name}
                      className="h-16 w-auto max-w-[180px] object-contain transition-all duration-500 opacity-50 group-hover:opacity-100 group-hover:scale-110 filter grayscale group-hover:grayscale-0 drop-shadow-lg"
                      loading="eager"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        const target = e.currentTarget as HTMLImageElement;
                        target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 60"%3E%3Ctext x="50%25" y="50%25" font-family="Arial, sans-serif" font-size="18" font-weight="bold" fill="%23666" text-anchor="middle" dominant-baseline="middle"%3E' + encodeURIComponent(company.name) + '%3C/text%3E%3C/svg%3E';
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes scroll {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }

        .animate-scroll {
          animation: scroll 30s linear infinite;
        }

        .animate-scroll:hover {
          animation-play-state: paused;
        }
      `}</style>
    </section>
  );
};

export default Companies;
