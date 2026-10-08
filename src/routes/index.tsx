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
      { title: "Syllaboss — The Smart Campus Study & Syllabus App" },
      {
        name: "description",
        content:
          "Download Syllaboss for Android (.APK), Windows (.EXE), or Apple iOS. Verified past questions, course summaries, Boss AI, and cashable student rewards.",
      },
      { property: "og:title", content: "Syllaboss — Study With Direction" },
      {
        property: "og:description",
        content:
          "Vetted Nigerian university lecture notes, past exams, and AI study companion. Available on all devices.",
      },
      { property: "og:type", content: "website" },
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
  const [uploadsEstimate, setUploadsEstimate] = useState(6);
  const [readsEstimate, setReadsEstimate] = useState(150);
  const { user } = useAuth();
  const navigate = useNavigate();

  // Calculate estimated earnings in Naira
  const estimatedPoints =
    uploadsEstimate * POINTS_PER_VERIFIED_UPLOAD +
    readsEstimate * (POINTS_PER_VIEW + POINTS_PER_DOWNLOAD);
  const estimatedNaira = Math.round(estimatedPoints / POINTS_PER_NAIRA);

  // Detect standalone installed mode
  useEffect(() => {
    if (typeof window !== "undefined") {
      const standalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        (navigator as unknown as { standalone?: boolean }).standalone === true ||
        window.location.search.includes("mode=pwa");
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
    <div className="min-h-screen overflow-x-hidden bg-[#f6faf7] text-[#00110a] font-sans selection:bg-[#1b7a4e]/20 selection:text-[#0b3321]">
      {/* Top Header */}
      <header className="sticky top-0 z-40 border-b border-[#e1eae3] bg-[#f6faf7]/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <SyllabossLogo />

          <nav className="hidden items-center gap-7 text-xs font-semibold text-[#526359] md:flex">
            <a href="#downloads" className="hover:text-[#00110a] transition-colors">
              Download App
            </a>
            <a href="#features" className="hover:text-[#00110a] transition-colors">
              Study Features
            </a>
            <a href="#calculator" className="hover:text-[#00110a] transition-colors">
              Earn SyllaPoints
            </a>
            <a href="#faq" className="hover:text-[#00110a] transition-colors">
              FAQ
            </a>
          </nav>

          <div className="flex items-center gap-2.5">
            <InstallButton
              showDropdown
              variant="default"
              size="sm"
              className="rounded-full bg-[#0d281e] text-white hover:bg-[#00110a] text-xs h-9 px-4 font-semibold shadow-xs"
            />
            {user ? (
              <Button
                asChild
                size="sm"
                variant="outline"
                className="rounded-full text-xs h-9 border-[#d6e3db] bg-white hover:bg-[#edf6f0]"
              >
                <Link to="/dashboard">Dashboard</Link>
              </Button>
            ) : (
              <Button
                asChild
                size="sm"
                variant="ghost"
                className="rounded-full text-xs h-9 text-[#375a4a] hover:text-[#00110a] hover:bg-[#e7f2eb]"
              >
                <Link to="/auth" search={{ mode: "signin" }}>
                  Log In
                </Link>
              </Button>
            )}
          </div>
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <section className="relative pt-14 pb-20 sm:pt-20 sm:pb-28 border-b border-[#e1eae3] overflow-hidden">
          {/* Subtle Ambient Glows */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[720px] h-[360px] bg-gradient-to-b from-[#1b7a4e]/10 to-transparent blur-3xl opacity-70"
          />

          <div className="relative mx-auto max-w-5xl px-4 text-center sm:px-6">
            {/* Pill Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-[#d6e3db] shadow-2xs text-[#155e3e] text-xs font-semibold mb-6 animate-fade-in">
              <Sparkles className="size-3.5 text-[#155e3e]" />
              <span>Available for Android (.APK), Windows PC (.EXE) & iOS</span>
            </div>

            {/* Main Headline */}
            <h1 className="font-display text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-[#00110a] leading-[1.08]">
              The Pocket Study App <br />
              <span className="font-normal text-[#155e3e] italic">
                Built for Your Campus.
              </span>
            </h1>

            {/* Sub-headline */}
            <p className="mx-auto mt-6 max-w-2xl text-base sm:text-lg text-[#3f4d45] leading-relaxed">
              Find verified lecture summaries, past questions, and marking guides tailored
              to your university syllabus. Prepare effortlessly with <strong>Boss AI</strong>,
              and earn cashable <strong>SyllaPoints</strong> every time classmates study your uploads.
            </p>

            {/* Primary Action Buttons */}
            <div className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-3.5">
              <InstallButton
                size="lg"
                className="w-full sm:w-auto h-12.5 rounded-full bg-[#0d281e] hover:bg-[#00110a] text-white text-sm sm:text-base font-bold px-8 shadow-sm transition-all hover:scale-[1.01]"
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
            <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-xs text-[#526359]">
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

            {/* Ultra-Lifelike Flagship iPhone 16 Pro Showcase */}
            <div className="mt-14 mx-auto max-w-sm sm:max-w-md relative flex justify-center">
              {/* Vibrant Ambient Glow Backdrop */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 -top-10 bg-gradient-to-b from-[#1b7a4e]/25 via-[#155e3e]/15 to-transparent blur-3xl rounded-full scale-125"
              />

              {/* iPhone 16 Pro Precision Titanium Chassis */}
              <div className="relative w-[360px] sm:w-[385px] h-[780px] sm:h-[824px] rounded-[54px] sm:rounded-[58px] p-3 sm:p-3.5 bg-gradient-to-b from-[#262f29] via-[#141a16] to-[#0a0f0c] shadow-[0_30px_90px_-20px_rgba(0,17,10,0.55),0_0_0_1px_rgba(255,255,255,0.18),0_0_0_7px_#121714,0_0_0_8px_rgba(255,255,255,0.06)] border border-white/10 flex flex-col">
                {/* Physical Hardware Controls (Left Side) */}
                {/* Action Button */}
                <div className="absolute -left-2 top-24 w-1 h-7 bg-[#242d27] rounded-l-md shadow-xs border-l border-white/10" />
                {/* Volume Up */}
                <div className="absolute -left-2 top-35 w-1 h-13 bg-[#242d27] rounded-l-md shadow-xs border-l border-white/10" />
                {/* Volume Down */}
                <div className="absolute -left-2 top-51 w-1 h-13 bg-[#242d27] rounded-l-md shadow-xs border-l border-white/10" />

                {/* Physical Hardware Controls (Right Side) */}
                {/* Side / Power Button */}
                <div className="absolute -right-2 top-32 w-1 h-18 bg-[#242d27] rounded-r-md shadow-xs border-r border-white/10" />
                {/* Camera Control Capacitive Slider */}
                <div className="absolute -right-2 top-56 w-1 h-15 bg-[#1b221d] rounded-r-md shadow-xs border-r border-white/15" />

                {/* iPhone Screen Glass Frame */}
                <div className="relative flex-1 rounded-[44px] sm:rounded-[48px] bg-[#f7f2e6] overflow-hidden border border-black/40 shadow-inner flex flex-col text-left select-none">
                  {/* Specular Diagonal Light Glare on Glass */}
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute -inset-full bg-gradient-to-tr from-transparent via-white/[0.04] to-white/[0.14] rotate-12 z-40"
                  />

                  {/* iOS Status Bar with Dynamic Island */}
                  <div className="relative pt-3 px-6 pb-2 flex items-center justify-between text-[11.5px] font-semibold text-[#1c2a22] z-30 shrink-0 bg-[#f7f2e6]/95 backdrop-blur-sm border-b border-[#ebdcca]/50">
                    <span className="font-semibold tracking-tight">9:41</span>

                    {/* Interactive Dynamic Island */}
                    <div className="absolute left-1/2 -translate-x-1/2 top-2.5 h-6.5 w-29 bg-black rounded-full flex items-center justify-between px-2.5 shadow-md">
                      {/* TrueDepth Front Camera with deep reflection */}
                      <div className="size-2.5 rounded-full bg-[#0d1611] ring-1 ring-[#223328]/60 flex items-center justify-center">
                        <div className="size-1 rounded-full bg-[#1b7a4e]/40" />
                      </div>
                      {/* Live Study Activity Micro Waveform */}
                      <div className="flex items-center gap-0.5 opacity-90">
                        <span className="w-0.5 h-2 bg-emerald-400 rounded-full animate-pulse" />
                        <span className="w-0.5 h-3 bg-emerald-400 rounded-full animate-pulse delay-75" />
                        <span className="w-0.5 h-1.5 bg-emerald-400 rounded-full animate-pulse delay-150" />
                      </div>
                      {/* Ambient Light Sensor */}
                      <div className="size-2 rounded-full bg-[#070b09]" />
                    </div>

                    {/* Status Icons: Cellular, Wi-Fi, Battery */}
                    <div className="flex items-center gap-1.5 opacity-90">
                      <span className="text-[10px] font-bold">5G</span>
                      <svg className="w-3.5 h-3 fill-current" viewBox="0 0 16 12">
                        <rect x="0" y="8" width="2.5" height="4" rx="0.5" />
                        <rect x="4" y="5.5" width="2.5" height="6.5" rx="0.5" />
                        <rect x="8" y="3" width="2.5" height="9" rx="0.5" />
                        <rect x="12" y="0.5" width="2.5" height="11.5" rx="0.5" />
                      </svg>
                      {/* Battery Capsule with 96% Fill */}
                      <div className="w-5.5 h-2.5 rounded-sm border border-current p-0.5 flex items-center">
                        <div className="w-[92%] h-full bg-[#155e3e] rounded-2xs" />
                      </div>
                    </div>
                  </div>

                  {/* Top App Header */}
                  <div className="px-4 py-2 flex items-center justify-between border-b border-[#e5ded0] bg-white/70 backdrop-blur-xs shrink-0 z-20">
                    <div className="flex items-center gap-2">
                      <SyllabossEmblem className="size-7" />
                      <div>
                        <span className="font-headline font-bold text-sm tracking-tight text-[#00110a] block leading-none">
                          Syllaboss
                        </span>
                        <span className="text-[9.5px] font-medium text-[#526359] block mt-0.5">
                          UNILAG • 300L Comp Sci
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* SyllaPoints Live Balance Chip */}
                      <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-900 text-[11px] font-bold shadow-2xs">
                        <Coins className="size-3 text-emerald-700" />
                        <span>2,450 pts</span>
                      </div>
                      <div className="size-7 rounded-full bg-white border border-[#d8d0c0] flex items-center justify-center text-[#526359] shadow-2xs">
                        <Bell className="size-3.5" />
                      </div>
                    </div>
                  </div>

                  {/* Scrollable Authentic App Content Body */}
                  <div className="flex-1 overflow-y-auto px-3.5 py-2.5 space-y-2.5 font-sans [&::-webkit-scrollbar]:hidden">
                    {/* Welcome Banner Card */}
                    <div className="p-3 rounded-2xl bg-gradient-to-br from-white to-[#f0f6f2] border border-[#d9e5dc] shadow-2xs">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xs font-bold text-[#00110a] flex items-center gap-1.5">
                          <span>Good morning, David</span>
                          <span className="text-[11px]">👋</span>
                        </h3>
                        <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[9.5px] font-bold uppercase tracking-wider border border-amber-200">
                          ✦ SyllaPlus (1.3x)
                        </span>
                      </div>
                      <p className="text-[10px] text-[#526359] mt-0.5">
                        First Semester 2025/2026 • 6 Courses Enrolled
                      </p>
                    </div>

                    {/* Boss AI Instant Search / Prompt Bar */}
                    <div className="relative">
                      <div className="h-9 w-full rounded-xl bg-white border border-[#ded5c4] shadow-2xs flex items-center px-2.5 gap-2 text-[#526359]">
                        <Search className="size-3.5 text-[#155e3e]" />
                        <span className="text-[10.5px] text-[#6b7d72] truncate">
                          Search courses, past questions, or ask Boss AI...
                        </span>
                        <div className="ml-auto size-5 rounded-md bg-[#edf6f0] text-[#155e3e] flex items-center justify-center">
                          <Bot className="size-3" />
                        </div>
                      </div>
                    </div>

                    {/* Active Course Card (Operating Systems) */}
                    <div className="p-3 rounded-2xl bg-white border border-[#ded5c4] shadow-2xs space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[9.5px] font-bold uppercase tracking-wider text-[#155e3e] flex items-center gap-1">
                          <CheckCircle2 className="size-3 text-[#155e3e]" />
                          Current Active Course
                        </span>
                        <span className="text-[10px] font-mono font-bold text-[#155e3e] bg-[#edf6f0] px-1.5 py-0.5 rounded">
                          CSC 301
                        </span>
                      </div>
                      <div>
                        <h4 className="text-[11.5px] font-bold text-[#00110a] leading-tight">
                          Operating Systems & Concurrency
                        </h4>
                        <p className="text-[9.5px] text-[#526359] mt-0.5">
                          Lecturer: Dr. Adeyemi • 14 Summaries • 8 Past Questions
                        </p>
                      </div>
                      <div className="space-y-1 pt-0.5">
                        <div className="w-full bg-[#e8e1d3] h-1.5 rounded-full overflow-hidden">
                          <div className="bg-gradient-to-r from-[#155e3e] to-[#259b66] h-full w-[84%] rounded-full" />
                        </div>
                        <div className="flex items-center justify-between text-[9.5px] text-[#526359]">
                          <span>Verified Syllabus Progress</span>
                          <span className="font-bold text-[#155e3e]">84% Completed</span>
                        </div>
                      </div>
                      <div className="pt-1 flex items-center justify-between border-t border-[#f0ebd9]">
                        <span className="text-[9.5px] font-semibold text-[#00110a] flex items-center gap-1">
                          <Flame className="size-3 text-orange-500" /> Exam in 18 Days
                        </span>
                        <span className="text-[9.5px] font-bold text-[#155e3e] bg-[#edf6f0] px-2 py-0.5 rounded-full">
                          Continue Study →
                        </span>
                      </div>
                    </div>

                    {/* Boss AI Exam Radar Card */}
                    <div className="p-3 rounded-2xl bg-[#f0f7f3] border border-[#cbe4d4] space-y-2 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <div className="size-5.5 rounded-lg bg-[#155e3e] text-white flex items-center justify-center">
                            <Bot className="size-3.5" />
                          </div>
                          <div>
                            <span className="text-[11px] font-bold text-[#00110a] block leading-none">
                              Boss AI Exam Radar
                            </span>
                            <span className="text-[9px] text-[#155e3e] font-semibold">
                              3 High-Yield Topics Detected
                            </span>
                          </div>
                        </div>
                        <span className="text-[9px] bg-[#d7ece0] text-[#114b32] px-1.5 py-0.5 rounded font-bold">
                          98% Match
                        </span>
                      </div>
                      <div className="p-2 rounded-xl bg-white/95 border border-[#d6e9dc] text-[10px] text-[#2c3d33] leading-snug space-y-1">
                        <p className="font-bold text-[#00110a]">
                          "Predicted Theory Questions (2019–2024 Analysis):"
                        </p>
                        <p className="text-[9px] text-[#44574c] leading-tight">
                          1. Round-Robin vs Multi-Level Feedback Queue scheduling (4 appearances)
                          <br />
                          2. Banker's Algorithm for deadlock avoidance (3 appearances)
                        </p>
                      </div>
                    </div>

                    {/* Quick Course Grid */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-2.5 rounded-xl bg-white border border-[#ded5c4] shadow-2xs space-y-1">
                        <span className="text-[9px] font-mono font-bold text-[#155e3e] bg-[#edf6f0] px-1.5 py-0.5 rounded">
                          GST 111
                        </span>
                        <h5 className="text-[10px] font-bold text-[#00110a] leading-tight">
                          Syntax & Morphology
                        </h5>
                        <p className="text-[8.5px] text-[#526359]">12 Summaries • Verified</p>
                      </div>

                      <div className="p-2.5 rounded-xl bg-white border border-[#ded5c4] shadow-2xs space-y-1">
                        <span className="text-[9px] font-mono font-bold text-[#1f66a8] bg-[#edf3f8] px-1.5 py-0.5 rounded">
                          MTH 101
                        </span>
                        <h5 className="text-[10px] font-bold text-[#00110a] leading-tight">
                          Calculus & Vectors
                        </h5>
                        <p className="text-[8.5px] text-[#526359]">24 Past Questions</p>
                      </div>
                    </div>

                    {/* Earnings Micro-Card */}
                    <div className="p-2.5 rounded-xl bg-gradient-to-r from-emerald-800 to-teal-900 text-white flex items-center justify-between shadow-xs">
                      <div className="flex items-center gap-1.5">
                        <Coins className="size-3.5 text-amber-300" />
                        <div>
                          <span className="text-[9.5px] font-bold block leading-none">
                            +150 SyllaPoints Earned Today
                          </span>
                          <span className="text-[8px] text-emerald-200 block mt-0.5">
                            3 classmates downloaded your CSC 301 note
                          </span>
                        </div>
                      </div>
                      <span className="text-[9px] bg-white/20 px-2 py-0.5 rounded font-mono font-bold">
                        Cashout ₦
                      </span>
                    </div>
                  </div>

                  {/* Authentic App Bottom Navigation Bar */}
                  <div className="px-3 pt-2 pb-1.5 bg-white border-t border-[#e2d9c9] flex items-center justify-around shrink-0 z-20">
                    <div className="flex flex-col items-center gap-0.5 text-[#155e3e]">
                      <Home className="size-4" />
                      <span className="text-[9px] font-bold">Home</span>
                    </div>
                    <div className="flex flex-col items-center gap-0.5 text-[#6b7d72]">
                      <BookOpen className="size-4" />
                      <span className="text-[9px] font-medium">Library</span>
                    </div>
                    <div className="flex flex-col items-center gap-0.5 text-[#155e3e] relative -top-1">
                      <div className="size-7 rounded-full bg-[#155e3e] text-white flex items-center justify-center shadow-xs">
                        <Bot className="size-4" />
                      </div>
                      <span className="text-[9px] font-bold text-[#155e3e]">Boss AI</span>
                    </div>
                    <div className="flex flex-col items-center gap-0.5 text-[#6b7d72]">
                      <Trophy className="size-4" />
                      <span className="text-[9px] font-medium">Rankings</span>
                    </div>
                    <div className="flex flex-col items-center gap-0.5 text-[#6b7d72]">
                      <Wallet className="size-4" />
                      <span className="text-[9px] font-medium">Wallet</span>
                    </div>
                  </div>

                  {/* iOS Home Indicator Bar */}
                  <div className="pb-2 pt-1 bg-white flex justify-center shrink-0">
                    <div className="w-32 h-1 bg-black/40 rounded-full" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Dedicated Multi-Device Download Hub */}
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

            {/* 3-Column Hero Device Cards */}
            <div className="grid gap-6 md:grid-cols-3 max-w-5xl mx-auto">
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
                    Android Phone & Tablet
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
                      <span>Instant 1-tap download & install</span>
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
                    Windows 10 & 11 PC
                  </h3>
                  <p className="text-xs text-[#526359] mt-1">
                    Standalone 64-bit desktop application for laptops & PCs.
                  </p>

                  <ul className="mt-5 space-y-2 text-xs text-[#3f4d45]">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="size-4 text-[#1f66a8] shrink-0" />
                      <span>Generates Desktop & Start Menu shortcuts</span>
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
                    iPhone & iPad (iOS)
                  </h3>
                  <p className="text-xs text-[#526359] mt-1">
                    Direct Safari Home Screen install. Zero Apple App Store needed.
                  </p>

                  <ul className="mt-5 space-y-2 text-xs text-[#3f4d45]">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="size-4 text-[#00110a] shrink-0" />
                      <span>Opens in Safari & tap Share button</span>
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
            </div>
          </div>
        </section>

        {/* Feature Grid: The 3 Pillars */}
        <section id="features" className="py-20 sm:py-24 border-b border-[#e1eae3]">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-14">
              <span className="text-xs font-semibold text-[#155e3e] uppercase tracking-wider">
                Why Students Excel With Syllaboss
              </span>
              <h2 className="mt-2 font-display text-3xl sm:text-4xl font-bold text-[#00110a]">
                Everything You Need to Pass Your Semester
              </h2>
              <p className="mt-3 text-sm text-[#3f4d45]">
                No more frantic searches across WhatsApp groups the night before an examination.
              </p>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[
                [
                  FileSearch,
                  "Verified Course Notes & Past Questions",
                  "Vetted lecture notes, solved past examination questions, and marking schemes organized cleanly by university, department, and course code.",
                ],
                [
                  Bot,
                  "Boss AI Examination Companion",
                  "Chat directly with lengthy PDF slides, generate chapter summaries, quiz yourself with active recall cards, and solve calculation steps.",
                ],
                [
                  Coins,
                  "Cashable Student SyllaPoints",
                  "Earn points on sign up, reading notes, and every time classmates study materials you upload. Cash out straight to your Nigerian bank account.",
                ],
                [
                  ShieldCheck,
                  "Automated Quality Verification",
                  "Every uploaded document is automatically audited against your course curriculum to guarantee clear text, correct chapters, and zero spam.",
                ],
                [
                  Wallet,
                  "Instant Direct Bank Transfers",
                  `Withdraw your earned royalties anytime your balance hits ${formatNaira(MINIMUM_WITHDRAWAL_NAIRA)}. Instant payouts to Kuda, OPay, GTB, Zenith, and all Nigerian banks.`,
                ],
                [
                  GraduationCap,
                  "Campus Syllabus Alignment",
                  "Track topic-by-topic syllabus coverage before examination week so you know exactly what topics have been taught and what will be tested.",
                ],
              ].map(([Icon, title, desc]) => {
                const I = Icon as typeof FileSearch;
                return (
                  <div
                    key={String(title)}
                    className="p-6 rounded-3xl bg-white border border-[#d2e0d7] shadow-2xs hover:border-[#155e3e] transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="size-11 rounded-2xl bg-[#edf6f0] flex items-center justify-center text-[#155e3e] mb-4">
                        <I className="size-5.5" />
                      </div>
                      <h3 className="font-display text-lg font-bold text-[#00110a]">
                        {String(title)}
                      </h3>
                      <p className="mt-2 text-xs text-[#526359] leading-relaxed">
                        {String(desc)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Interactive Earnings Simulator */}
        <section id="calculator" className="py-20 sm:py-24 bg-white border-b border-[#e1eae3]">
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
              <div className="lg:col-span-6 p-6 sm:p-7 rounded-3xl bg-[#f6faf7] border border-[#d2e0d7] shadow-xs space-y-6">
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
                <div className="p-4 rounded-2xl bg-white border border-[#d6e3db] flex items-center justify-between">
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

        {/* FAQ Section */}
        <section id="faq" className="py-20 sm:py-24 border-b border-[#e1eae3]">
          <div className="mx-auto max-w-3xl px-4 sm:px-6">
            <div className="text-center mb-12">
              <span className="text-xs font-semibold text-[#155e3e] uppercase tracking-wider">
                Got Questions?
              </span>
              <h2 className="mt-2 font-display text-3xl font-bold text-[#00110a]">
                Frequently Asked Questions
              </h2>
            </div>

            <div className="divide-y divide-[#e1eae3] rounded-3xl border border-[#d2e0d7] bg-white overflow-hidden shadow-xs">
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

        {/* Bottom Banner */}
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
              summaries and past exam solutions.
            </p>
            <div className="mt-9 flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
              <InstallButton
                size="lg"
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

      {/* Footer */}
      <footer className="border-t border-[#e1eae3] bg-[#f6faf7] py-9">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <SyllabossLogo />
          <p className="text-xs text-[#526359]">
            © 2026 Syllaboss Technologies. Study with direction.
          </p>
        </div>
      </footer>
    </div>
  );
}
