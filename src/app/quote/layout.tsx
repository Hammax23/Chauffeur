import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Online Quote",
  description:
    "Request a luxury chauffeur quote. Get a tailored quote for airport transfers, corporate travel, weddings & more.",
};

export default function QuoteLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
