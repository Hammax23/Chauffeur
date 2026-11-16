"use client";

import Image from "next/image";
import Link from "next/link";
import { type Service } from "@/data/services";
import { getServiceBlocks } from "@/lib/service-blocks";

export default function ServiceContentBlocks({ service }: { service: Service }) {
  // If we have specific text for airport transfers, use it exactly as provided in the screenshot
  const blocks = getServiceBlocks(service);

  return (
    <div className="w-full bg-white space-y-14 md:space-y-20">
      {blocks.map((block, idx) => (
        <div key={idx} className="max-w-[1250px] mx-auto px-6 sm:px-8 md:px-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 md:gap-16 lg:items-stretch items-center">

            {/* Image Box */}
            <div className={`relative h-[300px] sm:h-[400px] lg:h-auto rounded-[32px] overflow-hidden shadow-sm border border-gray-100 order-1 ${block.imagePosition === 'left' ? 'lg:order-1' : 'lg:order-2'}`}>
              <Image
                src={block.image}
                alt={`${block.titleBlack} ${block.titleGold}`.replace(/\s+/g, ' ').trim()}
                fill
                className="object-cover"
              />
            </div>

            {/* Text Box */}
            <div className={`flex flex-col justify-center py-2 lg:py-6 order-2 ${block.imagePosition === 'left' ? 'lg:order-2' : 'lg:order-1'}`}>
              <h2 className="text-[32px] sm:text-[40px] md:text-[44px] font-extrabold text-gray-900 leading-[1.15] tracking-tight mb-8">
                {block.titleBlack} <span className="text-[#C9A063]">{block.titleGold}</span>
              </h2>

              <div className="space-y-6 text-gray-700 text-[16px] sm:text-[17px] leading-[1.8] font-normal mb-10">
                {block.paragraphs.map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>

              {block.buttonText && (
                <div>
                  <Link
                    href={block.buttonLink}
                    className="inline-flex items-center justify-center px-8 py-4 bg-[#a88235] hover:bg-[#8f6e2b] text-white text-[15px] font-semibold rounded-[10px] transition-all duration-300"
                  >
                    {block.buttonText}
                  </Link>
                </div>
              )}
            </div>

          </div>
        </div>
      ))}
    </div>
  );
}
