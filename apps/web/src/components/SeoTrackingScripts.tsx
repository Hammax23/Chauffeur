import { headers } from "next/headers";
import { DEFAULT_GA4_ID, DEFAULT_GTM_ID, getSeoSettings, isTrackingExcludedPath } from "@/lib/seo-config";

/** Injects GA4, GTM, and Facebook Pixel from SEO panel settings */
export default async function SeoTrackingScripts() {
  const pathname = (await headers()).get("x-pathname") || "/";
  if (isTrackingExcludedPath(pathname)) return null;

  const settings = await getSeoSettings();
  const gtmId = settings.gtmId || DEFAULT_GTM_ID;
  const ga4Id = settings.ga4Id || DEFAULT_GA4_ID;

  return (
    <>
      {gtmId && (
        <>
          <script
            dangerouslySetInnerHTML={{
              __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${gtmId}');`,
            }}
          />
        </>
      )}
      {ga4Id && (
        <>
          <script async src={`https://www.googletagmanager.com/gtag/js?id=${ga4Id}`} />
          <script
            dangerouslySetInnerHTML={{
              __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${ga4Id}');`,
            }}
          />
        </>
      )}
      {settings.facebookPixelId && (
        <script
          dangerouslySetInnerHTML={{
            __html: `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${settings.facebookPixelId}');fbq('track','PageView');`,
          }}
        />
      )}
    </>
  );
}
