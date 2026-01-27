"use client";
import { Phone, Mail, MapPin } from 'lucide-react';

const ContactInfo = () => {
  return (
    <section className="relative py-12 sm:py-16 md:py-20 bg-gradient-to-b from-[#0a0a0a] via-black to-[#0a0a0a] overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute inset-0 bg-gradient-to-r from-[#C9A063]/5 via-transparent to-[#C9A063]/5"></div>
      </div>

      <div className="max-w-[1400px] mx-auto px-6 sm:px-8 md:px-12 relative z-10">
        {/* Center the grid container */}
        <div className="flex justify-center">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12 max-w-[1200px]">
            
            {/* Call Us */}
            <div className="group flex items-center gap-5">
              {/* Icon Circle - Smaller */}
              <div className="relative flex-shrink-0">
                <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-full bg-gradient-to-br from-[#C9A063] to-[#B8935A] flex items-center justify-center shadow-lg shadow-[#C9A063]/30 group-hover:shadow-xl group-hover:shadow-[#C9A063]/40 transition-all duration-300 group-hover:scale-110">
                  <Phone className="w-7 h-7 sm:w-8 sm:h-8 text-black" strokeWidth={2} />
                </div>
                {/* Subtle glow effect */}
                <div className="absolute inset-0 rounded-full bg-[#C9A063]/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </div>

              {/* Text Content */}
              <div className="flex-1">
                <h3 className="text-white text-[16px] sm:text-[18px] font-semibold mb-2 tracking-wide">
                  Call us
                </h3>
                <a 
                  href="tel:+97152-333-4444" 
                  className="text-gray-300 text-[14px] sm:text-[15px] font-light hover:text-[#C9A063] transition-colors duration-300"
                >
                  +971 52-333-4444
                </a>
              </div>
            </div>

            {/* Write to Us */}
            <div className="group flex items-center gap-5">
              {/* Icon Circle - Smaller */}
              <div className="relative flex-shrink-0">
                <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-full bg-gradient-to-br from-[#C9A063] to-[#B8935A] flex items-center justify-center shadow-lg shadow-[#C9A063]/30 group-hover:shadow-xl group-hover:shadow-[#C9A063]/40 transition-all duration-300 group-hover:scale-110">
                  <Mail className="w-7 h-7 sm:w-8 sm:h-8 text-black" strokeWidth={2} />
                </div>
                {/* Subtle glow effect */}
                <div className="absolute inset-0 rounded-full bg-[#C9A063]/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </div>

              {/* Text Content */}
              <div className="flex-1">
                <h3 className="text-white text-[16px] sm:text-[18px] font-semibold mb-2 tracking-wide">
                  Write to us
                </h3>
                <a 
                  href="mailto:info@renax.com" 
                  className="text-gray-300 text-[14px] sm:text-[15px] font-light hover:text-[#C9A063] transition-colors duration-300"
                >
                  info@luxride.com
                </a>
              </div>
            </div>

            {/* Address */}
            <div className="group flex items-center gap-5">
              {/* Icon Circle - Smaller */}
              <div className="relative flex-shrink-0">
                <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-full bg-gradient-to-br from-[#C9A063] to-[#B8935A] flex items-center justify-center shadow-lg shadow-[#C9A063]/30 group-hover:shadow-xl group-hover:shadow-[#C9A063]/40 transition-all duration-300 group-hover:scale-110">
                  <MapPin className="w-7 h-7 sm:w-8 sm:h-8 text-black" strokeWidth={2} />
                </div>
                {/* Subtle glow effect */}
                <div className="absolute inset-0 rounded-full bg-[#C9A063]/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </div>

              {/* Text Content */}
              <div className="flex-1">
                <h3 className="text-white text-[16px] sm:text-[18px] font-semibold mb-2 tracking-wide">
                  Address
                </h3>
                <p className="text-gray-300 text-[14px] sm:text-[15px] font-light leading-relaxed">
                  Dubai, Water Tower, Office 123
                </p>
              </div>
            </div>

          </div>
        </div>
      </div>
    </section>
  );
};

export default ContactInfo;
