import TopNav from "@/components/TopNav";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import type { Metadata } from "next";

const BASE_URL = "https://luxride-chauffeur.vercel.app";

export const metadata: Metadata = {
  title: "Privacy Policy & Cancellation Policy",
  description:
    "Privacy Policy and Cancellation Policy for SARJ Worldwide Chauffeur Services. Learn how we collect, use, and protect your personal information.",
  openGraph: {
    title: "Privacy Policy & Cancellation Policy | SARJ Worldwide Chauffeur Services",
    description: "How SARJ Worldwide collects, uses, and protects your personal information.",
    url: `${BASE_URL}/privacy-policy`,
    siteName: "SARJ Worldwide Chauffeur Services",
    type: "website",
  },
  alternates: { canonical: `${BASE_URL}/privacy-policy` },
};

export default function PrivacyPolicyPage() {
  return (
    <>
      <TopNav />
      <Navbar />

      <section className="relative bg-gradient-to-b from-gray-50 to-white min-h-screen">
        {/* Hero */}
        <div className="bg-gradient-to-r from-[#1a1a1a] via-[#111] to-[#1a1a1a] py-16 sm:py-20">
          <div className="max-w-4xl mx-auto px-6 text-center">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white tracking-tight">
              Privacy <span className="text-[#C9A063]">Policy</span>
            </h1>
            <p className="mt-4 text-gray-400 text-[15px] sm:text-base max-w-xl mx-auto">
              This Privacy Policy explains how SARJ Worldwide collects, uses, and protects personal information.
            </p>
            <p className="mt-2 text-gray-500 text-[13px]">
              Last Updated: January 2025
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-4xl mx-auto px-6 py-12 sm:py-16">
          <div className="prose prose-gray max-w-none space-y-10">

            {/* PRIVACY POLICY SECTION */}
            <div className="bg-[#C9A063]/10 rounded-2xl p-6 sm:p-8 border border-[#C9A063]/20">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Privacy Policy</h2>
              <p className="text-gray-500 text-sm">How we handle your personal information</p>
            </div>

            {/* 1. Information We Collect */}
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
                <span className="text-[#C9A063]">1.</span> Information We Collect
              </h2>
              <p className="text-gray-600 text-[15px] leading-relaxed mb-3">
                We may collect information such as:
              </p>
              <ul className="list-disc list-inside text-gray-600 text-[15px] leading-relaxed space-y-1.5 ml-4">
                <li>Name, email, phone number</li>
                <li>Trip details (pickup/drop-off, times, flight info, itinerary)</li>
                <li>Payment-related info (processed by PCI-compliant processors; we do not store full card details)</li>
                <li>Communications and support interactions</li>
              </ul>
            </div>

            {/* 2. How We Use Information */}
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
                <span className="text-[#C9A063]">2.</span> How We Use Information
              </h2>
              <p className="text-gray-600 text-[15px] leading-relaxed mb-3">
                We use personal information to:
              </p>
              <ul className="list-disc list-inside text-gray-600 text-[15px] leading-relaxed space-y-1.5 ml-4">
                <li>Provide and manage bookings and transportation services</li>
                <li>Send confirmations, driver updates, receipts, and service communications</li>
                <li>Improve service quality and customer experience</li>
                <li>Comply with legal obligations and prevent fraud</li>
              </ul>
              <p className="text-gray-600 text-[15px] leading-relaxed mt-3 font-medium">
                We do not sell personal data.
              </p>
            </div>

            {/* 3. Communications Consent */}
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
                <span className="text-[#C9A063]">3.</span> Communications Consent (Email/SMS)
              </h2>
              <p className="text-gray-600 text-[15px] leading-relaxed">
                By booking, you consent to transactional communications (email/SMS) about your trip (confirmations, updates, receipts). Carrier rates may apply. Marketing messages are sent only with consent, and you can unsubscribe anytime.
              </p>
            </div>

            {/* 4. Cookies & Analytics */}
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
                <span className="text-[#C9A063]">4.</span> Cookies &amp; Analytics
              </h2>
              <p className="text-gray-600 text-[15px] leading-relaxed">
                Our Site may use cookies and analytics to improve functionality and measure performance. You can disable cookies in browser settings; some features may not function properly.
              </p>
            </div>

            {/* 5. Data Protection & Disclosure */}
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
                <span className="text-[#C9A063]">5.</span> Data Protection &amp; Disclosure
              </h2>
              <p className="text-gray-600 text-[15px] leading-relaxed">
                We use reasonable technical and organizational measures to protect personal information. We may disclose information when required by law or with your consent, or to service providers/partners as needed to deliver services.
              </p>
            </div>

            {/* CANCELLATION POLICY SECTION */}
            <div id="cancellation" className="bg-[#C9A063]/10 rounded-2xl p-6 sm:p-8 border border-[#C9A063]/20 mt-12 scroll-mt-24">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Cancellation Policy</h2>
              <p className="text-gray-500 text-sm">Important information about booking cancellations and refunds</p>
            </div>

            {/* 6. Airport / One-Way Transfer (Sedan/SUV) */}
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
                <span className="text-[#C9A063]">6.</span> Airport / One-Way Transfer (Luxury Sedan/SUV) — Greater Toronto Area
              </h2>
              <ul className="list-disc list-inside text-gray-600 text-[15px] leading-relaxed space-y-1.5 ml-4">
                <li>Cancellations require <strong>2 hours&apos;</strong> notice.</li>
                <li>Less than 2 hours: full fare charges apply.</li>
              </ul>
            </div>

            {/* 7. Sprinter Van */}
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
                <span className="text-[#C9A063]">7.</span> Sprinter Van — Airport / One-Way Transfer
              </h2>
              <ul className="list-disc list-inside text-gray-600 text-[15px] leading-relaxed space-y-1.5 ml-4">
                <li>Cancellations require <strong>24 hours&apos;</strong> notice.</li>
                <li>Less than 24 hours: full fare charges apply.</li>
                <li>Hourly minimum service rates may apply.</li>
              </ul>
            </div>

            {/* 8. Out of Town / Hourly / Charter */}
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
                <span className="text-[#C9A063]">8.</span> Out of Town / Hourly / Charter Services (All Vehicle Types)
              </h2>
              <div className="bg-gray-50 rounded-xl border border-gray-100 overflow-hidden">
                <table className="w-full text-[15px]">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="text-left px-4 py-3 text-gray-700 font-semibold">Notice Period</th>
                      <th className="text-left px-4 py-3 text-gray-700 font-semibold">Charge</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    <tr>
                      <td className="px-4 py-3 text-gray-600">24+ hours</td>
                      <td className="px-4 py-3 text-green-600 font-semibold">Full reimbursement</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 text-gray-600">12–24 hours</td>
                      <td className="px-4 py-3 text-amber-600 font-semibold">50% of original fare</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 text-gray-600">&lt;12 hours</td>
                      <td className="px-4 py-3 text-red-600 font-semibold">Full fare charge</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="text-gray-500 text-[13px] mt-3 italic">
                Bookings may be subject to hourly minimum service rates.
              </p>
            </div>

            {/* 9. Major Events */}
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
                <span className="text-[#C9A063]">9.</span> Major Events (Peak / Special Events)
              </h2>
              <p className="text-gray-600 text-[15px] leading-relaxed">
                For services booked during major events, cancellations require <strong>14-day</strong> and <strong>21-day</strong> notice from the event&apos;s first day (as applicable). Otherwise, full fare charges may apply, and hourly minimums may apply.
              </p>
            </div>

            {/* 10. Meet & Greet Cancellations */}
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
                <span className="text-[#C9A063]">10.</span> Meet &amp; Greet Cancellations
              </h2>
              <p className="text-gray-600 text-[15px] leading-relaxed">
                YYZ and YTZ Meet &amp; Greet cancellations require <strong>2 hours&apos;</strong> notice; otherwise full charges apply.
              </p>
            </div>

            {/* 11. Onsite Coordinator Cancellations */}
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
                <span className="text-[#C9A063]">11.</span> Onsite Coordinator Cancellations
              </h2>
              <p className="text-gray-600 text-[15px] leading-relaxed">
                Service cancellations require <strong>48 hours&apos;</strong> notice; otherwise standard four-hour minimum service charges apply.
              </p>
            </div>

            {/* 12. No-Show Policy */}
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
                <span className="text-[#C9A063]">12.</span> No-Show Policy
              </h2>
              <p className="text-gray-600 text-[15px] leading-relaxed">
                If the client does not show or leaves the pickup location without contacting Dispatch, <strong>100% of the fare</strong> may be charged (no refund).
              </p>
            </div>

            {/* 13. Refunds & Processing */}
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
                <span className="text-[#C9A063]">13.</span> Refunds &amp; Processing
              </h2>
              <ul className="list-disc list-inside text-gray-600 text-[15px] leading-relaxed space-y-1.5 ml-4">
                <li>Approved refunds are typically processed within <strong>5–10 business days</strong> (bank timelines may vary).</li>
                <li>Refund/credit requests for trips covered under service guarantees must be submitted within <strong>30 calendar days</strong> of the invoice date.</li>
              </ul>
            </div>

            {/* Contact */}
            <div className="bg-gray-50 rounded-2xl p-6 sm:p-8 border border-gray-100">
              <h2 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
                <span className="text-[#C9A063]">14.</span> Contact Us
              </h2>
              <p className="text-gray-600 text-[15px] leading-relaxed mb-4">
                If you have any questions about this Privacy Policy or Cancellation Policy, please contact us:
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
