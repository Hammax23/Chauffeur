import type { Metadata } from "next";

const BASE_URL = "https://luxride-chauffeur.vercel.app";

export const metadata: Metadata = {
  title: "News & Insights",
  description:
    "SARJ Worldwide News: chauffeur fleet updates, travel tips, company updates & insights for luxury chauffeur services.",
  keywords: ["SARJ Worldwide news", "chauffeur news", "chauffeur fleet updates", "travel tips", "chauffeur service insights"],
  openGraph: {
    title: "News & Insights | SARJ Worldwide Chauffeur Services",
    description: "Chauffeur fleet updates, travel tips, company updates & industry insights.",
    url: `${BASE_URL}/news`,
    siteName: "SARJ Worldwide Chauffeur Services",
    type: "website",
  },
  twitter: { card: "summary_large_image", title: "News & Insights | SARJ Worldwide Chauffeur Services" },
  alternates: { canonical: `${BASE_URL}/news` },
};

export default function NewsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
