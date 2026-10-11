import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ShieldCheck, Lock, Eye, FileText, CheckCircle2 } from "lucide-react";
import { SyllabossLogo } from "@/components/syllaboss-logo";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — Syllaboss" },
      {
        name: "description",
        content: "Learn how Syllaboss collects, protects, and handles student data, cookies, and academic resources in compliance with the NDPA and global privacy standards.",
      },
      { property: "og:title", content: "Privacy Policy — Syllaboss" },
      { property: "og:description", content: "Syllaboss user data protection and privacy policies." },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  const lastUpdated = "October 11, 2026";

  return (
    <div className="min-h-screen bg-[#f6faf7] text-[#00110a] font-sans">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-[#e1eae3] bg-[#f6faf7]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
          <SyllabossLogo />
          <Button asChild variant="ghost" size="sm" className="gap-2 text-xs font-semibold rounded-full">
            <Link to="/">
              <ArrowLeft className="size-3.5" />
              <span>Back to Home</span>
            </Link>
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16">
        <div className="mb-10 text-center">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#edf6f0] border border-[#d6e3db] text-xs font-semibold text-[#155e3e] mb-3">
            <ShieldCheck className="size-3.5" />
            <span>Compliance & Data Protection</span>
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-[#00110a]">
            Privacy Policy
          </h1>
          <p className="mt-2 text-xs text-[#526359]">
            Last updated: {lastUpdated} · Effective for all Syllaboss services and web properties
          </p>
        </div>

        <div className="rounded-3xl border border-[#d2e0d7] bg-white p-6 sm:p-10 shadow-xs space-y-8 text-sm leading-relaxed text-[#2c3d33]">
          <section className="space-y-3">
            <h2 className="font-display text-lg font-bold text-[#00110a] flex items-center gap-2">
              <span className="size-6 rounded-lg bg-[#edf6f0] text-[#155e3e] flex items-center justify-center text-xs font-bold">1</span>
              Introduction
            </h2>
            <p>
              Syllaboss Technologies ("Syllaboss", "we", "our", or "us") operates the academic courseware sharing platform accessible via <strong>syllaboss.org</strong> and <strong>web.syllaboss.org</strong>. We are committed to safeguarding the privacy of university students, lecturers, academic researchers, and visitors.
            </p>
            <p>
              This Privacy Policy explains how we collect, store, utilize, and protect personal and academic information in compliance with the <strong>Nigeria Data Protection Act (NDPA 2023)</strong> and international standard privacy frameworks.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-lg font-bold text-[#00110a] flex items-center gap-2">
              <span className="size-6 rounded-lg bg-[#edf6f0] text-[#155e3e] flex items-center justify-center text-xs font-bold">2</span>
              Information We Collect
            </h2>
            <ul className="list-disc pl-5 space-y-2 text-[#3f4d45]">
              <li>
                <strong>Account Information:</strong> When you register for Syllaboss, we collect your student username, email address, chosen password, university institution, department, and academic level (e.g. 100L–500L).
              </li>
              <li>
                <strong>Academic Materials & Contributions:</strong> Lecture notes, examination past questions, course outlines, and summaries you upload to our peer library, including associated file metadata.
              </li>
              <li>
                <strong>SyllaPoints & Financial Data:</strong> Wallet records, points accruals, and bank payment details (such as Nigerian bank name and account number) provided strictly for authorized royalty withdrawals.
              </li>
              <li>
                <strong>Log & Device Data:</strong> IP address, device type, operating system, browser specifications, and referral URLs for security auditing and abuse prevention.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-lg font-bold text-[#00110a] flex items-center gap-2">
              <span className="size-6 rounded-lg bg-[#edf6f0] text-[#155e3e] flex items-center justify-center text-xs font-bold">3</span>
              How We Use Your Information
            </h2>
            <p>We process collected data exclusively for valid educational and operational purposes:</p>
            <div className="grid gap-3 sm:grid-cols-2 pt-1">
              <div className="p-3.5 rounded-2xl bg-[#f6faf7] border border-[#e1eae3]">
                <h4 className="font-semibold text-xs text-[#00110a]">Academic Personalization</h4>
                <p className="text-xs text-[#526359] mt-1">Filtering verified courseware by your institution and curriculum (NUC CCMAS standards).</p>
              </div>
              <div className="p-3.5 rounded-2xl bg-[#f6faf7] border border-[#e1eae3]">
                <h4 className="font-semibold text-xs text-[#00110a]">Boss AI Companion</h4>
                <p className="text-xs text-[#526359] mt-1">Powering document summarization, concept explanations, and exam revision pointers.</p>
              </div>
              <div className="p-3.5 rounded-2xl bg-[#f6faf7] border border-[#e1eae3]">
                <h4 className="font-semibold text-xs text-[#00110a]">Creator Royalties</h4>
                <p className="text-xs text-[#526359] mt-1">Calculating verified reader rewards and dispatching payouts to student contributors.</p>
              </div>
              <div className="p-3.5 rounded-2xl bg-[#f6faf7] border border-[#e1eae3]">
                <h4 className="font-semibold text-xs text-[#00110a]">Security & Integrity</h4>
                <p className="text-xs text-[#526359] mt-1">Preventing fraudulent uploads, plagiarism, malicious scripts, and account hijacking.</p>
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-lg font-bold text-[#00110a] flex items-center gap-2">
              <span className="size-6 rounded-lg bg-[#edf6f0] text-[#155e3e] flex items-center justify-center text-xs font-bold">4</span>
              Cookies and Third-Party Advertising (Google AdSense)
            </h2>
            <p>
              Syllaboss uses essential cookies to preserve your authenticated study session and theme preferences. In addition, we partner with verified third-party vendors including <strong>Google AdSense</strong> to display relevant academic content and non-intrusive sponsorships.
            </p>
            <ul className="list-disc pl-5 space-y-2 text-[#3f4d45]">
              <li>
                Google and other third-party vendors use cookies (such as the DoubleClick cookie) to serve advertisements based on prior visits to our website or other websites.
              </li>
              <li>
                You may opt out of personalized advertising by visiting Google's <a href="https://www.google.com/settings/ads" target="_blank" rel="noopener noreferrer" className="text-[#155e3e] underline font-medium">Ads Settings</a> or via <a href="https://www.aboutads.info" target="_blank" rel="noopener noreferrer" className="text-[#155e3e] underline font-medium">aboutads.info</a>.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-lg font-bold text-[#00110a] flex items-center gap-2">
              <span className="size-6 rounded-lg bg-[#edf6f0] text-[#155e3e] flex items-center justify-center text-xs font-bold">5</span>
              Data Protection & Security
            </h2>
            <p>
              We enforce modern cryptographic standards, including end-to-end TLS 1.3 encryption in transit, strict Row-Level Security (RLS) on student databases, and isolated document parsing sandboxes. We do not sell, rent, or trade student personal records to unauthorized commercial entities.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-lg font-bold text-[#00110a] flex items-center gap-2">
              <span className="size-6 rounded-lg bg-[#edf6f0] text-[#155e3e] flex items-center justify-center text-xs font-bold">6</span>
              Your Rights & Contact
            </h2>
            <p>
              You maintain full rights to review, rectify, or request deletion of your account and uploaded contributions at any time. For questions regarding privacy or data handling, reach our Data Protection Officer at:
            </p>
            <div className="p-4 rounded-2xl bg-[#edf6f0] border border-[#d6e3db] text-xs font-mono text-[#155e3e]">
              Email: privacy@syllaboss.org<br />
              Legal & Support Desk: support@syllaboss.org<br />
              Website: https://syllaboss.org
            </div>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#e1eae3] bg-white py-8 text-center text-xs text-[#526359]">
        <div className="mx-auto max-w-5xl px-4 flex flex-wrap justify-center gap-6 mb-3">
          <Link to="/privacy" className="font-semibold text-[#00110a]">Privacy Policy</Link>
          <Link to="/terms" className="hover:text-[#00110a]">Terms of Service</Link>
          <Link to="/about" className="hover:text-[#00110a]">About Us</Link>
          <Link to="/contact" className="hover:text-[#00110a]">Contact Us</Link>
          <Link to="/curriculum" className="hover:text-[#00110a]">Academic Curriculum</Link>
        </div>
        <p>© 2026 Syllaboss Technologies. All rights reserved.</p>
      </footer>
    </div>
  );
}
