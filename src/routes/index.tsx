import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Bot, CheckCircle2, Coins, FileSearch, GraduationCap, Menu, ShieldCheck, Smartphone, Upload, Wallet, X } from "lucide-react";
import { useState } from "react";

import { InstallButton } from "@/components/install-button";
import { MaterialSearchBar } from "@/components/material-search-bar";
import { SyllabossLogo } from "@/components/syllaboss-logo";
import { Button } from "@/components/ui/button";
import { UserMenu } from "@/components/user-menu";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { courseOptions, formatNaira, institutionOptions, NAIRA_PER_50_POINTS, POINTS_PER_PAGE } from "@/lib/constants";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Syllaboss — Find study materials, upload yours, earn cash" },
      { name: "description", content: "Search verified notes and past questions, upload your own to earn points per page, cash out to your bank, and study with an AI assistant." },
      { property: "og:title", content: "Syllaboss — Find study materials, upload yours, earn cash" },
      { property: "og:description", content: "Verified notes and past questions, points you can cash out, and an AI study assistant." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HomePage,
});

const POPULAR = ["MTH 101", "GST 111", "Past questions", "Anatomy", "Accounting", "CHM 101"];

const FAQ = [
  ["Is Syllaboss free?", "Yes. Creating an account, searching and downloading verified materials is free."],
  ["How are points calculated?", `You get ${POINTS_PER_PAGE} points for every page of a verified upload, up to 500 points per file.`],
  ["How do I get paid?", `Every 50 points is worth ${formatNaira(NAIRA_PER_50_POINTS)}. Request a withdrawal from your wallet and we pay to your Nigerian bank account after a quick review.`],
  ["How do you stop fake uploads?", "Each file is read automatically and compared with the title, course and type you enter. Files that don't match are rejected; unclear ones are reviewed by an admin."],
  ["Can I use it on my phone?", "Yes. Tap “Install app” to add Syllaboss to your home screen — it opens like a normal app."],
];

function HomePage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { user } = useAuth();
  const stats = useQuery({
    queryKey: ["public-stats"],
    queryFn: async () => {
      const { count } = await supabase.from("materials").select("id", { count: "exact", head: true }).eq("status", "verified");
      return { materials: count ?? 0 };
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
              [Coins, "Earn per page", `Get ${POINTS_PER_PAGE} points for each page you share once it's verified.`],
              [Wallet, "Cash out to your bank", `Every 50 points = ${formatNaira(NAIRA_PER_50_POINTS)}. Withdraw straight from your wallet.`],
              [Bot, "AI study assistant", "Ask Boss to explain topics, quiz you, summarise notes or plan your week."],
              [Smartphone, "Works like an app", "Install Syllaboss on your phone and open it from your home screen."],
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
                [GraduationCap, "Create your account", "Sign up with email or Google in seconds."],
                [CheckCircle2, "Tell us about you", "Your school, course, level and how you found us."],
                [ArrowRight, "Set your study plan", "Pick your study days, hours and target CGPA."],
                [Upload, "Study & earn", "Download materials, upload yours, chat with your AI assistant."],
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
            <h2 className="mt-3 font-display text-4xl font-semibold leading-tight sm:text-5xl">Your notes are worth money.</h2>
            <p className="mt-4 leading-7 text-muted-foreground">Upload clear, genuine notes or past questions. Our checker confirms the file matches the course and title you gave, counts the pages, and adds points to your wallet instantly.</p>
            <Button asChild size="lg" className="mt-8 rounded-full px-7"><Link {...start}>Start earning <ArrowRight /></Link></Button>
          </div>
          <div className="rounded-2xl border border-border bg-card p-7 shadow-soft">
            <p className="text-sm font-semibold">Example earnings</p>
            <table className="mt-4 w-full text-sm">
              <thead className="text-left text-xs uppercase text-muted-foreground"><tr><th className="pb-2">Upload</th><th className="pb-2">Pages</th><th className="pb-2">Points</th><th className="pb-2 text-right">Cash</th></tr></thead>
              <tbody className="divide-y divide-border">
                {[["Past questions", 8], ["Lecture notes", 24], ["Full handout", 100]].map(([n, p]) => {
                  const pts = Math.min(Number(p) * POINTS_PER_PAGE, 500);
                  return <tr key={String(n)}><td className="py-3">{n}</td><td>{p}</td><td className="font-semibold">{pts}</td><td className="text-right font-semibold text-primary">{formatNaira(Math.floor(pts / 50) * NAIRA_PER_50_POINTS)}</td></tr>;
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
