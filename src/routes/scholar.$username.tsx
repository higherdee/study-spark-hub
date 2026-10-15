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
        content: `Inspect @${params.username}'s campus ranking, daily study streak, and battle win-rate on Syllaboss.`,
      },
      {
        property: "og:title",
        content: `@${params.username} on Syllaboss Campus Wrapped`,
      },
      {
        property: "og:description",
        content: `Certified scholar standing, quiz battle win-rate, and AI archetype on Syllaboss.`,
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
      <div className="min-h-screen bg-background text-ink flex flex-col items-center justify-center p-6">
        <Loader2 className="size-9 animate-spin text-forest mb-3" />
        <p className="text-xs text-ink-soft font-semibold font-serif">Consulting Academic Registry...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-background text-ink flex flex-col items-center justify-center p-6 text-center">
        <div className="size-16 rounded-2xl bg-surface-container-high grid place-items-center mb-4 text-ink-soft border border-border">
          <GraduationCap className="size-8" />
        </div>
        <h2 className="font-display text-2xl font-bold text-ink">Scholar Record Not Found</h2>
        <p className="text-xs text-ink-soft max-w-sm mt-1.5 mb-6 leading-relaxed">
          No scholar matching "@{username}" was found in the register. Verify the handle or register on Syllaboss to publish your folio.
        </p>
        <Button asChild className="rounded-full bg-forest hover:bg-ink text-white font-semibold text-xs px-6 lift press">
          <Link to="/">Explore Syllaboss</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-ink flex flex-col justify-between selection:bg-brand selection:text-white">
      {/* Top Ledger Navbar */}
      <header className="border-b border-border backdrop-blur-md sticky top-0 z-40 bg-background/85 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <SyllabossLogo />
        </Link>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            asChild
            className="rounded-full bg-forest hover:bg-ink text-white font-semibold text-xs shadow-xs px-4 lift press"
          >
            <Link to="/auth">
              <span>Join Registry</span>
              <ArrowRight className="size-3.5 ml-1.5" />
            </Link>
          </Button>
        </div>
      </header>

      {/* Main Folio Showcase */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-8 sm:py-12 space-y-10">
        {/* Hero Section */}
        <div className="text-center space-y-2 max-w-xl mx-auto">
          <Badge variant="outline" className="border-brass/40 bg-brass/10 text-brass text-[10px] font-bold uppercase tracking-wider">
            Academic Ledger · 2026 Standing
          </Badge>
          <h1 className="font-display text-3xl sm:text-4xl font-normal text-ink tracking-tight">
            Folio of Scholar @{data.user.username}
          </h1>
          <p className="text-xs sm:text-sm text-ink-soft leading-relaxed">
            Officially standing in the <strong className="text-forest font-bold font-serif">Top {data.departmentPercentile}%</strong> of {data.user.course} at {data.user.institution}.
          </p>
        </div>

        {/* 9:16 Flex Story Card & Challenge Column */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left: The Visual 9:16 Story Folio */}
          <div className="lg:col-span-6 flex justify-center">
            <ScholarFlexCard data={data} showActions={true} />
          </div>

          {/* Right: Challenge This Scholar & Campus Pitch */}
          <div className="lg:col-span-6 space-y-5 lg:pt-2">
            {/* Challenge Callout Card */}
            <div className="p-6 rounded-3xl bg-card border border-border shadow-[var(--elev-2)] space-y-4">
              <div className="flex items-center justify-between">
                <div className="size-11 rounded-2xl bg-forest text-brass-soft grid place-items-center shadow-xs">
                  <Swords className="size-5" />
                </div>
                <Badge variant="outline" className="border-border bg-surface-container-low text-[10px] text-ink-soft font-mono">
                  1v1 ARENA
                </Badge>
              </div>

              <div>
                <h3 className="font-display text-xl font-bold text-ink">
                  Challenge @{data.user.username} to a Study Duel
                </h3>
                <p className="text-xs text-ink-soft mt-1.5 leading-relaxed">
                  Join students from <strong>{data.user.institution}</strong> on Syllaboss. Challenge coursemates to live quiz battles, build your study streak, and publish your own verified Campus Wrapped card.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 pt-1">
                <Button
                  asChild
                  className="h-10 rounded-2xl bg-forest hover:bg-ink text-white font-semibold text-xs shadow-xs gap-2 flex-1 lift press"
                >
                  <Link to="/auth">
                    <Swords className="size-4 text-brass-soft" />
                    <span>Enter Battle Arena</span>
                  </Link>
                </Button>

                <Button
                  variant="outline"
                  asChild
                  className="h-10 rounded-2xl border-border bg-card hover:bg-surface-container-low text-ink font-semibold text-xs gap-1.5 lift press"
                >
                  <Link to="/dashboard/leaderboard">
                    <Trophy className="size-4 text-brass" />
                    <span>Campus Leaderboard</span>
                  </Link>
                </Button>
              </div>
            </div>

            {/* AI Archetype Highlight Card */}
            <div className="p-5 rounded-3xl bg-surface-container-low border border-border space-y-2">
              <div className="flex items-center justify-between">
                <span className="eyebrow text-ink-soft">
                  Academic Archetype
                </span>
                <span className="text-2xl">{data.archetype.badgeEmoji}</span>
              </div>

              <h4 className="font-display text-lg font-bold text-ink">
                {data.archetype.title}
              </h4>
              <p className="text-xs font-semibold text-forest">{data.archetype.tagline}</p>
              <p className="text-xs italic font-serif text-ink-soft leading-relaxed pt-0.5">
                "{data.archetype.quote}"
              </p>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-4 rounded-2xl bg-card border border-border space-y-1">
                <div className="flex items-center gap-1.5 text-brass font-bold">
                  <Flame className="size-3.5" />
                  <span className="eyebrow text-brass">Streak</span>
                </div>
                <p className="text-xl font-bold font-mono text-ink tnum">{data.user.currentStreak} Days</p>
                <p className="text-[10px] text-ink-soft">Consecutive study sessions</p>
              </div>

              <div className="p-4 rounded-2xl bg-card border border-border space-y-1">
                <div className="flex items-center gap-1.5 text-brand font-bold">
                  <Swords className="size-3.5" />
                  <span className="eyebrow text-brand">Arena Wins</span>
                </div>
                <p className="text-xl font-bold font-mono text-ink tnum">{data.battleWinRate}%</p>
                <p className="text-[10px] text-ink-soft">{data.battlesWon} arena victories</p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Ledger Footer */}
      <footer className="border-t border-border py-6 px-4 text-center text-xs text-ink-soft space-y-1 bg-surface-container-lowest">
        <p className="font-semibold text-ink">Syllaboss · Academic Infrastructure for University Students</p>
        <p className="text-[11px] text-muted-foreground">Certified past questions, multiplayer quiz arenas, and campus courseware library.</p>
      </footer>
    </div>
  );
}

export default PublicScholarProfilePage;
