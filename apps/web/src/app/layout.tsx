import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "react-datepicker/dist/react-datepicker.css";
import "./globals.css";
import FloatingContact from "@/components/FloatingContact";
import CtaPopup from "@/components/CtaPopup";
import SeoSchemaScripts from "@/components/SeoSchemaScripts";
import SeoTrackingScripts from "@/components/SeoTrackingScripts";
import { SeoPageHeadLive } from "@/components/SeoPageLiveExtras";
import { buildGlobalMetadata } from "@/lib/seo-metadata";
import { getSeoSettings } from "@/lib/seo-config";

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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const settings = await getSeoSettings();

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/logo1.png" type="image/png" sizes="any" />
        <link rel="apple-touch-icon" href="/logo1.png" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="preload" href="/cover.mp4" as="video" type="video/mp4" />
        <meta name="theme-color" content="#C9A063" />
        {settings.facebookAppId ? (
          <meta property="fb:app_id" content={settings.facebookAppId} />
        ) : null}
        {settings.pinterestVerification ? (
          <meta name="p:domain_verify" content={settings.pinterestVerification} />
        ) : null}
        <SeoSchemaScripts />
        <SeoTrackingScripts />
      </head>
      <body
        className={`${inter.variable} font-sans antialiased`}
        suppressHydrationWarning
      >
        <SeoPageHeadLive />
        {settings.gtmId ? (
          <noscript>
            <iframe
              src={`https://www.googletagmanager.com/ns.html?id=${settings.gtmId}`}
              height="0"
              width="0"
              style={{ display: "none", visibility: "hidden" }}
              title="Google Tag Manager"
            />
          </noscript>
        ) : null}
        {children}
        <CtaPopup />
        <FloatingContact />
      </body>
    </html>
  );
}
