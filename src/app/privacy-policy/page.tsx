import TopNav from "@/components/TopNav";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import type { Metadata } from "next";

const BASE_URL = "https://luxride-chauffeur.vercel.app";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "Privacy Policy for SARJ Worldwide Chauffeur Services. Learn how we collect, use, and protect your personal information.",
  openGraph: {
    title: "Privacy Policy | SARJ Worldwide Chauffeur Services",
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
              Your privacy is important to us. This policy explains how we handle your data.
            </p>
            <p className="mt-2 text-gray-500 text-[13px]">
              Last updated: February 9, 2026
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-4xl mx-auto px-6 py-12 sm:py-16">
          <div className="prose prose-gray max-w-none space-y-10">

            {/* 1. Introduction */}
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
                <span className="text-[#C9A063]">1.</span> Introduction
              </h2>
              <p className="text-gray-600 text-[15px] leading-relaxed">
                SARJ Worldwide Chauffeur Services (&quot;Company,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) is committed to protecting and respecting your privacy. This Privacy Policy describes how we collect, use, store, and share your personal information when you use our website, mobile applications, and transportation services. By using our services, you consent to the practices described in this policy.
              </p>
            </div>

            {/* 2. Information We Collect */}
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
                <span className="text-[#C9A063]">2.</span> Information We Collect
              </h2>
              <p className="text-gray-600 text-[15px] leading-relaxed mb-3">
                We may collect the following types of personal information:
              </p>
              <h3 className="text-[16px] font-semibold text-gray-800 mt-4 mb-2">Personal Information</h3>
              <ul className="list-disc list-inside text-gray-600 text-[15px] leading-relaxed space-y-1.5 ml-4">
                <li>Full name</li>
                <li>Email address</li>
                <li>Phone number</li>
                <li>Billing and payment information</li>
                <li>Pickup and drop-off addresses</li>
                <li>Travel dates and times</li>
              </ul>
              <h3 className="text-[16px] font-semibold text-gray-800 mt-4 mb-2">Automatically Collected Information</h3>
              <ul className="list-disc list-inside text-gray-600 text-[15px] leading-relaxed space-y-1.5 ml-4">
                <li>IP address and browser type</li>
                <li>Device information and operating system</li>
                <li>Pages visited and time spent on our website</li>
                <li>Cookies and similar tracking technologies</li>
                <li>Referral source and navigation patterns</li>
              </ul>
            </div>

            {/* 3. How We Use Your Information */}
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
                <span className="text-[#C9A063]">3.</span> How We Use Your Information
              </h2>
              <p className="text-gray-600 text-[15px] leading-relaxed mb-3">
                We use your personal information for the following purposes:
              </p>
              <ul className="list-disc list-inside text-gray-600 text-[15px] leading-relaxed space-y-1.5 ml-4">
                <li>Processing and fulfilling your bookings and reservations</li>
                <li>Communicating with you about your trips, confirmations, and updates</li>
                <li>Processing payments and preventing fraud</li>
                <li>Improving our services, website, and user experience</li>
                <li>Sending promotional communications (only with your consent)</li>
                <li>Complying with legal obligations and resolving disputes</li>
                <li>Providing customer support and responding to inquiries</li>
              </ul>
            </div>

            {/* 4. Information Sharing */}
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
                <span className="text-[#C9A063]">4.</span> Information Sharing &amp; Disclosure
              </h2>
              <p className="text-gray-600 text-[15px] leading-relaxed mb-3">
                We do not sell, trade, or rent your personal information to third parties. We may share your information only in the following circumstances:
              </p>
              <ul className="list-disc list-inside text-gray-600 text-[15px] leading-relaxed space-y-1.5 ml-4">
                <li><strong>Service providers:</strong> Payment processors, email service providers, and technology partners who assist in delivering our services</li>
                <li><strong>Legal requirements:</strong> When required by law, court order, or government request</li>
                <li><strong>Safety:</strong> To protect the rights, property, or safety of our company, customers, or the public</li>
                <li><strong>Business transfers:</strong> In connection with a merger, acquisition, or sale of assets</li>
              </ul>
            </div>

            {/* 5. Cookies */}
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
                <span className="text-[#C9A063]">5.</span> Cookies &amp; Tracking Technologies
              </h2>
              <p className="text-gray-600 text-[15px] leading-relaxed mb-3">
                Our website uses cookies and similar technologies to enhance your browsing experience. Cookies are small text files stored on your device that help us:
              </p>
              <ul className="list-disc list-inside text-gray-600 text-[15px] leading-relaxed space-y-1.5 ml-4">
                <li>Remember your preferences and settings</li>
                <li>Analyze website traffic and usage patterns</li>
                <li>Provide personalized content and functionality</li>
                <li>Ensure website security and prevent fraud</li>
              </ul>
              <p className="text-gray-600 text-[15px] leading-relaxed mt-3">
                You can control cookie preferences through your browser settings. Disabling cookies may limit certain features of our website.
              </p>
            </div>

            {/* 6. Data Security */}
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
                <span className="text-[#C9A063]">6.</span> Data Security
              </h2>
              <p className="text-gray-600 text-[15px] leading-relaxed">
                We implement industry-standard security measures to protect your personal information from unauthorized access, alteration, disclosure, or destruction. These measures include SSL encryption, secure payment processing through Stripe, regular security audits, and restricted access to personal data. However, no method of electronic transmission or storage is 100% secure, and we cannot guarantee absolute security.
              </p>
            </div>

            {/* 7. Data Retention */}
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
                <span className="text-[#C9A063]">7.</span> Data Retention
              </h2>
              <p className="text-gray-600 text-[15px] leading-relaxed">
                We retain your personal information only for as long as necessary to fulfill the purposes for which it was collected, including to satisfy legal, accounting, or reporting requirements. Booking records are typically retained for a period of 7 years for tax and legal compliance. You may request deletion of your data at any time by contacting us.
              </p>
            </div>

            {/* 8. Your Rights */}
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
                <span className="text-[#C9A063]">8.</span> Your Rights
              </h2>
              <p className="text-gray-600 text-[15px] leading-relaxed mb-3">
                Depending on your jurisdiction, you may have the following rights regarding your personal information:
              </p>
              <ul className="list-disc list-inside text-gray-600 text-[15px] leading-relaxed space-y-1.5 ml-4">
                <li><strong>Access:</strong> Request a copy of the personal data we hold about you</li>
                <li><strong>Correction:</strong> Request correction of inaccurate or incomplete data</li>
                <li><strong>Deletion:</strong> Request deletion of your personal data</li>
                <li><strong>Portability:</strong> Request transfer of your data to another service</li>
                <li><strong>Objection:</strong> Object to certain processing of your data</li>
                <li><strong>Withdrawal of consent:</strong> Withdraw consent for marketing communications at any time</li>
              </ul>
              <p className="text-gray-600 text-[15px] leading-relaxed mt-3">
                To exercise any of these rights, please contact us using the details provided below. We will respond to your request within 30 days.
              </p>
            </div>

            {/* 9. Third-Party Links */}
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
                <span className="text-[#C9A063]">9.</span> Third-Party Links
              </h2>
              <p className="text-gray-600 text-[15px] leading-relaxed">
                Our website may contain links to third-party websites or services. We are not responsible for the privacy practices or content of these external sites. We encourage you to review the privacy policies of any third-party sites you visit.
              </p>
            </div>

            {/* 10. Children's Privacy */}
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
                <span className="text-[#C9A063]">10.</span> Children&apos;s Privacy
              </h2>
              <p className="text-gray-600 text-[15px] leading-relaxed">
                Our services are not directed to individuals under the age of 16. We do not knowingly collect personal information from children. If we become aware that we have inadvertently collected data from a child, we will take steps to delete it promptly.
              </p>
            </div>

            {/* 11. Changes */}
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
                <span className="text-[#C9A063]">11.</span> Changes to This Policy
              </h2>
              <p className="text-gray-600 text-[15px] leading-relaxed">
                We may update this Privacy Policy from time to time to reflect changes in our practices or legal requirements. Any updates will be posted on this page with a revised &quot;Last updated&quot; date. We encourage you to review this policy periodically.
              </p>
            </div>

            {/* 12. Contact */}
            <div className="bg-gray-50 rounded-2xl p-6 sm:p-8 border border-gray-100">
              <h2 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
                <span className="text-[#C9A063]">12.</span> Contact Us
              </h2>
              <p className="text-gray-600 text-[15px] leading-relaxed mb-4">
                If you have any questions or concerns about this Privacy Policy or how we handle your data, please contact us:
              </p>
              <div className="space-y-2 text-[15px]">
                <p className="text-gray-700"><strong>SARJ Worldwide Chauffeur Services</strong></p>
                <p className="text-gray-600">Phone: <a href="tel:+14168935779" className="text-[#C9A063] hover:underline">416-893-5779</a></p>
                <p className="text-gray-600">Email: <a href="mailto:info@sarjworldwide.com" className="text-[#C9A063] hover:underline">info@sarjworldwide.com</a></p>
              </div>
            </div>

          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
