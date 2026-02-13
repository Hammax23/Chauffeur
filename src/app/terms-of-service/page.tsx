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
              Last updated: February 9, 2026
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-4xl mx-auto px-6 py-12 sm:py-16">
          <div className="prose prose-gray max-w-none space-y-10">

            {/* 1. Rates & Pricing */}
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
                <span className="text-[#C9A063]">1.</span> Rates &amp; Pricing
              </h2>
              <p className="text-gray-600 text-[15px] leading-relaxed">
                SARJ Worldwide&apos;s rates are based on client information, but actual rates and services may vary, tolls, parking, and wait times. Prices are in CAD$.
              </p>
            </div>

            {/* 2. Airport Wait Time Policy */}
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
                <span className="text-[#C9A063]">2.</span> Airport Wait Time Policy
              </h2>
              <p className="text-gray-600 text-[15px] leading-relaxed mb-3">
                Pearson International Airport offers a 45-minute grace period for arrivals. Toronto Island Airport and FBO pickups provide a 15-minute grace period. During this time, SARJ Worldwide will attempt to contact the client.
              </p>
              <p className="text-gray-600 text-[15px] leading-relaxed">
                After the grace period ends, the chauffeur will wait an additional 15 minutes before cancelling the transfer, at which point the client is responsible for any charges.
              </p>
            </div>

            {/* 3. Airport Fee */}
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
                <span className="text-[#C9A063]">3.</span> Airport Fee
              </h2>
              <p className="text-gray-600 text-[15px] leading-relaxed mb-3">
                SARJ Worldwide services will incur an additional charge if the local airport or regulatory authority imposes charges. The Greater Toronto Airport Authority (GTAA) requires that pre-arranged and charter bus pickup fees for commercial vehicles be as follows:
              </p>
              <p className="text-gray-600 text-[15px] leading-relaxed font-medium mb-3">
                Effective January 1, 2026, the GTAA pre-arranged and charter bus pickup fees for commercial vehicles are:
              </p>
              <div className="bg-gray-50 rounded-xl border border-gray-100 overflow-hidden">
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
              <p className="text-gray-500 text-[13px] mt-3 italic">
                These fees apply to pre-arranged services and are subject to change by GTAA.
              </p>
            </div>

            {/* 4. Meet & Greet Cancellation */}
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
                <span className="text-[#C9A063]">4.</span> Meet &amp; Greet Service Cancellation Policy
              </h2>
              <p className="text-gray-600 text-[15px] leading-relaxed">
                YYZ and YTZ service cancellations require 2 hours&apos; notice. Full charges will be applied after 2 hours.
              </p>
            </div>

            {/* 5. Onsite Coordinator Cancellation */}
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
                <span className="text-[#C9A063]">5.</span> Onsite Coordinator Cancellation Policy
              </h2>
              <p className="text-gray-600 text-[15px] leading-relaxed">
                Service cancellations require 48 hours&apos; notice. Otherwise, standard 4-hour minimum service charges will apply.
              </p>
            </div>

            {/* 6. Payment and Taxes */}
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
                <span className="text-[#C9A063]">6.</span> Payment &amp; Taxes
              </h2>
              <p className="text-gray-600 text-[15px] leading-relaxed mb-3">
                Clients must pay for SARJ Worldwide&apos;s services at the time of request or, if invoiced, in accordance with the invoice terms. Payments are due within 2 weeks (weekdays) of the invoice date or according to their Preferred Client Pricing Agreement.
              </p>
              <p className="text-gray-600 text-[15px] leading-relaxed mb-3">
                Failure to pay an invoice in full when due will incur a <strong>2% monthly interest rate</strong> on outstanding amounts. Clients are fully responsible for all outstanding amounts.
              </p>
              <h3 className="text-[16px] font-semibold text-gray-800 mt-4 mb-2">Taxes</h3>
              <p className="text-gray-600 text-[15px] leading-relaxed">
                The client must pay SARJ Worldwide all applicable taxes for the service provided. This ensures full reimbursement by law.
              </p>
            </div>

            {/* 7. Invoice Discrepancies */}
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
                <span className="text-[#C9A063]">7.</span> Invoice Discrepancies
              </h2>
              <p className="text-gray-600 text-[15px] leading-relaxed mb-3">
                Clients should contact the phone number on their invoice to report any discrepancies. Invoice/billing discrepancies must be reported within <strong>30 days</strong> of the invoice date, after which the invoice is deemed accepted.
              </p>
              <p className="text-gray-600 text-[15px] leading-relaxed">
                Refunds for SARJ Worldwide&apos;s Service Guarantees will be processed according to the terms of the guarantee agreement. A refund or credit request for a trip covered by a service guarantee must be received within 30 calendar days of the invoice date.
              </p>
            </div>

            {/* 8. Passenger Confirmation */}
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
                <span className="text-[#C9A063]">8.</span> Passenger Confirmation
              </h2>
              <p className="text-gray-600 text-[15px] leading-relaxed mb-3">
                If a passenger can&apos;t find their vehicle, they should contact SARJ Worldwide Dispatch by:
              </p>
              <ul className="list-disc list-inside text-gray-600 text-[15px] leading-relaxed space-y-1.5 ml-4">
                <li>Phone: <a href="tel:+14168935779" className="text-[#C9A063] hover:underline">416-893-5779</a></li>
                <li>Email: <a href="mailto:reserve@SARJWorldwide.ca" className="text-[#C9A063] hover:underline">reserve@SARJWorldwide.ca</a></li>
                <li>Text: <a href="tel:+14168835778" className="text-[#C9A063] hover:underline">416-883-5778</a></li>
              </ul>
              <p className="text-gray-600 text-[15px] leading-relaxed mt-3 font-medium">
                Leaving your pickup location without prior notice will result in a full fare charge.
              </p>
            </div>

            {/* 9. Right to Use Agents */}
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
                <span className="text-[#C9A063]">9.</span> Right to Use Agents &amp; Subcontractors
              </h2>
              <p className="text-gray-600 text-[15px] leading-relaxed">
                SARJ Worldwide reserves the right to use agents and subcontractors to perform its services, and this right is governed by the Terms and Conditions.
              </p>
            </div>

            {/* 10. Drop and Return Policy */}
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
                <span className="text-[#C9A063]">10.</span> Drop &amp; Return Policy
              </h2>
              <p className="text-gray-600 text-[15px] leading-relaxed">
                Drop-off and return requests will only be fulfilled if there is a minimum of <strong>four hours</strong> between the two times. This minimum service time applies to each end of the transportation service.
              </p>
            </div>

            {/* 11. Stop on Route */}
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
                <span className="text-[#C9A063]">11.</span> Stop on Route
              </h2>
              <p className="text-gray-600 text-[15px] leading-relaxed">
                Requesting a stop on a scheduled transfer may incur an additional charge.
              </p>
            </div>

            {/* 12. Cancellation Policy */}
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
                <span className="text-[#C9A063]">12.</span> Cancellation Policy
              </h2>
              <p className="text-gray-600 text-[15px] leading-relaxed mb-4">
                SARJ Worldwide orders are considered &quot;dispatched&quot; once a confirmation notice and/or trip number are provided to the client. To qualify for a full or partial refund, the client must confirm the cancellation request within a reasonable timeframe.
              </p>

              {/* Sedan/SUV */}
              <div className="bg-gray-50 rounded-xl border border-gray-100 p-5 mb-4">
                <h3 className="text-[16px] font-semibold text-gray-800 mb-3">Sedan / SUV — Greater Toronto Area (GTAA)</h3>
                <div className="space-y-3">
                  <div>
                    <h4 className="text-[14px] font-semibold text-[#C9A063] mb-1">Airport / One-Way Transfer</h4>
                    <p className="text-gray-600 text-[15px] leading-relaxed">
                      Service cancellations require <strong>2 hours&apos;</strong> notice. Otherwise, full fare charges apply.
                    </p>
                  </div>
                  <div>
                    <h4 className="text-[14px] font-semibold text-[#C9A063] mb-1">Out of Town, Hourly, or Charter</h4>
                    <ul className="list-disc list-inside text-gray-600 text-[15px] leading-relaxed space-y-1.5 ml-4">
                      <li>24-hour notice required for full reimbursement</li>
                      <li>12–24 hours: 50% charge of the original fare</li>
                      <li>Less than 12 hours: Full fare charges</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Major Events */}
              <div className="bg-gray-50 rounded-xl border border-gray-100 p-5 mb-4">
                <h3 className="text-[16px] font-semibold text-gray-800 mb-3">Major Events</h3>
                <p className="text-gray-600 text-[15px] leading-relaxed">
                  A <strong>14-day</strong> notice (21 days for Sprinter Van) is required from the event&apos;s first day for any service booked during the event. Otherwise, full fare charges apply. Bookings will be subject to hourly minimum service.
                </p>
              </div>

              {/* Sprinter Van */}
              <div className="bg-gray-50 rounded-xl border border-gray-100 p-5">
                <h3 className="text-[16px] font-semibold text-gray-800 mb-3">Sprinter Van</h3>
                <div className="space-y-3">
                  <div>
                    <h4 className="text-[14px] font-semibold text-[#C9A063] mb-1">Airport / One-Way Transfer</h4>
                    <p className="text-gray-600 text-[15px] leading-relaxed">
                      Service cancellations require <strong>24 hours&apos;</strong> notice. Otherwise, full fare charges apply. Hourly minimum service rates will apply to bookings.
                    </p>
                  </div>
                  <div>
                    <h4 className="text-[14px] font-semibold text-[#C9A063] mb-1">Out of Town, Hourly Chauffeur Services</h4>
                    <ul className="list-disc list-inside text-gray-600 text-[15px] leading-relaxed space-y-1.5 ml-4">
                      <li>24-hour notice required for full reimbursement</li>
                      <li>12–24 hours: 50% charge of the original fare</li>
                      <li>Less than 12 hours: Full fare charges</li>
                    </ul>
                    <p className="text-gray-500 text-[13px] mt-2 italic">
                      *Bookings will be subject to hourly minimum service rates.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Contact */}
            <div className="bg-gray-50 rounded-2xl p-6 sm:p-8 border border-gray-100">
              <h2 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
                <span className="text-[#C9A063]">13.</span> Contact Us
              </h2>
              <p className="text-gray-600 text-[15px] leading-relaxed mb-4">
                If you have any questions about these Terms of Service, please contact us:
              </p>
              <div className="space-y-2 text-[15px]">
                <p className="text-gray-700"><strong>SARJ Worldwide Chauffeur Services</strong></p>
                <p className="text-gray-600">Phone: <a href="tel:+14168935779" className="text-[#C9A063] hover:underline">416-893-5779</a></p>
                <p className="text-gray-600">Email: <a href="mailto:reserve@sarjworldwide.ca" className="text-[#C9A063] hover:underline">reserve@sarjworldwide.ca</a></p>
              </div>
            </div>

          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
