import type { Metadata } from "next";

const BASE_URL = "https://luxride-chauffeur.vercel.app";

export const metadata: Metadata = {
  title: "Online Quote",
  description:
    "Request a SARJ Worldwide chauffeur quote. Get a tailored quote for airport transfers, corporate travel, weddings & more.",
  keywords: ["SARJ Worldwide chauffeur quote", "chauffeur quote", "airport transfer chauffeur price", "corporate chauffeur quote"],
  openGraph: {
    title: "Online Quote | SARJ Worldwide Chauffeur Services",
    description: "Get a tailored chauffeur quote for airport transfers, corporate travel, weddings & more.",
    url: `${BASE_URL}/quote`,
    siteName: "SARJ Worldwide Chauffeur Services",
    type: "website",
  },
  twitter: { card: "summary_large_image", title: "Online Quote | SARJ Worldwide Chauffeur Services" },
  alternates: { canonical: `${BASE_URL}/quote` },
};

export default function QuoteLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
