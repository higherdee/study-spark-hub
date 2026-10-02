import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Bot, CheckCircle2, Coins, FileSearch, GraduationCap, Menu, ShieldCheck, Smartphone, Upload, Wallet, X, Sparkles } from "lucide-react";
import { useState, useEffect } from "react";

import { InstallButton } from "@/components/install-button";
import { MaterialSearchBar } from "@/components/material-search-bar";
import { SyllabossLogo } from "@/components/syllaboss-logo";
import { Button } from "@/components/ui/button";
import { UserMenu } from "@/components/user-menu";
import { useAuth } from "@/hooks/use-auth";
import { turso } from "@/integrations/turso/client";
import {
  courseOptions,
  formatNaira,
  institutionOptions,
  POINTS_NAME,
  PLAN_NAME,
  POINTS_PER_NAIRA,
  MINIMUM_WITHDRAWAL_POINTS,
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
      { title: "Syllaboss — Find study materials, upload yours, earn cash" },
      { name: "description", content: "Search verified notes and past questions, upload your own to earn SyllaPoints, cash out to your bank, and study with an AI assistant." },
      { property: "og:title", content: "Syllaboss — Find study materials, upload yours, earn cash" },
      { property: "og:description", content: "Verified notes and past questions, SyllaPoints you can cash out, and an AI study assistant." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HomePage,
});

const POPULAR = ["MTH 101", "GST 111", "Past questions", "Anatomy", "Accounting", "CHM 101"];

const FAQ = [
  ["Is Syllaboss free?", "Yes. Creating an account, searching and downloading verified materials is free."],
  ["How are SyllaPoints earned?", `You get ${POINTS_REGISTRATION_BONUS} points for registering, ${POINTS_INSTALL_APP_BONUS} points for installing the app, ${POINTS_PER_VERIFIED_UPLOAD} points per verified upload, ${POINTS_PER_DOWNLOAD} points when someone downloads your material, ${POINTS_PER_VIEW} points per view, and ${POINTS_PER_30_MIN_STUDY} points every 30 minutes of studying on the platform.`],
  ["How do I get paid?", `1 Naira = ${POINTS_PER_NAIRA} ${POINTS_NAME} (5 points = ₦1). The minimum withdrawal is ${MINIMUM_WITHDRAWAL_POINTS.toLocaleString()} ${POINTS_NAME} (${formatNaira(MINIMUM_WITHDRAWAL_NAIRA)}). You can request a withdrawal directly to your Nigerian bank account anytime!`],
  ["What is SyllaPlus?", `SyllaPlus is our premium membership that unlocks bonus rewards (+300 ${POINTS_NAME} upgrade bonus), verified badges, faster review times, and ad-free experience.`],
  ["How does the referral system work?", `When a friend signs up with your referral code, you earn 40 ${POINTS_NAME}. When they upgrade to SyllaPlus, you earn an additional 200 ${POINTS_NAME}!`],
  ["How do you stop fake uploads?", "Each file is verified automatically and compared with the course and title you enter. Files that don't match are rejected; unclear ones are reviewed by an admin."],
  ["Can I use it on my phone?", "Yes! Tap “Install app” or “Add to Home Screen”. When you launch the installed app, it takes you straight into your dashboard."],
];

function HomePage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  // When a user opens the installed app (standalone mode), take them straight to authentication or dashboard
  useEffect(() => {
    if (typeof window !== "undefined") {
      const isStandalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        (navigator as unknown as { standalone?: boolean }).standalone === true ||
        window.location.search.includes("mode=pwa");
      if (isStandalone) {
        if (user) {
          navigate({ to: "/dashboard" });
        } else {
          navigate({ to: "/auth", search: { mode: "signin" } });
        }
      }
    }
  }, [user, navigate]);

  const stats = useQuery({
    queryKey: ["public-stats"],
    queryFn: async () => {
      const rs = await turso.execute("SELECT COUNT(*) AS count FROM materials WHERE status = 'verified'");
      const first = rs.rows[0] as unknown as Record<string, unknown> | undefined;
      return { materials: Number(first?.['count'] || 0) };
    },
  });
  const start = user ? { to: "/dashboard" as const } : { to: "/auth" as const, search: { mode: "signup" as const } };

  return (
    <div className="min-h-screen overflow-x-hidden bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="mr-auto min-w-0"><SyllabossLogo /></div>
          <nav className="hidden items-center gap-7 text-sm text-muted-foreground md:flex">
            <Link to="/materials" search={{ q: "", type: "", level: "" }} className="hover:text-foreground">Materials</Link>
            <a href="#earn" className="hover:text-foreground">Earn</a>
            <a href="#how" className="hover:text-foreground">How it works</a>
            <a href="#faq" className="hover:text-foreground">FAQ</a>
          </nav>
          <div className="hidden md:block"><InstallButton /></div>
          <div className="hidden md:block"><UserMenu /></div>
          <Button variant="ghost" size="icon" className="md:hidden" aria-label="Menu" onClick={() => setMenuOpen((o) => !o)}>{menuOpen ? <X /> : <Menu />}</Button>
        </div>
        {menuOpen && (
          <nav className="space-y-1 border-t border-border px-4 py-3 md:hidden">
            <Link to="/materials" search={{ q: "", type: "", level: "" }} className="block py-2 text-sm">Materials</Link>
            {[["Earn", "#earn"], ["How it works", "#how"], ["FAQ", "#faq"]].map(([l, h]) => <a key={h} href={h} onClick={() => setMenuOpen(false)} className="block py-2 text-sm">{l}</a>)}
            <div className="flex flex-wrap gap-2 border-t border-border pt-3"><InstallButton /><UserMenu /></div>
          </nav>
        )}
      </header>

      <main>
        <section className="relative border-b border-border bg-hero">
          <div className="mx-auto max-w-4xl px-4 py-20 text-center sm:px-6 sm:py-28">
            <p className="font-mono text-xs font-medium uppercase text-primary">For Nigerian university students</p>
            <h1 className="mt-5 font-display text-5xl font-semibold leading-[1.05] sm:text-6xl lg:text-7xl">
              Find any material. <em className="font-normal text-primary">Get paid for yours.</em>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
              Search verified lecture notes and past questions, upload your own to earn points for every page, cash out to your bank, and study smarter with an AI assistant.
            </p>
            <MaterialSearchBar className="mx-auto mt-10 max-w-2xl" />
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {POPULAR.map((p) => (
                <Link key={p} to="/materials" search={{ q: p, type: "", level: "" }} className="rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground hover:border-primary hover:text-foreground">{p}</Link>
              ))}
            </div>
            <div className="mt-10 flex flex-wrap justify-center gap-3">
              <Button asChild size="lg" className="rounded-full px-7"><Link {...start}>{user ? "Go to my dashboard" : "Create free account"} <ArrowRight /></Link></Button>
              <InstallButton size="lg" className="rounded-full px-7" />
            </div>
            <dl className="mx-auto mt-14 grid max-w-2xl grid-cols-3 gap-6 border-t border-border pt-6">
              <div><dt className="text-xs text-muted-foreground">Verified materials</dt><dd className="mt-1 font-display text-2xl font-semibold">{stats.data?.materials ?? "—"}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Institutions</dt><dd className="mt-1 font-display text-2xl font-semibold">{new Intl.NumberFormat("en-NG").format(institutionOptions.length)}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Courses</dt><dd className="mt-1 font-display text-2xl font-semibold">{courseOptions.length}</dd></div>
            </dl>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <p className="font-mono text-xs uppercase text-primary">Everything in one place</p>
          <h2 className="mt-3 max-w-2xl font-display text-4xl font-semibold leading-tight sm:text-5xl">Built for how students actually study.</h2>
          <div className="mt-12 grid gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
            {[
              [FileSearch, "Search materials", "Notes, past questions, handouts and summaries — filtered by course, level and type."],
              [ShieldCheck, "Verified files only", "Every upload is checked automatically so what you download matches what it says."],
              [Coins, `Earn ${POINTS_NAME}`, `Get ${POINTS_PER_VERIFIED_UPLOAD} points per verified upload, +${POINTS_PER_DOWNLOAD} per download, and +${POINTS_PER_VIEW} per view.`],
              [Wallet, "Cash out to your bank", `1 Naira = ${POINTS_PER_NAIRA} ${POINTS_NAME}. Withdraw directly to your Nigerian bank from 17,500 points (${formatNaira(MINIMUM_WITHDRAWAL_NAIRA)}).`],
              [Bot, "AI study assistant", "Ask Boss to explain topics, quiz you, summarise notes or plan your week."],
              [Smartphone, "Works like an app", `Install Syllaboss on your phone and earn ${POINTS_INSTALL_APP_BONUS} bonus ${POINTS_NAME} instantly.`],
            ].map(([Icon, title, copy]) => {
              const I = Icon as typeof FileSearch;
              return (
                <article key={String(title)} className="bg-card p-7">
                  <I className="size-6 text-primary" />
                  <h3 className="mt-6 font-display text-xl font-semibold">{String(title)}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{String(copy)}</p>
                </article>
              );
            })}
          </div>
        </section>

        <section id="how" className="scroll-mt-20 border-y border-border bg-secondary">
          <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
            <p className="font-mono text-xs uppercase text-primary">How it works</p>
            <h2 className="mt-3 font-display text-4xl font-semibold">Up and running in four steps.</h2>
            <ol className="mt-12 grid gap-6 md:grid-cols-4">
              {[
                [GraduationCap, "Create your account", `Sign up in seconds and get ${POINTS_REGISTRATION_BONUS} welcome ${POINTS_NAME}.`],
                [CheckCircle2, "Tell us about you", "Your school, course, level and study interests."],
                [ArrowRight, "Set your study plan", `Study daily and earn ${POINTS_PER_30_MIN_STUDY} points every 30 minutes.`],
                [Upload, "Upload & Earn", "Share notes, earn on every view and download, and cash out."],
              ].map(([Icon, t, c], i) => {
                const I = Icon as typeof FileSearch;
                return (
                  <li key={String(t)} className="rounded-xl border border-border bg-card p-6">
                    <span className="font-mono text-xs text-muted-foreground">0{i + 1}</span>
                    <I className="mt-4 size-5 text-primary" />
                    <h3 className="mt-3 font-semibold">{String(t)}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{String(c)}</p>
                  </li>
                );
              })}
            </ol>
          </div>
        </section>

        <section id="earn" className="mx-auto grid max-w-7xl scroll-mt-20 gap-10 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:items-center lg:px-8">
          <div>
            <p className="font-mono text-xs uppercase text-primary">Upload & earn</p>
            <h2 className="mt-3 font-display text-4xl font-semibold leading-tight sm:text-5xl">Your notes are worth cash.</h2>
            <p className="mt-4 leading-7 text-muted-foreground">
              Upload clear, genuine notes or past questions. Once verified, you get {POINTS_PER_VERIFIED_UPLOAD} {POINTS_NAME} instantly, plus {POINTS_PER_VIEW} points each time a peer views it, and {POINTS_PER_DOWNLOAD} points each time someone downloads it!
            </p>
            <Button asChild size="lg" className="mt-8 rounded-full px-7"><Link {...start}>Start earning <ArrowRight /></Link></Button>
          </div>
          <div className="rounded-2xl border border-border bg-card p-7 shadow-soft">
            <p className="text-sm font-semibold">Example earnings breakdown</p>
            <table className="mt-4 w-full text-sm">
              <thead className="text-left text-xs uppercase text-muted-foreground"><tr><th className="pb-2">Activity</th><th className="pb-2">{POINTS_NAME}</th><th className="pb-2 text-right">Cash</th></tr></thead>
              <tbody className="divide-y divide-border">
                {[
                  ["Account Registration Bonus", POINTS_REGISTRATION_BONUS],
                  ["Install Home Screen App", POINTS_INSTALL_APP_BONUS],
                  ["1 Verified Material Upload", POINTS_PER_VERIFIED_UPLOAD],
                  ["50 Student Downloads", 50 * POINTS_PER_DOWNLOAD],
                  ["100 Student Views", 100 * POINTS_PER_VIEW],
                  ["Upgrade to SyllaPlus Bonus", 300],
                ].map(([n, pts]) => {
                  const p = Number(pts);
                  return (
                    <tr key={String(n)}>
                      <td className="py-3">{n}</td>
                      <td className="font-semibold">+{p}</td>
                      <td className="text-right font-semibold text-primary">{formatNaira(pointsToNaira(p))}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <section id="faq" className="scroll-mt-20 border-t border-border">
          <div className="mx-auto max-w-3xl px-4 py-20 sm:px-6">
            <h2 className="font-display text-4xl font-semibold">Questions</h2>
            <div className="mt-8 divide-y divide-border rounded-xl border border-border bg-card">
              {FAQ.map(([q, a]) => (
                <details key={q} className="group p-5">
                  <summary className="cursor-pointer list-none font-medium">{q}</summary>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-primary text-primary-foreground">
          <div className="mx-auto flex max-w-7xl flex-col items-start gap-6 px-4 py-16 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
            <h2 className="font-display text-3xl font-semibold sm:text-4xl">Ready to study smarter?</h2>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg" variant="secondary" className="rounded-full px-7"><Link {...start}>{user ? "Open dashboard" : "Create free account"}</Link></Button>
              <InstallButton size="lg" variant="secondary" className="rounded-full px-7" />
            </div>
          </div>
        </section>
      </main>

      <footer className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-10 sm:px-6 lg:px-8">
        <SyllabossLogo />
        <p className="text-sm text-muted-foreground">© 2026 Syllaboss. Study with direction.</p>
      </footer>
    </div>
  );
}
