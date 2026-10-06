import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowRight,
  Bot,
  CheckCircle2,
  Coins,
  Download,
  FileSearch,
  Laptop,
  Menu,
  ShieldCheck,
  Smartphone,
  Tablet,
  Upload,
  Wallet,
  X,
  Sparkles,
  Monitor,
  Terminal,
} from "lucide-react";
import { useState, useEffect } from "react";

import { InstallButton } from "@/components/install-button";
import { AppWelcomeGate } from "@/components/app-welcome-gate";
import { SyllabossLogo, SyllabossEmblem } from "@/components/syllaboss-logo";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { turso } from "@/integrations/turso/client";
import {
  courseOptions,
  formatNaira,
  institutionOptions,
  POINTS_NAME,
  POINTS_PER_NAIRA,
  MINIMUM_WITHDRAWAL_NAIRA,
  POINTS_PER_VERIFIED_UPLOAD,
  POINTS_PER_DOWNLOAD,
  POINTS_PER_VIEW,
  POINTS_PER_30_MIN_STUDY,
  POINTS_REGISTRATION_BONUS,
  POINTS_INSTALL_APP_BONUS,
  pointsToNaira,
} from "@/lib/constants";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Syllaboss App — The Pocket Study & Syllabus App for Students" },
      { name: "description", content: "Download the Syllaboss app to your iPhone, Android, MacBook, or Windows. Verified past questions, notes, and AI study companion." },
      { property: "og:title", content: "Syllaboss App — Study with direction" },
      { property: "og:description", content: "Install Syllaboss on iPhone, Android, Mac, or Windows. Verified course notes & Boss AI." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HomePage,
});

const DEVICES = [
  { name: "Android", icon: Smartphone, desc: "Fast 1-Tap App Install" },
  { name: "Windows PC", icon: Monitor, desc: "Standalone Desktop App" },
  { name: "iPhone & iPad", icon: Smartphone, desc: "Home Screen App · Safari" },
  { name: "MacBook", icon: Laptop, desc: "macOS Dock & Desktop App" },
  { name: "Linux", icon: Terminal, desc: "Desktop Browser App" },
];

const FAQ = [
  ["Is the Syllaboss app free?", "Yes. Installing the app, searching verified materials, and studying is 100% free."],
  ["Is Syllaboss on the Google Play Store or Apple App Store?", "No app store required! You can install Syllaboss directly on Android, Windows PC, MacBook, or iPhone in 1 tap."],
  ["How do I install the app on Android?", "Tap 'Install for Android' and confirm Install. Syllaboss will be added directly to your app drawer and home screen instantly!"],
  ["How do I install on Windows?", "Tap 'Install for Windows PC' and confirm Install in Edge or Chrome. Syllaboss runs in its own window as a desktop app."],
  ["How do I install the app on my iPhone or iPad?", "Open Syllaboss in Safari, tap the Share icon at the bottom, and select 'Add to Home Screen'. The Syllaboss icon will appear right with your other apps!"],
  ["Can I install it on my MacBook or Linux laptop?", "Yes! On Mac, click File -> Add to Dock in Safari or Install in Chrome. On Linux, click Install in Chrome, Brave, or Edge."],
  ["How do SyllaPoints work?", `You get ${POINTS_REGISTRATION_BONUS} points on sign up, ${POINTS_INSTALL_APP_BONUS} points when you install the app, ${POINTS_PER_VERIFIED_UPLOAD} points per verified notes upload, and ${POINTS_PER_30_MIN_STUDY} points every 30 minutes you study. Points convert to Naira and can be withdrawn directly to your Nigerian bank!`],
];

function HomePage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

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

  // When launched inside the installed app without a session: show pure native App Welcome screen!
  if (isStandalone && !user) {
    return <AppWelcomeGate />;
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#f3fbf6] text-[#00110a] font-sans">
      {/* Top Header */}
      <header className="sticky top-0 z-40 border-b border-[#dce5df] bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <SyllabossLogo />

          <nav className="hidden items-center gap-6 text-xs font-semibold text-[#5a6660] md:flex">
            <a href="#devices" className="hover:text-[#00110a] transition-colors">Supported Devices</a>
            <a href="#features" className="hover:text-[#00110a] transition-colors">Features</a>
            <a href="#earn" className="hover:text-[#00110a] transition-colors">Rewards</a>
            <a href="#faq" className="hover:text-[#00110a] transition-colors">FAQ</a>
          </nav>

          <div className="flex items-center gap-3">
            <InstallButton
              showDropdown
              variant="default"
              size="sm"
              className="rounded-full bg-[#0d281e] text-white hover:bg-[#00110a] text-xs h-9 px-4 font-semibold shadow-xs"
            />
            {user ? (
              <Button asChild size="sm" variant="outline" className="rounded-full text-xs h-9 border-[#dce5df]">
                <Link to="/dashboard">Dashboard</Link>
              </Button>
            ) : (
              <Button asChild size="sm" variant="ghost" className="rounded-full text-xs h-9 text-[#446557] hover:text-[#00110a]">
                <Link to="/auth" search={{ mode: "signin" }}>Log In</Link>
              </Button>
            )}
          </div>
        </div>
      </header>

      <main>
        {/* Hero Section: Pure App Showcase */}
        <section className="relative pt-16 pb-20 sm:pt-24 sm:pb-28 border-b border-[#dce5df]">
          <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#edf6f0] border border-[#dce5df] text-[#1b7a4e] text-xs font-semibold mb-6">
              <Sparkles className="size-3.5" />
              <span>Available on all devices · Android, iOS, Windows & Mac</span>
            </div>

            <h1 className="font-display text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-[#00110a] leading-[1.1]">
              The Pocket Study App <br />
              <span className="font-normal text-[#1b7a4e] italic">Built for Your Campus.</span>
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-base sm:text-lg text-[#424844] leading-relaxed">
              Find verified course lecture notes, past questions, and summaries tailored to your university.
              Study with Boss AI and earn SyllaPoints every time peers read your uploads.
            </p>

            {/* Primary Action: Big Legible Install CTA */}
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3.5">
              <InstallButton
                showDropdown
                size="lg"
                className="w-full sm:w-auto h-13 rounded-full bg-[#0d281e] hover:bg-[#00110a] text-white text-base font-bold px-8 shadow-md"
              />
              <Button
                asChild
                variant="outline"
                size="lg"
                className="w-full sm:w-auto h-13 rounded-full border-[#dce5df] bg-white hover:bg-[#edf6f0] text-[#00110a] text-sm font-semibold px-6 shadow-2xs"
              >
                <Link to="/auth" search={{ mode: "signin" }}>
                  Already have the app? Sign In <ArrowRight className="size-4 ml-1.5" />
                </Link>
              </Button>
            </div>

            <p className="mt-4 text-xs text-[#5a6660]">
              Available on all devices · Instant 1-tap installation · No app store needed
            </p>

            {/* Supported Devices Badges */}
            <div id="devices" className="mt-14 pt-8 border-t border-[#dce5df]/80">
              <p className="text-xs font-semibold text-[#5a6660] uppercase tracking-wider mb-4">
                Compatible with all student devices
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3">
                {DEVICES.map((dev) => (
                  <div
                    key={dev.name}
                    className="flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-white border border-[#dce5df] shadow-xs"
                  >
                    <dev.icon className="size-4 text-[#1b7a4e]" />
                    <div className="flex flex-col text-left">
                      <span className="text-xs font-bold text-[#00110a]">{dev.name}</span>
                      <span className="text-[10px] text-[#5a6660] font-mono">{dev.desc}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Feature Grid */}
        <section id="features" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-xs font-semibold text-[#1b7a4e] uppercase tracking-wider">
              Everything in One App
            </span>
            <h2 className="mt-2 font-display text-3xl sm:text-4xl font-bold text-[#00110a]">
              Made for How Students Actually Study
            </h2>
            <p className="mt-3 text-sm text-[#424844]">
              Everything you need to prepare for semester examinations, without the stress.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              [FileSearch, "Verified Past Questions & Notes", "Access vetted lecture notes, past questions, and marking guides for your specific course and institution."],
              [Bot, "Boss AI Study Companion", "Chat with documents, summarize lengthy chapters, generate flashcards, and test yourself with mock theory and objective questions."],
              [Coins, "Cashable SyllaPoints", "Earn points when you install the app, study for 30 minutes, or upload lecture notes. Cash out directly to your Nigerian bank."],
              [Smartphone, "Native Home Screen App", "Tap the app icon right from your home screen for instant access. Works offline and loads at lightning speed."],
              [ShieldCheck, "Automated Verification", "Uploaded documents are checked for authenticity so you only study with relevant, verified materials."],
              [Wallet, "Direct Bank Payouts", "Withdraw your earnings directly to your bank account anytime you reach the minimum threshold."],
            ].map(([Icon, title, desc]) => {
              const I = Icon as typeof FileSearch;
              return (
                <div key={String(title)} className="p-6 rounded-2xl bg-white border border-[#dce5df] shadow-xs flex flex-col justify-between">
                  <div>
                    <div className="size-10 rounded-xl bg-[#edf6f0] flex items-center justify-center text-[#1b7a4e] mb-4">
                      <I className="size-5" />
                    </div>
                    <h3 className="font-display text-lg font-bold text-[#00110a]">{String(title)}</h3>
                    <p className="mt-2 text-xs text-[#5a6660] leading-relaxed">{String(desc)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* How to Install Section */}
        <section className="bg-white border-y border-[#dce5df] py-16 sm:py-20">
          <div className="mx-auto max-w-5xl px-4 sm:px-6">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <span className="text-xs font-semibold text-[#1b7a4e] uppercase tracking-wider">
                Simple Installation
              </span>
              <h2 className="mt-2 font-display text-3xl font-bold text-[#00110a]">
                How to Download Syllaboss to Your Device
              </h2>
              <p className="mt-2 text-xs text-[#5a6660]">
                No App Store or Google Play Store needed. Install directly in 2 taps.
              </p>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              <div className="p-5 rounded-2xl bg-[#edf6f0]/50 border border-[#dce5df] flex flex-col justify-between gap-3">
                <div>
                  <div className="flex items-center justify-between text-xs font-bold text-[#00110a]">
                    <div className="flex items-center gap-2">
                      <Smartphone className="size-4 text-[#1b7a4e]" />
                      <span>Android (.APK)</span>
                    </div>
                    <span className="text-[10px] text-[#1b7a4e] bg-[#edf6f0] px-1.5 py-0.5 rounded font-medium">Direct APK</span>
                  </div>
                  <ol className="list-decimal pl-4 text-xs text-[#5a6660] space-y-1.5 mt-3">
                    <li>Tap <strong>Download for Android (.APK)</strong></li>
                    <li>Open the downloaded <strong>Syllaboss.apk</strong></li>
                    <li>Tap <strong>Install</strong> to add to your app drawer</li>
                    <li>Launch and study anytime on your phone!</li>
                  </ol>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-[#edf6f0]/50 border border-[#dce5df] flex flex-col justify-between gap-3">
                <div>
                  <div className="flex items-center justify-between text-xs font-bold text-[#00110a]">
                    <div className="flex items-center gap-2">
                      <Monitor className="size-4 text-[#1b7a4e]" />
                      <span>Windows PC</span>
                    </div>
                    <span className="text-[10px] text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded font-medium">.EXE Installer</span>
                  </div>
                  <ol className="list-decimal pl-4 text-xs text-[#5a6660] space-y-1.5 mt-3">
                    <li>Tap <strong>Download for Windows (.EXE)</strong></li>
                    <li>Run <strong>Syllaboss-Setup.exe</strong></li>
                    <li>Creates Desktop & Start Menu shortcuts</li>
                    <li>Runs in its own standalone window!</li>
                  </ol>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-[#edf6f0]/50 border border-[#dce5df] flex flex-col justify-between gap-3">
                <div>
                  <div className="flex items-center justify-between text-xs font-bold text-[#00110a]">
                    <div className="flex items-center gap-2">
                      <Smartphone className="size-4 text-[#1b7a4e]" />
                      <span>iPhone & iPad</span>
                    </div>
                    <span className="text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded font-medium">Apple iOS</span>
                  </div>
                  <ol className="list-decimal pl-4 text-xs text-[#5a6660] space-y-1.5 mt-3">
                    <li>Open this page in <strong>Safari</strong></li>
                    <li>Tap the <strong>Share</strong> icon at the bottom</li>
                    <li>Tap <strong>"Add to Home Screen"</strong></li>
                    <li>The app icon is ready on your screen!</li>
                  </ol>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-[#edf6f0]/50 border border-[#dce5df] flex flex-col justify-between gap-3">
                <div>
                  <div className="flex items-center justify-between text-xs font-bold text-[#00110a]">
                    <div className="flex items-center gap-2">
                      <Laptop className="size-4 text-[#1b7a4e]" />
                      <span>Mac & Linux</span>
                    </div>
                    <span className="text-[10px] text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded font-medium">Desktop</span>
                  </div>
                  <ol className="list-decimal pl-4 text-xs text-[#5a6660] space-y-1.5 mt-3">
                    <li><strong>Mac</strong>: In Safari click File &rarr; Add to Dock</li>
                    <li><strong>Chrome</strong>: Click Install in address bar</li>
                    <li><strong>Linux</strong>: Install via Chrome, Edge or Brave</li>
                    <li>Runs as a standalone desktop application!</li>
                  </ol>
                </div>
              </div>
            </div>

            <div className="mt-8 text-center">
              <InstallButton
                showDropdown
                size="lg"
                className="rounded-full bg-[#0d281e] text-white hover:bg-[#00110a] px-8 h-12 font-bold shadow-md"
              />
            </div>
          </div>
        </section>

        {/* Rewards Section */}
        <section id="earn" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
            <div>
              <span className="text-xs font-semibold text-[#1b7a4e] uppercase tracking-wider">
                Earn As You Study
              </span>
              <h2 className="mt-2 font-display text-3xl sm:text-4xl font-bold text-[#00110a] leading-tight">
                Get Rewarded for Helping Your Peers Learn
              </h2>
              <p className="mt-4 text-sm text-[#424844] leading-relaxed">
                Upload clear lecture notes, summaries, or past questions. Every verified upload earns you instant SyllaPoints, plus royalties whenever course mates view or download your material.
              </p>
              <div className="mt-6 flex items-center gap-3">
                <InstallButton
                  size="default"
                  label="Install App to Start"
                  className="rounded-full bg-[#0d281e] text-white hover:bg-[#00110a]"
                />
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-white border border-[#dce5df] shadow-xs">
              <h3 className="font-display text-base font-bold text-[#00110a] mb-4">
                SyllaPoints Earning Rates
              </h3>
              <div className="divide-y divide-[#edf6f0] text-xs">
                <div className="py-2.5 flex justify-between items-center">
                  <span className="text-[#5a6660]">Install App Bonus</span>
                  <span className="font-mono font-bold text-[#1b7a4e]">+{POINTS_INSTALL_APP_BONUS} pts</span>
                </div>
                <div className="py-2.5 flex justify-between items-center">
                  <span className="text-[#5a6660]">Account Sign-Up Bonus</span>
                  <span className="font-mono font-bold text-[#1b7a4e]">+{POINTS_REGISTRATION_BONUS} pts</span>
                </div>
                <div className="py-2.5 flex justify-between items-center">
                  <span className="text-[#5a6660]">Verified Notes Upload</span>
                  <span className="font-mono font-bold text-[#1b7a4e]">+{POINTS_PER_VERIFIED_UPLOAD} pts</span>
                </div>
                <div className="py-2.5 flex justify-between items-center">
                  <span className="text-[#5a6660]">Study Session (every 30m)</span>
                  <span className="font-mono font-bold text-[#1b7a4e]">+{POINTS_PER_30_MIN_STUDY} pts</span>
                </div>
                <div className="py-2.5 flex justify-between items-center">
                  <span className="text-[#5a6660]">Peer Material Download</span>
                  <span className="font-mono font-bold text-[#1b7a4e]">+{POINTS_PER_DOWNLOAD} pts</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section id="faq" className="bg-white border-t border-[#dce5df] py-16 sm:py-20">
          <div className="mx-auto max-w-3xl px-4 sm:px-6">
            <h2 className="font-display text-3xl font-bold text-[#00110a] text-center mb-8">
              Frequently Asked Questions
            </h2>
            <div className="divide-y divide-[#dce5df] rounded-2xl border border-[#dce5df] overflow-hidden">
              {FAQ.map(([q, a]) => (
                <details key={q} className="group p-5 bg-white">
                  <summary className="cursor-pointer list-none font-semibold text-xs sm:text-sm text-[#00110a] flex items-center justify-between">
                    <span>{q}</span>
                    <span className="text-[#1b7a4e] font-bold text-base transition-transform group-open:rotate-45">+</span>
                  </summary>
                  <p className="mt-2 text-xs text-[#5a6660] leading-relaxed">{a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* Bottom Banner */}
        <section className="bg-[#0d281e] text-white py-16">
          <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 flex flex-col items-center">
            <SyllabossEmblem className="size-14 mb-4" />
            <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight">
              Ready to study with direction?
            </h2>
            <p className="mt-3 text-sm text-[#cee9da] max-w-md">
              Download the Syllaboss app to your phone or laptop now and start learning smarter.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center gap-3">
              <InstallButton
                showDropdown
                size="lg"
                className="w-full sm:w-auto rounded-full bg-[#cee9da] text-[#0d281e] hover:bg-white text-sm font-bold px-8 h-12 shadow-md"
              />
              <Button
                asChild
                variant="outline"
                size="lg"
                className="w-full sm:w-auto rounded-full border-white/20 bg-white/10 hover:bg-white/20 text-white text-sm font-semibold px-6 h-12"
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
      <footer className="border-t border-[#dce5df] bg-white py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <SyllabossLogo />
          <p className="text-xs text-[#5a6660]">
            © 2026 Syllaboss. Study with direction.
          </p>
        </div>
      </footer>
    </div>
  );
}
