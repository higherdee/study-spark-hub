import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowRight,
  Bot,
  CheckCircle2,
  Coins,
  Download,
  FileSearch,
  Laptop,
  ShieldCheck,
  Smartphone,
  Wallet,
  Sparkles,
  BookOpen,
  GraduationCap,
  Award,
  ChevronRight,
  Search,
  FileText,
  Star,
  Zap,
  Bell,
  Home,
  Trophy,
  Play,
  Check,
  Flame,
  Globe,
  CloudDownload,
  Upload,
  Menu,
  X,
} from "lucide-react";
import { useState, useEffect } from "react";

import { InstallButton } from "@/components/install-button";
import { AppWelcomeGate } from "@/components/app-welcome-gate";
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
  POINTS_PER_30_MIN_STUDY,
  POINTS_REGISTRATION_BONUS,
  POINTS_INSTALL_APP_BONUS,
  formatNaira,
} from "@/lib/constants";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Syllaboss — The Pocket Study App Built for Your Campus" },
      {
        name: "description",
        content:
          "Download Syllaboss for Android (.APK), Windows PC (.EXE), or Apple iOS. Verified course summaries, past questions, Boss AI tutor, and cashable student SyllaPoints.",
      },
      { property: "og:title", content: "Syllaboss — Study With Direction" },
      {
        property: "og:description",
        content:
          "Vetted Nigerian university lecture notes, past exams, and AI study companion. Available on all devices.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://syllaboss.org" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HomePage,
});

const FAQ = [
  [
    "Is Syllaboss completely free to download and use?",
    "Yes, 100% free! Downloading the app, browsing course materials, studying past questions, and chatting with Boss AI costs nothing.",
  ],
  [
    "What do I do if Android says 'App not installed'?",
    "This usually happens when you already have an older shortcut or test version of Syllaboss on your phone. Simply delete or uninstall the old Syllaboss app icon from your home screen first, then tap 'Download for Android (.APK)' and install the new version cleanly.",
  ],
  [
    "How does the direct Android APK download work?",
    "Tapping 'Download for Android (.APK)' directly downloads the lightweight (~900 KB) Syllaboss package. Tap the downloaded file from your browser notification bar and confirm 'Install'. It will appear straight in your app drawer.",
  ],
  [
    "How do I install Syllaboss on my Windows laptop or desktop?",
    "Click 'Download for Windows (.MSI)'. Run the installer (Syllaboss-Setup.msi) once to install the app and generate an official executable shortcut on your Desktop.",
  ],
  [
    "How do I use Syllaboss on my iPhone or iPad?",
    "Apple devices don't require any app store download! Simply open Syllaboss in Safari, tap the Share icon at the bottom, and select 'Add to Home Screen'. Syllaboss launches fullscreen just like any native iOS app.",
  ],
  [
    "How do SyllaPoints work and how do I withdraw to my bank?",
    `You earn +${POINTS_REGISTRATION_BONUS} points on sign-up, +${POINTS_INSTALL_APP_BONUS} points when you install the app, +${POINTS_PER_VERIFIED_UPLOAD} points per verified lecture upload, plus royalties whenever peers view or download your notes. Once your balance reaches ${formatNaira(MINIMUM_WITHDRAWAL_NAIRA)}, you can request an instant withdrawal directly to your Nigerian commercial bank account (OPay, Kuda, GTBank, Access, etc.).`,
  ],
];

function HomePage() {
  const [isStandalone, setIsStandalone] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [uploadsEstimate, setUploadsEstimate] = useState(6);
  const [readsEstimate, setReadsEstimate] = useState(150);
  const { user } = useAuth();
  const navigate = useNavigate();

  // Calculate estimated earnings in Naira
  const estimatedPoints =
    uploadsEstimate * POINTS_PER_VERIFIED_UPLOAD +
    readsEstimate * (POINTS_PER_VIEW + POINTS_PER_DOWNLOAD);
  const estimatedNaira = Math.round(estimatedPoints / POINTS_PER_NAIRA);

  // Detect standalone installed mode OR web subdomain mode (e.g. web.syllaboss.org)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const isSubdomain =
        window.location.hostname.startsWith("web.") ||
        window.location.hostname.startsWith("app.") ||
        window.location.search.includes("mode=web");

      const standalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        (navigator as unknown as { standalone?: boolean }).standalone === true ||
        window.location.search.includes("mode=pwa") ||
        isSubdomain;
      setIsStandalone(standalone);

      if (standalone && user) {
        navigate({ to: "/dashboard" });
      }
    }
  }, [user, navigate]);

  if (isStandalone && !user) {
    return <AppWelcomeGate />;
  }

  function handleTriggerDownload(target: "android" | "windows") {
    if (target === "android") {
      const link = document.createElement("a");
      link.href = "/downloads/syllaboss.apk";
      link.download = "Syllaboss.apk";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      const link = document.createElement("a");
      link.href = "/downloads/syllaboss-setup.msi";
      link.download = "Syllaboss-Setup.msi";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#f3fbf6] text-[#00110a] font-sans selection:bg-[#1b7a4e]/20 selection:text-[#0b3321]">
      {/* Top Header */}
      <header className="sticky top-0 z-50 border-b border-[#e1eae3] bg-[#f3fbf6]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <SyllabossLogo />

          {/* Center Navigation Links (Desktop) */}
          <nav className="hidden items-center gap-7 text-xs font-semibold text-[#526359] md:flex">
            <a href="#hero" className="hover:text-[#00110a] transition-colors">
              Home
            </a>
            <Link to="/materials" className="hover:text-[#00110a] transition-colors">
              Library
            </Link>
            <a href="#study-smarter" className="hover:text-[#00110a] transition-colors">
              AI Tutor
            </a>
            <a href="#downloads" className="hover:text-[#00110a] transition-colors">
              Downloads
            </a>
            <Link
              to={user ? "/dashboard" : "/auth"}
              className="hover:text-[#00110a] transition-colors"
            >
              Profile
            </Link>
          </nav>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-2.5">
            <InstallButton
              showDropdown
              variant="default"
              size="sm"
              label="Install on iPhone / iPad"
              className="rounded-full bg-[#0d281e] text-white hover:bg-[#00110a] text-xs h-9 px-4 font-semibold shadow-xs"
            />
            {user ? (
              <Button
                asChild
                size="sm"
                variant="outline"
                className="hidden sm:inline-flex rounded-full text-xs h-9 border-[#d6e3db] bg-white hover:bg-[#edf6f0]"
              >
                <Link to="/dashboard">Dashboard</Link>
              </Button>
            ) : (
              <Button
                asChild
                size="sm"
                variant="outline"
                className="hidden sm:inline-flex rounded-full text-xs h-9 border-[#d6e3db] bg-white hover:bg-[#edf6f0] text-[#00110a]"
              >
                <Link to="/auth" search={{ mode: "signin" }}>
                  Dashboard
                </Link>
              </Button>
            )}

            {/* Mobile Hamburger Toggle */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden size-9 rounded-full border border-[#d6e3db] bg-white flex items-center justify-center text-[#00110a] shadow-2xs"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="size-4.5" /> : <Menu className="size-4.5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-[#e1eae3] bg-[#f3fbf6] px-4 py-3 space-y-2 animate-fade-in shadow-md">
            <a
              href="#hero"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-xs font-semibold text-[#00110a] hover:text-[#155e3e]"
            >
              Home
            </a>
            <Link
              to="/materials"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-xs font-semibold text-[#526359] hover:text-[#00110a]"
            >
              Library
            </Link>
            <a
              href="#study-smarter"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-xs font-semibold text-[#526359] hover:text-[#00110a]"
            >
              AI Tutor
            </a>
            <a
              href="#downloads"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-xs font-semibold text-[#526359] hover:text-[#00110a]"
            >
              Downloads
            </a>
            <Link
              to={user ? "/dashboard" : "/auth"}
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-xs font-semibold text-[#526359] hover:text-[#00110a]"
            >
              {user ? "Dashboard" : "Log In / Register"}
            </Link>
          </div>
        )}
      </header>

      <main>
        {/* ========================================================= */}
        {/* HERO SECTION: The Pocket Study App Built for Your Campus */}
        {/* ========================================================= */}
        <section id="hero" className="relative pt-10 pb-16 sm:pt-16 sm:pb-24 border-b border-[#e1eae3] overflow-hidden">
          {/* Subtle Ambient Glow */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[840px] h-[400px] bg-gradient-to-b from-[#1b7a4e]/10 to-transparent blur-3xl opacity-70"
          />

          <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-center">
              {/* Left Column: Hero Text & Actions */}
              <div className="lg:col-span-6 text-center lg:text-left space-y-6">
                {/* Pill Badge */}
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-[#d6e3db] shadow-2xs text-[#155e3e] text-xs font-semibold animate-fade-in">
                  <Sparkles className="size-3.5 text-[#155e3e]" />
                  <span>Available for Android (.APK), Windows PC (.EXE) &amp; iOS</span>
                </div>

                {/* Main Headline */}
                <h1 className="font-display text-4xl sm:text-5xl lg:text-[58px] font-bold tracking-tight text-[#00110a] leading-[1.08]">
                  The Pocket Study App <br />
                  <span className="font-normal text-[#155e3e] italic">
                    Built for Your Campus.
                  </span>
                </h1>

                {/* Sub-headline */}
                <p className="max-w-xl mx-auto lg:mx-0 text-base sm:text-lg text-[#3f4d45] leading-relaxed">
                  Find verified lecture summaries, past questions, and marking guides tailored
                  to your university syllabus. Prepare effortlessly with <strong>Boss AI</strong>,
                  and earn cashable <strong>SyllaPoints</strong> every time classmates study your uploads.
                </p>

                {/* Primary Action Buttons */}
                <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3.5 pt-2">
                  <InstallButton
                    size="lg"
                    label="Install on iPhone / iPad"
                    className="w-full sm:w-auto h-12.5 rounded-full bg-[#0d281e] hover:bg-[#00110a] text-white text-sm sm:text-base font-bold px-7 shadow-sm transition-all hover:scale-[1.01]"
                  />
                  <Button
                    asChild
                    variant="outline"
                    size="lg"
                    className="w-full sm:w-auto h-12.5 rounded-full border-[#d2e0d7] bg-white hover:bg-[#edf6f0] text-[#00110a] text-sm font-semibold px-6 shadow-2xs"
                  >
                    <Link to="/auth" search={{ mode: "signin" }}>
                      Sign In to Web <ArrowRight className="size-4 ml-1.5" />
                    </Link>
                  </Button>
                </div>

                {/* Micro Device Badges */}
                <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 text-xs text-[#526359] pt-2">
                  <span className="inline-flex items-center gap-1.5 font-medium">
                    <AndroidOutlineIcon className="size-4 text-[#1b7a4e]" />
                    Android (.APK)
                  </span>
                  <span className="text-[#c1d3c7]">•</span>
                  <span className="inline-flex items-center gap-1.5 font-medium">
                    <WindowsOutlineIcon className="size-4 text-[#1f66a8]" />
                    Windows (.EXE)
                  </span>
                  <span className="text-[#c1d3c7]">•</span>
                  <span className="inline-flex items-center gap-1.5 font-medium">
                    <AppleOutlineIcon className="size-4 text-[#202924]" />
                    Apple iOS (Safari)
                  </span>
                </div>
              </div>

              {/* Right Column: High-Res Phone Collage Graphic */}
              <div className="lg:col-span-6 flex justify-center items-center relative">
                {/* Backlight Glow */}
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 bg-radial from-[#c6ebd9]/50 via-transparent to-transparent blur-3xl scale-105"
                />
                <div className="relative w-full max-w-[420px] sm:max-w-[480px] lg:max-w-[530px]">
                  <img
                    src="/images/hero-hand-collage.png"
                    alt="Syllaboss Pocket Study App on Campus"
                    className="w-full h-auto object-contain drop-shadow-[0_25px_50px_rgba(13,40,30,0.18)] transition-transform duration-500 hover:scale-[1.015]"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* 4 FEATURE CARDS: Verified Materials, Boss AI, SyllaPoints, Offline */}
        {/* ========================================================= */}
        <section id="features" className="py-14 sm:py-20 border-b border-[#e1eae3] bg-[#f3fbf6]">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {/* Card 1: Verified Materials */}
              <div className="p-6 rounded-3xl bg-[#edf6f0] border border-[#d6e3db] shadow-2xs hover:border-[#155e3e] transition-all flex flex-col justify-between">
                <div>
                  <div className="size-12 rounded-full bg-[#c6ebd9] flex items-center justify-center text-[#155e3e] mb-5">
                    <BookOpen className="size-5.5 text-[#155e3e]" />
                  </div>
                  <h3 className="font-display text-lg font-bold text-[#00110a]">
                    Verified Materials
                  </h3>
                  <p className="mt-2 text-xs sm:text-sm text-[#526359] leading-relaxed">
                    Get authentic notes, past questions and marking guides from accredited universities.
                  </p>
                </div>
              </div>

              {/* Card 2: Boss AI */}
              <div className="p-6 rounded-3xl bg-[#edf6f0] border border-[#d6e3db] shadow-2xs hover:border-[#155e3e] transition-all flex flex-col justify-between">
                <div>
                  <div className="size-12 rounded-full bg-[#c6ebd9] flex items-center justify-center text-[#155e3e] mb-5">
                    <Bot className="size-5.5 text-[#155e3e]" />
                  </div>
                  <h3 className="font-display text-lg font-bold text-[#00110a]">
                    Boss AI
                  </h3>
                  <p className="mt-2 text-xs sm:text-sm text-[#526359] leading-relaxed">
                    Turn complex topics into simple explanations. Ask, learn, and understand faster.
                  </p>
                </div>
              </div>

              {/* Card 3: SyllaPoints */}
              <div className="p-6 rounded-3xl bg-[#edf6f0] border border-[#d6e3db] shadow-2xs hover:border-[#155e3e] transition-all flex flex-col justify-between">
                <div>
                  <div className="size-12 rounded-full bg-[#c6ebd9] flex items-center justify-center text-[#155e3e] mb-5">
                    <Sparkles className="size-5.5 text-[#155e3e]" />
                  </div>
                  <h3 className="font-display text-lg font-bold text-[#00110a]">
                    SyllaPoints
                  </h3>
                  <p className="mt-2 text-xs sm:text-sm text-[#526359] leading-relaxed">
                    Earn points for sharing materials and help your classmates succeed.
                  </p>
                </div>
              </div>

              {/* Card 4: Offline Access */}
              <div className="p-6 rounded-3xl bg-[#edf6f0] border border-[#d6e3db] shadow-2xs hover:border-[#155e3e] transition-all flex flex-col justify-between">
                <div>
                  <div className="size-12 rounded-full bg-[#c6ebd9] flex items-center justify-center text-[#155e3e] mb-5">
                    <CloudDownload className="size-5.5 text-[#155e3e]" />
                  </div>
                  <h3 className="font-display text-lg font-bold text-[#00110a]">
                    Offline Access
                  </h3>
                  <p className="mt-2 text-xs sm:text-sm text-[#526359] leading-relaxed">
                    Download and study anytime, anywhere — no data needed.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* HOW IT WORKS: 4 Steps Horizontal Flow */}
        {/* ========================================================= */}
        <section id="how-it-works" className="py-16 sm:py-24 border-b border-[#e1eae3] bg-white">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            {/* Section Header */}
            <div className="text-center max-w-2xl mx-auto mb-16">
              <span className="text-[11px] font-bold tracking-[0.2em] text-[#526359] uppercase block">
                SIMPLE STEPS
              </span>
              <h2 className="mt-2 font-display text-3xl sm:text-4xl font-bold text-[#00110a]">
                How It Works
              </h2>
              <p className="mt-2 text-sm text-[#3f4d45]">
                Get started in seconds and unlock a smarter way to study.
              </p>
            </div>

            {/* 4 Steps Flow */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 relative">
              {/* Step 1 */}
              <div className="relative text-center flex flex-col items-center">
                <div className="relative mb-4">
                  <div className="size-16 rounded-full bg-[#edf6f0] border border-[#d6e3db] flex items-center justify-center text-[#155e3e] shadow-2xs">
                    <Upload className="size-6 text-[#155e3e]" />
                  </div>
                  <span className="absolute -bottom-1 -left-1 size-6 rounded-full bg-[#0d281e] text-white text-xs font-bold flex items-center justify-center shadow-xs">
                    1
                  </span>
                </div>
                <h3 className="font-display text-base font-bold text-[#00110a]">
                  Upload Materials
                </h3>
                <p className="mt-2 text-xs text-[#526359] max-w-xs leading-relaxed">
                  Share your notes, past questions or marking guides.
                </p>
              </div>

              {/* Step 2 */}
              <div className="relative text-center flex flex-col items-center">
                <div className="relative mb-4">
                  <div className="size-16 rounded-full bg-[#edf6f0] border border-[#d6e3db] flex items-center justify-center text-[#155e3e] shadow-2xs">
                    <Search className="size-6 text-[#155e3e]" />
                  </div>
                  <span className="absolute -bottom-1 -left-1 size-6 rounded-full bg-[#0d281e] text-white text-xs font-bold flex items-center justify-center shadow-xs">
                    2
                  </span>
                </div>
                <h3 className="font-display text-base font-bold text-[#00110a]">
                  Find &amp; Explore
                </h3>
                <p className="mt-2 text-xs text-[#526359] max-w-xs leading-relaxed">
                  Search by course, level or university.
                </p>
              </div>

              {/* Step 3 */}
              <div className="relative text-center flex flex-col items-center">
                <div className="relative mb-4">
                  <div className="size-16 rounded-full bg-[#edf6f0] border border-[#d6e3db] flex items-center justify-center text-[#155e3e] shadow-2xs">
                    <Bot className="size-6 text-[#155e3e]" />
                  </div>
                  <span className="absolute -bottom-1 -left-1 size-6 rounded-full bg-[#0d281e] text-white text-xs font-bold flex items-center justify-center shadow-xs">
                    3
                  </span>
                </div>
                <h3 className="font-display text-base font-bold text-[#00110a]">
                  Use Boss AI
                </h3>
                <p className="mt-2 text-xs text-[#526359] max-w-xs leading-relaxed">
                  Get instant explanations and study help.
                </p>
              </div>

              {/* Step 4 */}
              <div className="relative text-center flex flex-col items-center">
                <div className="relative mb-4">
                  <div className="size-16 rounded-full bg-[#edf6f0] border border-[#d6e3db] flex items-center justify-center text-[#155e3e] shadow-2xs">
                    <Star className="size-6 text-[#155e3e]" />
                  </div>
                  <span className="absolute -bottom-1 -left-1 size-6 rounded-full bg-[#0d281e] text-white text-xs font-bold flex items-center justify-center shadow-xs">
                    4
                  </span>
                </div>
                <h3 className="font-display text-base font-bold text-[#00110a]">
                  Earn SyllaPoints
                </h3>
                <p className="mt-2 text-xs text-[#526359] max-w-xs leading-relaxed">
                  Get rewarded when classmates download your uploads.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* STUDY SMARTER. GO FURTHER: Dual Phones Showcase & Checklist */}
        {/* ========================================================= */}
        <section id="study-smarter" className="py-16 sm:py-24 border-b border-[#e1eae3] bg-[#f3fbf6]">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
              {/* Left Column: Dual Phones Graphic */}
              <div className="lg:col-span-6 flex justify-center items-center">
                <div className="relative w-full max-w-[460px] sm:max-w-[520px]">
                  <img
                    src="/images/dual-phones-mockup.jpg"
                    alt="Syllaboss University Library and Boss AI Mobile App"
                    className="w-full h-auto object-contain rounded-3xl drop-shadow-[0_20px_45px_rgba(13,40,30,0.18)]"
                  />
                </div>
              </div>

              {/* Right Column: Copy, Checklist & Stamp */}
              <div className="lg:col-span-6 space-y-6">
                <span className="text-[11px] font-bold tracking-[0.2em] text-[#526359] uppercase block">
                  MORE THAN JUST NOTES
                </span>
                <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-[#00110a] leading-tight">
                  Study Smarter. <br />
                  Go Further.
                </h2>
                <p className="text-sm sm:text-base text-[#3f4d45] leading-relaxed">
                  Whether you're on campus or at home, SyllaBoss gives you everything you need
                  to stay ahead — from verified study materials to AI-powered learning and rewarding opportunities.
                </p>

                {/* Feature Checkmarks */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center gap-3 text-sm font-semibold text-[#00110a]">
                    <div className="size-6 rounded-md bg-[#edf6f0] border border-[#c6ebd9] flex items-center justify-center text-[#155e3e]">
                      <BookOpen className="size-3.5 text-[#155e3e]" />
                    </div>
                    <span>Course-specific library</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm font-semibold text-[#00110a]">
                    <div className="size-6 rounded-md bg-[#edf6f0] border border-[#c6ebd9] flex items-center justify-center text-[#155e3e]">
                      <Bot className="size-3.5 text-[#155e3e]" />
                    </div>
                    <span>AI-powered tutor (Boss AI)</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm font-semibold text-[#00110a]">
                    <div className="size-6 rounded-md bg-[#edf6f0] border border-[#c6ebd9] flex items-center justify-center text-[#155e3e]">
                      <Coins className="size-3.5 text-[#155e3e]" />
                    </div>
                    <span>Cashable SyllaPoints</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm font-semibold text-[#00110a]">
                    <div className="size-6 rounded-md bg-[#edf6f0] border border-[#c6ebd9] flex items-center justify-center text-[#155e3e]">
                      <Laptop className="size-3.5 text-[#155e3e]" />
                    </div>
                    <span>Cross-platform access</span>
                  </div>
                </div>

                {/* Action Button & Handwritten Stamp */}
                <div className="pt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                  <InstallButton
                    size="lg"
                    label="Install on iPhone / iPad"
                    className="rounded-full bg-[#0d281e] hover:bg-[#00110a] text-white text-sm font-bold px-8 h-12 shadow-sm"
                  />

                  {/* Stamp */}
                  <div className="relative inline-flex flex-col items-center text-[#155e3e] font-display italic font-semibold text-lg sm:text-xl select-none rotate-[-6deg]">
                    <span className="leading-tight">Your Success</span>
                    <span className="leading-tight">Our Priority</span>
                    <div className="w-16 h-0.5 bg-[#155e3e] rounded-full mt-1 opacity-70" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* DEDICATED MULTI-DEVICE DOWNLOAD HUB */}
        {/* ========================================================= */}
        <section id="downloads" className="py-20 sm:py-24 bg-white border-b border-[#e1eae3]">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-14">
              <span className="text-xs font-semibold text-[#155e3e] uppercase tracking-wider">
                Install On Every Device
              </span>
              <h2 className="mt-2 font-display text-3xl sm:text-4xl font-bold text-[#00110a]">
                Direct Downloads. Zero App Store Restrictions.
              </h2>
              <p className="mt-3 text-sm text-[#3f4d45]">
                Download standalone installers directly to your PC and Android phone, or run
                fullscreen on iOS via Safari.
              </p>
            </div>

            {/* Multi-Device & Web Hub Cards */}
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 max-w-7xl mx-auto">
              {/* Card 1: Android (.APK) */}
              <div className="p-6 rounded-3xl bg-[#f6faf7] border border-[#d2e0d7] flex flex-col justify-between shadow-xs hover:border-[#155e3e] transition-all">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="size-12 rounded-2xl bg-[#edf6f0] border border-[#d6e3db] flex items-center justify-center text-[#155e3e]">
                      <AndroidOutlineIcon className="size-6 text-[#155e3e]" />
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase tracking-wider">
                      Direct .APK
                    </span>
                  </div>

                  <h3 className="font-display text-xl font-bold text-[#00110a]">
                    Android Phone &amp; Tablet
                  </h3>
                  <p className="text-xs text-[#526359] mt-1">
                    Samsung, Tecno, Infinix, Xiaomi, Redmi, Pixel, Oppo, Vivo.
                  </p>

                  <ul className="mt-5 space-y-2 text-xs text-[#3f4d45]">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="size-4 text-[#155e3e] shrink-0" />
                      <span>Lightweight ~900 KB standalone package</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="size-4 text-[#155e3e] shrink-0" />
                      <span>Instant 1-tap download &amp; install</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="size-4 text-[#155e3e] shrink-0" />
                      <span>Works seamlessly offline for study</span>
                    </li>
                  </ul>
                </div>

                <div className="mt-6 pt-4 border-t border-[#e1eae3] space-y-2">
                  <Button
                    className="w-full h-11 rounded-2xl bg-[#155e3e] hover:bg-[#0b3321] text-white font-bold gap-2 text-sm shadow-xs"
                    onClick={() => handleTriggerDownload("android")}
                  >
                    <Download className="size-4.5" />
                    Download Syllaboss.apk
                  </Button>
                  <p className="text-[10px] text-center text-[#526359]">
                    Tip: If updating, remove any older shortcut before installing.
                  </p>
                </div>
              </div>

              {/* Card 2: Windows (.EXE) */}
              <div className="p-6 rounded-3xl bg-[#f6faf7] border border-[#d2e0d7] flex flex-col justify-between shadow-xs hover:border-[#1f66a8] transition-all">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="size-12 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-[#1f66a8]">
                      <WindowsOutlineIcon className="size-6 text-[#1f66a8]" />
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-blue-100 text-blue-800 text-[10px] font-bold uppercase tracking-wider">
                      .EXE Setup
                    </span>
                  </div>

                  <h3 className="font-display text-xl font-bold text-[#00110a]">
                    Windows 10 &amp; 11 PC
                  </h3>
                  <p className="text-xs text-[#526359] mt-1">
                    Standalone 64-bit desktop application for laptops &amp; PCs.
                  </p>

                  <ul className="mt-5 space-y-2 text-xs text-[#3f4d45]">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="size-4 text-[#1f66a8] shrink-0" />
                      <span>Generates Desktop &amp; Start Menu shortcuts</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="size-4 text-[#1f66a8] shrink-0" />
                      <span>Runs in a dedicated distraction-free window</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="size-4 text-[#1f66a8] shrink-0" />
                      <span>Ultra-lightweight setup executable (~8.7 KB)</span>
                    </li>
                  </ul>
                </div>

                <div className="mt-6 pt-4 border-t border-[#e1eae3] space-y-2">
                  <Button
                    className="w-full h-11 rounded-2xl bg-[#1f66a8] hover:bg-[#154673] text-white font-bold gap-2 text-sm shadow-xs"
                    onClick={() => handleTriggerDownload("windows")}
                  >
                    <Download className="size-4.5" />
                    Download Syllaboss-Setup.msi
                  </Button>
                  <p className="text-[10px] text-center text-[#526359]">
                    Compatible with Windows 10 and Windows 11.
                  </p>
                </div>
              </div>

              {/* Card 3: Apple iOS */}
              <div className="p-6 rounded-3xl bg-[#f6faf7] border border-[#d2e0d7] flex flex-col justify-between shadow-xs hover:border-[#00110a] transition-all">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="size-12 rounded-2xl bg-[#edf1ee] border border-[#d6e0d8] flex items-center justify-center text-[#00110a]">
                      <AppleOutlineIcon className="size-6 text-[#00110a]" />
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-neutral-200 text-neutral-800 text-[10px] font-bold uppercase tracking-wider">
                      Safari PWA
                    </span>
                  </div>

                  <h3 className="font-display text-xl font-bold text-[#00110a]">
                    iPhone &amp; iPad (iOS)
                  </h3>
                  <p className="text-xs text-[#526359] mt-1">
                    Direct Safari Home Screen install. Zero Apple App Store needed.
                  </p>

                  <ul className="mt-5 space-y-2 text-xs text-[#3f4d45]">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="size-4 text-[#00110a] shrink-0" />
                      <span>Opens in Safari &amp; tap Share button</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="size-4 text-[#00110a] shrink-0" />
                      <span>Select "Add to Home Screen"</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="size-4 text-[#00110a] shrink-0" />
                      <span>Launches fullscreen with home icon</span>
                    </li>
                  </ul>
                </div>

                <div className="mt-6 pt-4 border-t border-[#e1eae3] space-y-2">
                  <InstallButton
                    variant="outline"
                    className="w-full h-11 rounded-2xl border-[#00110a] text-[#00110a] hover:bg-[#edf6f0] font-bold text-sm"
                    label="View iOS Install Guide"
                    showDropdown={false}
                  />
                  <p className="text-[10px] text-center text-[#526359]">
                    Works on all iPhones and iPads running iOS 14+.
                  </p>
                </div>
              </div>

              {/* Card 4: Syllaboss Web (Browser) */}
              <div className="p-6 rounded-3xl bg-[#f6faf7] border border-[#d2e0d7] flex flex-col justify-between shadow-xs hover:border-[#155e3e] transition-all">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="size-12 rounded-2xl bg-[#edf6f0] border border-[#d6e3db] flex items-center justify-center text-[#155e3e]">
                      <Globe className="size-6 text-[#155e3e]" />
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase tracking-wider">
                      Instant Web
                    </span>
                  </div>

                  <h3 className="font-display text-xl font-bold text-[#00110a]">
                    Syllaboss Web
                  </h3>
                  <p className="text-xs text-[#526359] mt-1">
                    web.syllaboss.org for all desktop, laptop &amp; tablet browsers.
                  </p>

                  <ul className="mt-5 space-y-2 text-xs text-[#3f4d45]">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="size-4 text-[#155e3e] shrink-0" />
                      <span>Zero installation required</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="size-4 text-[#155e3e] shrink-0" />
                      <span>Chrome, Edge, Firefox, Safari</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="size-4 text-[#155e3e] shrink-0" />
                      <span>Instant sync across all your devices</span>
                    </li>
                  </ul>
                </div>

                <div className="mt-6 pt-4 border-t border-[#e1eae3] space-y-2">
                  <Button
                    asChild
                    className="w-full h-11 rounded-2xl bg-[#0d281e] hover:bg-[#00110a] text-white font-bold gap-2 text-sm shadow-xs"
                  >
                    <a href="https://web.syllaboss.org/dashboard">
                      Launch Web App →
                    </a>
                  </Button>
                  <p className="text-[10px] text-center text-[#526359]">
                    Access directly at web.syllaboss.org
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* INTERACTIVE EARNINGS SIMULATOR */}
        {/* ========================================================= */}
        <section id="calculator" className="py-20 sm:py-24 bg-[#f3fbf6] border-b border-[#e1eae3]">
          <div className="mx-auto max-w-5xl px-4 sm:px-6">
            <div className="grid gap-10 lg:grid-cols-12 lg:items-center">
              <div className="lg:col-span-6 space-y-4">
                <span className="text-xs font-semibold text-[#155e3e] uppercase tracking-wider">
                  The Student Earning Economy
                </span>
                <h2 className="font-display text-3xl sm:text-4xl font-bold text-[#00110a] leading-tight">
                  Get Paid for Helping Coursemates Learn
                </h2>
                <p className="text-sm text-[#3f4d45] leading-relaxed">
                  Turn your tidy lecture summaries and past exam solutions into passive income.
                  Every verified upload pays an instant base bonus, plus recurring royalties each time
                  a student reads or downloads it.
                </p>

                <div className="pt-2">
                  <InstallButton
                    size="default"
                    label="Install App to Start Earning"
                    className="rounded-full bg-[#0d281e] text-white hover:bg-[#00110a]"
                  />
                </div>
              </div>

              {/* Interactive Calculator Card */}
              <div className="lg:col-span-6 p-6 sm:p-7 rounded-3xl bg-white border border-[#d2e0d7] shadow-xs space-y-6">
                <div className="flex items-center justify-between pb-3 border-b border-[#e1eae3]">
                  <h3 className="font-display text-base font-bold text-[#00110a]">
                    Projected Monthly Royalty
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold">
                    Instant Bank Transfer
                  </span>
                </div>

                {/* Slider 1: Uploads */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-[#3f4d45]">Course Summaries Uploaded</span>
                    <span className="font-mono text-[#155e3e]">{uploadsEstimate} materials</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="20"
                    value={uploadsEstimate}
                    onChange={(e) => setUploadsEstimate(parseInt(e.target.value, 10))}
                    className="w-full accent-[#155e3e] cursor-pointer"
                  />
                </div>

                {/* Slider 2: Monthly Reads */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-[#3f4d45]">Estimated Monthly Student Reads</span>
                    <span className="font-mono text-[#155e3e]">{readsEstimate} reads</span>
                  </div>
                  <input
                    type="range"
                    min="20"
                    max="1000"
                    step="10"
                    value={readsEstimate}
                    onChange={(e) => setReadsEstimate(parseInt(e.target.value, 10))}
                    className="w-full accent-[#155e3e] cursor-pointer"
                  />
                </div>

                {/* Result Display */}
                <div className="p-4 rounded-2xl bg-[#edf6f0] border border-[#d6e3db] flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#526359]">
                      Estimated Payout
                    </span>
                    <div className="font-display text-2xl sm:text-3xl font-extrabold text-[#155e3e]">
                      {formatNaira(estimatedNaira)}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-[#526359] block">Total Points</span>
                    <span className="font-mono font-bold text-xs text-[#00110a]">
                      +{estimatedPoints.toLocaleString()} {POINTS_NAME}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* FAQ SECTION */}
        {/* ========================================================= */}
        <section id="faq" className="py-20 sm:py-24 border-b border-[#e1eae3] bg-white">
          <div className="mx-auto max-w-3xl px-4 sm:px-6">
            <div className="text-center mb-12">
              <span className="text-xs font-semibold text-[#155e3e] uppercase tracking-wider">
                Got Questions?
              </span>
              <h2 className="mt-2 font-display text-3xl font-bold text-[#00110a]">
                Frequently Asked Questions
              </h2>
            </div>

            <div className="divide-y divide-[#e1eae3] rounded-3xl border border-[#d2e0d7] bg-[#f3fbf6] overflow-hidden shadow-xs">
              {FAQ.map(([q, a]) => (
                <details key={q} className="group p-5">
                  <summary className="cursor-pointer list-none font-semibold text-xs sm:text-sm text-[#00110a] flex items-center justify-between">
                    <span>{q}</span>
                    <span className="text-[#155e3e] font-bold text-base transition-transform group-open:rotate-45">
                      +
                    </span>
                  </summary>
                  <p className="mt-2.5 text-xs text-[#526359] leading-relaxed">{a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* BOTTOM CALL TO ACTION BANNER */}
        {/* ========================================================= */}
        <section className="bg-[#0d281e] text-white py-20 relative overflow-hidden">
          <div className="relative mx-auto max-w-4xl px-4 text-center sm:px-6 flex flex-col items-center">
            <div className="p-3.5 rounded-2xl bg-white shadow-xl mb-5 flex items-center justify-center">
              <SyllabossEmblem className="size-12" />
            </div>
            <h2 className="font-display text-3xl sm:text-5xl font-bold tracking-tight">
              Ready to Study With Direction?
            </h2>
            <p className="mt-3.5 text-sm sm:text-base text-[#cbe2d4] max-w-lg leading-relaxed">
              Download the Syllaboss app to your phone or laptop now and access verified lecture
              summaries, past questions and Boss AI tutor.
            </p>
            <div className="mt-9 flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
              <InstallButton
                size="lg"
                label="Install on iPhone / iPad"
                className="w-full sm:w-auto rounded-full bg-[#cbe2d4] text-[#0d281e] hover:bg-white text-sm font-bold px-8 h-12.5 shadow-md"
              />
              <Button
                asChild
                variant="outline"
                size="lg"
                className="w-full sm:w-auto rounded-full border-white/20 bg-white/10 hover:bg-white/20 text-white text-sm font-semibold px-6 h-12.5"
              >
                <Link to="/auth" search={{ mode: "signin" }}>
                  Sign In to Web
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      {/* ========================================================= */}
      {/* FOOTER */}
      {/* ========================================================= */}
      <footer className="border-t border-[#e1eae3] bg-white py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 grid-cols-2 md:grid-cols-4 mb-12">
            <div className="col-span-2 md:col-span-1 space-y-3">
              <SyllabossLogo />
              <p className="text-xs text-[#526359] leading-relaxed">
                The premier verified study and courseware repository for Nigerian university students, benchmarked against NUC CCMAS academic standards.
              </p>
            </div>

            <div className="space-y-2.5">
              <span className="text-xs font-bold uppercase tracking-wider text-[#00110a]">Academics</span>
              <ul className="space-y-2 text-xs text-[#526359]">
                <li>
                  <Link to="/curriculum" className="hover:text-[#00110a] transition-colors">
                    NUC CCMAS Curriculum
                  </Link>
                </li>
                <li>
                  <Link to="/materials" className="hover:text-[#00110a] transition-colors">
                    Lecture Notes &amp; Past Questions
                  </Link>
                </li>
                <li>
                  <a href="#calculator" className="hover:text-[#00110a] transition-colors">
                    SyllaPoints Rewards
                  </a>
                </li>
                <li>
                  <a href="#downloads" className="hover:text-[#00110a] transition-colors">
                    Multi-Platform Downloads
                  </a>
                </li>
              </ul>
            </div>

            <div className="space-y-2.5">
              <span className="text-xs font-bold uppercase tracking-wider text-[#00110a]">Platform</span>
              <ul className="space-y-2 text-xs text-[#526359]">
                <li>
                  <Link to="/about" className="hover:text-[#00110a] transition-colors">
                    About Syllaboss
                  </Link>
                </li>
                <li>
                  <Link to="/contact" className="hover:text-[#00110a] transition-colors">
                    Contact Us &amp; Support
                  </Link>
                </li>
                <li>
                  <a href="#faq" className="hover:text-[#00110a] transition-colors">
                    Frequently Asked Questions
                  </a>
                </li>
                <li>
                  <a href="https://web.syllaboss.org/dashboard" className="hover:text-[#00110a] transition-colors font-semibold text-[#155e3e]">
                    Syllaboss Web App
                  </a>
                </li>
              </ul>
            </div>

            <div className="space-y-2.5">
              <span className="text-xs font-bold uppercase tracking-wider text-[#00110a]">Legal &amp; Compliance</span>
              <ul className="space-y-2 text-xs text-[#526359]">
                <li>
                  <Link to="/privacy" className="hover:text-[#00110a] transition-colors font-medium">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link to="/terms" className="hover:text-[#00110a] transition-colors font-medium">
                    Terms of Service
                  </Link>
                </li>
                <li>
                  <Link to="/privacy" className="hover:text-[#00110a] transition-colors">
                    Cookie &amp; AdSense Disclosures
                  </Link>
                </li>
                <li>
                  <Link to="/terms" className="hover:text-[#00110a] transition-colors">
                    Academic Integrity Guidelines
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-[#e1eae3] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#526359]">
            <p>© 2026 Syllaboss Technologies Ltd. All rights reserved. Study with direction.</p>
            <div className="flex gap-4">
              <Link to="/privacy" className="hover:text-[#00110a]">Privacy</Link>
              <span>·</span>
              <Link to="/terms" className="hover:text-[#00110a]">Terms</Link>
              <span>·</span>
              <Link to="/contact" className="hover:text-[#00110a]">Contact</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
