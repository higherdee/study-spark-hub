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
} from "lucide-react";

import { PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useProfile } from "@/lib/profile";
import { getLeaderboardServerFn } from "@/lib/upload.functions";
import { POINTS_NAME } from "@/lib/constants";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/dashboard/leaderboard")({
  head: () => ({
    meta: [
      { title: "Academic Leaderboard — Syllaboss" },
      { name: "description", content: "Top students across Nigerian institutions ranked by SyllaPoints, study hours, and verified uploads." },
    ],
  }),
  component: LeaderboardPage,
});

function LeaderboardPage() {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const [filterMySchool, setFilterMySchool] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["leaderboard"],
    queryFn: async () => {
      const res = await getLeaderboardServerFn();
      return res.leaderboard;
    },
    refetchInterval: 60000,
  });

  const fullList = data ?? [];
  const filteredList = filterMySchool && profile?.institution
    ? fullList.filter((s) => s.institution.toLowerCase().includes(profile.institution!.toLowerCase()))
    : fullList;

  const topThree = filteredList.slice(0, 3);
  const remainingList = filteredList.slice(3);

  // Student's own rank
  const myRankIndex = fullList.findIndex((s) => s.id === user?.id);
  const myRank = myRankIndex !== -1 ? myRankIndex + 1 : null;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <PageHeader
        eyebrow="Academic Rankings"
        title="Student Leaderboard"
      >
        <div className="flex items-center gap-2">
          {profile?.institution && (
            <Button
              variant={filterMySchool ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterMySchool((f) => !f)}
              className="rounded-full text-xs font-semibold gap-1.5 h-8"
            >
              <Filter className="size-3" />
              {filterMySchool ? "Showing My Institution" : "Filter by My School"}
            </Button>
          )}
        </div>
      </PageHeader>

      {/* Student Personal Standing Capsule */}
      {profile && (
        <div className="rounded-3xl border border-primary/30 bg-primary/5 p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="grid size-11 place-items-center rounded-2xl bg-primary text-primary-foreground font-display font-bold text-base shadow-xs">
              {myRank ? `#${myRank}` : "—"}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-display text-base font-bold text-foreground">
                  {profile.full_name || "Your Standing"}
                </span>
                {profile.sylla_plus && (
                  <span className="rounded-full bg-amber-500/20 border border-amber-500/30 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                    SyllaPlus
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {profile.institution || "Campus"} · {profile.course || "General Course"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-5 text-right">
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase">Your Points</p>
              <p className="font-display text-xl font-bold text-primary">
                {profile.points.toLocaleString()} {POINTS_NAME}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase">Study Time</p>
              <p className="font-display text-base font-semibold text-foreground">
                {Math.round((profile.study_minutes || 0) / 60)} hrs
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Top 3 Podium */}
      {topThree.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-3 pt-2">
          {topThree.map((scholar, idx) => {
            const place = idx + 1;
            const medalColors =
              place === 1
                ? "border-amber-500/40 bg-gradient-to-b from-amber-500/10 via-amber-500/5 to-card"
                : place === 2
                ? "border-slate-300 bg-gradient-to-b from-slate-200/50 via-slate-100/30 to-card"
                : "border-amber-700/30 bg-gradient-to-b from-amber-700/10 via-amber-700/5 to-card";

            return (
              <div
                key={scholar.id}
                className={cn(
                  "relative rounded-3xl border p-5 shadow-xs flex flex-col justify-between transition-all hover:shadow-soft",
                  medalColors
                )}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="grid size-7 place-items-center rounded-full bg-background border font-mono font-bold text-xs">
                      #{place}
                    </span>
                    {place === 1 ? (
                      <Trophy className="size-5 text-amber-500" />
                    ) : place === 2 ? (
                      <Medal className="size-5 text-slate-500" />
                    ) : (
                      <Award className="size-5 text-amber-700" />
                    )}
                  </div>

                  <h3 className="font-display text-base font-bold text-foreground mt-3 truncate">
                    {scholar.full_name}
                  </h3>
                  <p className="text-xs text-muted-foreground truncate">{scholar.institution}</p>
                  <p className="text-[11px] text-muted-foreground/80 truncate mt-0.5">{scholar.course}</p>
                </div>

                <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between text-xs">
                  <span className="font-bold text-primary flex items-center gap-1">
                    <Coins className="size-3.5" /> {scholar.points.toLocaleString()} pts
                  </span>
                  <span className="text-muted-foreground font-medium">
                    {Math.round(scholar.study_minutes / 60)}h study
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Full Leaderboard Table */}
      <div className="rounded-3xl border border-border/80 bg-card overflow-hidden shadow-xs">
        <div className="border-b border-border/60 p-4 bg-secondary/20 flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Ranked Scholars ({filteredList.length})
          </span>
          <span className="text-xs text-muted-foreground">
            Updated live · Top contributors
          </span>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-xs text-muted-foreground">
            Loading academic rankings...
          </div>
        ) : filteredList.length === 0 ? (
          <div className="p-8 text-center text-xs text-muted-foreground">
            No scholars ranked yet. Study or upload materials to take the lead!
          </div>
        ) : (
          <div className="divide-y divide-border/60">
            {remainingList.map((s) => {
              const isCurrentUser = s.id === user?.id;
              return (
                <div
                  key={s.id}
                  className={cn(
                    "flex items-center justify-between gap-4 p-4 text-xs transition-colors",
                    isCurrentUser ? "bg-primary/5 font-semibold" : "hover:bg-secondary/30"
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="grid size-7 shrink-0 place-items-center rounded-full bg-secondary font-mono text-xs font-bold text-muted-foreground">
                      #{s.rank}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="font-medium text-foreground truncate">{s.full_name}</span>
                        {isCurrentUser && (
                          <span className="rounded-full bg-primary/10 text-primary text-[10px] px-1.5 py-0.2 font-bold">
                            You
                          </span>
                        )}
                        {s.sylla_plus && (
                          <span className="rounded-full bg-amber-500/20 text-amber-700 text-[10px] px-1.5 py-0.2 font-bold">
                            Plus
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {s.institution} · {s.course}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0 text-right">
                    <div>
                      <p className="font-bold text-foreground">{s.points.toLocaleString()} pts</p>
                      <p className="text-[10px] text-muted-foreground">{Math.round(s.study_minutes / 60)} hrs study</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
