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
      {/* Editorial Header Section & Cohort Switcher */}
      <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 border-b border-[#dce5df]/80 pb-4">
        <div className="flex flex-col gap-1 max-w-2xl">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-[#edf6f0] text-[#446557] text-xs font-semibold uppercase tracking-wider">
              <Trophy className="size-3.5 text-[#1b7a4e]" />
              Academic Rankings & Distinction
            </span>
            <span className="font-mono text-xs text-[#5a6660]">Michaelmas 2025/2026</span>
          </div>
          <h1 className="font-display text-3xl sm:text-4xl text-[#00110a] tracking-tight font-medium">
            Student Leaderboard
          </h1>
          <p className="text-sm text-[#424844] leading-relaxed">
            Real-time scholastic merit standings evaluated across verified courseware archives, rigorous focus sessions, peer citations, and peer-to-peer curriculum contributions.
          </p>
        </div>

        {/* Segmented Cohort Switcher */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
          <div className="p-1 rounded-full bg-[#edf6f0] border border-[#dce5df] flex items-center gap-1">
            <button
              type="button"
              onClick={() => setFilterMode("all")}
              className={cn(
                "px-3.5 py-1 rounded-full text-xs font-semibold transition-all",
                filterMode === "all" ? "bg-white text-[#00110a] shadow-xs font-bold" : "text-[#5a6660] hover:text-[#00110a]"
              )}
            >
              All Universities
            </button>
            <button
              type="button"
              onClick={() => setFilterMode("school")}
              className={cn(
                "px-3.5 py-1 rounded-full text-xs font-semibold transition-all",
                filterMode === "school" ? "bg-white text-[#00110a] shadow-xs font-bold" : "text-[#5a6660] hover:text-[#00110a]"
              )}
            >
              My Institution
            </button>
            <button
              type="button"
              onClick={() => setFilterMode("faculty")}
              className={cn(
                "px-3.5 py-1 rounded-full text-xs font-semibold transition-all",
                filterMode === "faculty" ? "bg-white text-[#00110a] shadow-xs font-bold" : "text-[#5a6660] hover:text-[#00110a]"
              )}
            >
              My Faculty
            </button>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-[#dce5df] text-[#5a6660] font-mono text-xs">
            <span className="w-2 h-2 rounded-full bg-[#1b7a4e] animate-pulse" />
            <span>Synced live</span>
          </div>
        </div>
      </header>

      {/* Scholar Spotlight Standing Bar (Deep Ivy Emerald Elevation) */}
      {profile && (
        <section className="relative overflow-hidden rounded-2xl bg-[#0d281e] text-white p-6 shadow-md border border-[#446557]/40">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 relative z-10">
            {/* Identification */}
            <div className="flex items-center gap-4">
              <div className="relative shrink-0">
                <div className="size-14 rounded-full bg-[#1b7a4e] flex items-center justify-center text-white font-display text-lg font-bold shadow-md border-2 border-white/20">
                  {profile.full_name?.charAt(0) || "S"}
                </div>
                <span className="absolute -bottom-1 -right-1 size-6 rounded-full bg-[#c6ebd9] text-[#002116] font-mono text-xs font-bold flex items-center justify-center shadow-xs">
                  #{myRank}
                </span>
              </div>
              <div className="flex flex-col gap-0.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-display text-xl text-white font-semibold tracking-tight">
                    {profile.full_name || "Scholar Fellow"}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-white/15 text-white text-[11px] font-medium backdrop-blur-md">
                    You • Fellow
                  </span>
                  {profile.sylla_plus && (
                    <span className="px-2 py-0.5 rounded-full bg-[#f3e8c9] text-[#71540f] text-[10px] tracking-widest uppercase font-bold">
                      SyllaPlus Scholar
                    </span>
                  )}
                </div>
                <p className="text-xs text-[#749183]">
                  {profile.institution || "Achievers University, Owo"} • {profile.course || "Faculty Core"}
                </p>
              </div>
            </div>

            {/* Metrics Ribbon */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 items-center bg-white/5 p-4 rounded-xl backdrop-blur-md border border-white/10">
              <div className="flex flex-col">
                <span className="text-[10px] text-[#749183] uppercase tracking-wider font-semibold">Institutional Rank</span>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="font-display text-xl font-bold text-white">#{myRank}</span>
                  <span className="font-mono text-xs text-[#749183]">of {Math.max(fullList.length, 120)}</span>
                </div>
              </div>

              <div className="flex flex-col">
                <span className="text-[10px] text-[#749183] uppercase tracking-wider font-semibold">SyllaPoints</span>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="font-display text-xl font-bold text-[#c6ebd9]">
                    {profile.points.toLocaleString()}
                  </span>
                  <span className="font-mono text-xs text-[#c6ebd9]/80">pts</span>
                </div>
              </div>

              <div className="flex flex-col">
                <span className="text-[10px] text-[#749183] uppercase tracking-wider font-semibold">Study Velocity</span>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="font-display text-xl font-bold text-white">
                    {(profile.study_minutes / 60).toFixed(1)}
                  </span>
                  <span className="font-mono text-xs text-[#749183]">hrs</span>
                </div>
              </div>

              <div className="flex flex-col justify-center">
                <span className="text-[10px] text-[#749183] uppercase tracking-wider font-semibold">Yield Value</span>
                <span className="font-mono text-xs font-semibold text-[#c6ebd9] mt-0.5">
                  ~{formatNaira(pointsToNaira(profile.points))}
                </span>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Top 3 Scholars Podium Cards */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-2xl text-[#00110a] font-medium tracking-tight">Scholastic Laureates</h2>
          <span className="text-xs text-[#5a6660]">Michaelmas Cycle • Final Tally Countdown</span>
        </div>

        {isLoading ? (
          <div className="py-16 text-center flex flex-col items-center justify-center">
            <div className="animate-breathe-zoom">
              <SyllabossEmblem className="size-14" />
            </div>
            <p className="mt-3 text-xs font-semibold text-[#446557] animate-pulse">Evaluating scholar standings...</p>
          </div>
        ) : topThree.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            {/* Rank #2 (Silver Medalist) */}
            {topThree[1] && (
              <article className="flex flex-col rounded-2xl bg-white p-5 shadow-xs border border-[#dce5df] transition-all hover:shadow-md order-2 md:order-1">
                <div className="flex items-center justify-between mb-3">
                  <span className="size-8 rounded-full bg-slate-100 text-slate-700 font-mono text-xs font-bold flex items-center justify-center">
                    02
                  </span>
                  <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#edf6f0] text-xs font-semibold text-[#446557]">
                    <Medal className="size-3.5 text-slate-500" /> Silver Medal
                  </div>
                </div>
                <h3 className="font-display text-lg font-semibold text-[#00110a] truncate">{topThree[1].full_name}</h3>
                <p className="text-xs text-[#5a6660] truncate">{topThree[1].institution}</p>
                <p className="text-[11px] text-[#446557] truncate mt-0.5">{topThree[1].course}</p>

                <div className="flex flex-col gap-1.5 py-2.5 bg-[#edf6f0] rounded-xl px-3 my-3 font-mono text-xs text-[#151d1a]">
                  <div className="flex justify-between items-center">
                    <span className="text-[#5a6660]">Scholastic Power</span>
                    <span className="font-bold text-[#00110a]">{topThree[1].points.toLocaleString()} pts</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[#5a6660]">Study Velocity</span>
                    <span className="text-[#446557] font-semibold">{Math.round(topThree[1].study_minutes / 60)} hrs</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-[#5a6660] font-mono">
                  <span className="text-[#1b7a4e] font-semibold">Steady Track</span>
                  <span>Yield: {formatNaira(pointsToNaira(topThree[1].points))}</span>
                </div>
              </article>
            )}

            {/* Rank #1 (Gold Laureate) */}
            {topThree[0] && (
              <article className="flex flex-col rounded-2xl bg-white p-6 shadow-md border-2 border-amber-300 transition-all hover:shadow-lg order-1 md:order-2 md:-mt-4 relative">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-[#f3e8c9] text-[#71540f] text-[10px] uppercase tracking-widest font-bold shadow-xs flex items-center gap-1">
                  <Trophy className="size-3 text-amber-600" /> Dean's Valedictorian Track
                </div>
                <div className="flex items-center justify-between mb-3 mt-1">
                  <span className="size-9 rounded-full bg-amber-100 text-amber-900 font-mono text-sm font-bold flex items-center justify-center">
                    01
                  </span>
                  <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 text-xs font-semibold text-amber-900">
                    <Sparkles className="size-3.5 text-amber-600" /> Gold Laureate
                  </div>
                </div>
                <h3 className="font-display text-xl font-bold text-[#00110a] truncate">{topThree[0].full_name}</h3>
                <p className="text-xs text-[#5a6660] truncate">{topThree[0].institution}</p>
                <p className="text-[11px] text-[#446557] truncate mt-0.5">{topThree[0].course}</p>

                <div className="flex flex-col gap-1.5 py-3 bg-[#edf6f0] rounded-xl px-3.5 my-3 font-mono text-xs text-[#151d1a]">
                  <div className="flex justify-between items-center">
                    <span className="text-[#5a6660]">Scholastic Power</span>
                    <span className="font-display text-lg font-bold text-[#00110a]">{topThree[0].points.toLocaleString()} pts</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[#5a6660]">Study Velocity</span>
                    <span className="text-[#446557] font-semibold">{Math.round(topThree[0].study_minutes / 60)} hrs</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-[#5a6660] font-mono">
                  <span className="text-[#1b7a4e] font-semibold">1st Honors Track</span>
                  <span className="text-[#446557] font-bold">Yield: {formatNaira(pointsToNaira(topThree[0].points))}</span>
                </div>
              </article>
            )}

            {/* Rank #3 (Bronze Laurel) */}
            {topThree[2] && (
              <article className="flex flex-col rounded-2xl bg-white p-5 shadow-xs border border-[#dce5df] transition-all hover:shadow-md order-3">
                <div className="flex items-center justify-between mb-3">
                  <span className="size-8 rounded-full bg-orange-100 text-amber-950 font-mono text-xs font-bold flex items-center justify-center">
                    03
                  </span>
                  <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#edf6f0] text-xs font-semibold text-[#446557]">
                    <Award className="size-3.5 text-amber-800" /> Bronze Laurel
                  </div>
                </div>
                <h3 className="font-display text-lg font-semibold text-[#00110a] truncate">{topThree[2].full_name}</h3>
                <p className="text-xs text-[#5a6660] truncate">{topThree[2].institution}</p>
                <p className="text-[11px] text-[#446557] truncate mt-0.5">{topThree[2].course}</p>

                <div className="flex flex-col gap-1.5 py-2.5 bg-[#edf6f0] rounded-xl px-3 my-3 font-mono text-xs text-[#151d1a]">
                  <div className="flex justify-between items-center">
                    <span className="text-[#5a6660]">Scholastic Power</span>
                    <span className="font-bold text-[#00110a]">{topThree[2].points.toLocaleString()} pts</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[#5a6660]">Study Velocity</span>
                    <span className="text-[#446557] font-semibold">{Math.round(topThree[2].study_minutes / 60)} hrs</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-[#5a6660] font-mono">
                  <span className="text-[#1b7a4e] font-semibold">Active Contender</span>
                  <span>Yield: {formatNaira(pointsToNaira(topThree[2].points))}</span>
                </div>
              </article>
            )}
          </div>
        ) : null}
      </section>

      {/* Full Ranked Scholars Table */}
      <section className="flex flex-col gap-3 bg-white rounded-2xl shadow-xs border border-[#dce5df] p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#e7f0eb]">
          <div>
            <h2 className="font-display text-xl text-[#00110a] font-semibold">Active Scholar Roster</h2>
            <p className="text-xs text-[#5a6660]">Scholars contending for the top tier grant endowment threshold.</p>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 size-4 text-[#5a6660]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter by scholar name or school..."
              className="pl-9 pr-4 py-2 rounded-full bg-[#edf6f0] text-xs text-[#151d1a] border border-[#dce5df] focus:bg-white focus:outline-none w-64"
            />
          </div>
        </div>

        <div className="w-full overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="text-[#5a6660] uppercase tracking-wider border-b border-[#e7f0eb] font-semibold">
                <th className="py-3 px-3 w-16">Rank</th>
                <th className="py-3 px-3 min-w-[200px]">Scholar & Department</th>
                <th className="py-3 px-3 min-w-[180px]">Institution</th>
                <th className="py-3 px-3 text-right font-mono">Study Velocity</th>
                <th className="py-3 px-3 text-right font-mono">SyllaPoints</th>
                <th className="py-3 px-3 text-right font-mono">Cash Yield</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e7f0eb]">
              {remainingList.map((s) => {
                const isCurrentUser = s.id === user?.id;
                return (
                  <tr
                    key={s.id}
                    className={cn(
                      "hover:bg-[#edf6f0]/50 transition-colors",
                      isCurrentUser ? "bg-[#c6ebd9]/20 font-semibold" : ""
                    )}
                  >
                    <td className="py-3.5 px-3 font-mono font-semibold text-[#00110a]">#{s.rank}</td>
                    <td className="py-3.5 px-3">
                      <div className="flex flex-col">
                        <span className="font-semibold text-[#151d1a]">{s.full_name}</span>
                        <span className="text-[11px] text-[#5a6660]">{s.course}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-3 text-[#5a6660]">{s.institution}</td>
                    <td className="py-3.5 px-3 text-right font-mono text-[#446557]">
                      {Math.round(s.study_minutes / 60)} hrs
                    </td>
                    <td className="py-3.5 px-3 text-right font-mono font-bold text-[#00110a]">
                      {s.points.toLocaleString()} pts
                    </td>
                    <td className="py-3.5 px-3 text-right font-mono text-[#1b7a4e] font-semibold">
                      {formatNaira(pointsToNaira(s.points))}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
