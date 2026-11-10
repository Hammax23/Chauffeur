/**
 * Legal entity fields printed on tax invoices.
 * Override via env without code deploys.
 */
export function getBillingCompany() {
  return {
    legalName:
      process.env.BILLING_LEGAL_NAME?.trim() || "SARJ Worldwide Chauffeur Services",
    addressLine1:
      process.env.BILLING_ADDRESS_LINE1?.trim() || "231 Oak Park Blvd",
    addressLine2:
      process.env.BILLING_ADDRESS_LINE2?.trim() || "Oakville, ON L6H 7S8",
    country: process.env.BILLING_COUNTRY?.trim() || "Canada",
    phone: process.env.BILLING_PHONE?.trim() || "+1 416-893-5779",
    email:
      process.env.BILLING_EMAIL?.trim() ||
      process.env.CONTACT_EMAIL?.trim() ||
      "reserve@sarjworldwide.ca",
    website: process.env.BILLING_WEBSITE?.trim() || "https://sarjworldwide.ca",
    /** CRA HST/GST registration — required on Canadian tax invoices. */
    hstNumber: process.env.BILLING_HST_NUMBER?.trim() || "",
  };
}
