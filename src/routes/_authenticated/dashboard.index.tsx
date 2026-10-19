import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useReducedMotion } from "motion/react";
import { formatDistanceToNowStrict } from "date-fns";
import {
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Bot,
  Coins,
  Flame,
  Pause,
  Play,
  Share2,
  Sparkles,
  Timer,
  Upload,
  Users,
} from "lucide-react";

import { SyllabossEmblem } from "@/components/syllaboss-logo";
import { SyllaPlusModal } from "@/components/syllaplus-modal";
import { CampusWrappedModal } from "@/components/scholar/campus-wrapped-modal";
import { milestoneRemaining, useSharedStudyTimer } from "@/components/study-timer-context";
import { Button } from "@/components/ui/button";
import { SpotlightCard } from "@/components/ui/spotlight-card";
import { Magnetic } from "@/components/ui/magnetic";
import { GsapReveal } from "@/components/ui/gsap-reveal";
import { useAuth } from "@/hooks/use-auth";
import { getMaterials, getPointsLedger } from "@/integrations/turso/client";
import { useProfile } from "@/lib/profile";
import {
  MINIMUM_WITHDRAWAL_POINTS,
  POINTS_NAME,
  POINTS_PER_30_MIN_STUDY,
  POINTS_PER_DOWNLOAD,
  POINTS_PER_VERIFIED_UPLOAD,
  formatNaira,
  pointsToNaira,
} from "@/lib/constants";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/dashboard/")({
  head: () => ({
    meta: [
      { title: "Home — Syllaboss" },
      { name: "description", content: "Your study day at a glance: focus timer, streak, points and activity." },
    ],
  }),
  component: HomePage,
});

type LedgerEntry = { id: string; reason: string; amount: number; created_at: string };

/** Eased count-up so key figures settle into place instead of popping in. */
function useCountUp(target: number, duration = 850) {
  const reduce = useReducedMotion();
  const [value, setValue] = useState(reduce ? target : 0);
  const current = useRef(reduce ? target : 0);

  useEffect(() => {
    if (reduce) {
      current.current = target;
      setValue(target);
      return;
    }
    const from = current.current;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 4);
      const next = Math.round(from + (target - from) * eased);
      current.current = next;
      setValue(next);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration, reduce]);

  return value;
}

function dayKey(d: Date) {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function HomePage() {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const timer = useSharedStudyTimer();
  const [showPlus, setShowPlus] = useState(false);
  const [showWrapped, setShowWrapped] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const { data: materials = [] } = useQuery({
    queryKey: ["my-materials", user?.id],
    enabled: Boolean(user),
    queryFn: async () => (user ? await getMaterials({ userId: user.id }) : []),
  });

  const { data: ledger = [] } = useQuery({
    queryKey: ["my-ledger", user?.id],
    enabled: Boolean(user),
    queryFn: async () => (user ? ((await getPointsLedger(user.id)) as LedgerEntry[]) : []),
  });

  const points = profile?.points ?? 0;
  const streak = Number(profile?.current_streak || 1);
  const studyHours = ((profile?.study_minutes ?? 0) / 60).toFixed(1);
  const isPlus = Boolean(profile?.sylla_plus);

  const verified = materials.filter((m) => m.status === "verified").length;
  const pending = materials.filter((m) => m.status === "pending").length;
  const downloads = materials.reduce((a, m) => a + (m.downloads || 0), 0);
  const views = materials.reduce((a, m) => a + (m.views || 0), 0);

  const animatedPoints = useCountUp(points);
  const toWithdraw = Math.max(0, MINIMUM_WITHDRAWAL_POINTS - points);
  const withdrawPct = Math.min(100, (points / MINIMUM_WITHDRAWAL_POINTS) * 100);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const firstName = profile?.full_name?.split(" ")[0] || user?.email?.split("@")[0] || "Scholar";

  const { label: timerLabel, progress: timerProgress } = milestoneRemaining(timer?.seconds ?? 0);
  const paused = timer?.isPaused ?? false;

  // Last 7 days of earnings, from the real ledger.
  const week = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - (6 - i));
      return { date: d, total: 0 };
    });
    const index = new Map(days.map((d, i) => [dayKey(d.date), i]));
    const safeLedger = Array.isArray(ledger) ? ledger : [];
    for (const e of safeLedger) {
      if (!e || typeof e.amount !== "number" || e.amount <= 0 || !e.created_at) continue;
      try {
        const dt = new Date(e.created_at);
        if (isNaN(dt.getTime())) continue;
        const i = index.get(dayKey(dt));
        if (i !== undefined && days[i]) days[i]!.total += e.amount;
      } catch {
        // Skip invalid date entry
      }
    }
    const max = Math.max(1, ...days.map((d) => d.total));
    return { days, max, sum: days.reduce((a, d) => a + d.total, 0) };
  }, [ledger]);

  const R = 52;
  const C = 2 * Math.PI * R;

  return (
    <div className="flex flex-col gap-6 lg:gap-7">
      {/* Greeting */}
      <GsapReveal yOffset={12}>
        <section className="flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <p className="eyebrow text-brand">
              {new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}
            </p>
            <h1 className="mt-1.5 font-display text-[2rem] font-semibold leading-[1.05] tracking-tight text-ink sm:text-[2.6rem]">
              {greeting}, {firstName}
            </h1>
            <p className="mt-2 truncate text-sm text-muted-foreground">
              {[profile?.course || profile?.department, profile?.institution]
                .filter(Boolean)
                .join(" · ") || "Complete your profile to personalise your library"}
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            {!isPlus && (
              <Magnetic intensity={0.2}>
                <button
                  type="button"
                  onClick={() => setShowPlus(true)}
                  className="press hidden h-10 items-center gap-1.5 rounded-xl border border-brass/30 bg-brass-soft px-3.5 text-[13px] font-semibold text-brass-ink transition-colors hover:border-brass/55 sm:flex cursor-pointer"
                >
                  <Sparkles className="size-3.5" /> SyllaPlus
                </button>
              </Magnetic>
            )}
            <Magnetic intensity={0.25}>
              <Button asChild size="lg" className="h-10 px-5 rounded-xl shadow-lift">
                <Link to="/dashboard/upload">
                  <Upload /> Upload &amp; earn
                </Link>
              </Button>
            </Magnetic>
          </div>
        </section>
      </GsapReveal>

      {/* Focus + balance */}
      <section className="grid gap-4 lg:grid-cols-12 lg:gap-5">
        {/* Focus */}
        <div className="relative overflow-hidden rounded-3xl bg-forest p-6 text-white shadow-lift sm:p-8 lg:col-span-7">
          <SyllabossEmblem
            aria-hidden
            className="pointer-events-none absolute -bottom-16 -right-10 size-72 opacity-[0.07]"
          />
          <div className="relative flex flex-col gap-7 sm:flex-row sm:items-center sm:gap-9">
            <div className="relative mx-auto grid size-40 shrink-0 place-items-center sm:mx-0 sm:size-44">
              <svg viewBox="0 0 120 120" className="absolute inset-0 -rotate-90">
                <circle cx="60" cy="60" r={R} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="6" />
                <circle
                  cx="60"
                  cy="60"
                  r={R}
                  fill="none"
                  stroke={paused ? "rgba(255,255,255,0.35)" : "#4fd39b"}
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray={C}
                  strokeDashoffset={C * (1 - timerProgress)}
                  style={{ transition: "stroke-dashoffset 1s linear, stroke 300ms ease" }}
                />
              </svg>
              <div className="text-center">
                <p className="tnum font-display text-[2.15rem] font-medium leading-none tracking-tight">{timerLabel}</p>
                <p className="mt-1.5 text-[11px] font-medium text-white/60">
                  {paused ? "paused" : `to +${POINTS_PER_30_MIN_STUDY} pts`}
                </p>
              </div>
            </div>

            <div className="min-w-0 flex-1">
              <p className="eyebrow !text-white/55">Focus session</p>
              <h2 className="mt-2 font-display text-2xl font-medium leading-tight sm:text-[1.75rem]">
                {paused ? "Your timer is paused." : "Every focused half hour pays."}
              </h2>
              <p className="mt-2 max-w-sm text-sm leading-relaxed text-white/65">
                The timer runs while you study in Syllaboss and pauses when you step away. No tapping start.
              </p>
              <div className="mt-5 flex flex-wrap items-center gap-2.5">
                <Button
                  asChild
                  className="h-10 bg-white px-4 text-forest shadow-none hover:bg-white/90"
                >
                  <Link to="/dashboard/assistant">
                    <Bot /> Study with Boss AI
                  </Link>
                </Button>
                <button
                  type="button"
                  onClick={timer?.togglePause}
                  className="press inline-flex h-10 items-center gap-2 rounded-lg border border-white/20 px-4 text-[13px] font-semibold text-white/90 transition-colors hover:bg-white/10"
                >
                  {timer?.manualPause ? <Play className="size-3.5 fill-current" /> : <Pause className="size-3.5 fill-current" />}
                  {timer?.manualPause ? "Resume" : "Pause"}
                </button>
              </div>
            </div>
          </div>

          {/* Week streak */}
          <div className="relative mt-7 flex items-center justify-between gap-4 border-t border-white/10 pt-5">
            <div className="flex items-center gap-2.5">
              <Flame className="streak-flame size-5 fill-[#e9b949] text-[#e9b949]" />
              <p className="text-sm">
                <span className="tnum font-display text-xl font-medium">{streak}</span>{" "}
                <span className="text-white/65">day streak</span>
              </p>
            </div>
            <div className="flex items-center gap-1.5" aria-label={`${Math.min(streak, 7)} of the last 7 days active`}>
              {Array.from({ length: 7 }, (_, i) => {
                const d = new Date();
                d.setDate(d.getDate() - (6 - i));
                const on = 6 - i < streak;
                return (
                  <div key={i} className="flex flex-col items-center gap-1.5">
                    <span
                      className={cn(
                        "grid size-7 place-items-center rounded-full text-[10px] font-bold transition-colors",
                        on ? "bg-[#e9b949] text-forest" : "bg-white/8 text-white/35",
                        i === 6 && "ring-2 ring-white/70 ring-offset-2 ring-offset-forest",
                      )}
                    >
                      {on ? "✓" : ""}
                    </span>
                    <span className="text-[10px] font-medium text-white/45">
                      {d.toLocaleDateString("en-GB", { weekday: "narrow" })}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Balance */}
        <div className="flex flex-col rounded-3xl border border-border bg-card p-6 shadow-soft sm:p-8 lg:col-span-5">
          <div className="flex items-center justify-between">
            <p className="eyebrow">{POINTS_NAME}</p>
            <span className="grid size-8 place-items-center rounded-lg bg-brass-soft text-brass">
              <Coins className="size-4" />
            </span>
          </div>
          <p className="tnum mt-4 font-display text-[3.4rem] font-medium leading-none tracking-tight text-ink sm:text-[4rem]">
            {animatedPoints.toLocaleString()}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Worth about <span className="font-semibold text-ink">{formatNaira(pointsToNaira(points))}</span>
            {pending > 0 && (
              <span> · {pending * POINTS_PER_VERIFIED_UPLOAD} pts in review</span>
            )}
          </p>

          <div className="mt-6">
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-brand transition-[width] duration-[1100ms] ease-[cubic-bezier(0.23,1,0.32,1)]"
                style={{ width: mounted ? `${Math.max(2, withdrawPct)}%` : "0%" }}
              />
            </div>
            <p className="tnum mt-2.5 text-xs text-muted-foreground">
              {toWithdraw === 0 ? (
                <span className="font-semibold text-forest">You can withdraw now</span>
              ) : (
                <>
                  <span className="font-semibold text-ink">{toWithdraw.toLocaleString()} pts</span> to your first withdrawal
                </>
              )}
            </p>
          </div>

          <Button asChild variant="outline" className="mt-auto h-11 w-full justify-between px-4 sm:mt-6">
            <Link to="/dashboard/wallet">
              Open wallet <ArrowRight />
            </Link>
          </Button>
        </div>
      </section>

      {/* Quick actions */}
      <GsapReveal delay={0.15}>
        <section aria-label="Quick actions" className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
          <ActionTile to="/dashboard/library" icon={BookOpen} title="Library" sub="Notes & past questions" />
          <ActionTile to="/dashboard/assistant" icon={Bot} title="Boss AI" sub="Ask, quiz, explain" />
          <ActionTile to="/dashboard/community" icon={Users} title="Peers" sub="Study groups & battles" />
          <ActionTile onClick={() => setShowWrapped(true)} icon={Share2} title="Campus Wrapped" sub="Share your rank card" />
        </section>
      </GsapReveal>

      {/* Week + contribution */}
      <section className="grid gap-4 lg:grid-cols-12 lg:gap-5">
        <div className="rounded-3xl border border-border bg-card p-6 shadow-soft lg:col-span-7">
          <div className="flex items-start justify-between">
            <div>
              <p className="eyebrow">This week</p>
              <p className="tnum mt-2 font-display text-3xl font-medium leading-none text-ink">
                +{week.sum.toLocaleString()} <span className="text-lg text-muted-foreground">pts</span>
              </p>
            </div>
            <span className="rounded-full bg-muted px-3 py-1 text-[11px] font-semibold text-ink-soft">Last 7 days</span>
          </div>

          <div className="mt-6 flex h-36 items-end gap-2.5 sm:gap-4" role="img" aria-label="Points earned per day over the last seven days">
            {week.days.map((d, i) => {
              const h = d.total === 0 ? 4 : Math.max(10, (d.total / week.max) * 100);
              const today = i === 6;
              return (
                <div key={i} className="group flex h-full flex-1 flex-col items-center justify-end gap-2" title={`${d.total} pts`}>
                  <span className="tnum text-[11px] font-semibold text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
                    {d.total}
                  </span>
                  <div
                    className={cn(
                      "w-full max-w-10 rounded-t-lg transition-[height] duration-700 ease-[cubic-bezier(0.23,1,0.32,1)]",
                      today ? "bg-brand" : d.total ? "bg-moss/35 group-hover:bg-moss/55" : "bg-muted",
                    )}
                    style={{ height: mounted ? `${h}%` : "4%", transitionDelay: `${i * 45}ms` }}
                  />
                  <span className={cn("text-[11px] font-medium", today ? "text-ink" : "text-muted-foreground")}>
                    {d.date.toLocaleDateString("en-GB", { weekday: "short" })}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col rounded-3xl border border-border bg-card p-6 shadow-soft lg:col-span-5">
          <div className="flex items-center justify-between">
            <p className="eyebrow">Your contribution</p>
            <Link to="/dashboard/materials" className="inline-flex items-center gap-1 text-xs font-semibold text-moss transition-colors hover:text-ink">
              Manage <ArrowUpRight className="size-3.5" />
            </Link>
          </div>
          {materials.length === 0 ? (
            <div className="my-auto py-6 text-center">
              <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-accent text-forest">
                <Upload className="size-5" />
              </span>
              <p className="mt-3 font-display text-lg font-semibold text-ink">Share your first material</p>
              <p className="mx-auto mt-1 max-w-[16rem] text-sm text-muted-foreground">
                Earn +{POINTS_PER_VERIFIED_UPLOAD} points when it's verified, then +{POINTS_PER_DOWNLOAD} for every download.
              </p>
              <Button asChild className="mt-4 h-10 px-5">
                <Link to="/dashboard/upload">Upload now</Link>
              </Button>
            </div>
          ) : (
            <dl className="mt-5 grid flex-1 grid-cols-2 gap-3">
              <MiniStat label="Verified" value={verified} />
              <MiniStat label="In review" value={pending} />
              <MiniStat label="Reads" value={views + downloads} />
              <MiniStat label="Downloads" value={downloads} />
            </dl>
          )}
        </div>
      </section>

      {/* Activity */}
      <section className="rounded-3xl border border-border bg-card shadow-soft">
        <div className="flex items-center justify-between px-6 pt-6">
          <div>
            <p className="eyebrow">Recent activity</p>
            <h3 className="mt-1.5 font-display text-xl font-semibold text-ink">Your points ledger</h3>
          </div>
          <Link to="/dashboard/wallet" className="inline-flex items-center gap-1 text-xs font-semibold text-moss transition-colors hover:text-ink">
            All activity <ArrowRight className="size-3.5" />
          </Link>
        </div>

        {ledger.length === 0 ? (
          <div className="px-6 pb-10 pt-8 text-center">
            <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-muted text-moss">
              <Timer className="size-5" />
            </span>
            <p className="mt-3 text-sm font-semibold text-ink">Nothing here yet</p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
              Study sessions, verified uploads and bonuses will show up here as you earn them.
            </p>
          </div>
        ) : (
          <ul className="mt-3 divide-y divide-border px-3 pb-3">
            {ledger.slice(0, 6).map((entry) => {
              const gain = entry.amount >= 0;
              return (
                <li key={entry.id} className="flex items-center gap-3.5 rounded-xl px-3 py-3 transition-colors hover:bg-muted/60">
                  <span
                    className={cn(
                      "grid size-9 shrink-0 place-items-center rounded-full",
                      gain ? "bg-accent text-forest" : "bg-muted text-ink-soft",
                    )}
                  >
                    {gain ? <ArrowDownLeft className="size-4" /> : <ArrowUpRight className="size-4" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink">{entry.reason}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNowStrict(new Date(entry.created_at), { addSuffix: true })}
                    </p>
                  </div>
                  <p className={cn("tnum text-sm font-bold", gain ? "text-forest" : "text-ink-soft")}>
                    {gain ? "+" : "−"}
                    {Math.abs(entry.amount).toLocaleString()}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <SyllaPlusModal open={showPlus} onClose={() => setShowPlus(false)} onSuccess={() => setShowPlus(false)} />
      <CampusWrappedModal
        isOpen={showWrapped}
        onClose={() => setShowWrapped(false)}
        userId={user?.id}
        username={profile?.username || undefined}
      />
    </div>
  );
}

function ActionTile({
  to,
  onClick,
  icon: Icon,
  title,
  sub,
}: {
  to?: string;
  onClick?: () => void;
  icon: typeof Bot;
  title: string;
  sub: string;
}) {
  const content = (
    <SpotlightCard className="p-4 sm:p-5 h-full transition-all duration-300 hover:scale-[1.02] border-border/70 hover:border-brand/40 group cursor-pointer">
      <span className="grid size-10 place-items-center rounded-xl bg-muted text-moss transition-colors group-hover:bg-accent group-hover:text-forest">
        <Icon className="size-5" />
      </span>
      <span className="mt-4 block text-[15px] font-semibold leading-tight text-ink">{title}</span>
      <span className="mt-1 block text-xs leading-snug text-muted-foreground">{sub}</span>
    </SpotlightCard>
  );

  return to ? (
    <Link to={to} className="block h-full press">
      {content}
    </Link>
  ) : (
    <button type="button" onClick={onClick} className="block w-full text-left h-full press cursor-pointer">
      {content}
    </button>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-muted/70 px-4 py-3.5">
      <dt className="eyebrow">{label}</dt>
      <dd className="tnum mt-1.5 font-display text-3xl font-medium leading-none text-ink">{value.toLocaleString()}</dd>
    </div>
  );
}
