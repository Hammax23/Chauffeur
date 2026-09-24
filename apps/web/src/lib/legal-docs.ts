import DOMPurify from "isomorphic-dompurify";

export const LEGAL_SLUGS = ["privacy", "terms", "refund"] as const;
export type LegalSlug = (typeof LEGAL_SLUGS)[number];

export function isLegalSlug(v: unknown): v is LegalSlug {
  return typeof v === "string" && (LEGAL_SLUGS as readonly string[]).includes(v);
}

const ALLOWED_TAGS = [
  "p",
  "br",
  "strong",
  "em",
  "u",
  "s",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "ul",
  "ol",
  "li",
  "blockquote",
  "a",
  "hr",
  "img",
  "table",
  "thead",
  "tbody",
  "tr",
  "th",
  "td",
  "div",
  "span",
  "section",
];

const ALLOWED_ATTR = [
  "href",
  "target",
  "rel",
  "src",
  "alt",
  "title",
  "class",
  "style",
  "colspan",
  "rowspan",
];

/** Sanitize legal HTML while keeping inline styles (line-height, color, align, etc.). */
export function sanitizeLegalHtml(html: string): string {
  return DOMPurify.sanitize(html || "", {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOW_DATA_ATTR: false,
  });
}

/** Allow only safe CSS for the optional customCss field (no @import / expression / url()). */
export function sanitizeLegalCss(css: string): string {
  const raw = String(css || "").slice(0, 20_000);
  return raw
    .replace(/@import[\s\S]*?;/gi, "")
    .replace(/expression\s*\(/gi, "")
    .replace(/javascript\s*:/gi, "")
    .replace(/url\s*\(\s*['"]?\s*javascript:/gi, "url(")
    .replace(/behavior\s*:/gi, "")
    .replace(/-moz-binding\s*:/gi, "");
}

export const LEGAL_DEFAULT_TITLES: Record<LegalSlug, string> = {
  privacy: "Privacy Policy",
  terms: "Terms & Conditions",
  refund: "Refund Policy",
};

/** Seed HTML — mirrors prior in-app copy. */
export const LEGAL_DEFAULT_HTML: Record<LegalSlug, string> = {
  privacy: `
<div class="legal-callout"><h2>Privacy Policy</h2><p>How we handle your personal information</p></div>
<h2>1. Information We Collect</h2>
<p>We may collect information such as:</p>
<ul>
  <li>Name, email, phone number</li>
  <li>Trip details (pickup/drop-off, times, flight info, itinerary)</li>
  <li>Payment-related info (processed by PCI-compliant processors; we do not store full card details)</li>
  <li>Communications and support interactions</li>
</ul>
<h2>2. How We Use Information</h2>
<p>We use personal information to:</p>
<ul>
  <li>Provide and manage bookings and transportation services</li>
  <li>Send confirmations, driver updates, receipts, and service communications</li>
  <li>Improve service quality and customer experience</li>
  <li>Comply with legal obligations and prevent fraud</li>
</ul>
<p><strong>We do not sell personal data.</strong></p>
<h2>3. Communications Consent (Email/SMS)</h2>
<p>By booking, you consent to transactional communications (email/SMS) about your trip (confirmations, updates, receipts). Carrier rates may apply. Marketing messages are sent only with consent, and you can unsubscribe anytime.</p>
<h2>4. Cookies &amp; Analytics</h2>
<p>Our Site may use cookies and analytics to improve functionality and measure performance. You can disable cookies in browser settings; some features may not function properly.</p>
<h2>5. Data Protection &amp; Disclosure</h2>
<p>We use reasonable technical and organizational measures to protect personal information. We may disclose information when required by law or with your consent, or to service providers/partners as needed to deliver services.</p>
`.trim(),

  refund: `
<div class="legal-callout"><h2>Cancellation &amp; Refunds</h2><p>Notice periods and how refunds are processed</p></div>
<h2>1. Airport / One-Way Transfer (Luxury Sedan/SUV) — Greater Toronto Area</h2>
<ul>
  <li>Cancellations require 2 hours' notice.</li>
  <li>Less than 2 hours: full fare charges apply.</li>
</ul>
<h2>2. Sprinter Van — Airport / One-Way Transfer</h2>
<ul>
  <li>Cancellations require 24 hours' notice.</li>
  <li>Less than 24 hours: full fare charges apply.</li>
  <li>Hourly minimum service rates may apply.</li>
</ul>
<h2>3. Out of Town / Hourly / Charter Services (All Vehicle Types)</h2>
<table>
  <thead><tr><th>Notice Period</th><th>Charge</th></tr></thead>
  <tbody>
    <tr><td>24+ hours</td><td style="color:#16A34A;font-weight:700">Full reimbursement</td></tr>
    <tr><td>12–24 hours</td><td style="color:#D97706;font-weight:700">50% of original fare</td></tr>
    <tr><td>&lt;12 hours</td><td style="color:#DC2626;font-weight:700">Full fare charge</td></tr>
  </tbody>
</table>
<p><em>Bookings may be subject to hourly minimum service rates.</em></p>
<h2>4. Major Events (Peak / Special Events)</h2>
<p>For services booked during major events, cancellations require 14-day and 21-day notice from the event's first day (as applicable). Otherwise, full fare charges may apply, and hourly minimums may apply.</p>
<h2>5. Meet &amp; Greet Cancellations</h2>
<p>YYZ and YTZ Meet &amp; Greet cancellations require 2 hours' notice; otherwise full charges apply.</p>
<h2>6. Onsite Coordinator Cancellations</h2>
<p>Service cancellations require 48 hours' notice; otherwise standard four-hour minimum service charges apply.</p>
<h2>7. No-Show Policy</h2>
<p>If the client does not show or leaves the pickup location without contacting Dispatch, 100% of the fare may be charged (no refund).</p>
<h2>8. Refunds &amp; Processing</h2>
<ul>
  <li>Approved refunds are typically processed within 5–10 business days (bank timelines may vary).</li>
  <li>Refund/credit requests for trips covered under service guarantees must be submitted within 30 calendar days of the invoice date.</li>
</ul>
`.trim(),

  terms: `
<div class="legal-callout"><h2>Terms of Service</h2><p>These Terms govern SARJ Worldwide Chauffeured Services Inc. ("SARJ Worldwide," "Company," "we," "us," "our") services and website (the "Site"). By booking or using our services, you ("Client," "you," "your") agree to these Terms.</p></div>
<h2>1. Services Provided</h2>
<p>SARJ Worldwide provides ground transportation and chauffeured services including airport transfers, point-to-point rides, hourly services, corporate transportation, events, and shuttle services. Services may be performed by SARJ Worldwide or affiliated independent owner-operators ("Chauffeur Partners").</p>
<h2>2. Rates, Quotes &amp; Currency</h2>
<p>Rates are based on client-provided trip details. Final charges may vary due to tolls, parking, waiting time, route changes, extra stops, cleaning fees, airport fees, and applicable surcharges.</p>
<p>Prices are in Canadian Dollars (CAD) unless stated otherwise.</p>
<p>Published rates may change without notice; the confirmed rate is the one provided at time of reservation/confirmation.</p>
<h2>3. Reservations &amp; Payments</h2>
<p>Reservations are subject to availability and may require a valid credit card to confirm.</p>
<p>We may pre-authorize or charge the card 24–72 hours prior to pickup. Bookings made within 24 hours may be charged immediately.</p>
<p>Payments may be processed via a PCI-compliant payment processor (e.g., Stripe). We do not store full card details.</p>
<p>If invoiced, payment is due within two (2) business days of the invoice date (or per your Preferred Client Pricing Agreement).</p>
<p>Late payments may incur <strong>2% monthly interest</strong> on outstanding amounts. Clients remain responsible for all unpaid amounts.</p>
<h2>4. Taxes</h2>
<p>Clients are responsible for all applicable taxes (including HST where applicable) unless expressly included in a quoted flat rate.</p>
<h2>5. Additional Charges</h2>
<p><strong>Waiting Time</strong></p>
<ul>
  <li>Airport drop-off / point-to-point / hourly: 15 minutes complimentary at pickup.</li>
  <li>Airport pickup: 45 minutes complimentary from gate arrival; after that, CAD 1.50/min.</li>
</ul>
<p><strong>Tolls &amp; Parking:</strong> billed at cost.</p>
<p><strong>Extra Stops/Route Changes:</strong> may incur additional time/distance charges.</p>
<p><strong>After-hours surcharge</strong> (if disclosed): trips starting 11:00 PM – 4:45 AM may carry a surcharge (shown in your quote/confirmation).</p>
<p><strong>Event/Holiday surcharges</strong> (if disclosed): peak days and major events may include surcharges shown on your quote/confirmation.</p>
<h2>6. Airport Wait Time Policy (Arrivals)</h2>
<ul>
  <li><strong>Pearson International Airport (YYZ):</strong> 45-minute grace period for arrivals.</li>
  <li><strong>Toronto Island Airport (YTZ) &amp; FBO pickups:</strong> 15-minute grace period.</li>
</ul>
<p>During the grace period, we will attempt to contact the client. After the grace period, the chauffeur will wait an additional 15 minutes before cancelling the transfer. After cancellation, the client is responsible for applicable charges.</p>
<h2>7. Airport Fees (GTAA)</h2>
<p>If the airport or regulatory authority imposes pickup fees, those will be charged to the client. GTAA pre-arranged pickup fees include:</p>
<table>
  <thead><tr><th>Vehicle Type</th><th>Fee</th></tr></thead>
  <tbody>
    <tr><td>Sedans / Vans / SUVs</td><td>$17.25</td></tr>
    <tr><td>Stretch Limos / Sprinter Vans (max 12)</td><td>$31.05</td></tr>
    <tr><td>Mini-buses (13–25 seats)</td><td>$56.35</td></tr>
  </tbody>
</table>
<p><em>These fees apply to pre-arranged services and are subject to change by GTAA.</em></p>
<h2>8. Passenger Confirmation / Contact</h2>
<p>If a passenger cannot locate the vehicle, use Contact Us in the SARJ app to reach Dispatch. Leaving the pickup location without notice may result in a full fare charge.</p>
<h2>9. Drop &amp; Return Policy</h2>
<p>Drop-off and return requests will only be fulfilled if there is a minimum of <strong>four (4) hours</strong> between the two times.</p>
<h2>10. Vehicle Availability</h2>
<p>We will make reasonable efforts to provide the requested vehicle model; however, a similar class may be substituted if necessary. Vehicle images are illustrative.</p>
<h2>11. Vehicle Cleaning / Damage Fees</h2>
<ul>
  <li>Minimum <strong>CAD 250</strong> for spills/stains requiring professional cleaning.</li>
  <li>Biohazard (e.g., vomiting) fee <strong>CAD 300–500</strong> depending on severity and downtime.</li>
</ul>
<h2>12. Conduct &amp; Safety</h2>
<p>Seatbelts must be worn where required by law. Prohibited conduct includes:</p>
<ul>
  <li>Smoking/vaping in vehicles (may incur cleaning fees)</li>
  <li>Illegal substances or open alcohol where prohibited by law</li>
  <li>Unsafe, abusive, or threatening behavior (service may be terminated without refund)</li>
</ul>
<p>We reserve the right to refuse service for safety or non-compliance.</p>
<h2>13. Luggage, Capacity &amp; Lost &amp; Found</h2>
<p>Do not exceed quoted passenger/luggage capacity. Oversized luggage may require a larger vehicle (additional charges).</p>
<p>Items left in vehicles may be held if found; no liability is assumed. Unclaimed items may be disposed of after 30 days.</p>
<h2>14. Children, Car Seats &amp; Unaccompanied Minors</h2>
<p>Ontario child restraint laws apply. Child/booster seats may be provided upon request (fees may apply, subject to availability). You are responsible for correct installation. Unaccompanied minor transport requires prior written consent and may be refused.</p>
<h2>15. Pets, Service Animals &amp; Accessibility</h2>
<p>Service animals are welcome at no charge. Pets must be declared when booking, travel in a carrier, and may incur cleaning fees. For accessibility needs, inform us at booking to coordinate suitable arrangements where available.</p>
<h2>16. Flight Monitoring</h2>
<p>We may track flights using publicly available data to adjust dispatch within reasonable limits. You must provide accurate flight details and notify us of changes.</p>
<h2>17. Subcontractors / Chauffeur Partners</h2>
<p>We may use agents and subcontractors. Chauffeur Partners are responsible for their licensing, insurance, and compliance. SARJ Worldwide's role may be coordination; liability is limited as permitted by law.</p>
<h2>18. Limitation of Liability &amp; Timing Disclaimer</h2>
<p>We are not liable for indirect or consequential damages, delays, missed flights/events, or losses due to traffic, weather, construction, mechanical issues, road closures, airport operations, or other events outside our control.</p>
<h2>19. Force Majeure</h2>
<p>We are not liable for failure or delay due to events beyond reasonable control (natural disasters, emergencies, pandemics, labor disputes, government actions, infrastructure outages, etc.).</p>
<h2>20. Cross-Border Travel</h2>
<p>For cross-border trips, valid travel documents are your responsibility. We are not liable for denial of entry, customs delays, or related costs. Additional time/fees may apply.</p>
<h2>21. Invoice Discrepancies</h2>
<p>Invoice/billing discrepancies must be reported within <strong>30 days</strong> of the invoice date. After that, the invoice is deemed accepted.</p>
<h2>22. Chargebacks / Disputes</h2>
<p>By providing payment details, you authorize charges for base fare and applicable additional fees. Unfounded chargebacks may be contested. Accounts with unresolved chargebacks may be suspended.</p>
<h2>23. Third-Party Platforms</h2>
<p>Bookings through third-party systems (concierge/affiliate platforms) may also be subject to their terms and privacy policies.</p>
<h2>24. Governing Law &amp; Dispute Resolution</h2>
<p>These Terms are governed by the laws of Ontario, Canada. Disputes may be resolved by binding arbitration in Ontario, Canada, as permitted by law.</p>
<h2>25. Severability, Amendments &amp; Digital Acceptance</h2>
<p>If any provision is invalid, the rest remains in effect. We may update these Terms at any time. Booking by Site/email/phone/app constitutes electronic acceptance.</p>
`.trim(),
};

export const LEGAL_DEFAULT_CSS = `
.legal-body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #1C1C1E; font-size: 15px; line-height: 1.65; }
.legal-body h1, .legal-body h2, .legal-body h3, .legal-body h4 { color: #1C1C1E; font-weight: 800; letter-spacing: -0.02em; line-height: 1.3; margin: 1.35em 0 0.55em; }
.legal-body h2 { font-size: 1.2em; }
.legal-body h3 { font-size: 1.08em; }
.legal-body p { margin: 0 0 0.85em; line-height: 1.65; }
.legal-body ul, .legal-body ol { margin: 0 0 1em; padding-left: 1.25em; }
.legal-body li { margin: 0.35em 0; line-height: 1.55; }
.legal-body a { color: #C9A063; font-weight: 600; text-decoration: none; }
.legal-body table { width: 100%; border-collapse: collapse; margin: 0.75em 0 1em; font-size: 0.95em; }
.legal-body th, .legal-body td { border: 1px solid #E5E7EB; padding: 10px 12px; text-align: left; vertical-align: top; }
.legal-body th { background: #F3F4F6; font-weight: 700; }
.legal-body .legal-callout { background: rgba(201,160,99,0.12); border: 1px solid rgba(201,160,99,0.28); border-radius: 14px; padding: 14px 16px; margin: 0 0 1.25em; }
.legal-body .legal-callout h2 { margin: 0 0 0.35em; font-size: 1.15em; }
.legal-body .legal-callout p { margin: 0; color: #6B7280; }
.legal-body blockquote { border-left: 3px solid #C9A063; margin: 0.75em 0; padding: 0.25em 0 0.25em 0.9em; color: #4B5563; }
.legal-body img { max-width: 100%; height: auto; border-radius: 10px; }
.legal-body hr { border: none; border-top: 1px solid #E5E7EB; margin: 1.5em 0; }
`.trim();
