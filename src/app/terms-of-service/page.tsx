import TopNav from "@/components/TopNav";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import type { Metadata } from "next";

const BASE_URL = "https://luxride-chauffeur.vercel.app";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "Terms of Service for SARJ Worldwide Chauffeur Services. Read our terms and conditions for using our premium chauffeur and transportation services.",
  openGraph: {
    title: "Terms of Service | SARJ Worldwide Chauffeur Services",
    description: "Terms and conditions for SARJ Worldwide Chauffeur Services.",
    url: `${BASE_URL}/terms-of-service`,
    siteName: "SARJ Worldwide Chauffeur Services",
    type: "website",
  },
  alternates: { canonical: `${BASE_URL}/terms-of-service` },
};

export default function TermsOfServicePage() {
  return (
    <>
      <TopNav />
      <Navbar />

      <section className="relative bg-gradient-to-b from-gray-50 to-white min-h-screen">
        {/* Hero */}
        <div className="bg-gradient-to-r from-[#1a1a1a] via-[#111] to-[#1a1a1a] py-16 sm:py-20">
          <div className="max-w-4xl mx-auto px-6 text-center">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white tracking-tight">
              Terms of <span className="text-[#C9A063]">Service</span>
            </h1>
            <p className="mt-4 text-gray-400 text-[15px] sm:text-base max-w-xl mx-auto">
              Please read these terms carefully before using our services.
            </p>
            <p className="mt-2 text-gray-500 text-[13px]">
              Last Updated: January 2025
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-4xl mx-auto px-6 py-12 sm:py-16">
          <div className="prose prose-gray max-w-none space-y-10">

            {/* Introduction */}
            <div className="bg-gray-50 rounded-2xl p-6 sm:p-8 border border-gray-100">
              <p className="text-gray-600 text-[15px] leading-relaxed">
                These Terms of Service (&quot;Terms&quot;) govern the use of SARJ Worldwide Chauffeured Services Inc. (&quot;SARJ Worldwide,&quot; &quot;Company,&quot; &quot;we,&quot; &quot;us,&quot; &quot;our&quot;) services and website (the &quot;Site&quot;). By booking or using our services, you (&quot;Client,&quot; &quot;you,&quot; &quot;your&quot;) agree to these Terms.
              </p>
            </div>

            {/* 1. Services Provided */}
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
                <span className="text-[#C9A063]">1.</span> Services Provided
              </h2>
              <p className="text-gray-600 text-[15px] leading-relaxed">
                SARJ Worldwide provides ground transportation and chauffeured services including airport transfers, point-to-point rides, hourly services, corporate transportation, events, and shuttle services. Services may be performed by SARJ Worldwide or affiliated independent owner-operators (&quot;Chauffeur Partners&quot;).
              </p>
            </div>

            {/* 2. Rates, Quotes & Currency */}
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
                <span className="text-[#C9A063]">2.</span> Rates, Quotes &amp; Currency
              </h2>
              <p className="text-gray-600 text-[15px] leading-relaxed mb-3">
                Rates are based on client-provided trip details. Final charges may vary due to tolls, parking, waiting time, route changes, extra stops, cleaning fees, airport fees, and applicable surcharges.
              </p>
              <p className="text-gray-600 text-[15px] leading-relaxed mb-3">
                Prices are in Canadian Dollars (CAD) unless stated otherwise.
              </p>
              <p className="text-gray-600 text-[15px] leading-relaxed">
                Published rates may change without notice; the confirmed rate is the one provided at time of reservation/confirmation.
              </p>
            </div>

            {/* 3. Reservations & Payments */}
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
                <span className="text-[#C9A063]">3.</span> Reservations &amp; Payments
              </h2>
              <p className="text-gray-600 text-[15px] leading-relaxed mb-3">
                Reservations are subject to availability and may require a valid credit card to confirm.
              </p>
              <p className="text-gray-600 text-[15px] leading-relaxed mb-3">
                We may pre-authorize or charge the card 24–72 hours prior to pickup. Bookings made within 24 hours may be charged immediately.
              </p>
              <p className="text-gray-600 text-[15px] leading-relaxed mb-3">
                Payments may be processed via a PCI-compliant payment processor (e.g., Stripe through our booking/dispatch system). We do not store full card details.
              </p>
              <p className="text-gray-600 text-[15px] leading-relaxed mb-3">
                If invoiced, payment is due within two (2) business days of the invoice date (or per your Preferred Client Pricing Agreement).
              </p>
              <p className="text-gray-600 text-[15px] leading-relaxed">
                Late payments may incur <strong>2% monthly interest</strong> on outstanding amounts. Clients remain responsible for all unpaid amounts.
              </p>
            </div>

            {/* 4. Taxes */}
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
                <span className="text-[#C9A063]">4.</span> Taxes
              </h2>
              <p className="text-gray-600 text-[15px] leading-relaxed">
                Clients are responsible for all applicable taxes (including HST where applicable) unless expressly included in a quoted flat rate.
              </p>
            </div>

            {/* 5. Additional Charges */}
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
                <span className="text-[#C9A063]">5.</span> Additional Charges
              </h2>
              
              <h3 className="text-[16px] font-semibold text-gray-800 mt-4 mb-2">Waiting Time</h3>
              <ul className="list-disc list-inside text-gray-600 text-[15px] leading-relaxed space-y-1.5 ml-4 mb-4">
                <li>Airport drop-off / point-to-point / hourly: 15 minutes complimentary at pickup.</li>
                <li>Airport pickup: 45 minutes complimentary from gate arrival; after that, CAD 1.50/min.</li>
              </ul>

              <p className="text-gray-600 text-[15px] leading-relaxed mb-3">
                <strong>Tolls &amp; Parking:</strong> billed at cost.
              </p>
              <p className="text-gray-600 text-[15px] leading-relaxed mb-3">
                <strong>Extra Stops/Route Changes:</strong> may incur additional time/distance charges.
              </p>
              <p className="text-gray-600 text-[15px] leading-relaxed mb-3">
                <strong>After-hours surcharge</strong> (if disclosed): trips starting 11:00 PM – 4:45 AM may carry a surcharge (shown in your quote/confirmation).
              </p>
              <p className="text-gray-600 text-[15px] leading-relaxed">
                <strong>Event/Holiday surcharges</strong> (if disclosed): peak days and major events may include surcharges shown on your quote/confirmation.
              </p>
            </div>

            {/* 6. Airport Wait Time Policy */}
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
                <span className="text-[#C9A063]">6.</span> Airport Wait Time Policy (Arrivals)
              </h2>
              <ul className="list-disc list-inside text-gray-600 text-[15px] leading-relaxed space-y-1.5 ml-4 mb-3">
                <li><strong>Pearson International Airport (YYZ):</strong> 45-minute grace period for arrivals.</li>
                <li><strong>Toronto Island Airport (YTZ) &amp; FBO pickups:</strong> 15-minute grace period.</li>
              </ul>
              <p className="text-gray-600 text-[15px] leading-relaxed">
                During the grace period, we will attempt to contact the client. After the grace period, the chauffeur will wait an additional 15 minutes before cancelling the transfer. After cancellation, the client is responsible for applicable charges.
              </p>
            </div>

            {/* 7. Airport Fees (GTAA) */}
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
                <span className="text-[#C9A063]">7.</span> Airport Fees (GTAA)
              </h2>
              <p className="text-gray-600 text-[15px] leading-relaxed mb-3">
                If the airport or regulatory authority imposes pickup fees, those will be charged to the client. The Greater Toronto Airport Authority (GTAA) requires pre-arranged pickup fees for commercial vehicles, including:
              </p>
              <div className="bg-gray-50 rounded-xl border border-gray-100 overflow-hidden mb-3">
                <table className="w-full text-[15px]">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="text-left px-4 py-3 text-gray-700 font-semibold">Vehicle Type</th>
                      <th className="text-right px-4 py-3 text-gray-700 font-semibold">Fee</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    <tr>
                      <td className="px-4 py-3 text-gray-600">Sedans / Vans / SUVs</td>
                      <td className="px-4 py-3 text-gray-900 font-semibold text-right">$17.25</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 text-gray-600">Stretch Limos / Sprinter Vans (max 12)</td>
                      <td className="px-4 py-3 text-gray-900 font-semibold text-right">$31.05</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 text-gray-600">Mini-buses (13–25 seats)</td>
                      <td className="px-4 py-3 text-gray-900 font-semibold text-right">$56.35</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="text-gray-500 text-[13px] italic">
                These fees apply to pre-arranged services and are subject to change by GTAA.
              </p>
            </div>

            {/* 8. Passenger Confirmation / Contact */}
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
                <span className="text-[#C9A063]">8.</span> Passenger Confirmation / Contact
              </h2>
              <p className="text-gray-600 text-[15px] leading-relaxed mb-3">
                If a passenger cannot locate the vehicle, they must contact SARJ Worldwide Dispatch:
              </p>
              <ul className="list-disc list-inside text-gray-600 text-[15px] leading-relaxed space-y-1.5 ml-4 mb-3">
                <li>Phone: <a href="tel:+14168935779" className="text-[#C9A063] hover:underline">416-893-5779</a></li>
                <li>Text: <a href="sms:+14168835778" className="text-[#C9A063] hover:underline">416-883-5778</a></li>
                <li>Email: <span className="text-[#C9A063]">reserve@SARJWorldwide.ca</span></li>
              </ul>
              <p className="text-gray-600 text-[15px] leading-relaxed font-medium">
                Leaving the pickup location without notice may result in a full fare charge.
              </p>
            </div>

            {/* 9. Drop & Return Policy */}
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
                <span className="text-[#C9A063]">9.</span> Drop &amp; Return Policy
              </h2>
              <p className="text-gray-600 text-[15px] leading-relaxed">
                Drop-off and return requests will only be fulfilled if there is a minimum of <strong>four (4) hours</strong> between the two times. This minimum service time applies to each end of the service.
              </p>
            </div>

            {/* 10. Vehicle Availability */}
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
                <span className="text-[#C9A063]">10.</span> Vehicle Availability
              </h2>
              <p className="text-gray-600 text-[15px] leading-relaxed">
                We will make reasonable efforts to provide the requested vehicle model; however, a similar class may be substituted if necessary. Vehicle images are illustrative.
              </p>
            </div>

            {/* 11. Vehicle Cleaning / Damage Fees */}
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
                <span className="text-[#C9A063]">11.</span> Vehicle Cleaning / Damage Fees
              </h2>
              <ul className="list-disc list-inside text-gray-600 text-[15px] leading-relaxed space-y-1.5 ml-4">
                <li>Minimum <strong>CAD 250</strong> for spills/stains requiring professional cleaning.</li>
                <li>Biohazard (e.g., vomiting) fee <strong>CAD 300–500</strong> depending on severity and downtime.</li>
              </ul>
            </div>

            {/* 12. Conduct & Safety */}
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
                <span className="text-[#C9A063]">12.</span> Conduct &amp; Safety
              </h2>
              <p className="text-gray-600 text-[15px] leading-relaxed mb-3">
                Seatbelts must be worn where required by law. Prohibited conduct includes:
              </p>
              <ul className="list-disc list-inside text-gray-600 text-[15px] leading-relaxed space-y-1.5 ml-4 mb-3">
                <li>Smoking/vaping in vehicles (may incur cleaning fees)</li>
                <li>Illegal substances or open alcohol where prohibited by law</li>
                <li>Unsafe, abusive, or threatening behavior (service may be terminated without refund)</li>
              </ul>
              <p className="text-gray-600 text-[15px] leading-relaxed">
                We reserve the right to refuse service for safety or non-compliance.
              </p>
            </div>

            {/* 13. Luggage, Capacity & Lost & Found */}
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
                <span className="text-[#C9A063]">13.</span> Luggage, Capacity &amp; Lost &amp; Found
              </h2>
              <p className="text-gray-600 text-[15px] leading-relaxed mb-3">
                Do not exceed quoted passenger/luggage capacity. Oversized luggage may require a larger vehicle (additional charges).
              </p>
              <p className="text-gray-600 text-[15px] leading-relaxed">
                Items left in vehicles may be held if found; no liability is assumed. Unclaimed items may be disposed of after 30 days.
              </p>
            </div>

            {/* 14. Children, Car Seats & Unaccompanied Minors */}
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
                <span className="text-[#C9A063]">14.</span> Children, Car Seats &amp; Unaccompanied Minors
              </h2>
              <p className="text-gray-600 text-[15px] leading-relaxed">
                Ontario child restraint laws apply. Child/booster seats may be provided upon request (fees may apply, subject to availability). You are responsible for correct installation. Unaccompanied minor transport requires prior written consent and may be refused.
              </p>
            </div>

            {/* 15. Pets, Service Animals & Accessibility */}
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
                <span className="text-[#C9A063]">15.</span> Pets, Service Animals &amp; Accessibility
              </h2>
              <p className="text-gray-600 text-[15px] leading-relaxed">
                Service animals are welcome at no charge. Pets must be declared when booking, travel in a carrier, and may incur cleaning fees. For accessibility needs (e.g., wheelchair access), inform us at booking to coordinate suitable arrangements where available.
              </p>
            </div>

            {/* 16. Flight Monitoring */}
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
                <span className="text-[#C9A063]">16.</span> Flight Monitoring
              </h2>
              <p className="text-gray-600 text-[15px] leading-relaxed">
                We may track flights using publicly available data to adjust dispatch within reasonable limits. You must provide accurate flight details and notify us of changes. Meet-and-Greet (if requested) may carry a fee and includes specified wait time.
              </p>
            </div>

            {/* 17. Subcontractors / Chauffeur Partners */}
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
                <span className="text-[#C9A063]">17.</span> Subcontractors / Chauffeur Partners
              </h2>
              <p className="text-gray-600 text-[15px] leading-relaxed">
                We may use agents and subcontractors. Chauffeur Partners are responsible for their licensing, insurance, and compliance. SARJ Worldwide&apos;s role may be coordination; liability is limited as permitted by law.
              </p>
            </div>

            {/* 18. Limitation of Liability & Timing Disclaimer */}
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
                <span className="text-[#C9A063]">18.</span> Limitation of Liability &amp; Timing Disclaimer
              </h2>
              <p className="text-gray-600 text-[15px] leading-relaxed">
                We are not liable for indirect or consequential damages, delays, missed flights/events, or losses due to traffic, weather, construction, mechanical issues, road closures, airport operations, or other events outside our control. Claims beyond applicable insurance coverage are not our responsibility.
              </p>
            </div>

            {/* 19. Force Majeure */}
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
                <span className="text-[#C9A063]">19.</span> Force Majeure
              </h2>
              <p className="text-gray-600 text-[15px] leading-relaxed">
                We are not liable for failure or delay due to events beyond reasonable control (natural disasters, emergencies, pandemics, labor disputes, government actions, infrastructure outages, etc.).
              </p>
            </div>

            {/* 20. Cross-Border Travel */}
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
                <span className="text-[#C9A063]">20.</span> Cross-Border Travel
              </h2>
              <p className="text-gray-600 text-[15px] leading-relaxed">
                For cross-border trips, valid travel documents are your responsibility. We are not liable for denial of entry, customs delays, or related costs. Additional time/fees may apply.
              </p>
            </div>

            {/* 21. Invoice Discrepancies */}
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
                <span className="text-[#C9A063]">21.</span> Invoice Discrepancies
              </h2>
              <p className="text-gray-600 text-[15px] leading-relaxed">
                Invoice/billing discrepancies must be reported within <strong>30 days</strong> of the invoice date. After that, the invoice is deemed accepted.
              </p>
            </div>

            {/* 22. Chargebacks / Disputes */}
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
                <span className="text-[#C9A063]">22.</span> Chargebacks / Disputes
              </h2>
              <p className="text-gray-600 text-[15px] leading-relaxed">
                By providing payment details, you authorize charges for base fare and applicable additional fees (waiting, stops, parking/tolls, cleaning, damages, surcharges). Unfounded chargebacks may be contested using trip confirmations, GPS logs, and communications. Accounts with unresolved chargebacks may be suspended.
              </p>
            </div>

            {/* 23. Third-Party Platforms */}
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
                <span className="text-[#C9A063]">23.</span> Third-Party Platforms
              </h2>
              <p className="text-gray-600 text-[15px] leading-relaxed">
                Bookings through third-party systems (concierge/affiliate platforms) may also be subject to their terms and privacy policies.
              </p>
            </div>

            {/* 24. Governing Law & Dispute Resolution */}
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
                <span className="text-[#C9A063]">24.</span> Governing Law &amp; Dispute Resolution
              </h2>
              <p className="text-gray-600 text-[15px] leading-relaxed">
                These Terms are governed by the laws of Ontario, Canada. Disputes may be resolved by binding arbitration in Ontario, Canada, as permitted by law.
              </p>
            </div>

            {/* 25. Severability, Amendments & Digital Acceptance */}
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
                <span className="text-[#C9A063]">25.</span> Severability, Amendments &amp; Digital Acceptance
              </h2>
              <p className="text-gray-600 text-[15px] leading-relaxed">
                If any provision is invalid, the rest remains in effect. We may update these Terms at any time by posting changes on the Site. Booking by Site/email/phone constitutes electronic acceptance.
              </p>
            </div>

            {/* Contact */}
            <div className="bg-gray-50 rounded-2xl p-6 sm:p-8 border border-gray-100">
              <h2 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
                <span className="text-[#C9A063]">26.</span> Contact Us
              </h2>
              <p className="text-gray-600 text-[15px] leading-relaxed mb-4">
                If you have any questions about these Terms of Service, please contact us:
              </p>
              <div className="space-y-2 text-[15px]">
                <p className="text-gray-700"><strong>SARJ Worldwide Chauffeured Services Inc.</strong></p>
                <p className="text-gray-600">Phone: <a href="tel:+14168935779" className="text-[#C9A063] hover:underline">416-893-5779</a></p>
                <p className="text-gray-600">Text: <a href="sms:+14168835778" className="text-[#C9A063] hover:underline">416-883-5778</a></p>
                <p className="text-gray-600">Email: <span className="text-[#C9A063]">reserve@SARJWorldwide.ca</span></p>
              </div>
            </div>

          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
