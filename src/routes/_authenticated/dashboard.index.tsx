import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BookOpen,
  Bot,
  Calendar,
  CheckCircle2,
  ChevronDown,
  Clock,
  Coins,
  Download,
  Eye,
  FileText,
  GraduationCap,
  Layers,
  MoreVertical,
  Plus,
  Sparkles,
  Timer,
  TrendingUp,
  Upload,
  Wallet,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { getMaterials, getPointsLedger } from "@/integrations/turso/client";
import { useProfile } from "@/lib/profile";
import { POINTS_NAME, PLAN_NAME } from "@/lib/constants";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/dashboard/")({
  head: () => ({
    meta: [
      { title: "Home — Syllaboss" },
      { name: "description", content: "Your student academic command center on Syllaboss." },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const [graphMode, setGraphMode] = useState<"study" | "points">("study");

  const { data: materials = [] } = useQuery({
    queryKey: ["my-materials", user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      if (!user) return [];
      return await getMaterials({ userId: user.id });
    },
  });

  const { data: ledger = [] } = useQuery({
    queryKey: ["my-ledger", user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      if (!user) return [];
      return await getPointsLedger(user.id);
    },
  });

  const verified = materials.filter((m) => m.status === "verified").length;
  const pending = materials.filter((m) => m.status === "pending").length;
  const totalDownloads = materials.reduce((acc, m) => acc + (m.downloads || 0), 0);
  const totalViews = materials.reduce((acc, m) => acc + (m.views || 0), 0);

  const points = profile?.points ?? 0;
  const studyMins = profile?.study_minutes ?? 0;
  const studyHours = (studyMins / 60).toFixed(1);

  // Time-of-day greeting (Screenshot 2: "Good evening [name]")
  const hour = new Date().getHours();
  const greeting =
    hour < 12
      ? "Good morning"
      : hour < 17
      ? "Good afternoon"
      : "Good evening";

  const firstName =
    profile?.full_name?.split(" ")[0] ||
    user?.email?.split("@")[0] ||
    "Scholar";

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* 1. Header Greeting (matching Screenshot 2: "Good evening [name]") */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            {greeting}, {firstName}
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
            {profile?.institution ? `${profile.institution} · ${profile.course || "Undergraduate"}` : "Welcome to your student command center"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm" className="rounded-full text-xs font-semibold h-9 px-4 border-border/80">
            <Link to="/dashboard/library">
              <BookOpen className="size-3.5 mr-1 text-primary" /> Library
            </Link>
          </Button>
          <Button asChild size="sm" className="rounded-full text-xs font-semibold h-9 px-4 shadow-xs">
            <Link to="/dashboard/upload">
              <Upload className="size-3.5 mr-1" /> Upload & Earn
            </Link>
          </Button>
        </div>
      </div>

      {/* 2. High-Impact Useful CTA Banner (matching Screenshot 2) */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-600 via-indigo-600 to-amber-500 p-6 sm:p-7 text-white shadow-lg">
        <div className="relative z-10 max-w-xl space-y-2">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-0.5 text-xs font-semibold backdrop-blur-md">
            <Sparkles className="size-3.5 text-amber-300" />
            <span>Earn 25 SyllaPoints per verified upload</span>
          </div>

          <h2 className="font-display text-xl sm:text-2xl font-bold tracking-tight">
            Share your lecture notes & past questions
          </h2>
          <p className="text-xs sm:text-sm text-white/90 leading-relaxed max-w-md">
            Help students in your department prepare for semester exams. Upload verified materials to earn cashable points every time someone reads or downloads.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-3">
            <Button
              asChild
              className="rounded-full bg-white text-indigo-900 hover:bg-white/90 font-bold text-xs px-5 h-10 shadow-sm"
            >
              <Link to="/dashboard/upload">
                Upload notes now <ArrowRight className="size-3.5 ml-1" />
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="rounded-full bg-white/10 hover:bg-white/20 text-white border-white/30 font-medium text-xs px-4 h-10"
            >
              <Link to="/dashboard/assistant">
                Study with Boss AI
              </Link>
            </Button>
          </div>
        </div>

        {/* Subtle geometric gradient glow */}
        <div className="pointer-events-none absolute -right-12 -bottom-12 size-64 rounded-full bg-white/10 blur-2xl" />
      </div>

      {/* 3. Interactive Analytics Graph Card (matching Screenshot 2 with Study vs Syllapoints toggle) */}
      <div className="rounded-3xl border border-border/80 bg-card p-5 sm:p-6 shadow-xs">
        <div className="flex items-center justify-between gap-4 pb-4 border-b border-border/60">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {graphMode === "study" ? "Study Activity" : "SyllaPoints Growth"}
            </span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="font-display text-3xl font-bold tracking-tight text-foreground">
                {graphMode === "study" ? `${studyHours} hrs` : `${points.toLocaleString()} pts`}
              </span>
              <span className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                <ChevronDown className="size-3" /> Last 30 days
              </span>
            </div>
          </div>

          {/* Toggle buttons: Study vs SyllaPoints (replaces NGN vs USD) */}
          <div className="flex items-center rounded-2xl border border-border/80 bg-secondary/40 p-1">
            <button
              onClick={() => setGraphMode("study")}
              className={cn(
                "rounded-xl px-3 py-1.5 text-xs font-semibold transition-all flex items-center gap-1.5",
                graphMode === "study"
                  ? "bg-card text-foreground shadow-xs font-bold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Timer className="size-3.5 text-primary" /> Study Hours
            </button>
            <button
              onClick={() => setGraphMode("points")}
              className={cn(
                "rounded-xl px-3 py-1.5 text-xs font-semibold transition-all flex items-center gap-1.5",
                graphMode === "points"
                  ? "bg-card text-foreground shadow-xs font-bold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Coins className="size-3.5 text-amber-500" /> SyllaPoints
            </button>
          </div>
        </div>

        {/* Minimalist Chart Graphic (Matching Screenshot 2) */}
        <div className="mt-6 h-36 w-full flex flex-col justify-end">
          <div className="relative h-28 w-full border-b border-dashed border-border/70">
            {/* SVG Trend Line */}
            <svg className="h-full w-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 40">
              <path
                d={
                  graphMode === "study"
                    ? "M 0 38 Q 25 35, 50 25 T 100 12"
                    : "M 0 38 Q 30 30, 60 18 T 100 8"
                }
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                className="text-primary transition-all duration-500"
              />
              <path
                d={
                  graphMode === "study"
                    ? "M 0 38 Q 25 35, 50 25 T 100 12 L 100 40 L 0 40 Z"
                    : "M 0 38 Q 30 30, 60 18 T 100 8 L 100 40 L 0 40 Z"
                }
                fill="currentColor"
                className="text-primary/10 transition-all duration-500"
              />
            </svg>
          </div>

          {/* Date Axis */}
          <div className="mt-2 flex items-center justify-between text-[11px] font-mono text-muted-foreground">
            <span>Sep 3</span>
            <span>Sep 18</span>
            <span>Oct 3</span>
          </div>
        </div>
      </div>

      {/* 4. Points Balance Card (matching Screenshot 2: no naira everywhere) */}
      <div className="rounded-3xl border border-border/80 bg-card p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              SyllaPoints Balance
            </h3>
            <p className="mt-1 font-display text-3xl font-bold tracking-tight text-foreground">
              {points.toLocaleString()} <span className="text-sm font-normal text-muted-foreground">pts</span>
            </p>
          </div>

          <Button
            asChild
            className="rounded-2xl h-10 px-5 text-xs font-semibold shadow-xs"
          >
            <Link to="/dashboard/wallet">
              <Wallet className="size-3.5 mr-1.5" /> Withdraw funds
            </Link>
          </Button>
        </div>

        {/* Balance Sub-indicators */}
        <div className="flex flex-wrap items-center gap-6 pt-2 border-t border-border/60 text-xs">
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-primary" />
            <span className="text-muted-foreground">Available:</span>
            <span className="font-semibold text-foreground">{points.toLocaleString()} pts</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-amber-500" />
            <span className="text-muted-foreground">Pending Review:</span>
            <span className="font-semibold text-foreground">{pending * 25} pts</span>
          </div>

          <div className="ml-auto text-muted-foreground text-[11px]">
            Min withdrawal: 17,500 pts
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 5. OVERVIEW SECTION (Strictly matching Screenshots 3 & 4) */}
      {/* ========================================================= */}
      <div className="pt-4 space-y-5">
        {/* Overview Header with Date Filter Pills */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-xl sm:text-2xl font-bold text-foreground">
            Overview
          </h2>

          <div className="flex items-center gap-2 text-xs">
            <div className="flex items-center gap-1.5 rounded-xl border border-border/80 bg-card px-3 py-1.5 text-muted-foreground font-medium shadow-2xs">
              <span>Last 3 months</span>
              <ChevronDown className="size-3.5" />
            </div>

            <div className="hidden sm:flex items-center gap-1.5 rounded-xl border border-border/80 bg-card px-3 py-1.5 text-muted-foreground font-medium shadow-2xs">
              <Calendar className="size-3.5" />
              <span>5 Jul 2026 to 3 Oct 2026</span>
            </div>

            <button
              onClick={() => {}}
              className="flex items-center gap-1 rounded-xl border border-border/80 bg-card px-2.5 py-1.5 text-muted-foreground hover:text-foreground text-xs font-medium"
            >
              <MoreVertical className="size-3.5" />
              <span>Customize</span>
            </button>
          </div>
        </div>

        {/* 3 Metric Cards Grid (Matching Screenshot 3 & 4) */}
        <div className="grid gap-4 sm:grid-cols-3">
          {/* Card 1: Gross Volume / Total Earned */}
          <div className="rounded-3xl border border-border/80 bg-card p-5 shadow-xs flex flex-col justify-between min-h-36">
            <div>
              <p className="text-xs font-semibold text-muted-foreground">Gross Volume</p>
              <p className="mt-1 font-display text-2xl font-bold text-foreground">
                {points.toLocaleString()} pts
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-dashed border-border/60 flex items-center justify-center">
              <span className="rounded-full bg-secondary/80 px-3 py-1 text-[11px] font-medium text-muted-foreground">
                Verified rewards active
              </span>
            </div>
          </div>

          {/* Card 2: Net Volume / Active Balance */}
          <div className="rounded-3xl border border-border/80 bg-card p-5 shadow-xs flex flex-col justify-between min-h-36">
            <div>
              <p className="text-xs font-semibold text-muted-foreground">Net Volume</p>
              <p className="mt-1 font-display text-2xl font-bold text-foreground">
                {points.toLocaleString()} pts
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-dashed border-border/60 flex items-center justify-center">
              <span className="rounded-full bg-secondary/80 px-3 py-1 text-[11px] font-medium text-muted-foreground">
                Available for withdrawal
              </span>
            </div>
          </div>

          {/* Card 3: New Customers / Peer Reads */}
          <div className="rounded-3xl border border-border/80 bg-card p-5 shadow-xs flex flex-col justify-between min-h-36">
            <div>
              <p className="text-xs font-semibold text-muted-foreground">New Peer Reads</p>
              <p className="mt-1 font-display text-2xl font-bold text-foreground">
                {totalDownloads + totalViews}
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-dashed border-border/60 flex items-center justify-center">
              <span className="rounded-full bg-secondary/80 px-3 py-1 text-[11px] font-medium text-muted-foreground">
                {totalDownloads} direct downloads
              </span>
            </div>
          </div>
        </div>

        {/* Bottom 2 Detailed Fintech Cards (Matching Screenshot 3 & 4) */}
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Card 4: Activity Breakdown */}
          <div className="rounded-3xl border border-border/80 bg-card p-5 sm:p-6 shadow-xs space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Activity Breakdown
            </h3>

            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2">
                  <span className="size-2.5 rounded-full bg-emerald-500" />
                  <span className="font-medium text-foreground">Verified Uploads (+25 pts)</span>
                </span>
                <span className="font-bold text-foreground">{verified * 25} pts ({verified} files)</span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2">
                  <span className="size-2.5 rounded-full bg-amber-500" />
                  <span className="font-medium text-foreground">Pending Review</span>
                </span>
                <span className="font-bold text-muted-foreground">{pending} files awaiting audit</span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2">
                  <span className="size-2.5 rounded-full bg-indigo-500" />
                  <span className="font-medium text-foreground">Study Sessions (+5 pts/30m)</span>
                </span>
                <span className="font-bold text-foreground">{Math.floor(studyMins / 30) * 5} pts ({studyHours} hrs)</span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2">
                  <span className="size-2.5 rounded-full bg-rose-500" />
                  <span className="font-medium text-foreground">Peer Downloads (+5 pts)</span>
                </span>
                <span className="font-bold text-foreground">{totalDownloads * 5} pts ({totalDownloads} downloads)</span>
              </div>
            </div>
          </div>

          {/* Card 5: Revenue / Study History (Monthly columns from Screenshot 3) */}
          <div className="rounded-3xl border border-border/80 bg-card p-5 sm:p-6 shadow-xs space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Semester Activity History
            </h3>

            <div className="grid grid-cols-3 gap-3 pt-2">
              <div className="rounded-2xl border border-border/60 bg-secondary/20 p-3 text-center flex flex-col justify-between h-28">
                <span className="text-xs font-semibold text-foreground">August</span>
                <div className="h-10 w-full rounded-md bg-secondary/60 flex items-center justify-center text-[10px] text-muted-foreground">
                  Semester Break
                </div>
                <span className="font-mono text-xs text-muted-foreground">0 pts</span>
              </div>

              <div className="rounded-2xl border border-border/60 bg-secondary/20 p-3 text-center flex flex-col justify-between h-28">
                <span className="text-xs font-semibold text-foreground">September</span>
                <div className="h-10 w-full rounded-md bg-primary/20 flex items-center justify-center text-[10px] font-semibold text-primary">
                  Midterm
                </div>
                <span className="font-mono text-xs text-foreground font-semibold">
                  {Math.round(points * 0.4)} pts
                </span>
              </div>

              <div className="rounded-2xl border border-primary/40 bg-primary/5 p-3 text-center flex flex-col justify-between h-28">
                <span className="text-xs font-bold text-primary">October</span>
                <div className="h-10 w-full rounded-md bg-primary/30 flex items-center justify-center text-[10px] font-bold text-primary">
                  Active
                </div>
                <span className="font-mono text-xs text-primary font-bold">
                  {points} pts
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Card 6: Latest Payment / Activity Ledger (Screenshot 3 & 4) */}
        <div className="rounded-3xl border border-border/80 bg-card p-5 sm:p-6 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Latest Activity & Ledger
            </h3>
            <Link to="/dashboard/wallet" className="text-xs text-primary font-medium hover:underline">
              View wallet statements
            </Link>
          </div>

          {ledger.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground space-y-1">
              <p className="font-medium text-foreground">No recent activity yet</p>
              <p>Earnings from study sessions and verified uploads will appear here.</p>
            </div>
          ) : (
            <div className="divide-y divide-border/60">
              {ledger.slice(0, 5).map((entry: { id: string; reason: string; amount: number; created_at: string }) => (
                <div key={entry.id} className="flex items-center justify-between py-2.5 text-xs">
                  <div>
                    <p className="font-medium text-foreground">{entry.reason}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {new Date(entry.created_at).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <span className="font-bold text-primary">
                    +{entry.amount} pts
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
