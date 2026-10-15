import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, BookOpen, Bot, ShieldCheck, Award, GraduationCap, Users, Sparkles, CheckCircle2 } from "lucide-react";
import { SyllabossLogo, SyllabossEmblem } from "@/components/syllaboss-logo";
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

      {/* Hero Section */}
      <section className="mx-auto max-w-4xl px-4 pt-14 pb-10 text-center sm:px-6 sm:pt-20">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted border border-border text-xs font-semibold text-brand-deep mb-4">
          <Sparkles className="size-3.5" />
          <span>Our Academic Mission</span>
        </div>
        <h1 className="font-display text-3xl sm:text-5xl font-extrabold tracking-tight text-ink leading-tight">
          Democratizing Higher Education in Nigeria Through Verified Knowledge
        </h1>
        <p className="mt-4 text-sm sm:text-base text-ink-soft max-w-2xl mx-auto leading-relaxed">
          Syllaboss bridges the lecture hall gap. We organize course monographs, verified lecture summaries, and solved past questions aligned with the National Universities Commission (NUC CCMAS) guidelines.
        </p>
      </section>

      {/* Main Body */}
      <main className="mx-auto max-w-4xl px-4 pb-20 sm:px-6 space-y-12">
        {/* Core Pillars */}
        <div className="grid gap-6 sm:grid-cols-3">
          <div className="p-6 rounded-3xl bg-white border border-border shadow-xs space-y-3">
            <div className="size-11 rounded-2xl bg-muted text-brand-deep flex items-center justify-center">
              <BookOpen className="size-5" />
            </div>
            <h3 className="font-display text-base font-bold text-ink">Curriculum Aligned</h3>
            <p className="text-xs text-ink-soft leading-relaxed">
              Every course unit is benchmarked against the NUC Core Curriculum and Minimum Academic Standards across 17 disciplinary faculties.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-white border border-border shadow-xs space-y-3">
            <div className="size-11 rounded-2xl bg-muted text-brand-deep flex items-center justify-center">
              <Bot className="size-5" />
            </div>
            <h3 className="font-display text-base font-bold text-ink">Boss AI Companion</h3>
            <p className="text-xs text-ink-soft leading-relaxed">
              Our intelligent study tutor assists students by distilling complex theoretical derivations, highlighting exam radar concepts, and answering questions in real-time.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-white border border-border shadow-xs space-y-3">
            <div className="size-11 rounded-2xl bg-muted text-brand-deep flex items-center justify-center">
              <Award className="size-5" />
            </div>
            <h3 className="font-display text-base font-bold text-ink">Student Royalty Rewards</h3>
            <p className="text-xs text-ink-soft leading-relaxed">
              Top students earn SyllaPoints whenever peers read their verified notes, withdrawable directly to Nigerian bank accounts (OPay, Kuda, GTB, etc.).
            </p>
          </div>
        </div>

        {/* Narrative & Verification Guarantee */}
        <div className="rounded-3xl border border-border bg-white p-6 sm:p-10 shadow-xs space-y-6 text-sm text-[#2c3d33] leading-relaxed">
          <h2 className="font-display text-2xl font-bold text-ink">
            Why Syllaboss Was Created
          </h2>
          <p>
            University education across Nigerian federal, state, and private institutions has historically suffered from fragmented study materials. Course notes were passed down as faded photocopies, syllabus expectations were frequently ambiguous, and examination prep took place through chaotic last-minute messaging groups.
          </p>
          <p>
            Syllaboss changes this paradigm by providing an archival-grade, indexed academic ecosystem. Students can find materials specific to their university, department, and course code (e.g. MTH 101, CSC 201, GST 111, GET 206) in seconds.
          </p>

          <div className="pt-4 border-t border-surface-container-high space-y-3">
            <h3 className="font-display text-lg font-bold text-ink flex items-center gap-2">
              <ShieldCheck className="size-5 text-brand-deep" />
              Our Editorial & Verification Process
            </h3>
            <ul className="space-y-2 text-xs text-ink-soft">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="size-4 text-brand-deep shrink-0 mt-0.5" />
                <span><strong>Multi-Stage Screening:</strong> Submissions undergo automated OCR parsing, virus scans, and syllabus matching before publishing.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="size-4 text-brand-deep shrink-0 mt-0.5" />
                <span><strong>Plagiarism & Copyright Guard:</strong> We automatically check against duplicate submissions and protect intellectual property rights.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="size-4 text-brand-deep shrink-0 mt-0.5" />
                <span><strong>Student Peer Review:</strong> High-yield community ratings ensure that the most thorough, legible notes rise to the top.</span>
              </li>
            </ul>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-surface-container-high bg-white py-8 text-center text-xs text-ink-soft">
        <div className="mx-auto max-w-5xl px-4 flex flex-wrap justify-center gap-6 mb-3">
          <Link to="/privacy" className="hover:text-ink">Privacy Policy</Link>
          <Link to="/terms" className="hover:text-ink">Terms of Service</Link>
          <Link to="/about" className="font-semibold text-ink">About Us</Link>
          <Link to="/contact" className="hover:text-ink">Contact Us</Link>
          <Link to="/curriculum" className="hover:text-ink">Academic Curriculum</Link>
        </div>
        <p>© 2026 Syllaboss Technologies. All rights reserved.</p>
      </footer>
    </div>
  );
}
