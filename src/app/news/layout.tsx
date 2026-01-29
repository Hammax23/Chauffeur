import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "News & Insights",
  description:
    "LuxRide News: fleet updates, travel tips, company updates & industry insights for luxury chauffeur services.",
};

export default function NewsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
