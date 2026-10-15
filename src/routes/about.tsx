import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, BookOpen, Bot, ShieldCheck, Award, Sparkles, CheckCircle2 } from "lucide-react";
import { SyllabossLogo } from "@/components/syllaboss-logo";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About Syllaboss — Academic Courseware & Study Platform" },
      {
        name: "description",
        content: "Discover how Syllaboss empowers tertiary students across Nigerian universities with verified course materials, NUC CCMAS curriculum indexing, and Boss AI.",
      },
      { property: "og:title", content: "About Syllaboss — Nigerian University Academic Platform" },
      { property: "og:description", content: "Our mission to democratize higher education study materials across Nigeria." },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <div className="min-h-screen bg-background text-ink font-sans selection:bg-brand selection:text-white">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3.5 sm:px-6">
          <SyllabossLogo />
          <Button asChild variant="ghost" size="sm" className="gap-2 text-xs font-semibold rounded-full hover:bg-surface-container-low text-ink lift press">
            <Link to="/">
              <ArrowLeft className="size-3.5" />
              <span>Back to Home</span>
            </Link>
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="mx-auto max-w-4xl px-4 pt-14 pb-10 text-center sm:px-6 sm:pt-20">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container-high border border-border text-xs font-semibold text-forest mb-4 shadow-xs">
          <Sparkles className="size-3.5 text-brass" />
          <span className="eyebrow text-forest">Our Academic Mission</span>
        </div>
        <h1 className="font-display text-3xl sm:text-5xl font-normal tracking-tight text-ink leading-tight">
          Democratizing Higher Education Through Verified Knowledge
        </h1>
        <p className="mt-4 text-sm sm:text-base text-ink-soft max-w-2xl mx-auto leading-relaxed">
          Syllaboss bridges the lecture hall gap. We curate course monographs, verified lecture summaries, and solved past questions strictly benchmarked against the National Universities Commission (NUC CCMAS) guidelines.
        </p>
      </section>

      {/* Main Body */}
      <main className="mx-auto max-w-4xl px-4 pb-20 sm:px-6 space-y-10">
        {/* Core Pillars */}
        <div className="grid gap-5 sm:grid-cols-3">
          <div className="p-6 rounded-3xl bg-card border border-border shadow-[var(--elev-1)] space-y-3 lift">
            <div className="size-11 rounded-2xl bg-surface-container-high text-forest flex items-center justify-center border border-border">
              <BookOpen className="size-5 text-brand" />
            </div>
            <h3 className="font-display text-base font-bold text-ink">Curriculum Aligned</h3>
            <p className="text-xs text-ink-soft leading-relaxed">
              Every course unit is categorized against the NUC Core Curriculum and Minimum Academic Standards across 17 disciplinary faculties.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-card border border-border shadow-[var(--elev-1)] space-y-3 lift">
            <div className="size-11 rounded-2xl bg-surface-container-high text-forest flex items-center justify-center border border-border">
              <Bot className="size-5 text-forest" />
            </div>
            <h3 className="font-display text-base font-bold text-ink">Boss AI Copilot</h3>
            <p className="text-xs text-ink-soft leading-relaxed">
              Our academic tutor assists students by distilling complex derivations, highlighting high-yield exam radar concepts, and answering inquiries in real-time.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-card border border-border shadow-[var(--elev-1)] space-y-3 lift">
            <div className="size-11 rounded-2xl bg-surface-container-high text-forest flex items-center justify-center border border-border">
              <Award className="size-5 text-brass" />
            </div>
            <h3 className="font-display text-base font-bold text-ink">Student Royalty Rewards</h3>
            <p className="text-xs text-ink-soft leading-relaxed">
              Top scholars earn SyllaPoints whenever peers consult their verified contributions, withdrawable directly to Nigerian bank accounts (OPay, Kuda, GTB, etc.).
            </p>
          </div>
        </div>

        {/* Narrative & Verification Guarantee */}
        <div className="rounded-3xl border border-border bg-card p-6 sm:p-10 shadow-[var(--elev-1)] space-y-6 text-sm text-ink leading-relaxed">
          <h2 className="font-display text-2xl font-bold text-ink">
            Why Syllaboss Was Created
          </h2>
          <p className="text-ink-soft">
            University education across Nigerian federal, state, and private institutions has historically suffered from fragmented study materials. Course notes were passed down as faded photocopies, syllabus expectations were frequently ambiguous, and examination prep took place through chaotic last-minute messaging groups.
          </p>
          <p className="text-ink-soft">
            Syllaboss changes this paradigm by providing an archival-grade, indexed academic ecosystem. Students can find materials specific to their university, department, and course code (e.g. MTH 101, CSC 201, GST 111, GET 206) in seconds.
          </p>

          <div className="pt-5 border-t border-border space-y-3.5">
            <h3 className="font-display text-lg font-bold text-ink flex items-center gap-2">
              <ShieldCheck className="size-5 text-brand" />
              Our Editorial & Verification Process
            </h3>
            <ul className="space-y-2.5 text-xs text-ink-soft">
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="size-4 text-brand shrink-0 mt-0.5" />
                <span><strong className="text-ink">Multi-Stage Screening:</strong> Submissions undergo automated OCR parsing, virus scans, and syllabus matching before publishing.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="size-4 text-brand shrink-0 mt-0.5" />
                <span><strong className="text-ink">Plagiarism & Copyright Guard:</strong> We automatically check against duplicate submissions and protect intellectual property rights.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="size-4 text-brand shrink-0 mt-0.5" />
                <span><strong className="text-ink">Peer Commendations:</strong> High-yield community ratings ensure that the most thorough, legible notes rise to the top.</span>
              </li>
            </ul>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-surface-container-lowest py-8 text-center text-xs text-ink-soft">
        <div className="mx-auto max-w-5xl px-4 flex flex-wrap justify-center gap-6 mb-3">
          <Link to="/privacy" className="hover:text-ink">Privacy Policy</Link>
          <Link to="/terms" className="hover:text-ink">Terms of Service</Link>
          <Link to="/about" className="font-semibold text-ink">About Us</Link>
          <Link to="/contact" className="hover:text-ink">Contact Us</Link>
          <Link to="/curriculum" className="hover:text-ink">Academic Curriculum</Link>
        </div>
        <p className="text-muted-foreground">© 2026 Syllaboss Technologies. All rights reserved.</p>
      </footer>
    </div>
  );
}

export default AboutPage;
