import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo-metadata";

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadata("/news", {
    title: "News & Insights | SARJ Worldwide Chauffeur Services",
    description:
      "SARJ Worldwide News: chauffeur fleet updates, travel tips, company updates & insights for luxury chauffeur services.",
    keywords: ["SARJ Worldwide news", "chauffeur news", "chauffeur fleet updates", "travel tips", "chauffeur service insights"],
  });
}

export default function NewsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
