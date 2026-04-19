import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "SARJ Worldwide Chauffeur Services | Your Chauffeur Status",
  description: "SARJ Worldwide Chauffeur Services | Your Chauffeur Status",
  openGraph: {
    title: "SARJ Worldwide Chauffeur Services | Your Chauffeur Status",
    description: "SARJ Worldwide Chauffeur Services | Your Chauffeur Status",
    siteName: "SARJ Worldwide",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "SARJ Worldwide Chauffeur Services | Your Chauffeur Status",
    description: "SARJ Worldwide Chauffeur Services | Your Chauffeur Status",
  },
};

export default function TrackLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
