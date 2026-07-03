import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo-metadata";

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadata("/quote", {
    title: "Online Quote | SARJ Worldwide Chauffeur Services",
    description:
      "Request a SARJ Worldwide chauffeur quote. Get a tailored quote for airport transfers, corporate travel, weddings & more.",
    keywords: ["SARJ Worldwide chauffeur quote", "chauffeur quote", "airport transfer chauffeur price", "corporate chauffeur quote"],
  });
}

export default function QuoteLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
