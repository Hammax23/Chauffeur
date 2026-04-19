import type { Metadata } from "next";

const BASE_URL = "https://luxride-chauffeur.vercel.app";

export const metadata: Metadata = {
  title: "Contact Us",
  description:
    "Contact SARJ Worldwide chauffeur services. Call, email, or send a message. We're here 24/7 for chauffeur bookings, quotes & support.",
  keywords: ["contact SARJ Worldwide", "SARJ Worldwide chauffeur contact", "chauffeur booking", "chauffeur service contact"],
  openGraph: {
    title: "Contact Us | SARJ Worldwide Chauffeur Services",
    description: "Contact us 24/7 for chauffeur bookings, quotes & support.",
    url: `${BASE_URL}/contact`,
    siteName: "SARJ Worldwide Chauffeur Services",
    type: "website",
  },
  twitter: { card: "summary_large_image", title: "Contact Us | SARJ Worldwide Chauffeur Services" },
  alternates: { canonical: `${BASE_URL}/contact` },
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
