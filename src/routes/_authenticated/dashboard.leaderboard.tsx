import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Trophy,
  Award,
  Medal,
  Sparkles,
  Coins,
  Timer,
  BookOpen,
  Filter,
  GraduationCap,
  TrendingUp,
  School,
  CheckCircle,
  Search,
} from "lucide-react";

import { PageHeader } from "@/components/app-shell";
import { SyllabossEmblem } from "@/components/syllaboss-logo";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useProfile } from "@/lib/profile";
import { getLeaderboardServerFn } from "@/lib/upload.functions";
import { POINTS_NAME, formatNaira, pointsToNaira } from "@/lib/constants";
import { CampusWrappedModal } from "@/components/scholar/campus-wrapped-modal";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/dashboard/leaderboard")({
  head: () => ({
    meta: [
      { title: "Academic Leaderboard & Rankings — Syllaboss" },
      { name: "description", content: "Top students across Nigerian institutions ranked by SyllaPoints, study hours, and verified uploads." },
    ],
  }),
  component: LeaderboardPage,
});

function LeaderboardPage() {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const [filterMode, setFilterMode] = useState<"all" | "school" | "faculty">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isFlexCardOpen, setIsFlexCardOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["leaderboard"],
    queryFn: async () => {
      const res = await getLeaderboardServerFn();
      return res.leaderboard;
    },
    refetchInterval: 60000,
  });

  const fullList = data ?? [];
  const filteredList = fullList.filter((s) => {
    if (filterMode === "school" && profile?.institution) {
      if (!s.institution.toLowerCase().includes(profile.institution.toLowerCase())) return false;
    }
    if (filterMode === "faculty" && profile?.course) {
      if (!s.course.toLowerCase().includes(profile.course.toLowerCase())) return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        s.full_name.toLowerCase().includes(q) ||
        s.institution.toLowerCase().includes(q) ||
        s.course.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const topThree = filteredList.slice(0, 3);
  const remainingList = filteredList.slice(3);

  // Student's own rank
  const myRankIndex = fullList.findIndex((s) => s.id === user?.id);
  const myRank = myRankIndex !== -1 ? myRankIndex + 1 : 3;

  return (
    <div className="w-full max-w-[1400px] mx-auto space-y-6 pb-16 font-sans">
      {/* Header Section & Cohort Switcher */}
      <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 border-b border-border/80 pb-4">
        <div className="flex flex-col gap-1 max-w-2xl">
          <h1 className="font-display text-3xl sm:text-4xl text-ink tracking-tight font-medium">
            Student Leaderboard
          </h1>
          <p className="text-sm text-ink-soft leading-relaxed">
            Rankings based on SyllaPoints earned through study sessions and verified course material uploads.
          </p>
        </div>

        {/* Actions: Cohort Switcher & Folio Card */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="p-1 rounded-full bg-surface-container-high border border-border flex items-center gap-1">
            <button
              type="button"
              onClick={() => setFilterMode("all")}
              className={cn(
                "px-3.5 py-1 rounded-full text-xs font-semibold transition-all lift press",
                filterMode === "all" ? "bg-card text-ink shadow-xs font-bold" : "text-ink-soft hover:text-ink"
              )}
            >
              All Universities
            </button>
            <button
              type="button"
              onClick={() => setFilterMode("school")}
              className={cn(
                "px-3.5 py-1 rounded-full text-xs font-semibold transition-all lift press",
                filterMode === "school" ? "bg-card text-ink shadow-xs font-bold" : "text-ink-soft hover:text-ink"
              )}
            >
              My Institution
            </button>
            <button
              type="button"
              onClick={() => setFilterMode("faculty")}
              className={cn(
                "px-3.5 py-1 rounded-full text-xs font-semibold transition-all lift press",
                filterMode === "faculty" ? "bg-card text-ink shadow-xs font-bold" : "text-ink-soft hover:text-ink"
              )}
            >
              Programme
            </button>
          </div>

          <Button
            type="button"
            onClick={() => setIsFlexCardOpen(true)}
            className="h-8.5 rounded-full bg-forest hover:bg-ink text-white font-semibold text-xs shadow-xs gap-1.5 lift press"
          >
            <Sparkles className="size-3.5 text-brass-soft" />
            <span>Campus Folio & Card</span>
          </Button>
        </div>
      </header>

      {/* Scholar Spotlight Standing Bar (Deep Ivy Emerald Elevation) */}
      {profile && (
        <section className="relative overflow-hidden rounded-2xl bg-forest text-white p-6 shadow-md border border-moss/40">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 relative z-10">
            {/* Identification */}
            <div className="flex items-center gap-4">
              <div className="relative shrink-0">
                <div className="size-14 rounded-full bg-brand flex items-center justify-center text-white font-display text-lg font-bold shadow-md border-2 border-white/20">
                  {profile.full_name?.charAt(0) || "S"}
                </div>
                <span className="absolute -bottom-1 -right-1 size-6 rounded-full bg-accent text-accent-foreground font-mono text-xs font-bold flex items-center justify-center shadow-xs">
                  #{myRank}
                </span>
              </div>
              <div className="flex flex-col gap-0.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-display text-xl text-white font-semibold tracking-tight">
                    {profile.full_name || "Scholar Fellow"}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-white/15 text-white text-[11px] font-medium backdrop-blur-md">
                    You
                  </span>
                  {profile.sylla_plus && (
                    <span className="px-2 py-0.5 rounded-full bg-brass-soft text-brass-ink text-[10px] tracking-widest uppercase font-bold">
                      SyllaPlus Scholar
                    </span>
                  )}
                </div>
                <p className="text-xs text-on-primary-container">
                  {profile.institution || "Achievers University, Owo"} • {profile.course || "Faculty Core"}
                </p>
              </div>
            </div>

            {/* Metrics Ribbon */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 items-center bg-white/5 p-4 rounded-xl backdrop-blur-md border border-white/10">
              <div className="flex flex-col">
                <span className="text-[10px] text-on-primary-container uppercase tracking-wider font-semibold">Institutional Rank</span>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="font-display text-xl font-bold text-white">#{myRank}</span>
                  <span className="font-mono text-xs text-on-primary-container">of {fullList.length || 1}</span>
                </div>
              </div>

              <div className="flex flex-col">
                <span className="text-[10px] text-on-primary-container uppercase tracking-wider font-semibold">SyllaPoints</span>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="font-display text-xl font-bold text-accent">
                    {profile.points.toLocaleString()}
                  </span>
                  <span className="font-mono text-xs text-accent/80">pts</span>
                </div>
              </div>

              <div className="flex flex-col">
                <span className="text-[10px] text-on-primary-container uppercase tracking-wider font-semibold">Study Time</span>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="font-display text-xl font-bold text-white">
                    {(profile.study_minutes / 60).toFixed(1)}
                  </span>
                  <span className="font-mono text-xs text-on-primary-container">hrs</span>
                </div>
              </div>

              <div className="flex flex-col justify-center">
                <span className="text-[10px] text-on-primary-container uppercase tracking-wider font-semibold">Cash Yield</span>
                <span className="font-mono text-xs font-semibold text-accent mt-0.5">
                  ~{formatNaira(pointsToNaira(profile.points))}
                </span>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Podium */}
      <section className="flex flex-col gap-4">
        <h2 className="font-display text-2xl tracking-tight text-ink">Top of the campus</h2>

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="surface space-y-3 p-5">
                <div className="skeleton h-8 w-8 rounded-full" />
                <div className="skeleton h-5 w-2/3 rounded-md" />
                <div className="skeleton h-16 w-full rounded-xl" />
              </div>
            ))}
          </div>
        ) : topThree.length > 0 ? (
          <div className="stagger grid grid-cols-1 items-end gap-4 md:grid-cols-3">
            {[1, 0, 2].map((idx) => {
              const s = topThree[idx];
              if (!s) return null;
              const first = idx === 0;
              const handle = s.username || s.full_name.toLowerCase().replace(/\s+/g, "_");
              const initial = (s.username || s.full_name)[0]?.toUpperCase() ?? "S";
              const Icon = first ? Trophy : idx === 1 ? Medal : Award;
              return (
                <article
                  key={s.id}
                  className={cn(
                    "surface lift relative flex flex-col p-5",
                    first
                      ? "order-1 border-brass/50 bg-gradient-to-b from-brass-soft/60 to-card p-6 md:order-2 md:-mt-4"
                      : idx === 1
                        ? "order-2 md:order-1"
                        : "order-3",
                  )}
                >
                  <div className="mb-3 flex items-center justify-between">
                    <span
                      className={cn(
                        "grid size-9 place-items-center rounded-full text-sm font-bold tnum",
                        first ? "bg-brass text-white" : "bg-secondary text-ink",
                      )}
                    >
                      {idx + 1}
                    </span>
                    <Icon className={cn("size-5", first ? "text-brass" : "text-muted-foreground")} />
                  </div>

                  <div className="flex items-center gap-2.5">
                    {s.avatar_url ? (
                      <img
                        src={s.avatar_url}
                        alt=""
                        className="size-10 rounded-full border border-border object-cover"
                      />
                    ) : (
                      <div className="grid size-10 place-items-center rounded-full bg-surface-container-high text-sm font-bold text-forest">
                        {initial}
                      </div>
                    )}
                    <div className="min-w-0">
                      <h3 className="truncate font-display text-lg text-ink">@{handle}</h3>
                      <p className="truncate text-xs text-muted-foreground">{s.full_name}</p>
                    </div>
                  </div>

                  <p className="mt-3 truncate text-xs text-muted-foreground">{s.institution}</p>
                  <p className="truncate text-[11px] text-moss">{s.course}</p>

                  <dl className="mt-4 grid grid-cols-2 gap-2 rounded-xl bg-muted p-3 text-xs tnum">
                    <div>
                      <dt className="text-muted-foreground">Points</dt>
                      <dd className="mt-0.5 font-display text-lg text-ink">
                        {s.points.toLocaleString()}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Study time</dt>
                      <dd className="mt-0.5 font-display text-lg text-ink">
                        {Math.round(s.study_minutes / 60)}h
                      </dd>
                    </div>
                  </dl>
                </article>
              );
            })}
          </div>
        ) : null}
      </section>

      {/* Full Ranked Scholars Table */}
      <section className="flex flex-col gap-3 bg-card rounded-3xl shadow-[var(--elev-1)] border border-border p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
          <div>
            <h2 className="font-display text-xl text-ink font-semibold">All Ranked Students</h2>
            <p className="text-xs text-muted-foreground">Students ranked by study hours and SyllaPoints.</p>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by student username, name, or school..."
              className="pl-9 pr-4 py-2 rounded-full bg-muted text-xs text-foreground border border-border focus:bg-white focus:outline-none w-64"
            />
          </div>
        </div>

        <div className="w-full overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="text-muted-foreground uppercase tracking-wider border-b border-surface-container font-semibold">
                <th className="py-3 px-3 w-16">Rank</th>
                <th className="py-3 px-3 min-w-[200px]">Student Username & Course</th>
                <th className="py-3 px-3 min-w-[180px]">Institution</th>
                <th className="py-3 px-3 text-right font-mono">Study Time</th>
                <th className="py-3 px-3 text-right font-mono">SyllaPoints</th>
                <th className="py-3 px-3 text-right font-mono">Cash Yield</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container">
              {remainingList.map((s) => {
                const isCurrentUser = s.id === user?.id;
                const userDisplayHandle = s.username ? `@${s.username}` : `@${s.full_name.toLowerCase().replace(/\s+/g, "_")}`;
                return (
                  <tr
                    key={s.id}
                    className={cn(
                      "hover:bg-muted/50 transition-colors",
                      isCurrentUser ? "bg-accent/20 font-semibold" : ""
                    )}
                  >
                    <td className="py-3.5 px-3 font-mono font-semibold text-ink">#{s.rank}</td>
                    <td className="py-3.5 px-3">
                      <div className="flex items-center gap-2.5">
                        {s.avatar_url ? (
                          <img src={s.avatar_url} alt="" className="size-7 rounded-full object-cover border border-border" />
                        ) : (
                          <div className="size-7 rounded-full bg-surface-container-high text-forest font-bold text-[11px] flex items-center justify-center">
                            {((s.username || s.full_name)[0] ?? "S").toUpperCase()}
                          </div>
                        )}
                        <div className="flex flex-col">
                          <span className="font-semibold text-foreground">{userDisplayHandle}</span>
                          <span className="text-[11px] text-muted-foreground">{s.course}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-3 text-muted-foreground">{s.institution}</td>
                    <td className="py-3.5 px-3 text-right font-mono text-moss">
                      {Math.round(s.study_minutes / 60)} hrs
                    </td>
                    <td className="py-3.5 px-3 text-right font-mono font-bold text-ink">
                      {s.points.toLocaleString()} pts
                    </td>
                    <td className="py-3.5 px-3 text-right font-mono text-brand font-semibold">
                      {formatNaira(pointsToNaira(s.points))}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Campus Wrapped & Flex Story Card Modal */}
      <CampusWrappedModal
        isOpen={isFlexCardOpen}
        onClose={() => setIsFlexCardOpen(false)}
        userId={user?.id}
        username={profile?.username || undefined}
      />
    </div>
  );
}
