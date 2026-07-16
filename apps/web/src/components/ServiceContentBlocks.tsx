"use client";

import Image from "next/image";
import Link from "next/link";
import { type Service } from "@/data/services";

export default function ServiceContentBlocks({ service }: { service: Service }) {
  // If we have specific text for airport transfers, use it exactly as provided in the screenshot
  const isAirport = service.slug === 'airport-transfers';
  const isCorporate = service.slug === 'corporate-travel';
  const isPointToPoint = service.slug === 'point-to-point-transfers';
  const isHourly = service.slug === 'hourly-chauffeur';
  const isWedding = service.slug === 'wedding-events';
  const isMeetGreet = service.slug === 'meet-greet';
  const isVipTransport = service.slug === 'vip-transport';
  const isLongDistance = service.slug === 'intercity-travel';

  let blocks;
  if (isAirport) {
    blocks = [
      {
        titleBlack: "How Our Airport Car ",
        titleGold: "Service Works",
        paragraphs: [
          "Getting to Toronto Pearson shouldn't mean guessing when your ride will show up. Our airport transportation is built around your actual flight, not a fixed time slot: we track your arrival or departure and adjust pickup automatically for delays. Every trip includes a private vehicle and a professional chauffeur who handles the drive, parking, and route.",
          <>Looking for the best car service to Pearson Airport? Our <Link href="/cities-we-serve/mississauga" className="text-[#C9A063] font-semibold hover:underline">private airport transfer service in Mississauga</Link> and <Link href="/cities-we-serve/oakville" className="text-[#C9A063] font-semibold hover:underline">Toronto airport limo service in Oakville</Link> connect directly with Pearson for both arrivals and departures.</>
        ],
        buttonText: "Book Now",
        buttonLink: "/reservation",
        image: "/heropics/airport2.png",
        imagePosition: "right" as const
      },
      {
        titleBlack: "Airport Transportation Across the ",
        titleGold: "Greater Toronto Area and Beyond",
        paragraphs: [
          <>Beyond Pearson, we provide airport taxi and limousine service throughout the region, including <Link href="/cities-we-serve/burlington" className="text-[#C9A063] font-semibold hover:underline">airport limo service in Burlington</Link> and <Link href="/cities-we-serve/ottawa" className="text-[#C9A063] font-semibold hover:underline">Ottawa airport limo service</Link> for the same confirmed, chauffeur-driven experience.</>,
          "We also serve travellers in Hamilton and London, along with cross-border connections through Niagara Falls and Montreal. Whether you're arriving, departing, or connecting onward, every trip is arranged around your schedule with the same professional standard across every location we serve."
        ],
        buttonText: "",
        buttonLink: "",
        image: "/heropics/buisnesstravel.png",
        imagePosition: "left" as const
      }
    ];
  } else if (isCorporate) {
    blocks = [
      {
        titleBlack: "What Makes a Corporate Travel ",
        titleGold: "Service Different",
        paragraphs: [
          "A corporate traveler needs more than just a ride, they need consistency: the same standard of pickup, the same professional presentation, and a chauffeur who treats the schedule as fixed. Our corporate travel service is built for exactly that, with one point of contact handling pickups, waiting time, and multi-stop days without last-minute changes.",
          <>For companies in the city, our <Link href="/cities-we-serve/toronto-pearson" className="text-[#C9A063] font-semibold hover:underline">corporate limo service Toronto</Link> covers everything from a single airport pickup to a full day moving between offices and meetings.</>
        ],
        buttonText: "Book Now",
        buttonLink: "/reservation",
        image: "/heropics/buisnesstravel.png",
        imagePosition: "right" as const
      },
      {
        titleBlack: "Business Travel Chauffeurs for ",
        titleGold: "Every Kind of Schedule",
        paragraphs: [
          "Business class car service isn't only for airport runs. A business travel chauffeur can manage a roadshow with several stops, a client hospitality day, or a single transfer between a hotel and a boardroom, with the same driver and vehicle throughout. Chauffeur service for business works best when it's booked in advance, so pickup times, passenger count, and any special requirements are confirmed before the day begins, leaving nothing to arrange last minute."
        ],
        buttonText: "",
        buttonLink: "",
        image: "/heropics/bussinuss.jpg",
        imagePosition: "left" as const
      }
    ];
  } else if (isPointToPoint) {
    blocks = [
      {
        titleBlack: "What Point-to-Point Service ",
        titleGold: "Actually Means",
        paragraphs: [
          "Point-to-point is the simplest way to book a private ride: one pickup, one destination, nothing added on. It's different from an hourly booking, where the vehicle stays with you for a set period, and different from a multi-stop corporate itinerary. You tell us where you're starting and where you're going, and the trip is confirmed at a fixed rate in advance.",
          <>This is one of the most requested trips for our <Link href="/cities-we-serve/toronto-pearson" className="text-[#C9A063] font-semibold hover:underline">point to point service in Toronto</Link>, where a direct transfer to Pearson Airport is often all that&apos;s needed.</>
        ],
        buttonText: "Book Now",
        buttonLink: "/reservation",
        image: "/heropics/hourlyasdirected.png",
        imagePosition: "right" as const
      },
      {
        titleBlack: "When a Direct Transfer Makes More Sense ",
        titleGold: "Than Other Options",
        paragraphs: [
          <>If your day only involves getting from A to B, an hourly chauffeur or a full-day itinerary is more than you need. Point-to-point suits a single meeting, a dinner reservation, a direct airport trip, or dropping someone off without waiting around. It&apos;s also a common choice for our <Link href="/cities-we-serve/mississauga" className="text-[#C9A063] font-semibold hover:underline">point to point service in Mississauga</Link>, where a direct transfer to Pearson Airport is frequently the only trip needed for the day.</>
        ],
        buttonText: "",
        buttonLink: "",
        image: "/heropics/airportTransfers.png",
        imagePosition: "left" as const
      }
    ];
  } else if (isHourly) {
    blocks = [
      {
        titleBlack: "More Than a Ride, A Vehicle That ",
        titleGold: "Waits for You",
        paragraphs: [
          "Some days don't fit into a single trip. Hourly car service keeps your chauffeur and vehicle on call for a set block of time, so you can make several stops, run errands, attend back-to-back meetings, or simply have someone waiting outside while you're at dinner. It's the difference between booking a ride and booking a chauffeur for the day: one covers a single destination, the other stays with you until you're done."
        ],
        buttonText: "Book Now",
        buttonLink: "/reservation",
        image: "/heropics/hourlyasdirected.png",
        imagePosition: "right" as const
      },
      {
        titleBlack: "From Holiday Parties to ",
        titleGold: "Full Days Out",
        paragraphs: [
          "Chauffeur hire during the holidays is one of the most common reasons people book by the hour, whether it's a night of visiting several parties, a group outing that needs to stay together, or a day of shopping without worrying about parking. Our luxury chauffeur service suits birthdays, anniversaries, and nights out just as easily as business use, with the same vehicle and driver handling every stop on your list."
        ],
        buttonText: "",
        buttonLink: "",
        image: "/heropics/weddingsandevent.png",
        imagePosition: "left" as const
      }
    ];
  } else if (isWedding) {
    blocks = [
      {
        titleBlack: "From the Ceremony to ",
        titleGold: "the Reception",
        paragraphs: [
          "A wedding day rarely stays in one place. Our wedding car rentals are built around the full schedule, from picking up the wedding party before the ceremony to photos afterward and the drive to the reception, with return trips arranged for later in the evening. Every chauffeur is licensed, background-checked, and covered by commercial insurance, with punctual arrival guaranteed for every stop.",
          <>This is one of our most requested bookings for <Link href="/cities-we-serve/mississauga" className="text-[#C9A063] font-semibold hover:underline">wedding limo service in Mississauga</Link>, where couples often need transport across several venues in one afternoon.</>
        ],
        buttonText: "Book Now",
        buttonLink: "/reservation",
        image: "/heropics/wed.jpeg",
        imagePosition: "right" as const
      },
      {
        titleBlack: "One Car, Every Stop the ",
        titleGold: "Wedding Party Needs",
        paragraphs: [
          <>Car rental for a wedding usually means more than one passenger and more than one stop, the couple, the wedding party, sometimes parents or guests needing a ride between locations. Our limousines and SUVs are equipped with Wi-Fi, phone chargers, and bottled water, so the same vehicle and driver can stay with the wedding party from start to finish. This is a common request for our <Link href="/cities-we-serve/oakville" className="text-[#C9A063] font-semibold hover:underline">wedding limo service in Oakville</Link>, where multiple pickup points are often part of the day.</>
        ],
        buttonText: "",
        buttonLink: "",
        image: "/heropics/weddingsandevent.png",
        imagePosition: "left" as const
      }
    ];
  } else if (isMeetGreet) {
    blocks = [
      {
        titleBlack: "What Is an Airport ",
        titleGold: "Meet & Greet Service?",
        paragraphs: [
          "Stepping off a long flight is easier when someone is already waiting, not circling the pickup zone outside. Our chauffeurs track your flight in real time, meet you at the gate, help with luggage, and walk you directly to a private vehicle. Delays don't leave anyone standing around, since pickup adjusts to your actual landing time, not a fixed schedule.",
          <>One of our most requested arrivals is our <Link href="/cities-we-serve/toronto-pearson" className="text-[#C9A063] font-semibold hover:underline">Toronto meet and greet service</Link>, where travelers benefit from having someone handle the walk from gate to car.</>
        ],
        buttonText: "Book Now",
        buttonLink: "/reservation",
        image: "/heropics/airport1.jpeg",
        imagePosition: "right" as const
      },
      {
        titleBlack: "Meet & Greet Service for Corporate, ",
        titleGold: "VIP & Private Travel",
        paragraphs: [
          "A corporate arrival carries its own pressure, a client visiting for the first time, an executive moving into meetings, a guest who values discretion. Our chauffeurs handle it quietly: matching the vehicle to the occasion, confirming schedules ahead of time, and getting guests moving without delay at the gate.",
          <>The same care applies to private travel, a family reunion or milestone trip. This is common for corporate guests landing for our <Link href="/cities-we-serve/mississauga" className="text-[#C9A063] font-semibold hover:underline">Mississauga meet and greet service</Link>, where a smooth start matters most.</>
        ],
        buttonText: "",
        buttonLink: "",
        image: "/heropics/airport2.png",
        imagePosition: "left" as const
      }
    ];
  } else if (isVipTransport) {
    blocks = [
      {
        titleBlack: "Private VIP Transportation ",
        titleGold: "Across Toronto",
        paragraphs: [
          <>Need <Link href="/cities-we-serve/toronto-pearson" className="text-[#C9A063] font-semibold hover:underline">private VIP transportation in Toronto</Link>? SARJ Worldwide provides professionally coordinated journeys for airport arrivals, executive meetings, hotels, events, and private occasions. Clients can book private chauffeur transportation across Toronto for travel between downtown Toronto, Toronto Pearson International Airport, corporate offices, residences, and venues.</>,
          "Each booking is planned around pickup times, flight schedules, passenger numbers, luggage, and vehicle preferences. Luxury sedans, SUVs, executive vans, and professional chauffeurs support discreet, punctual, door-to-door travel for individuals, corporate guests, and high-profile passengers alike."
        ],
        buttonText: "Book Now",
        buttonLink: "/reservation",
        image: "/heropics/buisnesstravel.png",
        imagePosition: "right" as const
      },
      {
        titleBlack: "Luxury Transportation in ",
        titleGold: "Mississauga and Pearson Airport",
        paragraphs: [
          <>Travelling from Mississauga or Toronto Pearson Airport? SARJ Worldwide offers <Link href="/cities-we-serve/mississauga" className="text-[#C9A063] font-semibold hover:underline">luxury chauffeur transportation in Mississauga</Link> for airport pickups, hotel transfers, corporate travel, event transportation, and hourly bookings. Chauffeurs can accommodate multiple stops, waiting time, changing itineraries, and long-distance journeys across the GTA.</>,
          "Vehicle selection is based on group size, luggage, comfort, and occasion, with sedans, SUVs, sprinter vans, and limousines available. This flexible service helps executives, families, entertainers, and private clients reliably reach each destination comfortably, privately, and on schedule."
        ],
        buttonText: "",
        buttonLink: "",
        image: "/heropics/bussinuss.jpg",
        imagePosition: "left" as const
      }
    ];
  } else if (isLongDistance) {
    blocks = [
      {
        titleBlack: "Comfortable Long Distance Limo Service ",
        titleGold: "for Every Journey",
        paragraphs: [
          "Choose a professional chauffeur for business trips, family visits, hotel transfers, or private journeys between cities. Every reservation includes coordinated pickup, direct routing, luggage assistance, and a comfortable cabin for longer travel. Explore our premium fleet to compare executive sedans, luxury SUVs, and spacious vans for your passenger, luggage, travel, and specific comfort requirements.",
          <>Travellers departing from the GTA can book an <Link href="/cities-we-serve/toronto-pearson" className="text-[#C9A063] font-semibold hover:underline">intercity car service in Toronto</Link> for direct transportation to airports, hotels, offices, nearby communities, and destinations across Ontario.</>
        ],
        buttonText: "Contact Us",
        buttonLink: "/contact",
        image: "/heropics/buisnesstravel.png",
        imagePosition: "right" as const
      },
      {
        titleBlack: "One-Way, Airport and ",
        titleGold: "Ottawa Chauffeur Travel",
        paragraphs: [
          "Our one way car service supports passengers who need a direct journey without arranging return transportation. Reserve private travel for meetings, family occasions, airport connections, hotel stays, or scheduled transfers between communities.",
          <>Passengers in the capital region can arrange a <Link href="/cities-we-serve/ottawa" className="text-[#C9A063] font-semibold hover:underline">long distance chauffeur service in Ottawa</Link> with advance route planning, pickup coordination, and a vehicle selected for their group. Planned stops, luggage requirements, arrival times, and destination details can be added before confirmation for a smoother experience throughout the journey.</>
        ],
        buttonText: "",
        buttonLink: "",
        image: "/heropics/airportTransfers.png",
        imagePosition: "left" as const
      }
    ];
  } else {
    blocks = [
      {
        titleBlack: `Premium ${service.title} `,
        titleGold: "for Our Valued Clients",
        paragraphs: [
          service.description,
          "Whether you are traveling for business or leisure, our fleet of luxury vehicles and professional chauffeurs ensure your journey is nothing short of exceptional. We pride ourselves on punctuality, discretion, and personalized service tailored to your unique requirements. Experience the peace of mind that comes with knowing every detail of your transportation has been expertly managed by our dedicated team."
        ],
        buttonText: `Book Your ${service.title} Now`,
        buttonLink: "/reservation",
        image: service.slug === 'hourly-chauffeur' ? '/heropics/hourlyasdirected.png' :
          service.slug === 'wedding-events' ? '/heropics/wed.jpeg' :
            '/heropics/buisnesstravel.png',
        imagePosition: "right" as const
      },
      {
        titleBlack: "A Fleet Built ",
        titleGold: "for Every Type of Trip",
        paragraphs: [
          "No two trips look the same, which is why our service runs a fleet built around different needs. Solo travelers get an executive sedan with a quiet cabin for a few last quiet minutes. Families get a full size SUV with room for car seats, strollers, and oversized bags without anyone feeling boxed in.",
          "Every vehicle in this luxury fleet is inspected and cleaned before each trip, fully insured, and operated by a professional chauffeur. Pick the vehicle that fits the trip—we handle the rest."
        ],
        buttonText: "",
        buttonLink: "",
        image: "/heropics/bussinuss.jpg",
        imagePosition: "left" as const
      }
    ];
  }

  return (
    <div className="w-full bg-white space-y-14 md:space-y-20">
      {blocks.map((block, idx) => (
        <div key={idx} className="max-w-[1250px] mx-auto px-6 sm:px-8 md:px-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 md:gap-16 items-center">

            {/* Image Box */}
            <div className={`relative h-[280px] sm:h-[400px] lg:h-[550px] rounded-[32px] overflow-hidden shadow-sm border border-gray-100 order-1 ${block.imagePosition === 'left' ? 'lg:order-1' : 'lg:order-2'}`}>
              <Image
                src={block.image}
                alt={block.titleBlack}
                fill
                className="object-cover"
              />
            </div>

            {/* Text Box */}
            <div className={`flex flex-col order-2 ${block.imagePosition === 'left' ? 'lg:order-2' : 'lg:order-1'}`}>
              <h2 className="text-[32px] sm:text-[40px] md:text-[44px] font-bold text-gray-900 leading-[1.15] tracking-tight mb-8">
                {block.titleBlack} <span className="text-[#a88235]">{block.titleGold}</span>
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
