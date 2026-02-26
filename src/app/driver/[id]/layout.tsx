import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "SARJ Worldwide Chauffeur Services",
  description: "On The Way, Arrived, CIC, DONE. Thank you for representing SARJ Worldwide.",
  openGraph: {
    title: "SARJ Worldwide Chauffeur Services",
    description: "On The Way, Arrived, CIC, DONE. Thank you for representing SARJ Worldwide.",
    siteName: "SARJ Worldwide",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "SARJ Worldwide Chauffeur Services",
    description: "On The Way, Arrived, CIC, DONE. Thank you for representing SARJ Worldwide.",
  },
};

export default function DriverLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
