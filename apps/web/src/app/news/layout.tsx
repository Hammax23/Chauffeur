import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo-metadata";

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadata("/news", {
    title: "Blog & Insights | SARJ Worldwide Chauffeur Services",
    description:
      "SARJ Worldwide Blog: expert insights on luxury chauffeur travel, fleet updates, corporate mobility, travel tips, and premium ground transportation trends.",
    keywords: [
      "SARJ Worldwide blog",
      "chauffeur blog",
      "luxury travel insights",
      "chauffeur fleet updates",
      "travel tips",
      "corporate chauffeur",
    ],
  });
}

export default function NewsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
