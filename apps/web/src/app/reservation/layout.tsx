import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo-metadata";

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadata("/reservation", {
    title: "Online Reservation | SARJ Worldwide Chauffeur",
    description: "Book your luxury chauffeur online with SARJ Worldwide. Airport transfers, corporate travel & VIP service.",
  });
}

export default function ReservationLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
