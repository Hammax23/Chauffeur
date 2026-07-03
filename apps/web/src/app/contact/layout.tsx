import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo-metadata";

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadata("/contact", {
    title: "Contact Us | SARJ Worldwide Chauffeur Services",
    description:
      "Contact SARJ Worldwide chauffeur services. Call, email, or send a message. We're here 24/7 for chauffeur bookings, quotes & support.",
    keywords: ["contact SARJ Worldwide", "SARJ Worldwide chauffeur contact", "chauffeur booking", "chauffeur service contact"],
  });
}

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
