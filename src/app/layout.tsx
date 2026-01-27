import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
  weight: ["300", "400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: {
    default: "LuxRide Chauffeur Services | Premium Luxury Transportation",
    template: "%s | LuxRide Chauffeur"
  },
  description: "Experience world-class luxury chauffeur services. Airport transfers, corporate travel, weddings, VIP transport & city tours. Professional drivers, premium vehicles. Book your ride today!",
  keywords: [
    "chauffeur service",
    "luxury car hire",
    "airport transfer",
    "corporate transportation",
    "VIP transport",
    "wedding car service",
    "executive chauffeur",
    "private driver",
    "limousine service",
    "business travel",
    "Mercedes chauffeur",
    "BMW chauffeur",
    "Rolls Royce hire",
    "premium car service",
    "London chauffeur",
    "UK chauffeur service"
  ],
  authors: [{ name: "LuxRide Chauffeur Services" }],
  creator: "LuxRide",
  publisher: "LuxRide Chauffeur Services",
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
    siteName: "LuxRide Chauffeur Services",
    title: "LuxRide Chauffeur Services | Premium Luxury Transportation",
    description: "Experience world-class luxury chauffeur services. Airport transfers, corporate travel, weddings & VIP transport. Book your premium ride today!",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "LuxRide Luxury Chauffeur Services",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "LuxRide Chauffeur Services | Premium Luxury Transportation",
    description: "Experience world-class luxury chauffeur services. Airport transfers, corporate travel, weddings & VIP transport.",
    images: ["/og-image.jpg"],
    creator: "@luxride",
  },
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 5,
  },
  verification: {
    google: "your-google-verification-code",
  },
  alternates: {
    canonical: "https://luxride-chauffeur.vercel.app",
  },
  category: "transportation",
};

// JSON-LD Structured Data
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "name": "LuxRide Chauffeur Services",
  "image": "https://luxride-chauffeur.vercel.app/logo.png",
  "description": "Premium luxury chauffeur services offering airport transfers, corporate travel, wedding transportation, and VIP services.",
  "@id": "https://luxride-chauffeur.vercel.app",
  "url": "https://luxride-chauffeur.vercel.app",
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
    "https://facebook.com/luxride",
    "https://twitter.com/luxride",
    "https://instagram.com/luxride",
    "https://linkedin.com/company/luxride"
  ],
  "service": [
    {
      "@type": "Service",
      "name": "Airport Transfer",
      "description": "Luxury airport pickup and drop-off services"
    },
    {
      "@type": "Service",
      "name": "Corporate Travel",
      "description": "Executive chauffeur for business meetings and conferences"
    },
    {
      "@type": "Service",
      "name": "Wedding Transportation",
      "description": "Elegant wedding car services"
    },
    {
      "@type": "Service",
      "name": "VIP Transport",
      "description": "Discreet and secure VIP transportation"
    }
  ]
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#C9A063" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body
        className={`${inter.variable} font-sans antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
