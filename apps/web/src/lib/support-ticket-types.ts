/** In-app Contact Us — keep in sync with mobile form. */
export const SUPPORT_TICKET_TYPES = [
  "Suggestion",
  "Billing Problem",
  "General Question",
  "Booking Issue",
  "Account / Login",
  "Feedback",
  "Other",
] as const;

export type SupportTicketType = (typeof SUPPORT_TICKET_TYPES)[number];

export const SUPPORT_TICKET_TYPE_SET = new Set<string>(SUPPORT_TICKET_TYPES);

export const SUPPORT_TICKET_STATUSES = [
  "NEW",
  "IN_PROGRESS",
  "RESOLVED",
  "CLOSED",
] as const;

export type SupportTicketStatus = (typeof SUPPORT_TICKET_STATUSES)[number];

export const SUPPORT_TICKET_STATUS_SET = new Set<string>(SUPPORT_TICKET_STATUSES);
