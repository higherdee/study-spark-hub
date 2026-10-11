import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowRight,
  Bot,
  CheckCircle2,
  Coins,
  Download,
  ShieldCheck,
  Sparkles,
  BookOpen,
  GraduationCap,
  Award,
  ChevronDown,
  Search,
  FileText,
  Star,
  Zap,
  Check,
  Flame,
  Globe,
  Share,
  Laptop,
  Layers,
  HelpCircle,
  Clock,
  TrendingUp,
} from "lucide-react";
import { useState, useEffect } from "react";

import { InstallButton } from "@/components/install-button";
import { SyllabossLogo, SyllabossEmblem } from "@/components/syllaboss-logo";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import {
  WindowsOutlineIcon,
  AndroidOutlineIcon,
  AppleOutlineIcon,
} from "@/components/device-icons";
import {
  POINTS_NAME,
  POINTS_PER_NAIRA,
  MINIMUM_WITHDRAWAL_NAIRA,
  POINTS_PER_VERIFIED_UPLOAD,
  POINTS_PER_DOWNLOAD,
  POINTS_PER_VIEW,
  POINTS_REGISTRATION_BONUS,
  formatNaira,
} from "@/lib/constants";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Syllaboss — The Modern University Study Platform" },
      {
        name: "description",
        content:
          "Syllaboss is an all-in-one academic companion for iOS, Android and desktop. Verified past questions, course summaries, Boss AI LaTeX derivations, and cashable student rewards.",
      },
      { property: "og:title", content: "Syllaboss — Study With Direction" },
      {
        property: "og:description",
        content:
          "Peer-reviewed Nigerian university lecture notes, past exams, and Boss AI study companion. Available everywhere as a high-speed PWA.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://syllaboss.org" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HomePage,
});

const SHOWCASE_TABS = [
  {
    id: "boss-ai",
    title: "Boss AI Study Copilot",
    badge: "Step-by-step LaTeX",
    description:
      "Ask Boss AI complex exam questions, loop-closure kinematics, chemical mechanisms, or economic formulas. Boss AI formats every equation in crisp LaTeX and compiles structured exam answers.",
    metric: "Instant Explanations",
    icon: Bot,
    highlights: [
      "Rigorous mathematical formula derivations & proofs",
      "Instant exam essay theory marking with model answers",
      "Interactive multiple-choice practice simulations",
    ],
  },
  {
    id: "library",
    title: "University Library",
    badge: "NUC CCMAS Aligned",
    description:
      "Search and browse verified course summaries, departmental dossiers, and laboratory manuals from 200+ accredited universities spanning 100 Level through Final Year.",
    metric: "10,000+ Verified Notes",
    icon: BookOpen,
    highlights: [
      "Filter by Faculty, Department, and Course Code",
      "Offline-cached study documents for erratic networks",
      "Peer-reviewed by departmental scholars & toppers",
    ],
  },
  {
    id: "past-questions",
    title: "Exam Past Questions",
    badge: "Authentic Papers",
    description:
      "Access previous semester examination papers with verified marking schemes. Practice past questions under timed conditions to identify recurring examination radar topics.",
    metric: "98% Syllabus Match",
    icon: FileText,
    highlights: [
      "Real semester examination past papers",
      "Detailed step-by-step solution breakdowns",
      "Exam radar predictions based on previous test patterns",
    ],
  },
  {
    id: "rewards",
    title: "SyllaPoints Cash Rewards",
    badge: "Direct Bank Payouts",
    description:
      "Earn 25 SyllaPoints every time you share verified lecture summaries or past question solutions. Convert accumulated points directly to Naira with payouts to any Nigerian bank.",
    metric: "₦3,000 Min. Payout",
    icon: Coins,
    highlights: [
      "+25 SyllaPoints per approved academic upload",
      "Daily rewards for consistent 30-minute study streaks",
      "Zero hidden fees — automated transfer to your bank",
    ],
  },
];

const FAQ = [
  [
    "How do I install Syllaboss on my phone or computer?",
    "Syllaboss is built as a progressive web app (PWA), meaning zero downloads from app stores and zero bulky 100MB files. On iPhone/iPad: Open syllaboss.org in Safari, tap the Share icon, and select 'Add to Home Screen'. On Android: Tap 'Install Web App' or use Chrome's menu to select 'Install App'. On Windows & Mac: Click the Install icon in your browser address bar.",
  ],
  [
    "Is Syllaboss free to use for university students?",
    "Yes, 100% free! Searching the library, reading course summaries, taking practice quizzes, downloading materials, and chatting with Boss AI costs nothing.",
  ],
  [
    "Does Syllaboss work offline when campus network is down?",
    "Yes. Because Syllaboss is installed as a PWA, all your recently opened lecture dossiers and downloaded summaries remain cached on your device, allowing you to study even during network blackouts.",
  ],
  [
    "How does Boss AI format mathematical derivations and formulas?",
    "Boss AI is powered by an advanced academic reasoning engine configured with KaTeX. It automatically renders Greek variables, matrices, loop-closure kinematics, integrals, and physics equations in clean, publication-grade mathematical typography.",
  ],
  [
    "How do SyllaPoints rewards work and how do I withdraw to my bank?",
    `Students earn +${POINTS_PER_VERIFIED_UPLOAD} SyllaPoints per verified academic upload, plus bonus points for study streaks. Every 100 points equals ₦${100 / POINTS_PER_NAIRA}. Once your balance reaches ₦${MINIMUM_WITHDRAWAL_NAIRA}, you can request an instant bank transfer to any Nigerian bank.`,
  ],
];

function HomePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeShowcase, setActiveShowcase] = useState(0);

  // Rewards calculator state
  const [uploadsCount, setUploadsCount] = useState(15);
  const [downloadsReceived, setDownloadsReceived] = useState(80);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const calculatedPoints =
    uploadsCount * POINTS_PER_VERIFIED_UPLOAD +
    downloadsReceived * POINTS_PER_DOWNLOAD +
    POINTS_REGISTRATION_BONUS;
  const calculatedNaira = Math.floor(calculatedPoints / POINTS_PER_NAIRA);

  return (
    <div className="min-h-screen bg-[#f7f9f8] dark:bg-[#070b09] text-slate-900 dark:text-slate-100 font-sans selection:bg-emerald-500/20 selection:text-emerald-950">
      {/* ── Top Header (Trust Wallet Style Sticky Chrome) ──────────────── */}
      <header className="sticky top-0 z-50 h-16 desktop:h-20 w-full transition-colors duration-300 bg-[#f7f9f8]/90 dark:bg-[#070b09]/90 backdrop-blur-xl border-b border-black/[0.05] dark:border-white/[0.07]">
        <div className="mx-auto flex h-full max-w-[1360px] items-center justify-between px-4 sm:px-8">
          <SyllabossLogo />

          {/* Desktop Navigation with Smooth Pill Hover */}
          <nav aria-label="Main" className="hidden lg:block">
            <ul className="flex items-center gap-1 text-[13px] font-medium text-slate-600 dark:text-slate-300">
              <li>
                <a
                  href="#showcase"
                  className="rounded-full px-4 py-2 transition-colors hover:bg-black/[0.04] dark:hover:bg-white/[0.06] hover:text-slate-900 dark:hover:text-white"
                >
                  Features & AI
                </a>
              </li>
              <li>
                <a
                  href="#bento"
                  className="rounded-full px-4 py-2 transition-colors hover:bg-black/[0.04] dark:hover:bg-white/[0.06] hover:text-slate-900 dark:hover:text-white"
                >
                  Academic Suite
                </a>
              </li>
              <li>
                <a
                  href="#calculator"
                  className="rounded-full px-4 py-2 transition-colors hover:bg-black/[0.04] dark:hover:bg-white/[0.06] hover:text-slate-900 dark:hover:text-white"
                >
                  SyllaPoints
                </a>
              </li>
              <li>
                <a
                  href="#pwa"
                  className="rounded-full px-4 py-2 transition-colors hover:bg-black/[0.04] dark:hover:bg-white/[0.06] hover:text-slate-900 dark:hover:text-white"
                >
                  PWA Install
                </a>
              </li>
              <li>
                <a
                  href="#faq"
                  className="rounded-full px-4 py-2 transition-colors hover:bg-black/[0.04] dark:hover:bg-white/[0.06] hover:text-slate-900 dark:hover:text-white"
                >
                  FAQ
                </a>
              </li>
            </ul>
          </nav>

          {/* Header Action Buttons */}
          <div className="flex items-center gap-3">
            <InstallButton
              variant="default"
              size="sm"
              className="rounded-full bg-[#0d281e] text-white hover:bg-black dark:bg-emerald-500 dark:text-black dark:hover:bg-emerald-400 text-xs h-9 px-4.5 font-bold shadow-xs"
            />
            {user ? (
              <Button
                asChild
                size="sm"
                variant="outline"
                className="rounded-full text-xs h-9 border-black/[0.1] dark:border-white/[0.12] bg-white dark:bg-[#111915] font-semibold"
              >
                <Link to="/dashboard">Dashboard</Link>
              </Button>
            ) : (
              <Button
                asChild
                size="sm"
                variant="ghost"
                className="rounded-full text-xs h-9 text-slate-700 dark:text-slate-200 hover:bg-black/[0.04] dark:hover:bg-white/[0.06] font-semibold"
              >
                <Link to="/auth" search={{ mode: "signin" }}>
                  Sign In
                </Link>
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* ── Main Content Container ───────────────────────────────────── */}
      <main className="w-full overflow-x-clip px-3 sm:px-5 pb-16 pt-3 sm:pt-4">
        <div className="mx-auto flex w-full max-w-[1360px] flex-col gap-16 sm:gap-24 desktop:gap-28">

          {/* ── HERO SECTION (Trust Wallet Signature Hero Container) ─── */}
          <section className="relative flex w-full flex-col items-center overflow-hidden rounded-3xl sm:rounded-[36px] bg-[#edf3ef] dark:bg-[#0d1611] border border-black/[0.04] dark:border-white/[0.06] px-5 pt-12 sm:px-10 sm:pt-20 desktop:pt-24 pb-6 sm:pb-12 text-center">
            {/* Dynamic Ambient Glow Behind Hero */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[720px] h-[400px] bg-gradient-to-b from-emerald-500/25 via-emerald-600/10 to-transparent blur-3xl opacity-80 animate-v2-glow"
            />

            {/* Social Proof Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/90 dark:bg-white/10 border border-black/[0.06] dark:border-white/10 shadow-xs text-emerald-800 dark:text-emerald-300 text-xs font-semibold mb-6 animate-v2-enter">
              <Sparkles className="size-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>The Academic Companion You Control · 200+ Nigerian Universities</span>
            </div>

            {/* Main Headline with Tight Tracking */}
            <h1 className="max-w-[840px] font-display text-4xl sm:text-6xl lg:text-7xl font-bold tracking-[-0.03em] text-slate-900 dark:text-white leading-[1.06] [text-wrap:balance] animate-v2-enter">
              Your university syllabus. <br className="hidden sm:inline" />
              <span className="text-emerald-700 dark:text-emerald-400 font-normal italic">
                Unified, verified & alive.
              </span>
            </h1>

            {/* Sub-headline */}
            <p className="mt-5 sm:mt-6 max-w-[620px] text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed [text-wrap:pretty] animate-v2-enter">
              Syllaboss is an all-in-one academic study companion for iOS, Android and desktop browsers.
              Explore peer-reviewed course dossiers, practice past examinations, and derive complex formulas
              step-by-step with <strong>Boss AI</strong> — right on your device.
            </p>

            {/* Primary Action Buttons */}
            <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row items-center justify-center gap-3.5 w-full sm:w-auto animate-v2-enter">
              <InstallButton
                size="lg"
                className="w-full sm:w-auto h-12.5 rounded-full bg-[#0d281e] hover:bg-black dark:bg-emerald-500 dark:hover:bg-emerald-400 dark:text-black text-white text-sm sm:text-base font-bold px-8 shadow-lg shadow-emerald-950/20 active:scale-[0.98] transition-all"
              />
              <Button
                asChild
                variant="outline"
                size="lg"
                className="w-full sm:w-auto h-12.5 rounded-full border-black/[0.1] dark:border-white/[0.15] bg-white dark:bg-card/80 hover:bg-slate-100 dark:hover:bg-card text-foreground text-sm font-semibold px-7 shadow-xs active:scale-[0.98] transition-all"
              >
                <Link to="/auth" search={{ mode: "signin" }}>
                  <span>Launch Web App</span>
                  <ArrowRight className="size-4 ml-1.5" />
                </Link>
              </Button>
            </div>

            {/* ── High-Res Hero Mockup with Trust Wallet Floating Physics ── */}
            <div className="relative mt-8 sm:mt-12 w-full flex justify-center items-center">
              {/* Soft Ground Shadow */}
              <div
                aria-hidden="true"
                className="absolute bottom-4 left-1/2 -translate-x-1/2 w-[320px] sm:w-[420px] h-12 bg-black/15 blur-2xl rounded-full pointer-events-none"
              />
              <img
                src="/hero-mockup.png"
                alt="Syllaboss University Library on Mobile"
                className="animate-v2-float relative z-10 w-full max-w-[340px] sm:max-w-[440px] desktop:max-w-[500px] h-auto object-contain drop-shadow-[0_20px_50px_rgba(0,17,10,0.22)] select-none pointer-events-none"
              />
            </div>

            {/* Social Proof / Rating Badges */}
            <div className="mt-6 pt-6 border-t border-black/[0.06] dark:border-white/[0.08] w-full flex flex-wrap items-center justify-center gap-6 sm:gap-10 text-xs text-slate-600 dark:text-slate-400">
              <div className="flex items-center gap-2">
                <div className="flex text-amber-500">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="size-3.5 fill-current" />
                  ))}
                </div>
                <span className="font-bold text-slate-900 dark:text-white">4.9 / 5</span>
                <span>Student Rating</span>
              </div>
              <div className="flex items-center gap-1.5 font-medium">
                <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />
                <span>NUC CCMAS Standardized</span>
              </div>
              <div className="flex items-center gap-1.5 font-medium">
                <Sparkles className="size-4 text-emerald-600 dark:text-emerald-400" />
                <span>Zero APK / EXE Installers Needed</span>
              </div>
            </div>
          </section>

          {/* ── BENTO GRID: "Every move you make in your studies. One app." ── */}
          <section id="bento" className="w-full flex flex-col items-center gap-10 sm:gap-14">
            <div className="text-center max-w-[620px] space-y-3">
              <h2 className="font-display text-3xl sm:text-5xl font-bold tracking-[-0.03em] text-slate-900 dark:text-white [text-wrap:balance]">
                Every move you make in your studies. One app.
              </h2>
              <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 leading-relaxed">
                Everything required to conquer semester exams, laboratory reports, and assignments
                organized into a unified, distraction-free environment.
              </p>
            </div>

            {/* Trust Wallet Style Bento Tiles */}
            <div className="grid w-full grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {/* Tile 1: University Library */}
              <div className="group relative flex flex-col justify-between rounded-3xl bg-white dark:bg-[#111915] p-7 sm:p-8 border border-slate-200/80 dark:border-white/5 transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_12px_36px_rgba(0,17,10,0.08)]">
                <div>
                  <div className="size-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/50 flex items-center justify-center text-emerald-700 dark:text-emerald-400 mb-6">
                    <BookOpen className="size-6" />
                  </div>
                  <h3 className="font-display text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                    University Library
                  </h3>
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    Peer-reviewed course summaries, syllabus outlines, and high-yield study dossiers
                    authored across accredited faculties.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                  <span>100L – 500L Coverage</span>
                  <span className="group-hover:translate-x-1 transition-transform">&rarr;</span>
                </div>
              </div>

              {/* Tile 2: Boss AI Step-by-Step Derivations */}
              <div className="group relative flex flex-col justify-between rounded-3xl bg-white dark:bg-[#111915] p-7 sm:p-8 border border-slate-200/80 dark:border-white/5 transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_12px_36px_rgba(0,17,10,0.08)]">
                <div>
                  <div className="size-12 rounded-2xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/50 flex items-center justify-center text-blue-700 dark:text-blue-400 mb-6">
                    <Bot className="size-6" />
                  </div>
                  <h3 className="font-display text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                    Boss AI Reasoning
                  </h3>
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    LaTeX formula derivations, mechanism kinematic loop equations, and exam-grade
                    breakdowns rendered cleanly with KaTeX typography.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-xs font-semibold text-blue-700 dark:text-blue-400">
                  <span>Standard LaTeX Math</span>
                  <span className="group-hover:translate-x-1 transition-transform">&rarr;</span>
                </div>
              </div>

              {/* Tile 3: Authentic Past Questions */}
              <div className="group relative flex flex-col justify-between rounded-3xl bg-white dark:bg-[#111915] p-7 sm:p-8 border border-slate-200/80 dark:border-white/5 transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_12px_36px_rgba(0,17,10,0.08)]">
                <div>
                  <div className="size-12 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/50 flex items-center justify-center text-amber-700 dark:text-amber-400 mb-6">
                    <FileText className="size-6" />
                  </div>
                  <h3 className="font-display text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                    Solved Past Exams
                  </h3>
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    Real past examination papers from universities across Nigeria with verified model
                    answers to master your lecturer's questioning style.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-xs font-semibold text-amber-700 dark:text-amber-400">
                  <span>Verified Marking Keys</span>
                  <span className="group-hover:translate-x-1 transition-transform">&rarr;</span>
                </div>
              </div>

              {/* Tile 4: SyllaPoints Cashable Rewards */}
              <div className="group relative flex flex-col justify-between rounded-3xl bg-white dark:bg-[#111915] p-7 sm:p-8 border border-slate-200/80 dark:border-white/5 transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_12px_36px_rgba(0,17,10,0.08)]">
                <div>
                  <div className="size-12 rounded-2xl bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800/50 flex items-center justify-center text-purple-700 dark:text-purple-400 mb-6">
                    <Coins className="size-6" />
                  </div>
                  <h3 className="font-display text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                    Cashable Rewards
                  </h3>
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    Earn 25 SyllaPoints for every uploaded document. Withdraw cash directly to your
                    bank account once you reach the withdrawal threshold.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-xs font-semibold text-purple-700 dark:text-purple-400">
                  <span>Direct Bank Payouts</span>
                  <span className="group-hover:translate-x-1 transition-transform">&rarr;</span>
                </div>
              </div>

              {/* Tile 5: Offline-First PWA */}
              <div className="group relative flex flex-col justify-between rounded-3xl bg-white dark:bg-[#111915] p-7 sm:p-8 border border-slate-200/80 dark:border-white/5 transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_12px_36px_rgba(0,17,10,0.08)]">
                <div>
                  <div className="size-12 rounded-2xl bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800/50 flex items-center justify-center text-teal-700 dark:text-teal-400 mb-6">
                    <Zap className="size-6" />
                  </div>
                  <h3 className="font-display text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                    Zero Installation Hassle
                  </h3>
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    No APK permissions, no MSI installers, and no App Store delays. Add to home screen
                    in 2 taps and study anywhere with automated updates.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-xs font-semibold text-teal-700 dark:text-teal-400">
                  <span>Works Across All OS</span>
                  <span className="group-hover:translate-x-1 transition-transform">&rarr;</span>
                </div>
              </div>

              {/* Tile 6: Academic Integrity Guard */}
              <div className="group relative flex flex-col justify-between rounded-3xl bg-white dark:bg-[#111915] p-7 sm:p-8 border border-slate-200/80 dark:border-white/5 transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_12px_36px_rgba(0,17,10,0.08)]">
                <div>
                  <div className="size-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/50 flex items-center justify-center text-emerald-700 dark:text-emerald-400 mb-6">
                    <ShieldCheck className="size-6" />
                  </div>
                  <h3 className="font-display text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                    Zero Intrusive Popups
                  </h3>
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    Pure, focused reading with zero shady popunder redirects or spam. Built with care
                    for serious exam candidates.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                  <span>Distraction-Free Study</span>
                  <span className="group-hover:translate-x-1 transition-transform">&rarr;</span>
                </div>
              </div>
            </div>
          </section>

          {/* ── INTERACTIVE SHOWCASE (Trust Wallet Style Tabbed Showcase) ─ */}
          <section id="showcase" className="w-full flex flex-col items-center gap-10 sm:gap-14">
            <div className="text-center max-w-[640px] space-y-3">
              <h2 className="font-display text-3xl sm:text-5xl font-bold tracking-[-0.03em] text-slate-900 dark:text-white [text-wrap:balance]">
                Study, derive and conquer from one place
              </h2>
              <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 leading-relaxed">
                Switch between study modes effortlessly. Discover how Syllaboss powers your daily
                academic preparation.
              </p>
            </div>

            <div className="w-full flex flex-col lg:flex-row items-stretch gap-8 lg:gap-12 rounded-3xl sm:rounded-[36px] bg-white dark:bg-[#111915] p-6 sm:p-10 border border-slate-200/80 dark:border-white/5 shadow-sm">
              {/* Left Column: Interactive Visual Card */}
              <div className="flex-1 rounded-2xl sm:rounded-3xl bg-[#f2f6f3] dark:bg-[#0d1611] p-6 sm:p-8 flex flex-col justify-between border border-black/[0.04] dark:border-white/[0.06] relative overflow-hidden min-h-[380px]">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-xs font-bold mb-4">
                    <Sparkles className="size-3.5" />
                    <span>{SHOWCASE_TABS[activeShowcase].badge}</span>
                  </div>
                  <h3 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                    {SHOWCASE_TABS[activeShowcase].title}
                  </h3>
                  <p className="mt-3 text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed max-w-[480px]">
                    {SHOWCASE_TABS[activeShowcase].description}
                  </p>
                </div>

                {/* Highlights List */}
                <div className="mt-8 space-y-2.5">
                  {SHOWCASE_TABS[activeShowcase].highlights.map((h, i) => (
                    <div key={i} className="flex items-center gap-2.5 text-xs sm:text-sm text-slate-700 dark:text-slate-200">
                      <div className="size-5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                        <Check className="size-3 stroke-[2.5]" />
                      </div>
                      <span>{h}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-8 pt-4 border-t border-black/[0.06] dark:border-white/[0.08] flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-emerald-800 dark:text-emerald-300">
                    {SHOWCASE_TABS[activeShowcase].metric}
                  </span>
                  <Button
                    asChild
                    size="sm"
                    className="rounded-full bg-[#0d281e] text-white hover:bg-black dark:bg-emerald-500 dark:text-black font-semibold text-xs px-4"
                  >
                    <Link to="/dashboard">Try in App &rarr;</Link>
                  </Button>
                </div>
              </div>

              {/* Right Column: Interactive Switcher List */}
              <div className="lg:w-[420px] flex flex-col justify-center space-y-2">
                {SHOWCASE_TABS.map((tab, idx) => {
                  const Icon = tab.icon;
                  const isActive = activeShowcase === idx;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveShowcase(idx)}
                      className={`w-full text-left p-5 rounded-2xl transition-all duration-300 flex items-start gap-4 border ${
                        isActive
                          ? "bg-[#edf3ef] dark:bg-[#16221c] border-emerald-500/30 shadow-xs"
                          : "border-transparent hover:bg-slate-50 dark:hover:bg-white/[0.03] opacity-75 hover:opacity-100"
                      }`}
                    >
                      <div
                        className={`size-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                          isActive
                            ? "bg-[#0d281e] text-white dark:bg-emerald-500 dark:text-black"
                            : "bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400"
                        }`}
                      >
                        <Icon className="size-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h4 className="font-display font-bold text-base text-slate-900 dark:text-white">
                            {tab.title}
                          </h4>
                          {isActive && (
                            <span className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400">
                              Active
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                          {tab.description}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          {/* ── CLEAN PWA CROSS-DEVICE SECTION ─────────────────────────── */}
          <section id="pwa" className="w-full flex flex-col items-center gap-10 sm:gap-14">
            <div className="text-center max-w-[620px] space-y-3">
              <h2 className="font-display text-3xl sm:text-5xl font-bold tracking-[-0.03em] text-slate-900 dark:text-white [text-wrap:balance]">
                Available on iOS, Android & Desktop. One seamless PWA.
              </h2>
              <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 leading-relaxed">
                Enjoy instant startup, automated background syncing, and full offline caching without
                app store restrictions.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-[1100px]">
              {/* PWA Card 1: Mobile (iOS & Android) */}
              <div className="flex flex-col justify-between rounded-3xl bg-white dark:bg-[#111915] p-8 sm:p-10 border border-slate-200/80 dark:border-white/5 shadow-xs">
                <div>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="size-12 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/50 flex items-center justify-center text-amber-600">
                      <AppleOutlineIcon className="size-6" />
                    </div>
                    <div className="size-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/50 flex items-center justify-center text-emerald-600">
                      <AndroidOutlineIcon className="size-6" />
                    </div>
                  </div>

                  <h3 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
                    iPhone, iPad & Android Phones
                  </h3>
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    Install in two taps without downloading heavy app store packages. Runs fullscreen
                    with fluid gestures and zero battery drain.
                  </p>

                  <ul className="mt-6 space-y-2.5 text-xs text-slate-700 dark:text-slate-300">
                    <li className="flex items-center gap-2">
                      <Check className="size-3.5 text-emerald-600 shrink-0" />
                      <span>Safari on iOS: Tap Share &rarr; "Add to Home Screen"</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="size-3.5 text-emerald-600 shrink-0" />
                      <span>Chrome on Android: 1-tap "Install App" prompt</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="size-3.5 text-emerald-600 shrink-0" />
                      <span>Instant offline study mode for erratic campus Wi-Fi</span>
                    </li>
                  </ul>
                </div>

                <div className="mt-8 pt-6 border-t border-slate-100 dark:border-white/5">
                  <InstallButton
                    className="w-full h-11 rounded-full bg-[#0d281e] text-white hover:bg-black dark:bg-emerald-500 dark:text-black font-semibold text-xs"
                    label="Install on Mobile Now"
                  />
                </div>
              </div>

              {/* PWA Card 2: Desktop (Windows, Mac & Linux) */}
              <div className="flex flex-col justify-between rounded-3xl bg-white dark:bg-[#111915] p-8 sm:p-10 border border-slate-200/80 dark:border-white/5 shadow-xs">
                <div>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="size-12 rounded-2xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/50 flex items-center justify-center text-blue-600">
                      <WindowsOutlineIcon className="size-6" />
                    </div>
                    <div className="size-12 rounded-2xl bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 flex items-center justify-center text-stone-700 dark:text-stone-300">
                      <Laptop className="size-6" />
                    </div>
                  </div>

                  <h3 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
                    Windows, Mac & Laptop Browsers
                  </h3>
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    Operates in a dedicated, distraction-free desktop window with keyboard shortcuts,
                    instant split-screen PDF preview, and automated sync.
                  </p>

                  <ul className="mt-6 space-y-2.5 text-xs text-slate-700 dark:text-slate-300">
                    <li className="flex items-center gap-2">
                      <Check className="size-3.5 text-emerald-600 shrink-0" />
                      <span>Works seamlessly in Chrome, Edge, Safari, and Brave</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="size-3.5 text-emerald-600 shrink-0" />
                      <span>Dedicated desktop taskbar / dock icon</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="size-3.5 text-emerald-600 shrink-0" />
                      <span>Zero setup installer files or administrator privileges needed</span>
                    </li>
                  </ul>
                </div>

                <div className="mt-8 pt-6 border-t border-slate-100 dark:border-white/5">
                  <Button
                    asChild
                    className="w-full h-11 rounded-full bg-slate-900 hover:bg-black text-white dark:bg-white dark:text-black dark:hover:bg-slate-200 font-semibold text-xs"
                  >
                    <Link to="/dashboard">
                      <span>Launch in Browser</span>
                      <ArrowRight className="size-3.5 ml-1.5" />
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </section>

          {/* ── SYLLAPOINTS EARNINGS CALCULATOR ─────────────────────────── */}
          <section id="calculator" className="w-full rounded-3xl sm:rounded-[36px] bg-[#edf3ef] dark:bg-[#0d1611] p-8 sm:p-14 border border-black/[0.04] dark:border-white/[0.06] text-center">
            <div className="max-w-[600px] mx-auto space-y-3">
              <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                Peer Study Economy
              </span>
              <h2 className="font-display text-3xl sm:text-5xl font-bold tracking-[-0.03em] text-slate-900 dark:text-white [text-wrap:balance]">
                Calculate your semester study earnings
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Share your handwritten summaries or solved examination questions. Turn study effort
                into real bank withdrawals.
              </p>
            </div>

            <div className="mt-10 max-w-2xl mx-auto rounded-3xl bg-white dark:bg-[#111915] p-6 sm:p-8 border border-slate-200/80 dark:border-white/5 shadow-sm text-left space-y-6">
              <div>
                <div className="flex items-center justify-between text-xs font-semibold mb-2">
                  <span className="text-slate-700 dark:text-slate-200">
                    Verified Course Materials Shared:
                  </span>
                  <span className="text-emerald-700 dark:text-emerald-400 font-bold">
                    {uploadsCount} Uploads
                  </span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="50"
                  value={uploadsCount}
                  onChange={(e) => setUploadsCount(Number(e.target.value))}
                  className="w-full accent-emerald-600 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex items-center justify-between text-xs font-semibold mb-2">
                  <span className="text-slate-700 dark:text-slate-200">
                    Peer Downloads & Studies Received:
                  </span>
                  <span className="text-emerald-700 dark:text-emerald-400 font-bold">
                    {downloadsReceived} Classmates
                  </span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="500"
                  step="10"
                  value={downloadsReceived}
                  onChange={(e) => setDownloadsReceived(Number(e.target.value))}
                  className="w-full accent-emerald-600 cursor-pointer"
                />
              </div>

              {/* Earnings Result Banner */}
              <div className="p-5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/40 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <span className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                    Estimated Semester Reward:
                  </span>
                  <div className="font-display text-3xl font-bold text-emerald-800 dark:text-emerald-300">
                    {formatNaira(calculatedNaira)}
                  </div>
                  <span className="text-[11px] text-emerald-700/80 dark:text-emerald-400/80 font-mono">
                    ({calculatedPoints.toLocaleString()} SyllaPoints)
                  </span>
                </div>
                <Button
                  asChild
                  className="rounded-full bg-[#0d281e] text-white hover:bg-black dark:bg-emerald-500 dark:text-black font-bold text-xs h-10 px-6 shadow-sm"
                >
                  <Link to="/auth" search={{ mode: "signin" }}>
                    Start Earning &rarr;
                  </Link>
                </Button>
              </div>
            </div>
          </section>

          {/* ── FREQUENTLY ASKED QUESTIONS (Accordion) ────────────────── */}
          <section id="faq" className="w-full flex flex-col items-center gap-10 sm:gap-14">
            <div className="text-center max-w-[620px] space-y-3">
              <h2 className="font-display text-3xl sm:text-5xl font-bold tracking-[-0.03em] text-slate-900 dark:text-white [text-wrap:balance]">
                Frequently Asked Questions
              </h2>
              <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 leading-relaxed">
                Everything you need to know about using Syllaboss, Boss AI derivations, and progressive web app installation.
              </p>
            </div>

            <div className="w-full max-w-3xl space-y-3">
              {FAQ.map(([q, a], idx) => {
                const isOpen = openFaq === idx;
                return (
                  <div
                    key={idx}
                    className="rounded-2xl bg-white dark:bg-[#111915] border border-slate-200/80 dark:border-white/5 overflow-hidden transition-all shadow-xs"
                  >
                    <button
                      type="button"
                      onClick={() => setOpenFaq(isOpen ? null : idx)}
                      className="w-full p-5 sm:p-6 text-left flex items-center justify-between gap-4 font-display text-base sm:text-lg font-bold text-slate-900 dark:text-white"
                    >
                      <span>{q}</span>
                      <ChevronDown
                        className={`size-5 text-slate-500 transition-transform duration-300 shrink-0 ${
                          isOpen ? "rotate-180" : ""
                        }`}
                      />
                    </button>
                    {isOpen && (
                      <div className="px-5 sm:px-6 pb-5 sm:pb-6 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed border-t border-slate-100 dark:border-white/5 pt-3 animate-fade-in">
                        {a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* ── TRUST-WALLET STYLE FINAL CALL TO ACTION ──────────────── */}
          <section className="relative w-full rounded-3xl sm:rounded-[36px] bg-[#0d281e] text-white p-8 sm:p-16 flex flex-col items-center text-center overflow-hidden">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-emerald-500/20 blur-3xl rounded-full"
            />
            <SyllabossEmblem className="size-16 mb-6" />
            <h2 className="max-w-[700px] font-display text-3xl sm:text-5xl font-bold tracking-tight text-white leading-tight">
              Ready to master your syllabus with complete clarity?
            </h2>
            <p className="mt-4 max-w-[540px] text-sm sm:text-base text-emerald-100/80 leading-relaxed">
              Join thousands of Nigerian undergraduates preparing for first-class academic honors with
              Syllaboss and Boss AI.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center gap-3">
              <InstallButton
                size="lg"
                className="w-full sm:w-auto h-12 rounded-full bg-white text-[#0d281e] hover:bg-emerald-50 font-bold px-8 shadow-md"
                label="Install Web App (PWA)"
              />
              <Button
                asChild
                variant="outline"
                size="lg"
                className="w-full sm:w-auto h-12 rounded-full border-white/20 bg-transparent hover:bg-white/10 text-white font-semibold px-7"
              >
                <Link to="/auth" search={{ mode: "signin" }}>
                  <span>Open in Browser</span>
                  <ArrowRight className="size-4 ml-1.5" />
                </Link>
              </Button>
            </div>
          </section>
        </div>
      </main>

      {/* ── CLEAN FOOTER ────────────────────────────────────────────── */}
      <footer className="w-full border-t border-slate-200/80 dark:border-white/5 bg-white dark:bg-[#070b09] py-12 px-4 sm:px-8 mt-16">
        <div className="mx-auto max-w-[1360px] flex flex-col md:flex-row items-center justify-between gap-6 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-3">
            <SyllabossLogo />
            <span className="text-slate-300 dark:text-slate-700">|</span>
            <span>The Academic Study Companion</span>
          </div>

          <div className="flex flex-wrap items-center gap-6">
            <Link to="/privacy" className="hover:text-slate-900 dark:hover:text-white transition-colors">
              Privacy Policy
            </Link>
            <Link to="/terms" className="hover:text-slate-900 dark:hover:text-white transition-colors">
              Terms of Service
            </Link>
            <a href="mailto:support@syllaboss.org" className="hover:text-slate-900 dark:hover:text-white transition-colors">
              Contact Support
            </a>
          </div>

          <div>
            &copy; {new Date().getFullYear()} Syllaboss Inc. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}

