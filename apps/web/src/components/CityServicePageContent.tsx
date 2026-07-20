"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, User } from "lucide-react";
import ServiceQuoteForm from "@/components/ServiceQuoteForm";
import CityFAQSection from "@/components/CityFAQSection";

interface CityServicePageContentProps {
  name: string;
  slug: string;
  h1?: string | null;
  description?: string | null;
}

const CityServicePageContent = ({ name, slug }: CityServicePageContentProps) => {
  const bgImage =
    slug === "toronto-pearson"
      ? "/business-chauffeur-new.jpg"
      : slug === "hamilton"
        ? "/hamilton-airport.jpg"
        : slug === "london"
          ? "/london-airport.jpg"
          : slug === "ottawa"
            ? "/ottawa-wedding.jpg"
            : slug === "montreal"
              ? "/montreal-airport.jpg"
              : slug === "niagara-buffalo"
                ? "/niagara-hourly.jpg"
                : slug === "oakville"
                  ? "/oakville-wedding.jpg"
                  : slug === "mississauga"
                    ? "/mississauga-driver.jpg"
                    : slug === "burlington"
                      ? "/burlington-airport.jpg"
                      : slug === "st-catharines"
                        ? "/st-catharines-business.jpg"
                        : slug === "greater-toronto-area"
                          ? "/gta-driver.jpg"
                          : "/cities2.jpg";

  const section1AltText: Record<string, string> = {
    "toronto-pearson": "Point-to-Point and Hourly Chauffeur Services",
    "greater-toronto-area": "Point-to-Point and Hourly Chauffeur Services",
    "hamilton": "Direct Transfers Airport Service",
    "london": " Point-to-Point Chauffeur Service",
    "ottawa": "Airport limo Service",
    "montreal": "VIP airport greeting",
    "oakville": "Hourly Chauffeur Service",
    "mississauga": "Mississauga Hourly Personal Driver",
    "burlington": "Airport Transfers Between Burlington and Pearson",
    "st-catharines": "single-trip chauffeur service",
    "niagara-buffalo": "Hourly Chauffeur Service for Niagara Falls"
  };

  const section2AltText: Record<string, string> = {
    "toronto-pearson": "Toronto Wedding Limo Service",
    "greater-toronto-area": "Luxury Chauffeur Service for Weddings and Events",
    "hamilton": " wedding car hire",
    "london": "Airport Hourly Chauffeur Service",
    "ottawa": "Wedding Transportation Service",
    "montreal": "Montreal Wedding Transportation Service",
    "oakville": "Wedding Limousine Services in Oakville",
    "mississauga": "Mississauga wedding limo service",
    "burlington": "luxury wedding car rental in Burlington",
    "st-catharines": "personal driver service",
    "niagara-buffalo": "Cross-Border Service Buffalo Niagara International Airport"
  };

  return (
    <div className="bg-transparent flex flex-col gap-12 md:gap-16 pb-12 md:pb-16">
      {/* Full-width Hero block */}
      <section className="relative min-h-[400px] md:min-h-[500px] pt-[120px] md:pt-[140px] flex flex-col justify-center overflow-hidden">
        {/* Background Image & Overlays */}
        <div className="absolute inset-0">
          <Image
            src={bgImage}
            alt={`${name} Luxury Limo`}
            fill
            priority
            sizes="100vw"
            className="object-cover object-[center_25%]"
            quality={75}
          />
        </div>
        <div className="absolute inset-0 bg-black/50" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-black/50" />

        <div className="relative max-w-[1250px] w-full mx-auto px-6 sm:px-8 md:px-12 z-10 py-10 md:py-16 flex flex-col items-center text-center">

          {/* Title */}
          {slug === "toronto-pearson" ? (
            <h1 className="text-4xl sm:text-5xl md:text-[56px] lg:text-[64px] font-bold tracking-tight mb-4 leading-[1.1]">
              <span className="text-white">Toronto Airport Limo Service for </span>
              <span className="text-[#C9A063]">Pearson Transfers</span>
            </h1>
          ) : slug === "greater-toronto-area" ? (
            <h1 className="text-4xl sm:text-5xl md:text-[56px] lg:text-[64px] font-bold tracking-tight mb-4 leading-[1.1]">
              <span className="text-white">Professional Airport Transfer Service Across the </span>
              <span className="text-[#C9A063]">Greater Toronto Area</span>
            </h1>
          ) : slug === "hamilton" ? (
            <h1 className="text-4xl sm:text-5xl md:text-[56px] lg:text-[64px] font-bold tracking-tight mb-4 leading-[1.1]">
              <span className="text-white">Private Chauffeured Car Service in </span>
              <span className="text-[#C9A063]">Hamilton, Ontario</span>
            </h1>
          ) : slug === "london" ? (
            <h1 className="text-4xl sm:text-5xl md:text-[56px] lg:text-[64px] font-bold tracking-tight mb-4 leading-[1.1]">
              <span className="text-white">Professional Airport Transfer Service </span>
              <span className="text-[#C9A063]">London, Ontario</span>
            </h1>
          ) : slug === "ottawa" ? (
            <h1 className="text-4xl sm:text-5xl md:text-[56px] lg:text-[64px] font-bold tracking-tight mb-4 leading-[1.1]">
              <span className="text-white">Professional Car Service Transportation in </span>
              <span className="text-[#C9A063]">Ottawa</span>
            </h1>
          ) : slug === "montreal" ? (
            <h1 className="text-4xl sm:text-5xl md:text-[56px] lg:text-[64px] font-bold tracking-tight mb-4 leading-[1.1]">
              <span className="text-white">Airport Transfer and Limo Services in </span>
              <span className="text-[#C9A063]">Montreal</span>
            </h1>
          ) : slug === "oakville" ? (
            <h1 className="text-4xl sm:text-5xl md:text-[56px] lg:text-[64px] font-bold tracking-tight mb-4 leading-[1.1]">
              <span className="text-white">Airport Transfers and Business Travel Service in </span>
              <span className="text-[#C9A063]">Oakville, Ontario</span>
            </h1>
          ) : slug === "mississauga" ? (
            <h1 className="text-4xl sm:text-5xl md:text-[56px] lg:text-[64px] font-bold tracking-tight mb-4 leading-[1.1]">
              <span className="text-white">Private Airport Taxi and Limousine Service in </span>
              <span className="text-[#C9A063]">Mississauga</span>
            </h1>
          ) : slug === "burlington" ? (
            <h1 className="text-4xl sm:text-5xl md:text-[56px] lg:text-[64px] font-bold tracking-tight mb-4 leading-[1.1]">
              <span className="text-white">Airport Limo and Corporate Transportation in </span>
              <span className="text-[#C9A063]">Burlington</span>
            </h1>
          ) : slug === "st-catharines" ? (
            <h1 className="text-4xl sm:text-5xl md:text-[56px] lg:text-[64px] font-bold tracking-tight mb-4 leading-[1.1]">
              <span className="text-white">Limousine Service and Wedding Transportation in </span>
              <span className="text-[#C9A063]">St. Catharines</span>
            </h1>
          ) : slug === "niagara-buffalo" ? (
            <h1 className="text-4xl sm:text-5xl md:text-[56px] lg:text-[64px] font-bold tracking-tight mb-4 leading-[1.1]">
              <span className="text-white">Wedding Car Rental and Chauffeur Service in </span>
              <span className="text-[#C9A063]">Niagara Falls</span>
            </h1>
          ) : (
            <h1 className="text-4xl sm:text-5xl md:text-[56px] lg:text-[64px] font-bold tracking-tight mb-4 leading-[1.1]">
              <span className="text-white">{name} </span>
              <span className="text-[#C9A063]">Airport Limo Service</span>
            </h1>
          )}

          {/* Breadcrumb inside hero */}
          <div className="flex justify-center items-center gap-2 text-[#C9A063] text-[14px] font-medium mb-8">
            <Link href="/" className="hover:text-white transition-colors">Home</Link>
            <span>»</span>
            <span>{name}</span>
          </div>

          {/* Description */}
          <div className="max-w-4xl mx-auto">
            {slug === "toronto-pearson" ? (
              <p className="text-base sm:text-[17px] text-white/90 font-light leading-relaxed mb-3">
                Getting to or from Pearson shouldn&apos;t be stressful. Sarj Worldwide&apos;s Toronto airport limo service handles your pickup time, flight status, and destination, so your <Link href="/services/airport-transfers" className="text-[#C9A063] hover:underline transition-colors">Airport Transfer</Link> is arranged around your actual schedule. Add our <Link href="/services/meet-greet" className="text-[#C9A063] hover:underline transition-colors">Meet &amp; Greet</Link> service for a chauffeur waiting at the terminal, helping you from baggage claim straight to the car.
              </p>
            ) : slug === "greater-toronto-area" ? (
              <div className="text-base sm:text-[17px] text-white/90 font-light leading-relaxed mb-3 flex flex-col gap-3">
                <p>
                  Book a professional <Link href="/services/airport-transfers" className="text-[#C9A063] hover:underline transition-colors">airport transfer service</Link> with Sarj Worldwide for direct travel between Toronto Pearson Airport (YYZ) and your home, hotel, office, or event venue. Our airport transfer service GTA customers rely on includes a private vehicle, confirmed pickup details, and a professional chauffeur who tracks your flight and follows your schedule.
                </p>
              </div>
            ) : slug === "hamilton" ? (
              <div className="text-base sm:text-[17px] text-white/90 font-light leading-relaxed mb-3 flex flex-col gap-3">
                <p>
                  Book <Link href="/services/hourly-chauffeur" className="text-[#C9A063] hover:underline transition-colors">private chauffeured transportation</Link> in Hamilton, Ontario, with Sarj Worldwide for corporate travel, airport pickups, direct transfers, and special occasions. Every journey is arranged around your confirmed pickup time, destination, and passenger details. Your chauffeur manages the route, traffic, and parking while you travel in a private vehicle, not a self-drive rental.
                </p>
              </div>
            ) : slug === "london" ? (
              <p className="text-base sm:text-[17px] text-white/90 font-light leading-relaxed mb-3">
                Are you looking for a dependable <Link href="/services/airport-transfers" className="text-[#C9A063] hover:underline transition-colors">private airport transfer</Link> in London, Ontario? Sarj Worldwide arranges private transportation between London International Airport and homes, hotels, offices, or other destinations. A professional chauffeur handles the route, traffic, and parking, supporting a smoother, pre-arranged journey for arrivals, departures, and business trips.
              </p>
            ) : slug === "ottawa" ? (
              <p className="text-base sm:text-[17px] text-white/90 font-light leading-relaxed mb-3">
                Need dependable transportation for a meeting, airport pickup, or client visit? Sarj Worldwide offers a private car service Ottawa businesses and travellers can reserve in advance. Our <Link href="/services/corporate-travel" className="text-[#C9A063] hover:underline transition-colors">Corporate Car Service</Link> connects offices, hotels, and conference venues near ByWard Market and the Ottawa Business Park with Ottawa International Airport and other confirmed destinations.
              </p>
            ) : slug === "montreal" ? (
              <p className="text-base sm:text-[17px] text-white/90 font-light leading-relaxed mb-3">
                Sarj Worldwide offers a <Link href="/services/airport-transfers" className="text-[#C9A063] hover:underline transition-colors">private airport transfer</Link> Montreal passengers can arrange for arrivals, departures, and onward travel across the city. Our Private car service connects Montreal-Trudeau International Airport (YUL) with homes, hotels, offices, and event venues through scheduled, chauffeur-driven transportation planned around your pickup details, destination, and passenger needs.
              </p>
            ) : slug === "oakville" ? (
              <p className="text-base sm:text-[17px] text-white/90 font-light leading-relaxed mb-3">
                Sarj Worldwide provides an organized <Link href="/services/corporate-travel" className="text-[#C9A063] hover:underline transition-colors">business travel service</Link> Oakville Ontario professionals can reserve for airport journeys, meetings, hotel transfers, and client transportation. Our <Link href="/services/airport-transfers" className="text-[#C9A063] hover:underline transition-colors">Door To Door Airport Service</Link> connects Oakville with Toronto Pearson Airport through pre-arranged, chauffeur-driven travel, coordinated around your confirmed itinerary for a comfortable trip between destinations.
              </p>
            ) : slug === "mississauga" ? (
              <p className="text-base sm:text-[17px] text-white/90 font-light leading-relaxed mb-3">
                Travelling to or from Pearson should not begin with uncertain pickup arrangements. Sarj Worldwide offers pre-booked, chauffeur-driven transportation between the airport and Mississauga homes, hotels, offices, or venues. Our pre-booked <Link href="/services/airport-transfers" className="text-[#C9A063] hover:underline transition-colors">airport transfer service</Link> is arranged around your flight and journey details, with passenger count, luggage, and any special requirements confirmed before travel.
              </p>
            ) : slug === "burlington" ? (
              <p className="text-base sm:text-[17px] text-white/90 font-light leading-relaxed mb-3">
                Sarj Worldwide provides <Link href="/services/airport-transfers" className="text-[#C9A063] hover:underline transition-colors">airport limo</Link> Burlington travellers can book alongside <Link href="/services/corporate-travel" className="text-[#C9A063] hover:underline transition-colors">corporate transportation</Link> for local businesses, connecting Toronto Pearson and Hamilton International Airport with homes, hotels, and offices. Our <Link href="/services/airport-transfers" className="text-[#C9A063] hover:underline transition-colors">Airport Pickup Service</Link> and Corporate Travel Service are arranged around your confirmed pickup time, flight details, and destination.
              </p>
            ) : slug === "st-catharines" ? (
              <p className="text-base sm:text-[17px] text-white/90 font-light leading-relaxed mb-3">
                Planning a wedding or need a direct trip across the Garden City? Sarj Worldwide offers limousine service St. Catharines Ontario couples and travellers can book for ceremonies, receptions, and scheduled transfers. Our <Link href="/services/wedding-events" className="text-[#C9A063] hover:underline transition-colors">wedding guest transportation</Link> and Point-to-Point Service are arranged around your venue, timing, and passenger details from start to finish.
              </p>
            ) : slug === "niagara-buffalo" ? (
              <p className="text-base sm:text-[17px] text-white/90 font-light leading-relaxed mb-3">
                Exchanging vows near the Falls or touring Clifton Hill for the day, getting there shouldn&apos;t mean renting a car or arranging separate rides. Sarj Worldwide offers wedding car rental Niagara couples and visitors can book, along with <Link href="/services/hourly-chauffeur" className="text-[#C9A063] hover:underline transition-colors">hourly chauffeur service</Link> across the region and cross-border transfers to Buffalo, New York.
              </p>
            ) : (
              <>
                <p className="text-base sm:text-[17px] text-white/90 font-light leading-relaxed mb-3">
                  Premium chauffeured transportation for business, events, and airport transfers.
                </p>
                <p className="text-base sm:text-[17px] text-white/90 font-light leading-relaxed">
                  We are committed to safe and discreet transportation with our best fleet of luxury vehicles and professional chauffeurs in {name}.
                </p>
              </>
            )}
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-wrap justify-center items-center gap-4 mt-8">
            <Link
              href="/reservation"
              className="inline-flex items-center justify-center px-8 py-3.5 bg-[#C9A063] text-black text-[13px] font-bold uppercase tracking-[0.1em] rounded-md hover:bg-[#B8935A] transition-all duration-300 shadow-[0_0_20px_rgba(201,160,99,0.3)] hover:shadow-[0_0_30px_rgba(201,160,99,0.5)]"
            >
              Book Now
            </Link>
            <a
              href="tel:4168935779"
              className="inline-flex items-center justify-center px-8 py-3.5 border border-white text-white text-[13px] font-bold uppercase tracking-[0.1em] rounded-md hover:bg-white hover:text-black transition-all duration-300"
            >
              Call +1 416-893-5779
            </a>
          </div>
        </div>
      </section>

      {/* Main Layout: Text & Form Side-by-Side */}
      <div className="max-w-[1250px] w-full mx-auto px-6 sm:px-8 md:px-12">
        <div className="md:grid md:grid-cols-[1fr_350px] lg:grid-cols-[1fr_400px] gap-12 md:gap-16">

          {/* Left Column: Welcome Content */}
          <div className="flex flex-col h-full">
            <section className="flex flex-col mb-12 md:mb-0">
              <div className="flex flex-col h-full">
                <span className="inline-block text-[11px] sm:text-[12px] font-bold tracking-[0.25em] uppercase text-[#C9A063] mb-4">
                  Welcome Aboard
                </span>
                {slug === "toronto-pearson" ? (
                  <>
                    <h2 className="text-[32px] sm:text-[40px] md:text-[44px] font-extrabold text-gray-900 leading-[1.15] tracking-tight mb-6">
                      Professional Chauffeur Service <span className="text-[#C9A063]">for Business Travel</span>
                    </h2>
                    <div className="w-16 h-[3px] bg-[#C9A063] mb-8" />
                    <div className="text-gray-600 text-[16px] md:text-[18px] leading-[1.9] font-normal mb-8 whitespace-pre-line">
                      <p className="mb-6">
                        We work with executives, employees, and visiting clients who need dependable transport between Pearson, downtown Toronto hotels, and Financial District offices. Our <Link href="/services/corporate-travel" className="text-[#C9A063] hover:underline transition-colors">Corporate Travel</Link> service lets companies set a standard for how their people and guests get around the city, whether that&apos;s a single airport pickup or a full day of meetings.
                      </p>
                      <p className="mb-0">
                        Every trip includes real-time flight tracking, so pickups adjust automatically if your flight is delayed, and a licensed chauffeur handling the route while you focus on work. From a quick transfer to appointments across the city, travel logistics become one less thing on your day.
                      </p>
                    </div>
                  </>
                ) : slug === "greater-toronto-area" ? (
                  <>
                    <h2 className="text-[32px] sm:text-[40px] md:text-[44px] font-extrabold text-gray-900 leading-[1.15] tracking-tight mb-6">
                      Business Travel Chauffeur <span className="text-[#C9A063]">for Corporate Journeys</span>
                    </h2>
                    <div className="w-16 h-[3px] bg-[#C9A063] mb-8" />
                    <div className="text-gray-600 text-[16px] sm:text-[17px] leading-[1.8] font-normal mb-10 whitespace-pre-line flex-grow">
                      <p className="mb-5">
                        Use the service for business trips, airport arrivals, family travel, guest pickups, or transportation to important events across Mississauga, Vaughan, Brampton, and Markham. Your journey is arranged in advance, so you know when your chauffeur will arrive and where you&apos;re headed. Reserve your airport transportation before your travel date.
                      </p>
                      <p className="mb-0">
                        For executives and visiting clients, the airport run is often just the first leg of a longer day. Our <Link href="/services/corporate-travel" className="text-[#C9A063] hover:underline transition-colors">business travel service</Link> moves passengers between airports, offices, meetings, and hotels with the same driver and vehicle for as long as the day requires, managing traffic, parking, and routing throughout.
                      </p>
                    </div>
                  </>
                ) : slug === "hamilton" ? (
                  <>
                    <h2 className="text-[32px] sm:text-[40px] md:text-[44px] font-extrabold text-gray-900 leading-[1.15] tracking-tight mb-6">
                      Corporate Travel That <span className="text-[#C9A063]">Keeps Business Moving</span>
                    </h2>
                    <div className="w-16 h-[3px] bg-[#C9A063] mb-8" />
                    <div className="text-gray-600 text-[16px] md:text-[18px] leading-[1.9] font-normal mb-8 whitespace-pre-line">
                      <p className="mb-6">
                        Hamilton&apos;s business travel isn&apos;t limited to downtown. Between meetings near McMaster Innovation Park, site visits along the Red Hill Business Park, and client dinners downtown, our Corporate Travel service covers the full day with one chauffeur and vehicle, whether it&apos;s a single visiting director or a full delegation moving between appointments.
                      </p>
                      <p className="mb-0">
                        Book a single transfer or coordinate several business movements as one itinerary, with a chauffeur managing the route and timing throughout. Passengers can prepare for meetings, take calls, or simply have a quiet moment between stops, all handled with the same discretion and professional standard of presentation.
                      </p>
                    </div>
                  </>
                ) : slug === "london" ? (
                  <>
                    <h2 className="text-[32px] sm:text-[40px] md:text-[44px] font-extrabold text-gray-900 leading-[1.15] tracking-tight mb-6">
                      Corporate Chauffeur Travel <span className="text-[#C9A063]">for Business Schedules</span>
                    </h2>
                    <div className="w-16 h-[3px] bg-[#C9A063] mb-8" />
                    <div className="text-gray-600 text-[16px] md:text-[18px] leading-[1.9] font-normal mb-8 whitespace-pre-line">
                      <p className="mb-6">
                        Our <Link href="/services/corporate-travel" className="text-[#C9A063] hover:underline transition-colors">executive chauffeur service</Link> helps executives, employees, clients, and visiting partners travel between airports, offices, hotels, and conference venues near downtown London and the Western University area. Book one transfer or arrange transportation for several appointments within the same itinerary, coordinated around your confirmed schedule.
                      </p>
                      <p className="mb-0">
                        A private chauffeur handles traffic, navigation, and parking throughout, giving passengers time to prepare for meetings, make calls, or relax while travelling across London. Advance booking also makes it easier to manage multi-stop business days without arranging separate vehicles for each destination.
                      </p>
                    </div>
                  </>
                ) : slug === "ottawa" ? (
                  <>
                    <h2 className="text-[32px] sm:text-[40px] md:text-[44px] font-extrabold text-gray-900 leading-[1.15] tracking-tight mb-6">
                      Private Chauffeurs for <span className="text-[#C9A063]">Ottawa Business Travel</span>
                    </h2>
                    <div className="w-16 h-[3px] bg-[#C9A063] mb-8" />
                    <div className="text-gray-600 text-[16px] md:text-[18px] leading-[1.9] font-normal mb-8 whitespace-pre-line">
                      <p className="mb-6">
                        Government meetings, embassy visits, and multi-stop schedules are routine in Ottawa, which is why a private driver Ottawa companies book needs to know the city beyond the airport route. Arrange transportation for airport-to-office journeys, client hospitality, roadshows, conferences, or several appointments across the downtown core and Ottawa&apos;s tech corridor.
                      </p>
                      <p className="mb-0">
                        Your chauffeur manages navigation and parking while passengers prepare for meetings, make calls, or travel privately between stops. Sarj Worldwide coordinates a single transfer or a full business itinerary based on the locations and timing provided during booking, with one point of contact handling the day from start to finish.
                      </p>
                    </div>
                  </>
                ) : slug === "montreal" ? (
                  <>
                    <h2 className="text-[32px] sm:text-[40px] md:text-[44px] font-extrabold text-gray-900 leading-[1.15] tracking-tight mb-6">
                      Corporate Chauffeur Service for <span className="text-[#C9A063]">Montreal Business Travel</span>
                    </h2>
                    <div className="w-16 h-[3px] bg-[#C9A063] mb-8" />
                    <div className="text-gray-600 text-[16px] md:text-[18px] leading-[1.9] font-normal mb-8 whitespace-pre-line">
                      <p className="mb-6">
                        Passengers who need additional arrival support can reserve our <Link href="/services/meet-and-greet" className="text-[#C9A063] hover:underline transition-colors">VIP airport greeting</Link> for a smoother transition from the terminal to their waiting vehicle, with a chauffeur on hand from baggage claim through to the car. This is available for both arriving and departing travellers across Montreal.
                      </p>
                      <p className="mb-0">
                        Choose professional limo services Montreal travellers can book in advance for private, comfortable transportation to a residence, hotel, workplace, meeting location, or special event. Whether heading to Old Montreal, the Plateau, or downtown Ville-Marie, your journey is arranged around your schedule from start to finish.
                      </p>
                    </div>
                  </>
                ) : slug === "oakville" ? (
                  <>
                    <h2 className="text-[32px] sm:text-[40px] md:text-[44px] font-extrabold text-gray-900 leading-[1.15] tracking-tight mb-6">
                      Corporate Chauffeur <span className="text-[#C9A063]">and Airport Transportation</span>
                    </h2>
                    <div className="w-16 h-[3px] bg-[#C9A063] mb-8" />
                    <div className="text-gray-600 text-[16px] md:text-[18px] leading-[1.9] font-normal mb-8 whitespace-pre-line">
                      <p className="mb-6">
                        Business schedules often involve more than one destination. Sarj Worldwide can coordinate transportation between offices, hotels, conference locations, restaurants, and Toronto Pearson Airport. Our <Link href="/services/corporate-travel" className="text-[#C9A063] hover:underline transition-colors">Executive chauffeur serive</Link>  is suitable for individual executives, employee travel, and professional guest pickups, with each trip planned around the timing and stops you provide.
                      </p>
                      <p className="mb-0">
                        Passengers can prepare for meetings or relax while their chauffeur manages the journey, parking, and traffic along the way. Advance reservations also make it easier to organize airport arrivals, departures, and onward business travel from Oakville, whether it&apos;s a single pickup or a full day of appointments.
                      </p>
                    </div>
                  </>
                ) : slug === "mississauga" ? (
                  <>
                    <h2 className="text-[32px] sm:text-[40px] md:text-[44px] font-extrabold text-gray-900 leading-[1.15] tracking-tight mb-6">
                      Business-Class Car Service <span className="text-[#C9A063]">for Mississauga Professionals</span>
                    </h2>
                    <div className="w-16 h-[3px] bg-[#C9A063] mb-8" />
                    <div className="text-gray-600 text-[16px] md:text-[18px] leading-[1.9] font-normal mb-8 whitespace-pre-line">
                      <p className="mb-6">
                        From Pearson arrivals to meetings near the Airport Corporate Centre or Meadowvale Business Park, our business class car service supports demanding corporate itineraries. The <Link href="/services/corporate-travel" className="text-[#C9A063] hover:underline transition-colors">client transportation service</Link> can be reserved for executives, visiting partners, employee movements, conferences, and client hospitality across Mississauga&apos;s business districts.
                      </p>
                      <p className="mb-0">
                        Instead of coordinating several last-minute rides, companies can organize professional chauffeur transportation around confirmed appointments, hotel stays, and office visits throughout Mississauga. Reserve an airport taxi and limousine service in advance for a private, door-to-door trip planned entirely around your schedule.
                      </p>
                    </div>
                  </>
                ) : slug === "burlington" ? (
                  <>
                    <h2 className="text-[32px] sm:text-[40px] md:text-[44px] font-extrabold text-gray-900 leading-[1.15] tracking-tight mb-6">
                      Corporate Travel and Point-to-Point Transfers <span className="text-[#C9A063]">for Burlington Businesses</span>
                    </h2>
                    <div className="w-16 h-[3px] bg-[#C9A063] mb-8" />
                    <div className="text-gray-600 text-[16px] md:text-[18px] leading-[1.9] font-normal mb-8 whitespace-pre-line">
                      <p className="mb-6">
                        Burlington&apos;s business community, from Brant Street offices to the Burlington GO corridor, relies on transportation that keeps meetings and client visits on schedule. Our Corporate Transportation in Burlington supports traveling professionals and client delegations moving between offices, hotels, and conference venues, with a licensed chauffeur managing traffic, parking, and timing throughout the day.
                      </p>
                      <p className="mb-0">
                        For a single scheduled trip, we offer point to point transfer limo services between one pickup and one destination, ideal for a direct appointment or meeting. Book one transfer or a full itinerary, coordinated around the stops and timing you provide.
                      </p>
                    </div>
                  </>
                ) : slug === "st-catharines" ? (
                  <>
                    <h2 className="text-[32px] sm:text-[40px] md:text-[44px] font-extrabold text-gray-900 leading-[1.15] tracking-tight mb-6">
                      Luxury Wedding Transportation <span className="text-[#C9A063]">and Point-to-Point Transfers</span>
                    </h2>
                    <div className="w-16 h-[3px] bg-[#C9A063] mb-8" />
                    <div className="text-gray-600 text-[16px] md:text-[18px] leading-[1.9] font-normal mb-8 whitespace-pre-line">
                      <p className="mb-6">
                        A St. Catharines wedding often moves between more than one location, from a downtown ceremony to photos at Montebello Park&apos;s rose gardens or a reception near the Port Dalhousie waterfront. Our luxury chauffeur service St. Catharines couples can reserve covers the wedding party, guest transfers, and return trips, coordinated around your ceremony and reception schedule.
                      </p>
                      <p className="mb-0">
                        For a single scheduled trip instead, our <Link href="/services/point-to-point-transfers" className="text-[#C9A063] hover:underline transition-colors">single-trip chauffeur service</Link> offers one pickup and one destination, ideal for an appointment, event, or airport connection through Hamilton or Pearson. This isn&apos;t a metered St. Catharines taxi ride; it&apos;s a private, chauffeur-driven vehicle booked and confirmed in advance.
                      </p>
                    </div>
                  </>
                ) : slug === "niagara-buffalo" ? (
                  <>
                    <h2 className="text-[32px] sm:text-[40px] md:text-[44px] font-extrabold text-gray-900 leading-[1.15] tracking-tight mb-6">
                      Wedding Transportation for Niagara Falls <span className="text-[#C9A063]">Ceremonies and Receptions</span>
                    </h2>
                    <div className="w-16 h-[3px] bg-[#C9A063] mb-8" />
                    <div className="text-gray-600 text-[16px] md:text-[18px] leading-[1.9] font-normal mb-8 whitespace-pre-line">
                      <p className="mb-6">
                        A Niagara Falls wedding day often moves between more than one location, from a Fallsview ceremony to photos at Queenston Heights or the gardens along the Niagara Parks riverfront, before a reception elsewhere in the region. Our <Link href="/services/wedding-events" className="text-[#C9A063] hover:underline transition-colors">Professional Wedding Transportation</Link> covers the wedding party, guest transfers, and return trips, coordinated around your ceremony and reception timing.
                      </p>
                      <p className="mb-0">
                        For guests or vendors needing a single scheduled trip instead, our Point-to-Point Service offers one pickup and one destination. This is private, chauffeur-driven transportation, not a self-drive car rental Niagara Falls visitors would need to navigate, insure, and return themselves.
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <h2 className="text-[32px] sm:text-[40px] md:text-[44px] font-extrabold text-gray-900 leading-[1.15] tracking-tight mb-6">
                      {name} to Pearson <span className="text-[#C9A063]">Airport Limo Service</span>
                    </h2>
                    <div className="w-16 h-[3px] bg-[#C9A063] mb-8" />
                    <div className="text-gray-600 text-[16px] sm:text-[17px] leading-[1.8] font-normal mb-10 whitespace-pre-line flex-grow">
                      <p className="mb-5">
                        If SARJ Worldwide knows anything about {name}, it&apos;s that this region deserves nothing less than
                        world-class luxury chauffeured transportation—whether you&apos;re here for business, breathtaking
                        scenery, major events, or simply the finest in hospitality. We bring the same premium fleet,
                        professional chauffeurs, and seamless service that define us globally.
                      </p>
                      <p className="mb-5">
                        We are committed to safe and discreet transportation with our best fleet of luxury
                        vehicles and chauffeurs trained to provide exceptional customer service and hospitality—we
                        like to call it &quot;Chauffeured Hospitality.&quot; With a global footprint in over 1000 cities
                        worldwide, the same standards apply wherever you travel.
                      </p>
                      <p className="mb-0">
                        Our Airport Concierge service includes expedited trips through security and access to VIP
                        airport lounges, so you can leave the stress of commercial air travel behind and step
                        straight into comfort. Book your luxury limo airport service in {name} today.
                      </p>
                    </div>
                  </>
                )}
              </div>

              <div className="pt-6">
                <Link
                  href="/contact"
                  className="inline-flex items-center justify-center px-8 py-3.5 bg-[#D4B78F] text-gray-900 text-[13px] font-bold uppercase tracking-[0.1em] rounded hover:bg-[#C9A063] transition-colors w-full sm:w-auto"
                >
                  CONTACT US
                </Link>
              </div>
            </section>
          </div>

          {/* Right Column: Sidebar Quote Form */}
          <aside className="h-full">
            <ServiceQuoteForm prefilledPickup={name} />
          </aside>
        </div>
      </div>

      {/* --- New Section 1: Most Requested Route --- */}
      <section className="w-full">
        <div className="max-w-[1250px] mx-auto px-6 sm:px-8 md:px-12">
          <div className="grid md:grid-cols-2 gap-10 md:gap-16 items-stretch">
            {/* Left Side: Image */}
            <div className="relative w-full h-[260px] sm:h-[320px] md:h-full md:min-h-[400px] rounded-2xl overflow-hidden shadow-lg">
              <Image
                src={bgImage}
                alt={section1AltText[slug] || "Point-to-Point and Hourly Chauffeur Services"}
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className={`object-cover ${["niagara-buffalo", "niagara-falls", "mississauga", "oakville"].includes(slug) ? "object-left" : ["hamilton", "greater-toronto-area"].includes(slug) ? "object-right" : "object-center"}`}
              />
            </div>

            {/* Right Side: Text */}
            <div className="flex flex-col justify-center py-4">
              <span className="inline-block text-[11px] sm:text-[12px] font-bold tracking-[0.25em] uppercase text-[#D4B78F] mb-4">
                MOST REQUESTED ROUTE
              </span>
              {slug === "toronto-pearson" ? (
                <>
                  <h2 className="text-[32px] sm:text-[40px] md:text-[44px] font-extrabold text-gray-900 leading-[1.15] tracking-tight mb-6">
                    Point-to-Point and <span className="text-[#C9A063]">Hourly Chauffeur Services</span>
                  </h2>
                  <div className="text-gray-600 text-[15px] sm:text-[16px] leading-[1.8] space-y-5">
                    <p>
                      Need to get from one place to another without the runaround? Our <Link href="/services/point-to-point-transfers" className="text-[#C9A063] hover:underline transition-colors">Point-to-Point Chauffeur Service</Link> covers direct trips between homes, offices, hotels, restaurants, and venues across the city. If your day looks more like a string of stops, meetings, shopping, dinner, and a few different addresses, our <Link href="/services/hourly-chauffeur" className="text-[#C9A063] hover:underline transition-colors">Hourly Chauffeur Service</Link> keeps the same car and driver with you the whole time, so you&apos;re not rebooking for every leg of the trip.
                    </p>
                  </div>
                </>
              ) : slug === "greater-toronto-area" ? (
                <>
                  <h2 className="text-[32px] sm:text-[40px] md:text-[44px] font-extrabold text-gray-900 leading-[1.15] tracking-tight mb-6">
                    Point-to-Point and <span className="text-[#C9A063]">Hourly Chauffeur Services</span>
                  </h2>
                  <div className="text-gray-600 text-[15px] sm:text-[16px] leading-[1.8] space-y-5">
                    <p>
                      Not every trip starts or ends at an airport. Our <Link href="/services/point-to-point-transfers" className="text-[#C9A063] hover:underline transition-colors">Chauffeur Point-to-Point Limo Service</Link> is built for direct transfers between homes, workplaces, restaurants, hotels, and venues throughout the GTA one pickup, one destination, no detours. When the day involves more than one stop, our <Link href="/services/hourly-chauffeur" className="text-[#C9A063] hover:underline transition-colors">Hourly Chauffeur Service</Link> keeps a private vehicle on standby for the full reserved window, which is what makes it the option most people searching for an hourly chauffeur service GTA end up choosing for meetings, appointments, shopping, or a night out  no re-booking between stops.
                    </p>
                  </div>
                </>
              ) : slug === "hamilton" ? (
                <>
                  <h2 className="text-[32px] sm:text-[40px] md:text-[44px] font-extrabold text-gray-900 leading-[1.15] tracking-tight mb-6">
                    Direct Transfers, Airport Pickups <span className="text-[#C9A063]">and Hourly Chauffeurs</span>
                  </h2>
                  <div className="text-gray-600 text-[15px] sm:text-[16px] leading-[1.8] space-y-5">
                    <p>
                      Choose our <Link href="/services/point-to-point-transfers" className="text-[#C9A063] hover:underline transition-colors">direct transfer service</Link> for direct travel between homes, workplaces, hotels, medical appointments, restaurants, and event venues. Travellers searching for car rental Hamilton Airport Ontario can also arrange an <Link href="/services/airport-transfers" className="text-[#C9A063] hover:underline transition-colors">Airport Transfer</Link> with pickup or drop-off at the terminal. For schedules with several stops, reserve an <Link href="/services/hourly-chauffeur" className="text-[#C9A063] hover:underline transition-colors">Hourly Chauffeur Service</Link> and keep a chauffeur for the day, creating one flexible booking for meetings, errands, dining, or local travel.
                    </p>
                  </div>
                </>
              ) : slug === "london" ? (
                <>
                  <h2 className="text-[32px] sm:text-[40px] md:text-[44px] font-extrabold text-gray-900 leading-[1.15] tracking-tight mb-6">
                    Direct Point-to-Point <span className="text-[#C9A063]">Transportation Across London</span>
                  </h2>
                  <div className="text-gray-600 text-[15px] sm:text-[16px] leading-[1.8] space-y-5">
                    <p>
                      Use our <Link href="/services/point-to-point-transfers" className="text-[#C9A063] hover:underline transition-colors">Point-to-Point Chauffeur Service</Link> when you need direct travel between two confirmed locations. Book transportation to a workplace, hotel, restaurant, medical appointment, private residence, or local venue. One-way and return journeys can be arranged in advance, so you know when and where your chauffeur will arrive. This service is ideal for passengers who want private door-to-door travel without unnecessary stops or last-minute ride requests.
                    </p>
                  </div>
                </>
              ) : slug === "ottawa" ? (
                <>
                  <h2 className="text-[32px] sm:text-[40px] md:text-[44px] font-extrabold text-gray-900 leading-[1.15] tracking-tight mb-6">
                    Airport Transfers and <span className="text-[#C9A063]">Direct Point-to-Point Trips</span>
                  </h2>
                  <div className="text-gray-600 text-[15px] sm:text-[16px] leading-[1.8] space-y-5">
                    <p>
                      Book our <Link href="/services/airport-transfers" className="text-[#C9A063] hover:underline transition-colors">Airport limo Service</Link> for scheduled transportation between Ottawa International Airport and your home, hotel, office, or meeting location. For local travel, the <Link href="/services/point-to-point-transfers" className="text-[#C9A063] hover:underline transition-colors">Point-to-Point Service</Link> covers one confirmed pickup and one destination, including restaurants, medical appointments, residences, and business venues. Travellers needing waiting time or several stops should request a custom or hourly itinerary instead of a standard direct transfer.
                    </p>
                  </div>
                </>
              ) : slug === "montreal" ? (
                <>
                  <h2 className="text-[32px] sm:text-[40px] md:text-[44px] font-extrabold text-gray-900 leading-[1.15] tracking-tight mb-6">
                    Point-to-Point and Meet <span className="text-[#C9A063]">& Greet Transportation</span>
                  </h2>
                  <div className="text-gray-600 text-[15px] sm:text-[16px] leading-[1.8] space-y-5">
                    <p>
                      Reserve our one-way car service for direct travel between residences, workplaces, restaurants, hotels, and private venues throughout Montreal. One-way and return journeys can be arranged around your preferred pickup time and destination. Airport passengers may add our Meet & Greet Service for a more organized transition from arrival to their waiting vehicle. This combination works well for visitors, professionals, families, and guests who prefer pre-arranged door-to-door transportation.
                    </p>
                  </div>
                </>
              ) : slug === "oakville" ? (
                <>
                  <h2 className="text-[32px] sm:text-[40px] md:text-[44px] font-extrabold text-gray-900 leading-[1.15] tracking-tight mb-6">
                    Point-to-Point and <span className="text-[#C9A063]">Hourly Chauffeur Options</span>
                  </h2>
                  <div className="text-gray-600 text-[15px] sm:text-[16px] leading-[1.8] space-y-5">
                    <p>
                      Choose our <Link href="/services/point-to-point-transfers" className="text-[#C9A063] hover:underline transition-colors">scheduled car service</Link> when you need direct transportation between two confirmed locations. The point to point transfer service Oakville passengers can arrange covers homes, workplaces, hotels, restaurants, and local venues. For schedules involving several appointments, our hourly chauffeur service Oakville option keeps the vehicle available for the reserved period. An <Link href="/services/hourly-chauffeur" className="text-[#C9A063] hover:underline transition-colors">Hourly Chauffeur Service</Link> is ideal for meetings, shopping, dining, corporate visits, or personal itineraries requiring multiple stops.
                    </p>
                  </div>
                </>
              ) : slug === "mississauga" ? (
                <>
                  <h2 className="text-[32px] sm:text-[40px] md:text-[44px] font-extrabold text-gray-900 leading-[1.15] tracking-tight mb-6">
                    Direct Trips and <span className="text-[#C9A063]">Hourly Chauffeur Flexibility</span>
                  </h2>
                  <div className="text-gray-600 text-[15px] sm:text-[16px] leading-[1.8] space-y-5">
                    <p>
                      A direct appointment at Square One requires a different arrangement from a day involving several meetings. Our Point-to-Point Service in Mississauga is designed for one scheduled pickup and destination, while the <Link href="/services/hourly-chauffeur" className="text-[#C9A063] hover:underline transition-colors">Hourly Personal Driver</Link> keeps the vehicle available for an agreed period. Hourly booking suits business calls, dining plans, shopping, appointments, and itineraries with waiting time or multiple stops, giving passengers greater control over local travel.
                    </p>
                  </div>
                </>
              ) : slug === "burlington" ? (
                <>
                  <h2 className="text-[32px] sm:text-[40px] md:text-[44px] font-extrabold text-gray-900 leading-[1.15] tracking-tight mb-6">
                    Airport Transfers Between Burlington and Pearson <span className="text-[#C9A063]">or Hamilton Airport</span>
                  </h2>
                  <div className="text-gray-600 text-[15px] sm:text-[16px] leading-[1.8] space-y-5">
                    <p>
                      Whether you&apos;re flying from Toronto Pearson or Hamilton International Airport, our airport limo Burlington service is built around your flight, not a fixed time slot. Pickup details, passenger count, and luggage requirements are confirmed in advance, and your chauffeur tracks flight status to adjust for delays. From Aldershot to the downtown core, every trip is arranged door-to-door for a private, dependable journey to or from the terminal.
                    </p>
                  </div>
                </>
              ) : slug === "st-catharines" ? (
                <>
                  <h2 className="text-[32px] sm:text-[40px] md:text-[44px] font-extrabold text-gray-900 leading-[1.15] tracking-tight mb-6">
                    Executive Black Car Service for St. <span className="text-[#C9A063]">Catharines Business Travel</span>
                  </h2>
                  <div className="text-gray-600 text-[15px] sm:text-[16px] leading-[1.8] space-y-5">
                    <p>
                      Downtown St. Catharines is home to government offices, legal firms, and financial teams who need transportation that matches the pace of the day. Our executive black car service St. Catharines companies rely on supporting client visits, meetings, and multi-stop schedules, with a licensed chauffeur managing traffic and parking. Book a single transfer or a coordinated itinerary between offices, hotels, and venues across the city.
                    </p>
                  </div>
                </>
              ) : slug === "niagara-buffalo" ? (
                <>
                  <h2 className="text-[32px] sm:text-[40px] md:text-[44px] font-extrabold text-gray-900 leading-[1.15] tracking-tight mb-6">
                    Hourly Chauffeur Service for Niagara Falls <span className="text-[#C9A063]">Visitors and Locals</span>
                  </h2>
                  <div className="text-gray-600 text-[15px] sm:text-[16px] leading-[1.8] space-y-5">
                    <p>
                      A day at the Falls rarely means just one stop. Our hourly chauffeur service keeps a private vehicle and driver available for an agreed period, suited to sightseeing at Clifton Hill, winery visits, dinner reservations, or a full wedding weekend itinerary. Wedding parties, guests, and Niagara visitors can add multiple stops or waiting time without arranging separate rides for each leg of the day.
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <h2 className="text-[32px] sm:text-[40px] md:text-[44px] font-extrabold text-gray-900 leading-[1.15] tracking-tight mb-6">
                    {name} to Pearson <span className="text-[#C9A063]">Airport Limo Service</span>
                  </h2>
                  <div className="text-gray-600 text-[15px] sm:text-[16px] leading-[1.8] space-y-5">
                    <p>
                      Our {name} to Pearson Airport Limo service is one of the most requested
                      transportation options for local residents and business professionals. Toronto
                      Pearson Airport can be busy and unpredictable, which is why having a reliable
                      transportation provider makes a significant difference.
                    </p>
                    <p>
                      Our chauffeurs monitor traffic conditions and plan routes carefully to help ensure
                      on-time arrivals. We understand the importance of reaching the airport on
                      schedule, whether you are travelling for business, a family vacation, or an
                      important event.
                    </p>
                    <p>
                      We provide convenient pickup and drop-off services throughout {name},
                      including residential neighborhoods, condominiums, hotels, office buildings, and
                      event venues.
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* --- New Section 2: Door to Door Airport Transportation --- */}
      <section className="w-full bg-white">
        <div className="max-w-[1250px] mx-auto px-6 sm:px-8 md:px-12">
          <div className="grid md:grid-cols-2 gap-12 lg:gap-20 items-stretch">
            {/* Left Side: Text */}
            <div className="order-2 md:order-1 pr-0 lg:pr-8 flex flex-col justify-center py-4">
              {slug === "toronto-pearson" ? (
                <>
                  <h2 className="text-[32px] sm:text-[40px] md:text-[44px] font-extrabold text-gray-900 leading-[1.15] tracking-tight mb-6">
                    Wedding and Event Limo <span className="text-[#C9A063]">Booking in Toronto</span>
                  </h2>
                  <div className="text-gray-600 text-[15px] sm:text-[16px] leading-[1.8] space-y-5 mb-8">
                    <p>
                      Your wedding day runs on a schedule, and we build ours around it. Sarj Worldwide&apos;s Wedding Limousine Service covers the ceremony, the reception, photos, and getting your guests where they need to be  all timed to fit the flow of your day, not the other way around. We also handle Event Transportation for galas, corporate functions, and private parties, so everyone arrives comfortably and on time.
                    </p>
                  </div>
                </>
              ) : slug === "greater-toronto-area" ? (
                <>
                  <h2 className="text-[32px] sm:text-[40px] md:text-[44px] font-extrabold text-gray-900 leading-[1.15] tracking-tight mb-6">
                    Luxury Chauffeur Service for <span className="text-[#C9A063]">Weddings and Events</span>
                  </h2>
                  <div className="text-gray-600 text-[15px] sm:text-[16px] leading-[1.8] space-y-5 mb-8">
                    <p>
                      A wedding day runs on its own timeline, and transportation shouldn&apos;t be the thing that throws it off. That&apos;s the thinking behind our luxury chauffeur service GTA couples and event planners book for weddings, receptions, galas, and private celebrations. Our <Link href="/services/wedding-events" className="text-[#C9A063] hover:underline transition-colors">Wedding and Event Transportation</Link> is coordinated directly around ceremony times, venue arrivals, the photography window, and guest pickups, with return travel planned from the start rather than arranged last-minute. Sarj Worldwide&apos;s chauffeurs have handled enough of these to know that the timing matters more than the vehicle  though couples, wedding parties, and guests all still travel in comfort.
                    </p>
                  </div>
                </>
              ) : slug === "hamilton" ? (
                <>
                  <h2 className="text-[32px] sm:text-[40px] md:text-[44px] font-extrabold text-gray-900 leading-[1.15] tracking-tight mb-6">
                    Wedding Cars and Event <span className="text-[#C9A063]">Transportation in Hamilton</span>
                  </h2>
                  <div className="text-gray-600 text-[15px] sm:text-[16px] leading-[1.8] space-y-5 mb-8">
                    <p>
                      Plan important arrivals with <Link href="/services/wedding-events" className="text-[#C9A063] hover:underline transition-colors">wedding car hire</Link> Hamilton couples and event organizers can tailor to their schedule. Sarj Worldwide coordinates transportation for ceremonies, receptions, photography locations, corporate functions, private celebrations, and guest transfers. Our <Link href="/services/wedding-events" className="text-[#C9A063] hover:underline transition-colors">Wedding &amp; Event Transportation</Link> service can include planned pickup times, multiple locations, and return journeys, helping couples, families, hosts, and attendees travel comfortably without leaving transport arrangements until the last minute.
                    </p>
                  </div>
                </>
              ) : slug === "london" ? (
                <>
                  <h2 className="text-[32px] sm:text-[40px] md:text-[44px] font-extrabold text-gray-900 leading-[1.15] tracking-tight mb-6">
                    Airport Pickups and <span className="text-[#C9A063]">Hourly Chauffeur Service</span>
                  </h2>
                  <div className="text-gray-600 text-[15px] sm:text-[16px] leading-[1.8] space-y-5 mb-8">
                    <p>
                      If you are comparing car rental options at London Ontario Airport but do not want to drive, reserve a private chauffeured vehicle instead. Our Hourly Chauffeur Service keeps the chauffeur and vehicle available for the booked period. It is useful for meetings, appointments, dining, shopping, airport pickups, or schedules with several stops. You can manage multiple journeys through one booking rather than arranging a different ride each time.
                    </p>
                  </div>
                </>
              ) : slug === "ottawa" ? (
                <>
                  <h2 className="text-[32px] sm:text-[40px] md:text-[44px] font-extrabold text-gray-900 leading-[1.15] tracking-tight mb-6">
                    Chauffeured Wedding <span className="text-[#C9A063]">and Event Transportation</span>
                  </h2>
                  <div className="text-gray-600 text-[15px] sm:text-[16px] leading-[1.8] space-y-5 mb-8">
                    <p>
                      Couples comparing wedding car rentals Ottawa options can reserve a professionally chauffeured vehicle rather than a self-drive rental. Our <Link href="/services/wedding-events" className="text-[#C9A063] hover:underline transition-colors">Wedding Transportation Service</Link> supports ceremony arrivals, reception transfers, photography stops, and guest travel. Event Transportation is also available for corporate functions, formal dinners, private celebrations, and other scheduled occasions. Provide the venue details and timeline in advance so each pickup and return journey can be coordinated clearly.
                    </p>
                  </div>
                </>
              ) : slug === "montreal" ? (
                <>
                  <h2 className="text-[32px] sm:text-[40px] md:text-[44px] font-extrabold text-gray-900 leading-[1.15] tracking-tight mb-6">
                    Wedding Limo and Event <span className="text-[#C9A063]">Transportation in Montreal</span>
                  </h2>
                  <div className="text-gray-600 text-[15px] sm:text-[16px] leading-[1.8] space-y-5 mb-8">
                    <p>
                      Sarj Worldwide provides a wedding vehicle service Montreal couples can coordinate around ceremonies, receptions, photography sessions, and guest transfers. Our <Link href="/services/wedding-events" className="text-[#C9A063] hover:underline transition-colors">Wedding Transportation Service</Link> supports the couple, wedding party, relatives, and invited guests with planned pickup and return times. We also offer Event Transportation for private celebrations, galas, formal dinners, and corporate functions, helping passengers travel comfortably between hotels, venues, and other scheduled locations.
                    </p>
                  </div>
                </>
              ) : slug === "oakville" ? (
                <>
                  <h2 className="text-[32px] sm:text-[40px] md:text-[44px] font-extrabold text-gray-900 leading-[1.15] tracking-tight mb-6">
                    Wedding Limousine <span className="text-[#C9A063]">Services in Oakville</span>
                  </h2>
                  <div className="text-gray-600 text-[15px] sm:text-[16px] leading-[1.8] space-y-5 mb-8">
                    <p>
                      Our wedding limousine services help couples coordinate transportation for ceremonies, receptions, photography locations, and guest travel. Sarj Worldwide offers a wedding limo service Oakville clients can plan around venue times, passenger needs, and return arrangements. Through our Wedding Transportation Service, couples and wedding parties can travel according to a prepared schedule. We also provide <Link href="/services/wedding-events" className="text-[#C9A063] hover:underline transition-colors">Wedding Event Transportation</Link> for private celebrations, formal dinners, galas, and corporate functions across Oakville and surrounding areas.
                    </p>
                  </div>
                </>
              ) : slug === "mississauga" ? (
                <>
                  <h2 className="text-[32px] sm:text-[40px] md:text-[44px] font-extrabold text-gray-900 leading-[1.15] tracking-tight mb-6">
                    Coordinated Wedding <span className="text-[#C9A063]">and Event Transportation</span>
                  </h2>
                  <div className="text-gray-600 text-[15px] sm:text-[16px] leading-[1.8] space-y-5 mb-8">
                    <p>
                      Wedding-day transport depends on timing, passenger coordination, and clear pickup instructions. Sarj Worldwide arranges <Link href="/services/wedding-events" className="text-[#C9A063] hover:underline transition-colors">wedding limo service</Link> for ceremonies, receptions, photography locations, wedding parties, and guest transfers across Mississauga. Our Event Transportation also supports galas, corporate functions, formal dinners, and private celebrations. Each journey can be planned around venue schedules and return requirements, reducing the need for guests to arrange separate vehicles during an important occasion.
                    </p>
                  </div>
                </>
              ) : slug === "burlington" ? (
                <>
                  <h2 className="text-[32px] sm:text-[40px] md:text-[44px] font-extrabold text-gray-900 leading-[1.15] tracking-tight mb-6">
                    Luxury Wedding Cars and Personal Driver <span className="text-[#C9A063]">Service in Burlington</span>
                  </h2>
                  <div className="text-gray-600 text-[15px] sm:text-[16px] leading-[1.8] space-y-5 mb-8">
                    <p>
                      For wedding parties, Sarj Worldwide arranges a <Link href="/services/wedding-events" className="text-[#C9A063] hover:underline transition-colors">luxury wedding car rental</Link> Burlington couples can book for ceremonies, receptions, and photography locations along the waterfront or at Spencer Smith Park. For a more flexible day, our personal driver service Burlington professionals and residents can reserve keeps a chauffeur and vehicle available for an agreed period, covering multiple stops, appointments, or a full evening out.
                    </p>
                  </div>
                </>
              ) : slug === "st-catharines" ? (
                <>
                  <h2 className="text-[32px] sm:text-[40px] md:text-[44px] font-extrabold text-gray-900 leading-[1.15] tracking-tight mb-6">
                    Hourly Chauffeur Service for <span className="text-[#C9A063]">Flexible Local Travel</span>
                  </h2>
                  <div className="text-gray-600 text-[15px] sm:text-[16px] leading-[1.8] space-y-5 mb-8">
                    <p>
                      Some days call for more flexibility than a single trip. Our <Link href="/services/hourly-chauffeur" className="text-[#C9A063] hover:underline transition-colors">personal driver service</Link> keeps a vehicle and driver available for an agreed period, suited to shopping, dining, appointments, or an evening at events like the Niagara Wine Festival. Passengers can make several stops or add waiting time without arranging separate rides, giving you full control over the day&apos;s schedule.
                    </p>
                  </div>
                </>
              ) : slug === "niagara-buffalo" ? (
                <>
                  <h2 className="text-[32px] sm:text-[40px] md:text-[44px] font-extrabold text-gray-900 leading-[1.15] tracking-tight mb-6">
                    Cross-Border Transfers to Buffalo <span className="text-[#C9A063]">Niagara International Airport</span>
                  </h2>
                  <div className="text-gray-600 text-[15px] sm:text-[16px] leading-[1.8] space-y-5 mb-8">
                    <p>
                      Sarj Worldwide provides cross-border chauffeur service between Niagara Falls, Ontario, and Buffalo Niagara International Airport (BUF), a common option for travellers connecting through the US side. Your chauffeur handles the border crossing, so there&apos;s no need for a car rental at Buffalo Niagara International Airport or a separate cross-border shuttle. Trips can also be arranged to Niagara Falls International Airport (IAG) on request.
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <h2 className="text-[32px] sm:text-[40px] md:text-[44px] font-extrabold text-gray-900 leading-[1.15] tracking-tight mb-6">
                    Door to Door Airport Transportation <span className="text-[#C9A063]">You Can Trust</span>
                  </h2>
                  <div className="text-gray-600 text-[15px] sm:text-[16px] leading-[1.8] space-y-5 mb-8">
                    <p>
                      {name} Airport Limo specializes in door to door airport transfers. From your home,
                      office, hotel, or event venue directly to the airport terminal, our service is
                      designed for maximum convenience.
                    </p>
                    <p>
                      Our drivers are courteous, helpful, and knowledgeable about Southern Ontario
                      routes and traffic patterns. They arrive on time, assist with luggage, and ensure
                      you are comfortable throughout the ride. For business travelers, our Black Car
                      Service offers a quiet and professional environment so you can focus on calls or
                      emails while on the way to the airport.
                    </p>
                  </div>
                </>
              )}
              <div>
                <Link
                  href="/quote"
                  className="inline-flex items-center justify-center px-8 py-3.5 bg-[#D4B78F] text-gray-900 text-[13px] font-bold uppercase tracking-[0.1em] rounded hover:bg-[#C9A063] transition-colors"
                >
                  GET A FREE QUOTE
                </Link>
              </div>
            </div>

            {/* Right Side: Image */}
            <div className="relative w-full h-[260px] sm:h-[320px] md:h-full md:min-h-[400px] rounded-[16px] overflow-hidden order-1 md:order-2">
              <Image
                src={
                  slug === "toronto-pearson"
                    ? "/toronto-wedding-pillars.jpg"
                    : slug === "hamilton"
                      ? "/hamilton-wedding.jpg"
                      : slug === "london"
                        ? "/london-business.jpg"
                        : slug === "ottawa"
                          ? "/ottawa-airport.jpg"
                          : slug === "montreal"
                            ? "/montreal-wedding.jpg"
                            : slug === "niagara-buffalo"
                              ? "/niagara-buffalo.jpg"
                              : slug === "oakville"
                                ? "/oakville-point.jpg"
                                : slug === "mississauga"
                                  ? "/mississauga-wedding-new.jpg"
                                  : slug === "burlington"
                                    ? "/burlington-wedding.jpg"
                                    : slug === "st-catharines"
                                      ? "/st-catharines-local.jpg"
                                      : slug === "greater-toronto-area"
                                        ? "/gta-wedding.jpg"
                                        : "/cities.jpeg"
                }
                alt={section2AltText[slug] || "Door to Door Airport Transportation You Can Trust"}
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className={`object-cover ${slug === "toronto-pearson" ? "object-bottom" : slug === "greater-toronto-area" ? "object-right" : ["hamilton", "london"].includes(slug) ? "object-left" : "object-center"}`}
              />
            </div>
          </div>
        </div>
      </section>

      {/* --- New Section 3: The right vehicle for every airport trip --- */}
      <section className="w-full bg-white">
        <div className="max-w-[1250px] mx-auto px-6 sm:px-8 md:px-12">
          {/* Header */}
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="flex items-center justify-center gap-4 mb-4">
              <div className="w-12 h-[1px] bg-[#D4B78F]"></div>
              <span className="text-[10px] sm:text-[11px] font-bold tracking-[0.2em] uppercase text-[#D4B78F]">
                DOOR TO DOOR
              </span>
              <div className="w-12 h-[1px] bg-[#D4B78F]"></div>
            </div>
            <h2 className="text-[32px] sm:text-[40px] md:text-[44px] font-extrabold text-gray-900 leading-[1.15] tracking-tight mb-6">
              The right vehicle for every<br className="hidden sm:block" /> <span className="text-[#C9A063]">airport trip</span>
            </h2>
            <p className="text-gray-500 text-[15px] sm:text-[16px] leading-[1.8]">
              Chauffeur-driven comfort for solo travellers, families, and full groups across {name} and Halton Region.
            </p>
          </div>

          {/* Cards Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Card 1 */}
            <div className="bg-white rounded-[16px] overflow-hidden border border-gray-200">
              <div className="relative w-full aspect-[16/9]">
                <Image src="/fleet-suv-card.jpg" alt="Executive SUVs" fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                <div className="absolute top-4 left-4 bg-white px-3 py-1.5 rounded-full text-[9px] font-bold tracking-[0.15em] text-gray-900 uppercase">
                  AIRPORT TRANSFERS
                </div>
                <div className="absolute bottom-4 right-4 text-white/90 text-[11px] font-medium flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5" /> Up to 6
                </div>
              </div>
              <div className="p-6 sm:p-8">
                <h3 className="text-[22px] font-sans text-gray-900 mb-3 font-semibold">Executive SUVs</h3>
                <p className="text-gray-500 text-[14px] leading-[1.7]">
                  Punctual {name} pickups and terminal drop-offs with free flight tracking and meet & greet on arrival.
                </p>
              </div>
            </div>

            {/* Card 2 */}
            <div className="bg-white rounded-[16px] overflow-hidden border border-gray-200">
              <div className="relative w-full aspect-[16/9]">
                <Image src="/fleet-sedan-card.jpg" alt="Luxury Sedans" fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                <div className="absolute top-4 left-4 bg-white px-3 py-1.5 rounded-full text-[9px] font-bold tracking-[0.15em] text-gray-900 uppercase">
                  BUSINESS TRAVEL
                </div>
                <div className="absolute bottom-4 right-4 text-white/90 text-[11px] font-medium flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5" /> Up to 3
                </div>
              </div>
              <div className="p-6 sm:p-8">
                <h3 className="text-[22px] font-sans text-gray-900 mb-3 font-semibold">Luxury Sedans</h3>
                <p className="text-gray-500 text-[14px] leading-[1.7]">
                  Discreet black car service for {name} executives and clients – with simple corporate billing.
                </p>
              </div>
            </div>

            {/* Card 3 */}
            <div className="bg-white rounded-[16px] overflow-hidden border border-gray-200">
              <div className="relative w-full aspect-[16/9]">
                <Image src="/fleet-sprinter-card.jpg" alt="Sprinter Vans" fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                <div className="absolute top-4 left-4 bg-white px-3 py-1.5 rounded-full text-[9px] font-bold tracking-[0.15em] text-gray-900 uppercase">
                  FAMILIES & GROUPS
                </div>
                <div className="absolute bottom-4 right-4 text-white/90 text-[11px] font-medium flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5" /> Up to 14
                </div>
              </div>
              <div className="p-6 sm:p-8">
                <h3 className="text-[22px] font-sans text-gray-900 mb-3 font-semibold">Sprinter Vans</h3>
                <p className="text-gray-500 text-[14px] leading-[1.7]">
                  Roomy vans for families and groups with extra luggage and comfortable seating throughout the ride.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --- New Section 4: CTA Banner --- */}
      <section className="relative w-full py-20 md:py-28 overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src="/cta-bg.jpg"
            alt="Airport Transportation"
            fill
            sizes="100vw"
            className="object-cover object-center"
            quality={75}
          />
          <div className="absolute inset-0 bg-black/70" />
        </div>

        <div className="relative max-w-4xl mx-auto px-6 sm:px-8 text-center z-10">
          <span className="inline-block text-[11px] sm:text-[12px] font-bold tracking-[0.25em] uppercase text-[#D4B78F] mb-4">
            READY WHEN YOU ARE
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-sans text-white leading-[1.2] mb-6">
            Easy Online Booking and 24 Hour Support
          </h2>
          <p className="text-gray-300 text-[15px] sm:text-[17px] leading-[1.8] mb-8 max-w-2xl mx-auto">
            {name} Airport Limo — reliable airport transportation across {name}, Halton Region and Southern Ontario.
          </p>
          <div className="text-[#D4B78F] text-3xl sm:text-4xl md:text-[44px] font-sans font-bold mb-10">
            <a href="tel:6476140100" className="hover:text-white transition-colors duration-300">+1 416-893-5779</a>
          </div>
          <Link
            href="/reservation"
            className="inline-flex items-center justify-center px-10 py-4 bg-[#D4B78F] text-black text-[13px] font-bold uppercase tracking-[0.1em] rounded-md hover:bg-[#C9A063] transition-all duration-300 shadow-lg"
          >
            Book Your Trip
          </Link>
        </div>
      </section>

      {/* --- New Section 5: FAQs --- */}
      <CityFAQSection name={name} slug={slug} />
    </div>
  );
};

export default CityServicePageContent;
