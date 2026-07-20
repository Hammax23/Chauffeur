"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, ArrowRight, HelpCircle } from "lucide-react";

interface CityFAQSectionProps {
  name: string;
  slug?: string;
}

export default function CityFAQSection({ name, slug }: CityFAQSectionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggle = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  const torontoPearsonFaqs = [
    {
      question: `What terminal is Air Canada at Pearson?`,
      answer: `Air Canada flies out of Terminal 1, but it's worth double-checking your specific flight, since this can occasionally vary.`,
    },
    {
      question: `What airport is YYZ?`,
      answer: `YYZ is the code for Toronto Pearson International Airport, located in Mississauga about 25 km from downtown Toronto.`,
    },
    {
      question: `How do I get downtown from Pearson Airport?`,
      answer: `The quickest options are a direct airport limo straight to your destination, or the UP Express train to Union Station, which takes about 28 minutes.`,
    },
    {
      question: `How do I book limo service in Toronto for my wedding?`,
      answer: `Just send us your date, guest count, pickup and drop-off locations, timing, and any vehicle preferences, and we'll put together a quote.`,
    },
    {
      question: `Can I book a Meet & Greet service at Toronto Pearson Airport?`,
      answer: `Yes we just need the passenger's name, airline, flight number, arrival time, and terminal to have someone waiting.`,
    },
    {
      question: `How early should I book a Toronto airport limo?`,
      answer: `The earlier the better for weekends, holidays, weddings, larger groups, or if you have a specific vehicle in mind — those fill up fastest.`,
    },
    {
      question: `Can I book a chauffeur for multiple stops around Toronto?`,
      answer: `Definitely our hourly service is built exactly for that, whether it's a few meetings, a night out, or a packed itinerary.`,
    },
  ];

  const greaterTorontoAreaFaqs = [
    {
      question: `How to book black car service airport transfer?`,
      answer: `Provide your pickup location, airport, travel date, flight details, passenger count, and preferred vehicle.`,
    },
    {
      question: `How early should I reserve an airport transfer in the GTA?`,
      answer: `Book several days ahead, especially for holidays, weekends, groups, or early-morning departures.`,
    },
    {
      question: `Can I book airport transportation for a corporate guest?`,
      answer: `Yes, transportation can be arranged for executives, employees, clients, and visiting business partners.`,
    },
    {
      question: `Does point-to-point service include non-airport trips?`,
      answer: `Yes, it covers direct travel between homes, hotels, offices, restaurants, and event venues.`,
    },
    {
      question: `Can an hourly chauffeur wait between multiple stops?`,
      answer: `Yes, the vehicle and chauffeur remain available throughout the reserved booking period.`,
    },
    {
      question: `Is wedding transportation available for guests?`,
      answer: `Yes, transportation can be arranged for couples, family members, wedding parties, and guests.`,
    },
    {
      question: `What details are required when booking an airport transfer?`,
      answer: `Share the pickup address, destination, date, time, flight number, luggage, and passenger details.`,
    },
  ];

  const hamiltonFaqs = [
    {
      question: `Is this a self-drive car rental service?`,
      answer: `No, Sarj Worldwide provides private vehicles with professional chauffeurs rather than self-drive rentals.`,
    },
    {
      question: `How do I book a chauffeured car in Hamilton?`,
      answer: `Provide your date, pickup point, destination, passenger count, schedule, and preferred vehicle.`,
    },
    {
      question: `Can I arrange a pickup from Hamilton Airport?`,
      answer: `Yes, airport pickup and drop-off services can be reserved in advance.`,
    },
    {
      question: `Can I hire a chauffeur for the day?`,
      answer: `Yes, hourly bookings allow you to keep the chauffeur and vehicle for multiple stops.`,
    },
    {
      question: `Is point-to-point transportation available within Hamilton?`,
      answer: `Yes, direct transportation is available between homes, offices, hotels, restaurants, and venues.`,
    },
    {
      question: `How early should I book wedding car hire in Hamilton?`,
      answer: `Book early to secure your preferred vehicle and schedule, especially during peak wedding seasons.`,
    },
    {
      question: `Can corporate travel include several stops?`,
      answer: `Yes, business transportation can be planned around meetings, hotels, airports, and multiple appointments.`,
    },
  ];

  const londonFaqs = [
    {
      question: `How do I book an airport transfer service in London?`,
      answer: `Provide your travel date, pickup address, destination, flight details, passenger count, and luggage information.`,
    },
    {
      question: `Can I arrange transportation from London International Airport?`,
      answer: `Yes, private airport pickups and drop-offs can be booked in advance.`,
    },
    {
      question: `Is this a self-drive car rental service?`,
      answer: `No, Sarj Worldwide provides private vehicles driven by professional chauffeurs.`,
    },
    {
      question: `Can corporate transportation include several meetings?`,
      answer: `Yes, multiple offices, hotels, meetings, or venues can be added to one itinerary.`,
    },
    {
      question: `Is point-to-point service available for local journeys?`,
      answer: `Yes, direct travel can be arranged between any confirmed pickup point and destination.`,
    },
    {
      question: `Can I reserve a chauffeur by the hour?`,
      answer: `Yes, the chauffeur and vehicle remain available throughout the reserved period.`,
    },
    {
      question: `How early should I reserve my chauffeur service?`,
      answer: `Book once your schedule is confirmed, especially for airport travel, groups, and busy dates.`,
    },
  ];

  const ottawaFaqs = [
    {
      question: `How do I book a private car service in Ottawa?`,
      answer: `Provide your date, pickup address, destination, passenger count, and preferred travel time.`,
    },
    {
      question: `Is this an Ottawa Ontario taxi service?`,
      answer: `No, Sarj Worldwide offers pre-arranged private chauffeur transportation rather than on-demand taxi service.`,
    },
    {
      question: `Can I reserve an airport transfer service Ottawa travellers can use?`,
      answer: `Yes, private airport pickups and drop-offs can be scheduled in advance.`,
    },
    {
      question: `Can I hire a private driver Ottawa businesses can use for meetings?`,
      answer: `Yes, business itineraries can include offices, hotels, airports, and scheduled appointments.`,
    },
    {
      question: `Is Sarj Worldwide an Ottawa cab company?`,
      answer: `No, it provides reserved chauffeur-driven transportation rather than street-hail cab service.`,
    },
    {
      question: `Can point-to-point transportation include several stops?`,
      answer: `A standard point-to-point trip is direct; multiple stops require a custom or hourly booking.`,
    },
    {
      question: `How is this different from a taxi service in Ottawa Canada?`,
      answer: `Your vehicle, pickup time, and itinerary are confirmed before the scheduled journey.`,
    },
  ];

  const montrealFaqs = [
    {
      question: `How do I book an airport transfer in Montreal?`,
      answer: `Provide your travel date, pickup location, destination, flight details, passenger count, and luggage needs.`,
    },
    {
      question: `Are limo services available from Montreal airport?`,
      answer: `Yes, pre-arranged chauffeur transportation can be booked for airport pickups and drop-offs.`,
    },
    {
      question: `Can I reserve a Meet & Greet service?`,
      answer: `Yes, share the passenger name, airline, flight number, and arrival details when booking.`,
    },
    {
      question: `Is Sarj Worldwide an exotic car rental company in Montreal?`,
      answer: `No, customers comparing exotic car rental Montreal options can book private chauffeur-driven transportation instead.`,
    },
    {
      question: `Can corporate transportation include multiple stops?`,
      answer: `Yes, offices, hotels, meetings, restaurants, and other business locations can be included in one itinerary.`,
    },
    {
      question: `How early should I book wedding transportation in Montreal?`,
      answer: `Reserve early to secure your preferred schedule and vehicle for the wedding date.`,
    },
    {
      question: `Is point-to-point service available without airport travel?`,
      answer: `Yes, direct local transportation can be booked between any confirmed pickup and destination.`,
    },
  ];

  const oakvilleFaqs = [
    {
      question: `What affects limousine rental Toronto price?`,
      answer: `Pricing may vary by vehicle, booking duration, travel distance, date, passenger count, and requested stops.`,
    },
    {
      question: `How do I book a wedding limousine service?`,
      answer: `Provide your wedding date, locations, schedule, passenger count, and preferred vehicle when requesting a quote.`,
    },
    {
      question: `Can I reserve an airport shuttle Oakville to Pearson?`,
      answer: `Yes, private chauffeur-driven transportation between Oakville and Toronto Pearson Airport can be booked in advance.`,
    },
    {
      question: `How early should I reserve an Oakville airport transfer?`,
      answer: `Book early for weekends, holidays, group travel, and early-morning or late-night flights.`,
    },
    {
      question: `Can corporate travel include multiple destinations?`,
      answer: `Yes, offices, hotels, airports, meetings, and restaurants can be included in one planned itinerary.`,
    },
    {
      question: `Is hourly chauffeur service suitable for business meetings?`,
      answer: `Yes, it keeps the chauffeur and vehicle available between appointments during the reserved period.`,
    },
    {
      question: `Can I book point-to-point transportation for local travel?`,
      answer: `Yes, direct local journeys can be arranged between any confirmed pickup point and destination.`,
    },
  ];

  const mississaugaFaqs = [
    {
      question: `Where is Toronto Pearson International Airport Mississauga ON Canada?`,
      answer: `Toronto Pearson International Airport is located in Mississauga, Ontario, northwest of downtown Toronto.`,
    },
    {
      question: `What does aeroport taxi and limousine service Mississauga include?`,
      answer: `It includes pre-booked, chauffeur-driven transportation between Pearson Airport and your confirmed destination.`,
    },
    {
      question: `How do I reserve limousine service in Mississauga Ontario?`,
      answer: `Share your date, pickup point, destination, passenger count, luggage needs, and preferred travel time.`,
    },
    {
      question: `Is car rental Mississauga Airport self-drive or chauffeur-driven?`,
      answer: `Sarj Worldwide offers private chauffeur-driven transportation rather than standard self-drive car rental.`,
    },
    {
      question: `How early should I reserve transportation to Pearson Airport?`,
      answer: `Advance booking is recommended, especially for holidays, groups, early departures, and special vehicle requests.`,
    },
    {
      question: `Can I arrange airport transportation for a business guest?`,
      answer: `Yes, transportation can be scheduled for executives, employees, clients, and visiting corporate guests.`,
    },
    {
      question: `Can point-to-point or hourly bookings include multiple stops?`,
      answer: `Point-to-point covers a direct trip, while hourly chauffeur bookings are better suited to multiple stops.`,
    },
  ];

  const burlingtonFaqs = [
    {
      question: `How far is Burlington from Toronto airport?`,
      answer: `Burlington is approximately 45 to 60 minutes from Toronto Pearson International Airport, depending on traffic and time of day.`,
    },
    {
      question: `How much is an airport taxi from Burlington to Pearson?`,
      answer: `Pricing depends on pickup location, vehicle type, and time of travel; Sarj Worldwide provides a confirmed rate at the time of booking rather than a metered fare.`,
    },
    {
      question: `Does Sarj Worldwide serve both Pearson and Hamilton International Airport from Burlington?`,
      answer: `Yes, Burlington's location allows for direct chauffeur-driven transfers to and from both Toronto Pearson and Hamilton International Airport.`,
    },
    {
      question: `What is included in Burlington's corporate transportation service?`,
      answer: `Corporate transportation includes a licensed chauffeur, a private vehicle, and pre-arranged pickup for executives, employees, and client delegations travelling between offices, hotels, and meetings.`,
    },
    {
      question: `How is point-to-point service different from an hourly booking?`,
      answer: `Point-to-point covers a single pickup and destination, while an hourly personal driver service keeps the vehicle available for a set period to cover multiple stops.`,
    },
    {
      question: `How far in advance should I book a wedding car in Burlington?`,
      answer: `Wedding transportation should be booked as early as possible, ideally several weeks ahead, to confirm vehicle availability and coordinate ceremony and reception timing.`,
    },
    {
      question: `Is this a car rental or a chauffeur-driven service?`,
      answer: `Sarj Worldwide provides private chauffeur-driven transportation, not a self-drive car rental, for all Burlington bookings.`,
    },
  ];

  const stCatharinesFaqs = [
    {
      question: `Why is St. Catharines called the Garden City?`,
      answer: `St. Catharines earned the nickname "Garden City" for its lush parks, green spaces, and location in the heart of the Niagara Region.`,
    },
    {
      question: `Is limousine service in St. Catharines the same as a taxi?`,
      answer: `No, Sarj Worldwide provides private, chauffeur-driven limousine service booked in advance, not a metered St. Catharines taxi.`,
    },
    {
      question: `How far in advance should I book wedding transportation?`,
      answer: `Wedding transportation should be booked several weeks ahead to confirm vehicle availability and coordinate ceremony, photography, and reception timing.`,
    },
    {
      question: `Does point-to-point service include airport transfers?`,
      answer: `Yes, point-to-point trips can include transfers to or from Hamilton International Airport or Toronto Pearson.`,
    },
    {
      question: `Can I book executive black car service for a client visit?`,
      answer: `Yes, executive black car service can be arranged for client meetings, business guests, and multi-stop corporate itineraries.`,
    },
    {
      question: `What is the difference between point-to-point and hourly chauffeur service?`,
      answer: `Point-to-point covers one pickup and destination, while hourly chauffeur service keeps the vehicle available for a set period with multiple stops.`,
    },
    {
      question: `Can hourly chauffeur service be booked for local events?`,
      answer: `Yes, hourly bookings suit local events, dinners, and outings such as the Niagara Wine Festival.`,
    },
  ];

  const niagaraFallsFaqs = [
    {
      question: `How far is Niagara Falls, Ontario from Buffalo Niagara International Airport?`,
      answer: `Buffalo Niagara International Airport is approximately 30 to 40 minutes from Niagara Falls, Ontario, depending on border wait times.`,
    },
    {
      question: `Is this a self-drive car rental or a chauffeur-driven service?`,
      answer: `Sarj Worldwide provides private, chauffeur-driven transportation, not a self-drive car rental, for all Niagara Falls and cross-border bookings.`,
    },
    {
      question: `Does Sarj Worldwide cross the Canada-US border?`,
      answer: `Yes, cross-border transfers to and from Buffalo, New York are available; passengers should carry valid passports or required travel documents.`,
    },
    {
      question: `How far in advance should I book wedding transportation in Niagara Falls?`,
      answer: `Wedding transportation should be booked several weeks ahead to confirm vehicle availability and coordinate ceremony, photography, and reception timing.`,
    },
    {
      question: `What is the difference between hourly chauffeur service and point-to-point transfers?`,
      answer: `Point-to-point covers one pickup and destination, while hourly chauffeur service keeps the vehicle available for a set period with multiple stops.`,
    },
    {
      question: `Can hourly chauffeur service be booked for a wedding weekend?`,
      answer: `Yes, hourly bookings suit rehearsal dinners, guest transportation, and multi-stop wedding weekend itineraries.`,
    },
    {
      question: `Can point-to-point service include an airport transfer?`,
      answer: `Yes, point-to-point trips can include transfers to Buffalo Niagara International Airport or Niagara Falls International Airport.`,
    },
  ];

  const defaultFaqs = [
    {
      question: `How long is the drive from ${name} to Pearson?`,
      answer: `Travel time varies based on your exact location in ${name} and current traffic conditions. We always monitor live traffic and plan the optimal route to ensure you arrive at the terminal with plenty of time to spare.`,
    },
    {
      question: `Which airports do you serve from ${name}?`,
      answer: `We provide luxury chauffeured transportation to and from Toronto Pearson International Airport (YYZ), Billy Bishop Toronto City Airport (YTZ), John C. Munro Hamilton International Airport (YHM), and all other private or regional airports in Southern Ontario.`,
    },
    {
      question: `Do you offer flat-rate fares?`,
      answer: `Yes, we offer competitive, transparent flat-rate pricing for all airport transfers. When you book online or request a quote through our system, you will see the exact fare upfront with no hidden fees or unexpected surcharges.`,
    },
    {
      question: `Do you track my flight on arrival?`,
      answer: `Absolutely. We actively monitor your flight's status in real-time. Whether you arrive early or encounter delays, your chauffeur adjusts their arrival time accordingly and will be waiting for you when you land.`,
    },
    {
      question: `Which areas of ${name} do you serve?`,
      answer: `We provide seamless, door-to-door service to all residential neighborhoods, corporate offices, hotels, and event venues across ${name} and the surrounding regions.`,
    },
    {
      question: `How do I pay and can I use a coupon?`,
      answer: `We accept all major credit cards through our secure online reservation system. If you have a promotional code or corporate discount, you can apply it directly during the checkout process before confirming your ride.`,
    },
  ];

  const faqs = slug === "toronto-pearson"
    ? torontoPearsonFaqs
    : slug === "greater-toronto-area"
      ? greaterTorontoAreaFaqs
      : slug === "hamilton"
        ? hamiltonFaqs
        : slug === "london"
          ? londonFaqs
          : slug === "ottawa"
            ? ottawaFaqs
            : slug === "montreal"
              ? montrealFaqs
              : slug === "oakville"
                ? oakvilleFaqs
                : slug === "mississauga"
                  ? mississaugaFaqs
                  : slug === "burlington"
                    ? burlingtonFaqs
                    : slug === "st-catharines"
                      ? stCatharinesFaqs
                      : slug === "niagara-buffalo"
                        ? niagaraFallsFaqs
                        : defaultFaqs;

  return (
    <section className="relative bg-white overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-px bg-gradient-to-r from-transparent via-[#C9A063]/25 to-transparent" />

      <div className="max-w-[1250px] mx-auto px-6 sm:px-8 md:px-12 mb-16">
        <div className="w-full bg-white rounded-3xl border border-gray-100 p-8 md:p-12 shadow-sm">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.4fr] gap-12 md:gap-16 items-start">
            {/* Left — intro */}
            <div className="lg:sticky lg:top-28">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-gray-200 bg-[#fafafa] mb-4">
                <HelpCircle className="w-3.5 h-3.5 text-[#C9A063]" strokeWidth={2} />
                <span className="text-gray-800 text-[11px] sm:text-[12px] font-medium tracking-widest uppercase">
                  GOOD TO KNOW
                </span>
              </div>

              <h2 className="text-[#1a2b3c] text-2xl sm:text-3xl md:text-[32px] font-bold tracking-tight mb-3 leading-tight lg:whitespace-nowrap">
                Frequently Asked Questions
              </h2>

              <p className="text-gray-500 text-[14px] sm:text-[15px] leading-relaxed mb-6 max-w-md">
                Find quick answers to common questions about our {name} service. Need more help? Our 24/7 support team is always available.
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
      </div>
    </section>
  );
}
