import type { LandingComparisonContent } from "@/components/LandingComparison";

/** Home-to-terminal comparison section shared by the airport landing pages. */
export const pearsonComparison: LandingComparisonContent = {
  eyebrow: "Home to terminal",
  title: ["Skip the parking lot,", "arrive at the curb"],
  intro:
    "Driving yourself to Pearson means the drive, the parking lot, the shuttle and the walk to check-in. A SARJ chauffeur takes you from home straight to your terminal, about 40 minutes sooner.",
  points: [
    { title: "About 35 minutes, door to curb", body: "No parking lot, no shuttle and no walk to check-in. You step out right at your terminal." },
    { title: "Curbside drop-off", body: "Your chauffeur takes you to the door of Terminal 1 or Terminal 3 and helps with your luggage." },
    { title: "Fixed upfront price", body: "Tolls, taxes and airport fees are included, with no parking bill and no surge pricing." },
    { title: "Flight tracking", body: "We watch your flight, so early or late arrivals never leave you waiting." },
  ],
  image: {
    src: "/home-to-pearson-terminal-v2.webp",
    alt: "Driving and parking at Toronto Pearson (about 1 h 15 min) versus a SARJ Worldwide chauffeur with curbside drop-off (about 35 min)",
    width: 1560,
    height: 941,
  },
  start: "Home",
  end: "Pearson terminal",
  routes: [
    {
      name: "Drive and park",
      sub: "Self-drive, long-term lot and shuttle",
      total: "≈ 1 hr 15 min",
      stops: [
        { label: "Drive to airport", time: "≈ 35 min" },
        { label: "Park and shuttle", time: "≈ 30 min" },
        { label: "Walk to check-in", time: "≈ 10 min" },
      ],
    },
    {
      name: "SARJ chauffeur",
      sub: "Private car, direct to your terminal",
      total: "≈ 35 min",
      highlight: true,
      stops: [],
      direct: "Enjoy the ride",
    },
  ],
};
