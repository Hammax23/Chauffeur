/** Contact Us form — must match dropdown options in contact/page.tsx */
export const CONTACT_SERVICE_TYPES = [
  "Worldwide Transportation",
  "Airport Transportation",
  "Transfer",
  "Hourly/As Directed",
  "Wedding Transportation",
] as const;

export type ContactServiceType = (typeof CONTACT_SERVICE_TYPES)[number];

export const CONTACT_SERVICE_TYPE_SET = new Set<string>(CONTACT_SERVICE_TYPES);
