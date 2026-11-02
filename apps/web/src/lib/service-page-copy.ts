export type ServicePageCopy = {
  metaTitle: string;
  metaDescription: string;
  h1: string;
  heroText: string;
  keywords: string[];
};

/** Hero/SEO copy overrides for service pages (from the supplied content documents). */
export const SERVICE_PAGE_COPY: Record<string, ServicePageCopy> = {
  "airport-transfers": {
    metaTitle: "Airport Transfer Service Toronto | Sarj Worldwide",
    metaDescription:
      "Book a private airport transfer service in Toronto with flight tracking, flat fares and professional chauffeurs. Serving Pearson and the GTA 24/7.",
    h1: "Private Airport Transfer Service in Toronto and the GTA",
    heroText:
      "Sarj Worldwide runs a private airport transfer service across Toronto and the GTA, with confirmed pickups, real-time flight tracking and professional chauffeurs. From Toronto Pearson to Hamilton, Ottawa and Montreal, every ride comes with a private vehicle, a flat fare and a team available around the clock.",
    keywords: ["airport transfer service Toronto", "Pearson airport transfer", "airport limo service", "SARJ Worldwide chauffeur"],
  },
  "hourly-chauffeur": {
    metaTitle: "Hourly Chauffeur Service | Sarj Worldwide",
    metaDescription:
      "Book hourly chauffeur service or hourly limo rental with Sarj Worldwide for a private vehicle on call for your schedule.",
    h1: "Your Chauffeur, On Your Schedule",
    heroText:
      "Sarj Worldwide offers hourly chauffeur service and hourly limo rental, with a private vehicle and driver on call for your day. Choose from sedans, SUVs, vans, or limousines, and keep the same vehicle and chauffeur with you from your first stop to your last.",
    keywords: ["hourly chauffeur service", "hourly limo rental", "as directed chauffeur", "SARJ Worldwide chauffeur"],
  },
  "corporate-travel": {
    metaTitle: "Corporate Car Service & Executive Travel | Sarj Worldwide",
    metaDescription:
      "Book a corporate car service or executive car service with Sarj Worldwide for reliable, chauffeur-driven business travel and client transportation.",
    h1: "Corporate Car Service and Executive Travel",
    heroText:
      "Sarj Worldwide offers corporate car service and executive car service built around your meetings, client visits, and business schedule.",
    keywords: ["corporate car service", "executive car service", "business travel chauffeur", "SARJ Worldwide chauffeur"],
  },
  "point-to-point-transfers": {
    metaTitle: "Point-to-Point Car Service | Sarj Worldwide",
    metaDescription:
      "Book point-to-point car service with Sarj Worldwide for a direct, private trip between Toronto, Pearson Airport, and beyond.",
    h1: "Point-to-Point Car Service Across Canada",
    heroText:
      "Sarj Worldwide offers point-to-point car service for a single, direct trip between your pickup location and destination.",
    keywords: ["point to point car service", "direct private transfer", "Toronto car service", "SARJ Worldwide chauffeur"],
  },
  "wedding-events": {
    metaTitle: "Wedding Limo & Luxury Car Service | SARJ Worldwide",
    metaDescription:
      "SARJ Worldwide provides wedding limo and luxury car services with professional chauffeurs, elegant vehicles, and reliable transportation for ceremonies, receptions, and special events.",
    h1: "Luxury Wedding Transportation",
    heroText:
      "SARJ Worldwide provides elegant wedding limousine and luxury car services designed around your special day. From the ceremony to the reception, our professional chauffeurs and premium vehicles help couples and wedding parties travel comfortably, stylishly, and on schedule.",
    keywords: ["wedding limo service", "wedding transportation", "luxury wedding car service", "SARJ Worldwide chauffeur"],
  },
  "meet-greet": {
    metaTitle: "Airport Meet & Greet Service Toronto | SARJ Worldwide",
    metaDescription:
      "Professional airport meet and greet service with SARJ Worldwide. Chauffeurs wait at the gate, assist with luggage, and arrange private transfers.",
    h1: "Airport Meet & Greet Service for a Smooth Arrival",
    heroText:
      "SARJ Worldwide offers professional meet and greet service at Pearson and Billy Bishop airports. Your chauffeur waits for your arrival, assists with luggage, and escorts you to your private vehicle for a smooth and stress-free journey.",
    keywords: ["airport meet and greet service", "Toronto meet and greet", "Pearson meet and greet", "SARJ Worldwide chauffeur"],
  },
};
