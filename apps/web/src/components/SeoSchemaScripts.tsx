import { getSeoSettings } from "@/lib/seo-config";

/** Injects JSON-LD schema from SEO panel settings */
export default async function SeoSchemaScripts() {
  const settings = await getSeoSettings();
  const schemas: object[] = [];

  if (settings.localBusinessSchema && typeof settings.localBusinessSchema === "object") {
    schemas.push(settings.localBusinessSchema as object);
  }
  if (settings.websiteSchema && typeof settings.websiteSchema === "object") {
    schemas.push(settings.websiteSchema as object);
  }

  if (schemas.length === 0) {
    const baseUrl = settings.siteUrl.replace(/\/$/, "");
    schemas.push({
      "@context": "https://schema.org",
      "@type": "LocalBusiness",
      name: settings.organizationName || settings.siteName,
      url: baseUrl,
      logo: settings.organizationLogo || `${baseUrl}/logo1.png`,
    });
    schemas.push({
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: settings.siteName,
      url: baseUrl,
    });
  }

  return (
    <>
      {schemas.map((schema, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}
    </>
  );
}
