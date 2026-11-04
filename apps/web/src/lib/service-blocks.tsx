import type { ReactNode } from "react";
import Link from "next/link";
import { type Service } from "@/data/services";

export interface ServiceBlock {
  titleBlack: string;
  titleGold: string;
  paragraphs: ReactNode[];
  buttonText?: string;
  buttonLink: string;
  image: string;
  imagePosition: "left" | "right";
}

/** Content sections shown on a service page (shared by the page and the SEO panel link picker). */
export function getServiceBlocks(service: Service): ServiceBlock[] {
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
        titleBlack: "How Your Airport Transfer in ",
        titleGold: "Toronto Works",
        paragraphs: [
          "Most airport rides go wrong at the same point: the pickup time was set weeks ago, and the flight didn't cooperate. We work the other way around. Once you've booked, we follow your flight and move the pickup if you land early or run late, so your chauffeur is there when you actually need them.",
          "A private airport transfer in Toronto should be simple: one vehicle, one professional chauffeur who handles the driving, route and parking, and nobody else on board. That applies to every Toronto Pearson airport transfer, whether you're arriving or departing.",
          <>To book an airport transfer in Toronto, you need your pickup and drop-off addresses, the date and time, and your flight number. Reserve online in a couple of minutes and you&apos;ll receive a confirmation for your trip. First time at Pearson? This <Link href="/news" className="text-[#C9A063] font-semibold hover:underline">Pearson airport transfer guide</Link> explains what to expect from booking to pickup.</>
        ],
        buttonText: "Book Your Transfer",
        buttonLink: "/reservation",
        image: "/heropics/airport2.png",
        imagePosition: "right" as const
      },
      {
        titleBlack: "Airport Limo Service in the ",
        titleGold: "GTA and Beyond",
        paragraphs: [
          "The standard stays the same whether you're leaving from downtown or a quiet street in Halton. We run airport limo service across the GTA, from Oakville and Burlington to Mississauga, home to Pearson.",
          "Heading further out? We also cover Hamilton, London, Niagara Falls and Buffalo. If you need a luxury airport car service in Canada that goes beyond Toronto, the same chauffeur-driven standard extends to Ottawa and Montreal. Each trip is arranged around your schedule and priced as a flat fare, so there are no surprises when you arrive."
        ],
        buttonText: "",
        buttonLink: "",
        image: "/heropics/buisnesstravel.png",
        imagePosition: "left" as const
      },
      {
        titleBlack: "What to Expect at ",
        titleGold: "Pearson Airport",
        paragraphs: [
          "Pearson has two terminals, and the one your airline uses decides where pickup and drop-off happen. For departures, give us your flight time and pickup address, and we'll confirm a time that gets you to the terminal comfortably ahead of check-in. For arrivals, we follow your landing, so your chauffeur is ready when you are."
        ],
        buttonText: "",
        buttonLink: "",
        image: "/heropics/airport1.jpeg",
        imagePosition: "right" as const
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
        buttonText: "Contact Us",
        buttonLink: "/contact",
        image: "/corporate-section-1.jpg",
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
        image: "/corporate-section-2.jpg",
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
        buttonText: "Contact Us",
        buttonLink: "/contact",
        image: "/p2p-section-1.jpg",
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
        image: "/p2p-section-2.jpg",
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
        buttonText: "Contact Us",
        buttonLink: "/contact",
        image: "/hourly-section-1.jpg",
        imagePosition: "right" as const
      },
      {
        titleBlack: "From Holiday Parties to ",
        titleGold: "Full Days Out",
        paragraphs: [
          "Chauffeur hire during the holidays is one of the most common reasons people book by the hour, whether it's a night of visiting several parties, a group outing that needs to stay together, or a day of shopping without worrying about parking. Our luxury chauffeur service suits birthdays, anniversaries, and nights out just as easily as business use, with the same vehicle and driver handling every stop on your list.",
          "It's also a practical option for visiting clients or family from out of town, whether they're flying into Pearson for the day or already staying somewhere in the area.",
          <>If you need an <Link href="/cities-we-serve/mississauga" className="text-[#C9A063] font-semibold hover:underline">hourly chauffeur service in Mississauga</Link> or an <Link href="/cities-we-serve/oakville" className="text-[#C9A063] font-semibold hover:underline">hourly limo rental in Oakville</Link>, the same vehicle and driver can pick up your guest and stay with them for the day.</>
        ],
        buttonText: "",
        buttonLink: "",
        image: "/hourly-section-2.jpg",
        imagePosition: "left" as const
      }
    ];
  } else if (isWedding) {
    blocks = [
      {
        titleBlack: "From the Ceremony to ",
        titleGold: "the Reception",
        paragraphs: [
          "A wedding day rarely happens in one location. SARJ Worldwide helps couples and wedding parties manage transportation throughout the day, from pre-ceremony pickups and venue transfers to photography stops and the journey to the reception. Our chauffeurs coordinate each trip carefully to help keep your schedule organized and comfortable.",
          <>This is a popular choice for couples booking <Link href="/cities-we-serve/mississauga" className="text-[#C9A063] font-semibold hover:underline">wedding limo service in Mississauga</Link>, where wedding plans often include multiple venues, guest pickups, and travel between locations throughout the celebration.</>
        ],
        buttonText: "Contact Us",
        buttonLink: "/contact",
        image: "/wedding-section-1.jpg",
        imagePosition: "right" as const
      },
      {
        titleBlack: "Wedding Transportation for ",
        titleGold: "Every Part of Your Day",
        paragraphs: [
          "Wedding transportation often involves more than one passenger and multiple locations throughout the day. SARJ Worldwide helps couples, wedding parties, and guests travel comfortably between venues, photo locations, hotels, and celebrations with a dedicated chauffeur and premium vehicle.",
          <>Our limousines and SUVs provide a comfortable travel experience with features such as Wi-Fi, phone chargers, and bottled water, allowing your group to enjoy the day without worrying about transportation details. This is a popular choice for our <Link href="/cities-we-serve/oakville" className="text-[#C9A063] font-semibold hover:underline">wedding limo service in Oakville</Link>, where couples often require coordinated travel between different pickup points and venues.</>
        ],
        buttonText: "",
        buttonLink: "",
        image: "/wedding-section-2.jpg",
        imagePosition: "left" as const
      }
    ];
  } else if (isMeetGreet) {
    blocks = [
      {
        titleBlack: "What Is an Airport ",
        titleGold: "Meet & Greet Service?",
        paragraphs: [
          "Arriving after a long flight is easier when someone is already waiting for you. SARJ Worldwide chauffeurs monitor your flight, meet you at the airport, assist with your luggage, and guide you directly to your waiting vehicle. Instead of searching for transportation or waiting in busy pickup areas, your arrival is handled with professional care from the moment you land.",
          <>Flight delays are also managed through real-time tracking, allowing pickup arrangements to adjust according to your actual arrival time. Our <Link href="/cities-we-serve/toronto-pearson" className="text-[#C9A063] font-semibold hover:underline">Toronto meet and greet service</Link> helps travelers enjoy a comfortable airport experience with reliable chauffeur assistance from gate to destination.</>
        ],
        buttonText: "Contact Us",
        buttonLink: "/contact",
        image: "/meetgreet-section-1.jpg",
        imagePosition: "right" as const
      },
      {
        titleBlack: "Meet & Greet Service for Corporate, ",
        titleGold: "VIP & Private Travel",
        paragraphs: [
          "Corporate and private arrivals often require extra attention, especially when welcoming executives, clients, or important guests. SARJ Worldwide provides a professional airport welcome experience designed around comfort, timing, and discretion. Our chauffeurs coordinate arrivals carefully, assist guests with their luggage, and ensure a smooth transition from the airport to the vehicle.",
          <>Whether you are arranging transportation for a business visitor, family member, or VIP traveler, our team helps create a seamless arrival experience. Our <Link href="/cities-we-serve/mississauga" className="text-[#C9A063] font-semibold hover:underline">Mississauga meet and greet service</Link> is ideal for travelers who want dependable airport assistance combined with private chauffeur transportation.</>
        ],
        buttonText: "",
        buttonLink: "",
        image: "/meetgreet-section-2.jpg",
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
        buttonText: "Contact Us",
        buttonLink: "/contact",
        image: "/vip-section-1.jpg",
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
        image: "/vip-section-2.jpg",
        imagePosition: "left" as const
      }
    ];
  } else if (isLongDistance) {
    blocks = [
      {
        titleBlack: "Comfortable Long Distance Limo Service ",
        titleGold: "for Every Journey",
        paragraphs: [
          <>Choose a professional chauffeur for business trips, family visits, hotel transfers, or private journeys between cities. Every reservation includes coordinated pickup, direct routing, luggage assistance, and a comfortable cabin for longer travel. Explore our <Link href="/fleet" className="text-[#C9A063] font-semibold hover:underline">premium fleet</Link> to compare executive sedans, luxury SUVs, and spacious vans for your passenger, luggage, travel, and specific comfort requirements.</>,
          <>Travellers departing from the GTA can book an <Link href="/cities-we-serve/toronto-pearson" className="text-[#C9A063] font-semibold hover:underline">intercity car service in Toronto</Link> for direct transportation to airports, hotels, offices, nearby communities, and destinations across Ontario.</>
        ],
        buttonText: "Contact Us",
        buttonLink: "/contact",
        image: "/longdistance-section-1.jpg",
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
        image: "/longdistance-section-2.jpg",
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
        buttonText: "Contact Us",
        buttonLink: "/contact",
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

  return blocks as ServiceBlock[];
}
