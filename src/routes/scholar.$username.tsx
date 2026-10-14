import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Trophy,
  Swords,
  Flame,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  GraduationCap,
  Share2,
  BookOpen,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { SyllabossLogo } from "@/components/syllaboss-logo";
import { ScholarFlexCard } from "@/components/scholar/scholar-flex-card";
import { getScholarFlexDataServerFn } from "@/lib/scholar.functions";

export const Route = createFileRoute("/scholar/$username")({
  head: ({ params }) => ({
    meta: [
      { title: `@${params.username} — Campus Wrapped & Scholar Profile | Syllaboss` },
      {
        name: "description",
        content: `Check @${params.username}'s campus ranking, daily study streak, and battle win-rate on Syllaboss.`,
      },
      {
        property: "og:title",
        content: `@${params.username} on Syllaboss Campus Wrapped`,
      },
      {
        property: "og:description",
        content: `Top scholar stats, battle win-rate, and AI archetype on Syllaboss.`,
      },
    ],
  }),
  component: PublicScholarProfilePage,
});

export function PublicScholarProfilePage() {
  const { username } = useParams({ from: "/scholar/$username" });

  const { data, isLoading } = useQuery({
    queryKey: ["public-scholar-profile", username],
    queryFn: async () => {
      return await getScholarFlexDataServerFn({ data: { username } });
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#070B14] text-white flex flex-col items-center justify-center p-6">
        <Loader2 className="size-10 animate-spin text-emerald-400 mb-3" />
        <p className="text-sm text-white/70 font-semibold">Loading Scholar Profile...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-[#070B14] text-white flex flex-col items-center justify-center p-6 text-center">
        <GraduationCap className="size-16 text-white/30 mb-4" />
        <h2 className="text-xl font-bold">Scholar Not Found</h2>
        <p className="text-xs text-white/60 max-w-sm mt-1 mb-6">
          No scholar matching "@{username}" was found. Check the spelling or join Syllaboss to create your own profile!
        </p>
        <Button asChild className="rounded-full bg-emerald-500 hover:bg-emerald-600 text-black font-bold">
          <Link to="/">Explore Syllaboss</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070B14] text-white flex flex-col justify-between selection:bg-emerald-500 selection:text-black">
      {/* Top Navbar */}
      <header className="border-b border-white/10 backdrop-blur-md sticky top-0 z-40 bg-[#070B14]/80 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <SyllabossLogo />
        </Link>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            asChild
            className="rounded-full bg-emerald-500 hover:bg-emerald-600 text-black font-extrabold text-xs shadow-md shadow-emerald-500/20"
          >
            <Link to="/auth">
              <span>Join Syllaboss</span>
              <ArrowRight className="size-3.5 ml-1" />
            </Link>
          </Button>
        </div>
      </header>

      {/* Main Showcase */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-8 sm:py-12 space-y-10">
        {/* Hero Banner */}
        <div className="text-center space-y-2 max-w-xl mx-auto">
          <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/40 text-[10px] font-black uppercase tracking-wider">
            Campus Wrapped 2026 Showcase
          </Badge>
          <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
            Meet Scholar @{data.user.username}
          </h1>
          <p className="text-xs sm:text-sm text-white/70 leading-relaxed">
            Ranked <strong className="text-amber-400">Top {data.departmentPercentile}%</strong> in {data.user.course} at {data.user.institution}.
          </p>
        </div>

        {/* 9:16 Flex Story Card & Challenge CTA */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left: The Visual 9:16 Flex Card */}
          <div className="lg:col-span-6 flex justify-center">
            <ScholarFlexCard data={data} showActions={true} />
          </div>

          {/* Right: Challenge This Scholar & Campus Viral Pitch */}
          <div className="lg:col-span-6 space-y-6 lg:pt-4">
            {/* Viral Challenge Box */}
            <div className="p-6 rounded-3xl bg-gradient-to-br from-amber-500/20 via-white/[0.03] to-emerald-500/15 border-2 border-amber-500/40 shadow-2xl space-y-4">
              <div className="size-12 rounded-2xl bg-amber-500 text-black grid place-items-center shadow-lg shadow-amber-500/30">
                <Swords className="size-6" />
              </div>

              <div>
                <h3 className="text-xl font-black text-white">
                  Think you can outrank @{data.user.username}?
                </h3>
                <p className="text-xs text-white/80 mt-1.5 leading-relaxed">
                  Join students from <strong>{data.user.institution}</strong> on Syllaboss. Challenge peers to real-time multiplayer study battles, build your study streak, and flex your own Campus Wrapped card!
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 pt-2">
                <Button
                  asChild
                  className="h-11 rounded-2xl bg-amber-500 hover:bg-amber-600 text-black font-black text-xs sm:text-sm shadow-xl shadow-amber-500/20 gap-2 flex-1"
                >
                  <Link to="/auth">
                    <Swords className="size-4" />
                    <span>Challenge in Battle Arena</span>
                  </Link>
                </Button>

                <Button
                  variant="outline"
                  asChild
                  className="h-11 rounded-2xl border-white/20 bg-white/5 hover:bg-white/10 text-white font-bold text-xs gap-1.5"
                >
                  <Link to="/dashboard/leaderboard">
                    <Trophy className="size-4 text-amber-400" />
                    <span>View Campus Leaderboard</span>
                  </Link>
                </Button>
              </div>
            </div>

            {/* AI Archetype Highlight Card */}
            <div className="p-5 rounded-3xl bg-white/[0.04] border border-white/10 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest text-violet-400">
                  Boss AI Archetype Assigned
                </span>
                <span className="text-2xl">{data.archetype.badgeEmoji}</span>
              </div>

              <h4 className="text-lg font-black text-white">
                {data.archetype.title}
              </h4>
              <p className="text-xs font-bold text-violet-300">{data.archetype.tagline}</p>
              <p className="text-xs italic text-white/70 leading-relaxed">
                "{data.archetype.quote}"
              </p>
            </div>

            {/* Quick Stats Summary */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-1">
                <div className="flex items-center gap-1.5 text-amber-400 font-bold">
                  <Flame className="size-3.5 fill-amber-400" />
                  <span>Daily Streak</span>
                </div>
                <p className="text-xl font-black text-white">{data.user.currentStreak} Days</p>
                <p className="text-[10px] text-white/50">Consecutive reading streak</p>
              </div>

              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-1">
                <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                  <Swords className="size-3.5" />
                  <span>Battle Win-Rate</span>
                </div>
                <p className="text-xl font-black text-white">{data.battleWinRate}%</p>
                <p className="text-[10px] text-white/50">{data.battlesWon} victories</p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 py-6 px-4 text-center text-xs text-white/50 space-y-1">
        <p className="font-bold text-white/70">Syllaboss · Academic Infrastructure for University Students</p>
        <p className="text-[11px]">Free past questions, multiplayer quizzes, and academic library sharing.</p>
      </footer>
    </div>
  );
}

export default PublicScholarProfilePage;
