import { getSeoSettings } from "@/lib/seo-config";

/** Injects GA4, GTM, and Facebook Pixel from SEO panel settings */
export default async function SeoTrackingScripts() {
  const settings = await getSeoSettings();

  return (
    <>
      {settings.gtmId && (
        <>
          <script
            dangerouslySetInnerHTML={{
              __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${settings.gtmId}');`,
            }}
          />
        </>
      )}
      {settings.ga4Id && !settings.gtmId && (
        <>
          <script async src={`https://www.googletagmanager.com/gtag/js?id=${settings.ga4Id}`} />
          <script
            dangerouslySetInnerHTML={{
              __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${settings.ga4Id}');`,
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
