import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "react-datepicker/dist/react-datepicker.css";
import "./globals.css";
import FloatingContact from "@/components/FloatingContact";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
  weight: ["400", "500", "600", "700"], // Reduced weights for faster loading
  preload: true,
});

export const metadata: Metadata = {
  title: {
    default: "SARJ Worldwide Chauffeur Services | Premium Luxury Transportation",
    template: "%s | SARJ Worldwide Chauffeur"
  },
  description: "SARJ Worldwide chauffeur services. Airport transfers, corporate travel, weddings, VIP transport & city tours. Professional chauffeurs, premium vehicles. Book your chauffeur today!",
  keywords: [
    "SARJ Worldwide chauffeur",
    "SARJ Worldwide chauffeur services",
    "chauffeur service",
    "luxury chauffeur",
    "airport transfer chauffeur",
    "corporate chauffeur",
    "VIP chauffeur transport",
    "wedding chauffeur service",
    "executive chauffeur",
    "private chauffeur",
    "limousine chauffeur",
    "business travel chauffeur",
    "premium chauffeur service",
    "worldwide chauffeur services"
  ],
  authors: [{ name: "SARJ Worldwide Chauffeur Services" }],
  creator: "SARJ Worldwide",
  publisher: "SARJ Worldwide Chauffeur Services",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_GB",
    url: "https://luxride-chauffeur.vercel.app",
    siteName: "SARJ Worldwide Chauffeur Services",
    title: "SARJ Worldwide Chauffeur Services | Premium Luxury Transportation",
    description: "Experience world-class luxury chauffeur services. Airport transfers, corporate travel, weddings & VIP transport. Book your premium ride today!",
    images: [
      {
        url: "https://luxride-chauffeur.vercel.app/logo1.png",
        width: 1200,
        height: 630,
        alt: "SARJ Worldwide Luxury Chauffeur Services",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "SARJ Worldwide Chauffeur Services | Premium Luxury Transportation",
    description: "Experience world-class luxury chauffeur services. Airport transfers, corporate travel, weddings & VIP transport.",
    images: ["https://luxride-chauffeur.vercel.app/logo1.png"],
    creator: "@sarjworldwide",
  },
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 5,
  },
  alternates: {
    canonical: "https://luxride-chauffeur.vercel.app",
  },
  category: "transportation",
};

// JSON-LD Structured Data - Organization & WebSite
const baseUrl = "https://luxride-chauffeur.vercel.app";
const jsonLdOrg = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "@id": `${baseUrl}/#organization`,
  "name": "SARJ Worldwide Chauffeur Services",
  "alternateName": "SARJ Worldwide",
  "image": `${baseUrl}/logo1.png`,
  "description": "SARJ Worldwide provides premium chauffeur services: airport transfers, corporate travel, wedding transportation, and VIP services worldwide.",
  "url": baseUrl,
  "telephone": "+1800900122",
  "priceRange": "$$$",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "London City",
    "addressLocality": "London",
    "addressCountry": "GB"
  },
  "geo": {
    "@type": "GeoCoordinates",
    "latitude": 51.5074,
    "longitude": -0.1278
  },
  "openingHoursSpecification": {
    "@type": "OpeningHoursSpecification",
    "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
    "opens": "00:00",
    "closes": "23:59"
  },
  "sameAs": [
    "https://facebook.com/sarjworldwide",
    "https://twitter.com/sarjworldwide",
    "https://instagram.com/sarjworldwide",
    "https://linkedin.com/company/sarjworldwide"
  ],
  "service": [
    { "@type": "Service", "name": "Airport Transfer", "description": "Luxury airport pickup and drop-off with meet & greet" },
    { "@type": "Service", "name": "Corporate Travel", "description": "Executive chauffeur for business meetings and conferences" },
    { "@type": "Service", "name": "Wedding Transportation", "description": "Elegant wedding car and bridal services" },
    { "@type": "Service", "name": "VIP Transport", "description": "Discreet and secure VIP transportation" },
    { "@type": "Service", "name": "Point-to-Point Transfers", "description": "Door-to-door luxury between any destinations" },
    { "@type": "Service", "name": "City Tours", "description": "Luxury sightseeing and guided tours" }
  ]
};
const jsonLdWebSite = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": `${baseUrl}/#website`,
  "url": baseUrl,
  "name": "SARJ Worldwide Chauffeur Services",
  "description": "SARJ Worldwide chauffeur services worldwide",
  "publisher": { "@id": `${baseUrl}/#organization` }
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
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdOrg) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdWebSite) }}
        />
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
