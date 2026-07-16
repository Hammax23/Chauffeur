"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { services as allServices } from "@/data/services";
import * as Icons from "lucide-react";

export default function OtherServicesSection() {
  // Select 3 prominent services to feature and pair them with our luxury images
  const featuredSlugs = ["airport-transfers", "corporate-travel", "hourly-chauffeur"];
  const featuredImages = [
    "/heropics/airport2.png",
    "/heropics/buisnesstravel.png",
    "/heropics/hourlyasdirected.png"
  ];

  const services = featuredSlugs.map((slug, index) => {
    const serviceData = allServices.find(s => s.slug === slug);
    if (!serviceData) return null;
    
    // Dynamically get the icon component from lucide-react based on the icon name in data
    const IconComponent = (Icons as any)[serviceData.icon] || Icons.Car;

    return {
      id: serviceData.slug,
      title: serviceData.title,
      desc: serviceData.shortDesc,
      image: featuredImages[index],
      icon: <IconComponent className="w-6 h-6 text-white" strokeWidth={1.5} />,
      link: `/services/${serviceData.slug}`
    };
  }).filter((s): s is NonNullable<typeof s> => Boolean(s));

  return (
    <section className="bg-white">
      <div className="max-w-[1300px] mx-auto px-6 sm:px-8 md:px-12 z-10">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-12 md:mb-16">
          <div className="max-w-2xl">
            <span className="inline-block text-[#C9A063] text-[12px] font-bold tracking-[0.3em] uppercase mb-4">
              Beyond Expectations
            </span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl text-gray-900 font-bold tracking-tight leading-[1.1]">
              Experience our world-class <br className="hidden sm:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#C9A063] to-[#A5803E]">
                luxury transport services
              </span>
            </h2>
          </div>
          <Link
            href="/services"
            className="group flex items-center gap-3 text-gray-900 text-[13px] font-bold tracking-widest uppercase hover:text-[#C9A063] transition-colors"
          >
            Explore All Services
            <div className="w-10 h-10 rounded-full border border-gray-300 flex items-center justify-center group-hover:border-[#C9A063] transition-colors">
              <ArrowRight className="w-4 h-4" />
            </div>
          </Link>
        </div>

        {/* Dynamic Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          {services.map((service) => (
            <Link 
              key={service.id} 
              href={service.link}
              className="group relative h-[450px] lg:h-[550px] w-full rounded-2xl overflow-hidden block"
            >
              {/* Background Image */}
              <Image 
                src={service.image} 
                alt={service.title} 
                fill 
                className="object-cover transition-transform duration-700 group-hover:scale-110"
              />
              
              {/* Permanent Gradient overlay for readability */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent transition-opacity duration-500" />
              
              {/* Hover Darken overlay */}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

              {/* Content Container */}
              <div className="absolute inset-0 p-6 sm:p-8 flex flex-col justify-end">
                <div className="transform transition-transform duration-500">
                  
                  {/* Icon */}
                  <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-lg group-hover:bg-[#C9A063]/20 group-hover:border-[#C9A063]/40 transition-all duration-300 mb-4">
                    {service.icon}
                  </div>

                  {/* Title with decorative line */}
                  <div className="flex items-center gap-4 mb-3">
                    <h3 className="text-xl sm:text-2xl font-bold text-white tracking-wide group-hover:text-[#C9A063] transition-colors duration-300">
                      {service.title}
                    </h3>
                    <div className="h-px flex-1 bg-gradient-to-r from-white/50 to-transparent group-hover:from-[#C9A063]/50 transition-colors duration-300"></div>
                  </div>

                  {/* Description (Always visible) */}
                  <p className="text-gray-300 text-sm leading-relaxed mb-6 font-light line-clamp-3">
                    {service.desc}
                  </p>
                  
                  {/* Reserve Now Button */}
                  <div className="flex items-center justify-between mt-auto">
                    <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/10 hover:bg-[#C9A063] text-white text-[12px] font-semibold uppercase tracking-wider backdrop-blur-sm border border-white/20 hover:border-[#C9A063] transition-all duration-300">
                      Reserve Now
                      <ArrowRight className="w-4 h-4" strokeWidth={2} />
                    </div>
                  </div>
                  
                </div>
              </div>
            </Link>
          ))}
        </div>

      </div>
    </section>
  );
}
