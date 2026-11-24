import { headers } from "next/headers";
import { DEFAULT_GA4_ID, DEFAULT_GTM_ID, getSeoSettings, isTrackingExcludedPath } from "@/lib/seo-config";

/**
 * Runs `body` once, on the visitor's first interaction or a few seconds after the page has loaded,
 * whichever comes first. Keeps third-party tag downloads and parsing off the critical load path
 * (lower Total Blocking Time) while still loading them on every page view.
 */
const deferTag = (body: string) =>
  `(function(){var d=0;function r(){if(d)return;d=1;${body}}` +
  `['pointerdown','keydown','scroll','touchstart'].forEach(function(e){addEventListener(e,r,{once:true,passive:true})});` +
  `if(document.readyState==='complete'){setTimeout(r,4000)}else{addEventListener('load',function(){setTimeout(r,4000)})}})();`;

/** Injects GA4, GTM, and Facebook Pixel from SEO panel settings */
export default async function SeoTrackingScripts() {
  const pathname = (await headers()).get("x-pathname") || "/";
  if (isTrackingExcludedPath(pathname)) return null;

  const settings = await getSeoSettings();
  const gtmId = settings.gtmId || DEFAULT_GTM_ID;
  // GA4 is pinned to the property from Google's install snippet; the SEO panel value is ignored
  const ga4Id = DEFAULT_GA4_ID;

  return (
    <>
      {gtmId && (
        <>
          <script
            dangerouslySetInnerHTML={{
              __html: `window.dataLayer=window.dataLayer||[];dataLayer.push({'gtm.start':new Date().getTime(),event:'gtm.js'});${deferTag(`var d=document,f=d.getElementsByTagName('script')[0],j=d.createElement('script');j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id=${gtmId}';f.parentNode.insertBefore(j,f);`)}`,
            }}
          />
        </>
      )}
      {ga4Id && (
        <>
          <script
            dangerouslySetInnerHTML={{
              __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${ga4Id}');${deferTag(`var d=document,j=d.createElement('script');j.async=true;j.src='https://www.googletagmanager.com/gtag/js?id=${ga4Id}';d.head.appendChild(j);`)}`,
            }}
          />
        </>
      )}
      {settings.facebookPixelId && (
        <script
          dangerouslySetInnerHTML={{
            __html: `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];${deferTag(`t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s);`)}}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${settings.facebookPixelId}');fbq('track','PageView');`,
          }}
        />
      )}
    </>
  );
}
