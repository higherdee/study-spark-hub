import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Scale, CheckCircle2, AlertCircle } from "lucide-react";
import { SyllabossLogo } from "@/components/syllaboss-logo";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service — Syllaboss" },
      {
        name: "description",
        content: "Read the Syllaboss Terms of Service governing student academic contributions, SyllaPoints rewards, Boss AI usage, and community conduct.",
      },
      { property: "og:title", content: "Terms of Service — Syllaboss" },
      { property: "og:description", content: "Syllaboss platform terms and academic community guidelines." },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  const lastUpdated = "October 11, 2026";

  return (
    <div className="min-h-screen bg-surface-container-low text-ink font-sans">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-surface-container-high bg-surface-container-low/90 backdrop-blur-md">
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
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted border border-border text-xs font-semibold text-brand-deep mb-3">
            <Scale className="size-3.5" />
            <span>User Agreement & Rules</span>
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-ink">
            Terms of Service
          </h1>
          <p className="mt-2 text-xs text-ink-soft">
            Last updated: {lastUpdated} · Please review carefully before using our services
          </p>
        </div>

        <div className="rounded-3xl border border-border bg-white p-6 sm:p-10 shadow-xs space-y-8 text-sm leading-relaxed text-[#2c3d33]">
          <section className="space-y-3">
            <h2 className="font-display text-lg font-bold text-ink flex items-center gap-2">
              <span className="size-6 rounded-lg bg-muted text-brand-deep flex items-center justify-center text-xs font-bold">1</span>
              Agreement to Terms
            </h2>
            <p>
              By accessing, browsing, registering an account on <strong>syllaboss.org</strong> or <strong>web.syllaboss.org</strong>, or downloading our native applications, you agree to be bound by these Terms of Service. If you do not agree, you must immediately discontinue use of the platform.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-lg font-bold text-ink flex items-center gap-2">
              <span className="size-6 rounded-lg bg-muted text-brand-deep flex items-center justify-center text-xs font-bold">2</span>
              User Accounts & Eligibility
            </h2>
            <p>
              Syllaboss is primarily designed for students, educators, and academic scholars in accredited tertiary institutions. When registering, you must provide accurate, current information. You are responsible for safeguarding your login credentials and for all activities conducted under your profile.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-lg font-bold text-ink flex items-center gap-2">
              <span className="size-6 rounded-lg bg-muted text-brand-deep flex items-center justify-center text-xs font-bold">3</span>
              Academic Integrity & Content Uploads
            </h2>
            <p>
              Syllaboss exists to foster collaborative study, high-yield examination revision, and knowledge preservation. Contributors must strictly adhere to the following standards:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-ink-soft">
              <li>
                <strong>Permitted Materials:</strong> Summarized student lecture notes, personal monographs, solved past examination question sets, syllabus topic breakdowns, and openly licensed academic courseware.
              </li>
              <li>
                <strong>Prohibited Uploads:</strong> Live ongoing examination question papers, leaked test sheets, copyrighted commercial textbooks without explicit distribution rights, or defamatory, plagiarized, or malicious materials.
              </li>
              <li>
                <strong>Takedown Procedure:</strong> If you represent an institution or copyright owner and believe a document infringes your intellectual property, contact our legal desk at <span className="font-mono text-brand-deep">legal@syllaboss.org</span> for immediate review and removal.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-lg font-bold text-ink flex items-center gap-2">
              <span className="size-6 rounded-lg bg-muted text-brand-deep flex items-center justify-center text-xs font-bold">4</span>
              SyllaPoints & Creator Rewards Program
            </h2>
            <p>
              Syllaboss provides a merit-based points economy to reward students who contribute verified, high-quality course summaries and active peer study:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-ink-soft">
              <li>Points are earned through verified uploads, genuine reads, and community study milestones.</li>
              <li>Points may be converted to Nigerian Naira (NGN) and withdrawn to verified Nigerian commercial bank accounts once reaching the minimum balance threshold.</li>
              <li>Any attempt to artificially inflate views, game points with dummy accounts, or upload spam results in forfeiture of accrued balance and permanent account termination.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-lg font-bold text-ink flex items-center gap-2">
              <span className="size-6 rounded-lg bg-muted text-brand-deep flex items-center justify-center text-xs font-bold">5</span>
              Boss AI Companion Disclaimer
            </h2>
            <p>
              Boss AI provides automated text summarization, formula derivations, and study flashcards based on user documents and Nigerian curriculum benchmarks (NUC CCMAS). While engineered to deliver high accuracy, AI responses should serve as revision aids rather than certified legal, medical, or engineering advice.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-lg font-bold text-ink flex items-center gap-2">
              <span className="size-6 rounded-lg bg-muted text-brand-deep flex items-center justify-center text-xs font-bold">6</span>
              Limitation of Liability & Governing Law
            </h2>
            <p>
              These Terms are governed by and construed in accordance with the laws of the Federal Republic of Nigeria. Syllaboss shall not be liable for indirect, incidental, or consequential damages resulting from platform downtime or reliance on community study materials.
            </p>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-surface-container-high bg-white py-8 text-center text-xs text-ink-soft">
        <div className="mx-auto max-w-5xl px-4 flex flex-wrap justify-center gap-6 mb-3">
          <Link to="/privacy" className="hover:text-ink">Privacy Policy</Link>
          <Link to="/terms" className="font-semibold text-ink">Terms of Service</Link>
          <Link to="/about" className="hover:text-ink">About Us</Link>
          <Link to="/contact" className="hover:text-ink">Contact Us</Link>
          <Link to="/curriculum" className="hover:text-ink">Academic Curriculum</Link>
        </div>
        <p>© 2026 Syllaboss Technologies. All rights reserved.</p>
      </footer>
    </div>
  );
}
