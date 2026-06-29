"use client";
import { Phone, Mail, MapPin } from 'lucide-react';

const ContactInfo = () => {
  return (
    <section className="relative py-6 sm:py-8 bg-gradient-to-b from-[#0a0a0a] via-black to-[#0a0a0a] overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute inset-0 bg-gradient-to-r from-[#C9A063]/5 via-transparent to-[#C9A063]/5"></div>
      </div>

      <div className="max-w-[1400px] mx-auto px-6 sm:px-8 md:px-12 relative z-10">
        {/* Center the grid container */}
        <div className="flex justify-center">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-10 max-w-[1200px]">
            
            {/* Call Us */}
            <div className="group flex items-center gap-5">
              {/* Icon Circle - Smaller */}
              <div className="relative flex-shrink-0">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br from-[#C9A063] to-[#B8935A] flex items-center justify-center shadow-lg shadow-[#C9A063]/30 group-hover:shadow-xl group-hover:shadow-[#C9A063]/40 transition-all duration-300 group-hover:scale-110">
                  <Phone className="w-5 h-5 sm:w-6 sm:h-6 text-black" strokeWidth={2} />
                </div>
                {/* Subtle glow effect */}
                <div className="absolute inset-0 rounded-full bg-[#C9A063]/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </div>

              {/* Text Content */}
              <div className="flex-1">
                <h3 className="text-white text-[16px] sm:text-[18px] font-semibold mb-2 tracking-wide">
                  Phone Number
                </h3>
                <span className="text-gray-300 text-[14px] sm:text-[15px] font-light">
                  416-893-5779
                </span>
              </div>
            </div>

            {/* Write to Us */}
            <div className="group flex items-center gap-5">
              {/* Icon Circle - Smaller */}
              <div className="relative flex-shrink-0">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br from-[#C9A063] to-[#B8935A] flex items-center justify-center shadow-lg shadow-[#C9A063]/30 group-hover:shadow-xl group-hover:shadow-[#C9A063]/40 transition-all duration-300 group-hover:scale-110">
                  <Mail className="w-5 h-5 sm:w-6 sm:h-6 text-black" strokeWidth={2} />
                </div>
                {/* Subtle glow effect */}
                <div className="absolute inset-0 rounded-full bg-[#C9A063]/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </div>

              {/* Text Content */}
              <div className="flex-1">
                <h3 className="text-white text-[16px] sm:text-[18px] font-semibold mb-2 tracking-wide">
                  Write to us
                </h3>
                <span className="text-gray-300 text-[14px] sm:text-[15px] font-light">
                  reserve@sarjworldwide.ca
                </span>
              </div>
            </div>

            {/* Address */}
            <div className="group flex items-center gap-5">
              {/* Icon Circle - Smaller */}
              <div className="relative flex-shrink-0">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br from-[#C9A063] to-[#B8935A] flex items-center justify-center shadow-lg shadow-[#C9A063]/30 group-hover:shadow-xl group-hover:shadow-[#C9A063]/40 transition-all duration-300 group-hover:scale-110">
                  <MapPin className="w-5 h-5 sm:w-6 sm:h-6 text-black" strokeWidth={2} />
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
                  231 Oak Park Blvd, Oakville, ON L6H 7S8
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
