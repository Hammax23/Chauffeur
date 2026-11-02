"use client";

import { useState, ReactNode } from "react";
import Link from "next/link";
import { ChevronDown, ArrowRight, HelpCircle } from "lucide-react";

interface ServiceFAQSectionProps {
  slug: string;
  title: string;
}

const serviceFaqs: Record<string, { question: string; answer: ReactNode }[]> = {
  "airport-transfers": [
    {
      question: "What's included in a private airport transfer service?",
      answer: "A private vehicle, a professional chauffeur, real-time flight tracking and a pickup time based on your actual arrival rather than a fixed schedule. Your chauffeur handles the driving, route and parking, and your fare is flat, so you know the cost before you travel."
    },
    {
      question: "What is the best airport transfer service in Toronto?",
      answer: "The best one is the one built around your flight, not just your booking. Look for flight tracking, a fixed fare agreed in advance, a professional chauffeur and a team you can reach around the clock. Sarj Worldwide offers all four, for both arrivals and departures at Toronto Pearson."
    },
    {
      question: "How do I book an airport transfer in Toronto?",
      answer: "Reserve online with your pickup and drop-off addresses, date, time and flight number. You can also call +1 (416) 893-5779 and the team will arrange it for you. Booking ahead is best, especially for early-morning flights and busy travel weekends."
    },
    {
      question: "What happens if my flight is delayed or lands early?",
      answer: "We track your flight in real time and adjust the pickup to match, so you don't need to call ahead or rebook."
    },
    {
      question: "What's the difference between an airport taxi and a limousine service?",
      answer: <>A taxi is usually picked up from a queue and charged by the meter. A limousine or private chauffeur service is booked ahead, with the vehicle, chauffeur and fare confirmed before you travel. If you&apos;re weighing the options, this <Link href="/news" className="text-[#C9A063] font-semibold hover:underline">Pearson limo vs Uber vs taxi breakdown</Link> goes deeper.</>
    },
    {
      question: "Do you offer airport car service in Montreal?",
      answer: "Yes. We arrange direct private transfers to and from Montreal, including Montréal-Trudeau (YUL). Because it's a long-distance trip, book as early as you can so your vehicle and chauffeur are confirmed."
    },
    {
      question: "Is airport taxi service available in Hamilton?",
      answer: "We provide private airport transfers in Hamilton rather than metered taxis, covering Hamilton International (YHM) and trips between Hamilton and Pearson. You get a confirmed booking and a flat fare instead of waiting for a cab."
    },
    {
      question: "Can I book a transfer from Pearson to Niagara Falls?",
      answer: "Yes. Pearson to Niagara Falls is a popular run, and the same private service applies, with flight tracking so your pickup matches your landing time. Cross-border transfers to Buffalo Niagara International (BUF) are also available."
    },
    {
      question: "Do you provide airport transfer service in London, Ontario?",
      answer: "Yes. Private transfers connect London and Southwestern Ontario with Pearson and London International (YXU)."
    }
  ],
  "meet-greet": [
    {
      question: "What is a meet and greet service?",
      answer: "A chauffeur waits for your arrival, tracks your flight, assists with luggage, and escorts you directly to a private vehicle."
    },
    {
      question: "Who typically books meet and greet service?",
      answer: "Business travelers, VIP guests, families, elderly passengers, and visitors who want extra airport assistance often choose this service."
    },
    {
      question: "Does meet and greet include the ride to my destination?",
      answer: "Yes, meet and greet service can be combined with private chauffeur transportation to hotels, offices, residences, or events."
    },
    {
      question: "Can I arrange meet and greet for a visiting corporate guest?",
      answer: "Yes, businesses can arrange airport welcome services for executives, clients, and visiting partners."
    },
    {
      question: "Is meet and greet service available in Oakville?",
      answer: <>Yes, SARJ Worldwide provides <Link href="/cities-we-serve/oakville" className="text-[#C9A063] font-semibold hover:underline">Oakville meet and greet service</Link> with professional airport assistance and private transportation options.</>
    },
    {
      question: "What happens if my flight is delayed?",
      answer: "Your chauffeur monitors your flight status and adjusts the pickup timing based on your updated arrival information."
    },
    {
      question: "Can meet and greet be booked with a luxury vehicle?",
      answer: "Yes, the service is available with SARJ Worldwide vehicles, including sedans, SUVs, sprinters, and limousines."
    }
  ],
  "vip-transport": [
    {
      question: "What is a VIP chauffeur service?",
      answer: "It is private luxury transportation with a professional chauffeur, premium vehicle, and personalized schedule."
    },
    {
      question: "Who can book this service?",
      answer: "Executives, celebrities, corporate guests, families, and private travellers can book VIP transportation."
    },
    {
      question: "Do you serve Toronto Pearson Airport?",
      answer: "Yes. Airport pickups and drop-offs are available for Toronto Pearson International Airport."
    },
    {
      question: "Is service available outside Toronto?",
      answer: "Yes. Travel may be arranged across the GTA, Ontario, Montreal, Niagara, Buffalo, and nearby destinations."
    },
    {
      question: "What vehicles are available?",
      answer: "Options include luxury sedans, SUVs, executive vans, sprinter vans, and limousines."
    },
    {
      question: "Can I book multiple stops?",
      answer: "Yes. Hourly bookings can include waiting time, several stops, meetings, and events."
    },
    {
      question: "How do I make a booking?",
      answer: "Share your date, pickup location, destination, passenger count, and vehicle preference."
    }
  ],
  "intercity-travel": [
    {
      question: "How far can a private driver travel?",
      answer: "There's no fixed distance limit. We regularly run routes across Ontario and into Quebec, and cross-border into the US. Tell us your destination when you request a quote and we'll confirm the route and timing."
    },
    {
      question: "Can I book transportation between cities on the same day?",
      answer: "For shorter routes, same-day booking is often possible depending on chauffeur and vehicle availability. For longer trips or peak travel dates, we recommend booking at least a few days ahead to guarantee your preferred vehicle."
    },
    {
      question: "Are tolls and parking included in the quote?",
      answer: "Tolls and parking are confirmed as part of your quote before booking, so the price you approve is the price you pay, with no surprise charges added afterward."
    },
    {
      question: "Which vehicle is best for a long trip?",
      answer: "A sedan works well for one or two passengers with standard luggage. For a group or extra bags, an SUV or van gives more room to stay comfortable over a longer drive."
    },
    {
      question: "Can I add stops during the journey?",
      answer: "Yes. Let us know planned stops when you book, and your chauffeur will build them into the route so nothing needs to be arranged on the fly."
    },
    {
      question: "Can I book pickup from another city's airport?",
      answer: "Yes. A pickup from an airport outside the GTA can continue directly to a hotel, office, home, or on to another city, all in the same reservation."
    },
    {
      question: "How early should I book?",
      answer: "For weekends, holidays, and specific vehicle requests, book a few days ahead if you can. For most weekday trips, even a short lead time is usually enough."
    }
  ],
  "corporate-travel": [
    {
      question: "What is a corporate traveler?",
      answer: "A corporate traveler is anyone traveling for business purposes, such as meetings, conferences, or client visits, rather than personal reasons."
    },
    {
      question: "Can I use a corporate rate for personal travel?",
      answer: "Corporate rates are generally tied to a business account and intended for business travel; personal trips are usually booked separately."
    },
    {
      question: "How do companies compare airline contracts for corporate travel management?",
      answer: "Companies typically compare airline contracts on pricing, flexibility, and route coverage; ground transportation like ours is arranged separately to connect with those flights."
    },
    {
      question: "What is included in a corporate car service booking?",
      answer: "A private vehicle, a professional chauffeur, and a confirmed pickup time, with multi-stop itineraries available on request."
    },
    {
      question: "Can a business book a chauffeur for a full day?",
      answer: "Yes, a chauffeur can be booked for a full business day, covering multiple meetings, waiting time, and return trips."
    },
    {
      question: "Is corporate car service available for visiting clients, not just employees?",
      answer: "Yes, bookings can be made for visiting clients, partners, or guests, in addition to internal staff travel."
    },
    {
      question: "How far in advance should a company book executive car service?",
      answer: "Booking in advance is recommended, especially for multi-stop days or recurring travel, though single trips can often be arranged with shorter notice."
    }
  ],
  "hourly-chauffeur": [
    {
      question: "What is hourly or as-directed chauffeur service?",
      answer: "A private vehicle and chauffeur booked for a set block of time, allowing multiple stops or waiting time instead of a single trip."
    },
    {
      question: "How is hourly service different from point-to-point?",
      answer: "Point-to-point covers one pickup and one destination, while hourly service keeps the vehicle available for a set period to cover several stops."
    },
    {
      question: "Is there a minimum number of hours for a booking?",
      answer: "Minimums depend on the date and vehicle you choose. Reach out with your schedule and we'll confirm the block of time and rate that fits your day."
    },
    {
      question: "What vehicles are available for hourly booking?",
      answer: "Sedans, SUVs, vans, and limousines are all available by the hour, so the vehicle matches the size of your group and the occasion."
    },
    {
      question: "Can hourly service include waiting time between stops?",
      answer: "Yes, the vehicle and chauffeur remain with you throughout the booked period, including waiting time between stops."
    },
    {
      question: "Is hourly chauffeur service only for special occasions?",
      answer: "No. It works just as well for a business day with multiple meetings, a shopping trip, or hosting an out-of-town guest, as it does for a holiday party or celebration."
    }
  ],
  "wedding-events": [
    {
      question: "What is included in SARJ Worldwide wedding transportation?",
      answer: "Wedding transportation includes a private chauffeur-driven vehicle, professional service, and travel arrangements based on your ceremony, photography locations, reception, and schedule."
    },
    {
      question: "How far in advance should I book wedding transportation?",
      answer: "It is recommended to reserve your wedding vehicle early, especially during busy wedding seasons, to confirm availability for your preferred date and vehicle."
    },
    {
      question: "Is this a self-drive rental or a chauffeur service?",
      answer: "SARJ Worldwide provides chauffeur-driven wedding transportation with professional drivers and luxury vehicles. Customers do not need to drive the vehicle themselves."
    },
    {
      question: "Can wedding transportation include multiple locations?",
      answer: "Yes, bookings can include multiple stops for the couple, wedding party, family members, hotels, photography locations, and venues throughout the day."
    },
    {
      question: "What vehicles are available for wedding transportation?",
      answer: "SARJ Worldwide offers luxury transportation options including sedans, SUVs, sprinter vehicles, and limousines, based on your group size and travel requirements."
    },
    {
      question: "Is wedding limo service available in Toronto and surrounding areas?",
      answer: "Yes, SARJ Worldwide provides wedding transportation across Toronto and nearby areas, including ceremony transfers, reception travel, and special event transportation."
    },
    {
      question: "Can I book transportation for the entire wedding day?",
      answer: "Yes, couples can arrange extended bookings when they need a dedicated chauffeur and vehicle available throughout different parts of their wedding schedule."
    }
  ],
  "point-to-point-transfers": [
    {
      question: "What is point-to-point car service?",
      answer: "A private trip between one pickup location and one destination, booked at a fixed rate with no added stops or waiting time."
    },
    {
      question: "How is point-to-point different from hourly chauffeur service?",
      answer: "Point-to-point covers a single trip, while hourly service keeps the vehicle available for a set period to cover multiple stops."
    },
    {
      question: "How is point-to-point different from corporate travel service?",
      answer: "Corporate travel often includes multiple stops across a business day; point-to-point is a single, direct trip from start to finish."
    },
    {
      question: "Can point-to-point service include an airport transfer?",
      answer: "Yes, a point-to-point trip can be booked directly to or from the airport as a single, confirmed transfer."
    },
    {
      question: "Is point-to-point service available in Ottawa?",
      answer: <>Yes, our <Link href="/cities-we-serve/ottawa" className="text-[#C9A063] font-semibold hover:underline">point to point service in Ottawa</Link> covers direct trips for government, business, and personal travel.</>
    },
    {
      question: "Is the fare fixed or metered for point-to-point trips?",
      answer: "The rate is confirmed in advance based on your pickup and destination, not metered like a taxi."
    },
    {
      question: "How far in advance should I book a point-to-point trip?",
      answer: "Booking ahead is recommended, especially for early flights or busy periods, though same-day requests can often be accommodated."
    }
  ]
};

const defaultFaqs = [
  {
    question: "How do I make a reservation?",
    answer: "You can easily book online through our reservation portal, request a quote, or call our 24/7 customer service team."
  },
  {
    question: "Are your chauffeurs professionally trained?",
    answer: "Yes, all our chauffeurs undergo rigorous background checks, defensive driving courses, and executive hospitality training."
  },
  {
    question: "What is your cancellation policy?",
    answer: "We offer flexible cancellation. Specific terms depend on the vehicle class and booking type, which are fully detailed in your reservation confirmation."
  },
  {
    question: "What forms of payment do you accept?",
    answer: "We accept all major credit cards including Visa, MasterCard, and American Express. Corporate accounts may also qualify for direct bank transfer payments."
  },
  {
    question: "Do you offer services outside of Oakville?",
    answer: "While based in Oakville, our premium chauffeur services cover the entire Greater Toronto Area (GTA) and extending throughout Southern Ontario."
  },
  {
    question: "Can I travel with my pet?",
    answer: "Yes, we are a pet-friendly service. We simply ask that pets remain in their carrier during the journey and that you notify us during the booking process."
  },
  {
    question: "How early should I book to guarantee availability?",
    answer: "For standard transfers, a 24-hour notice is recommended. For special events, groups, or peak seasons, we advise booking as early as possible to guarantee your choice of vehicle."
  }
];

export default function ServiceFAQSection({ slug, title }: ServiceFAQSectionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggle = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  const faqs = serviceFaqs[slug] || defaultFaqs;

  return (
    <section className="w-full bg-white">
      <div className="w-full bg-white rounded-3xl border border-gray-100 p-8 md:p-12 shadow-sm">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.4fr] gap-12 md:gap-16 items-start">
          {/* Left — intro */}
          <div>
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-gray-200 bg-[#fafafa] mb-4">
              <HelpCircle className="w-3.5 h-3.5 text-[#C9A063]" strokeWidth={2} />
              <span className="text-gray-800 text-[11px] sm:text-[12px] font-medium tracking-widest uppercase">
                FAQs
              </span>
            </div>

            <h2 className="text-[#1a2b3c] text-2xl sm:text-3xl md:text-[32px] font-bold tracking-tight mb-3 leading-tight lg:whitespace-nowrap">
              Frequently Asked Questions
            </h2>

            <p className="text-gray-500 text-[14px] sm:text-[15px] leading-relaxed mb-6 max-w-md">
              Find quick answers about our {title} services, booking policies, and fleet options. Our team is available 24/7 for further assistance.
            </p>

            <Link
              href="/contact"
              className="group inline-flex items-center gap-2 text-[#C9A063] font-semibold text-[14px] hover:text-[#B8935A] transition-colors"
            >
              Contact our team
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" strokeWidth={2} />
            </Link>
          </div>

          {/* Right — accordion */}
          <div className="space-y-3">
            {faqs.map((faq, index) => {
              const isOpen = openIndex === index;
              return (
                <div
                  key={index}
                  className={`rounded-xl border transition-all duration-300 ${isOpen
                      ? "border-[#C9A063]/35 bg-[#fafafa] shadow-sm shadow-[#C9A063]/5"
                      : "border-gray-100 bg-white hover:border-gray-200"
                    }`}
                >
                  <button
                    type="button"
                    onClick={() => toggle(index)}
                    className="w-full flex items-start justify-between gap-4 px-5 py-4 sm:px-6 sm:py-4.5 text-left"
                    aria-expanded={isOpen}
                  >
                    <span
                      className={`text-[14px] sm:text-[15px] font-semibold leading-snug transition-colors ${isOpen ? "text-[#1a2b3c]" : "text-gray-800"
                        }`}
                    >
                      {faq.question}
                    </span>
                    <span
                      className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300 ${isOpen ? "bg-[#C9A063] text-white rotate-180" : "bg-gray-100 text-gray-500"
                        }`}
                    >
                      <ChevronDown className="w-4 h-4" strokeWidth={2.5} />
                    </span>
                  </button>

                  <div
                    className={`grid transition-all duration-300 ease-in-out ${isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                      }`}
                  >
                    <div className="overflow-hidden">
                      <p className="px-5 sm:px-6 pb-4 sm:pb-5 text-gray-500 text-[13px] sm:text-[14px] leading-relaxed border-t border-gray-100/80 pt-3.5">
                        {faq.answer}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
