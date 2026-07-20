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
    const address =
      settings.organizationAddress ||
      settings.organizationCity ||
      settings.organizationRegion ||
      settings.organizationPostal
        ? {
            "@type": "PostalAddress",
            streetAddress: settings.organizationAddress || undefined,
            addressLocality: settings.organizationCity || undefined,
            addressRegion: settings.organizationRegion || undefined,
            postalCode: settings.organizationPostal || undefined,
            addressCountry: settings.organizationCountry || "CA",
          }
        : undefined;

    schemas.push({
      "@context": "https://schema.org",
      "@type": "LocalBusiness",
      name: settings.organizationName || settings.siteName,
      url: baseUrl,
      logo: settings.organizationLogo || `${baseUrl}/logo1.png`,
      ...(settings.organizationPhone ? { telephone: settings.organizationPhone } : {}),
      ...(settings.organizationEmail ? { email: settings.organizationEmail } : {}),
      ...(address ? { address } : {}),
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
