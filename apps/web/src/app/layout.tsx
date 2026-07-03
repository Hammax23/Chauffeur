import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "react-datepicker/dist/react-datepicker.css";
import "./globals.css";
import FloatingContact from "@/components/FloatingContact";
import SeoSchemaScripts from "@/components/SeoSchemaScripts";
import SeoTrackingScripts from "@/components/SeoTrackingScripts";
import { buildGlobalMetadata } from "@/lib/seo-metadata";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
  weight: ["400", "500", "600", "700"],
  preload: true,
});

export async function generateMetadata(): Promise<Metadata> {
  return buildGlobalMetadata();
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/logo1.png" type="image/png" sizes="any" />
        <link rel="apple-touch-icon" href="/logo1.png" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="preload" href="/cover.mp4" as="video" type="video/mp4" />
        <meta name="theme-color" content="#C9A063" />
        <SeoSchemaScripts />
        <SeoTrackingScripts />
      </head>
      <body
        className={`${inter.variable} font-sans antialiased`}
        suppressHydrationWarning
      >
        {children}
        <FloatingContact />
      </body>
    </html>
  );
}
