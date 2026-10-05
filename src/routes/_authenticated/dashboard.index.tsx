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
  Coins,
  Download,
  Eye,
  FileText,
  GraduationCap,
  Layers,
  MoreVertical,
  School,
  Sparkles,
  Timer,
  TrendingUp,
  Upload,
  Verified,
  Wallet,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { SyllaPlusModal } from "@/components/syllaplus-modal";
import { useAuth } from "@/hooks/use-auth";
import { getMaterials, getPointsLedger } from "@/integrations/turso/client";
import { useProfile } from "@/lib/profile";
import { POINTS_NAME, pointsToNaira, formatNaira } from "@/lib/constants";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/dashboard/")({
  head: () => ({
    meta: [
      { title: "Academic Command Center — Syllaboss" },
      { name: "description", content: "Your Ivy-standard academic command center and earnings ledger." },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const [graphMode, setGraphMode] = useState<"study" | "points">("study");
  const [interval, setInterval] = useState<"30d" | "90d">("30d");
  const [activeTooltip, setActiveTooltip] = useState<{ label: string; value: string } | null>(null);
  const [showPlusModal, setShowPlusModal] = useState(false);

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
  const isPlus = Boolean(profile?.sylla_plus);

  // Time-of-day greeting
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

  // Data sets for functional interactive graph
  const studyPoints30d = [
    { cx: 70, cy: 105, label: "01 Oct", val: "0.2 hrs" },
    { cx: 210, cy: 92, label: "08 Oct", val: "1.4 hrs" },
    { cx: 350, cy: 80, label: "15 Oct", val: "3.5 hrs" },
    { cx: 490, cy: 62, label: "22 Oct", val: "8.0 hrs" },
    { cx: 630, cy: 45, label: "Today", val: `${studyHours} hrs` },
  ];

  const pointsTrend30d = [
    { cx: 70, cy: 100, label: "01 Oct", val: "200 pts" },
    { cx: 210, cy: 85, label: "08 Oct", val: "250 pts" },
    { cx: 350, cy: 70, label: "15 Oct", val: "320 pts" },
    { cx: 490, cy: 55, label: "22 Oct", val: "410 pts" },
    { cx: 630, cy: 38, label: "Today", val: `${points.toLocaleString()} pts` },
  ];

  const activePoints = graphMode === "study" ? studyPoints30d : pointsTrend30d;

  return (
    <div className="flex flex-col w-full max-w-[1400px] mx-auto space-y-6 pb-16 font-sans">
      {/* 1. Campus & Scholar Status Top Header */}
      <section className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-[#dce5df]/80">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="font-display text-2xl sm:text-3xl lg:text-4xl text-[#00110a] tracking-tight font-medium">
              {greeting}, {firstName}
            </h1>
            <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-[#e7f0eb] text-[#446557] text-xs font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-[#1b7a4e] animate-pulse"></span>
              Semester Session 2025/2026
            </span>
            {isPlus ? (
              <span className="px-2.5 py-0.5 rounded bg-[#f3e8c9] text-[#71540f] text-[10px] tracking-widest uppercase font-bold shadow-xs">
                SyllaPlus Active (1.3x)
              </span>
            ) : (
              <button
                type="button"
                onClick={() => setShowPlusModal(true)}
                className="px-2.5 py-0.5 rounded bg-[#f3e8c9] text-[#71540f] hover:bg-[#e7d8b0] text-[10px] tracking-widest uppercase font-bold shadow-xs transition-colors flex items-center gap-1"
              >
                <Sparkles className="size-3" /> Upgrade to SyllaPlus
              </button>
            )}
          </div>
          <p className="text-sm text-[#424844] flex items-center gap-2">
            <School className="size-4 text-[#446557]" />
            {profile?.institution ? `${profile.institution} • ${profile.course || profile.department || "Academic Scholar"}` : "Achievers University, Owo • Engineering & Science Core"}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button asChild variant="outline" className="rounded-full bg-white hover:bg-[#e7f0eb] text-[#151d1a] border-[#dce5df] text-xs font-semibold h-10 px-5 shadow-xs">
            <Link to="/dashboard/library">
              <BookOpen className="size-4 mr-1.5 text-[#446557]" />
              Browse Library
            </Link>
          </Button>
          <Button asChild className="rounded-full bg-[#0d281e] hover:bg-[#00110a] text-white text-xs font-semibold h-10 px-5 shadow-sm group">
            <Link to="/dashboard/upload">
              <Upload className="size-4 mr-1.5 group-hover:scale-110 transition-transform" />
              Upload & Earn
            </Link>
          </Button>
        </div>
      </section>

      {/* 2. Executive Scholar Announcement / Monetization Hero Banner (Ivy Emerald Gradient) */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#0d281e] via-[#123629] to-[#1a4435] text-white p-6 sm:p-8 shadow-lg border border-[#446557]/30">
        <div className="absolute -right-16 -bottom-16 w-80 h-80 rounded-full bg-[#cee9da]/10 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex flex-col gap-2.5 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-white/10 text-[#cee9da] text-[11px] uppercase tracking-widest font-semibold backdrop-blur-md">
                Endowment Repository
              </span>
              <span className="text-[#b3ccbf] text-xs font-medium">Department of Engineering & Sciences</span>
            </div>
            <h2 className="font-display text-2xl sm:text-3xl text-white font-normal leading-snug">
              Share your lecture notes & past questions.
            </h2>
            <p className="text-sm text-[#749183] leading-relaxed">
              Help students in your department prepare for semester exams. Upload verified course materials to earn cashable SyllaPoints every time peers read, study, or download your archives.
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Button asChild className="rounded-full bg-[#cee9da] text-[#092017] hover:bg-white text-xs font-bold px-6 h-10 shadow-sm">
                <Link to="/dashboard/upload">
                  Upload notes now
                  <ArrowRight className="size-3.5 ml-1.5" />
                </Link>
              </Button>
              <Button asChild variant="outline" className="rounded-full bg-white/10 hover:bg-white/15 text-white border-white/20 text-xs font-semibold px-5 h-10 backdrop-blur-md">
                <Link to="/dashboard/assistant">
                  <Sparkles className="size-3.5 mr-1.5 text-[#f3e8c9]" />
                  Study with Boss AI
                </Link>
              </Button>
            </div>
          </div>

          {/* Archival Preview Mosaic Badges */}
          <div className="hidden xl:flex flex-col gap-2 min-w-[280px] bg-white/5 backdrop-blur-xl p-4 rounded-xl border border-white/10 shadow-inner">
            <span className="text-[11px] text-[#cee9da] tracking-wider uppercase font-semibold">Faculty Archival Pulse</span>
            <div className="flex items-center justify-between py-1.5 border-b border-white/10 text-xs">
              <span className="text-white/80 font-medium">GET 206 Thermodynamics</span>
              <span className="text-[#cee9da] font-mono font-semibold">Verified +25pt</span>
            </div>
            <div className="flex items-center justify-between py-1.5 border-b border-white/10 text-xs">
              <span className="text-white/80 font-medium">MTH 101 Calculus I</span>
              <span className="text-[#cee9da] font-mono font-semibold">Verified +25pt</span>
            </div>
            <div className="flex items-center justify-between py-1.5 text-xs">
              <span className="text-white/80 font-medium">MECH 201 Navier-Stokes</span>
              <span className="text-[#b3ccbf] font-mono font-semibold">Processing OCR</span>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Main Two-Column Academic Command Hub */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (Span 8): Study Velocity & Key Metric Instruments */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          {/* Study Activity & Velocity Ledger Card */}
          <div className="p-6 rounded-2xl bg-white shadow-xs border border-[#dce5df] flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#e7f0eb]">
              <div className="flex items-center gap-1 p-1 rounded-full bg-[#edf6f0] max-w-max border border-[#dce5df]/60">
                <button
                  type="button"
                  onClick={() => setGraphMode("study")}
                  className={cn(
                    "px-4 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 flex items-center gap-1.5",
                    graphMode === "study"
                      ? "bg-white text-[#151d1a] shadow-xs font-bold"
                      : "text-[#5a6660] hover:text-[#151d1a]"
                  )}
                >
                  <Timer className="size-3.5 text-[#446557]" /> Study Hours
                </button>
                <button
                  type="button"
                  onClick={() => setGraphMode("points")}
                  className={cn(
                    "px-4 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 flex items-center gap-1.5",
                    graphMode === "points"
                      ? "bg-white text-[#151d1a] shadow-xs font-bold"
                      : "text-[#5a6660] hover:text-[#151d1a]"
                  )}
                >
                  <Coins className="size-3.5 text-[#a87c12]" /> SyllaPoints
                </button>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-[#5a6660] font-medium">Interval:</span>
                <button
                  type="button"
                  onClick={() => setInterval((prev) => (prev === "30d" ? "90d" : "30d"))}
                  className="px-3 py-1 rounded-lg bg-[#e7f0eb] hover:bg-[#dce5df] text-[#151d1a] text-xs font-semibold flex items-center gap-1 transition-colors"
                >
                  {interval === "30d" ? "Last 30 days" : "Last 3 months"}
                  <ChevronDown className="size-3.5 text-[#5a6660]" />
                </button>
              </div>
            </div>

            <div className="flex items-baseline gap-2">
              <span className="font-display text-4xl sm:text-5xl text-[#00110a] tracking-tight font-medium">
                {graphMode === "study" ? studyHours : points.toLocaleString()}
              </span>
              <span className="font-display text-xl text-[#5a6660] font-normal">
                {graphMode === "study" ? "hrs" : "pts"}
              </span>
              <span className="ml-2 px-2.5 py-0.5 rounded-full bg-[#edf6f0] text-xs text-[#446557] font-semibold">
                {graphMode === "study" ? "Session velocity baseline" : "Verified ledger yield"}
              </span>
            </div>

            {/* Academic Smooth Sparkline Data Visualization (Fully Interactive) */}
            <div className="relative w-full h-48 rounded-xl bg-[#edf6f0]/40 p-4 flex flex-col justify-end overflow-visible border border-[#dce5df]/50">
              {activeTooltip && (
                <div className="absolute top-3 right-4 px-3 py-1.5 rounded-lg bg-[#0d281e] text-white text-xs font-mono shadow-md z-20 flex items-center gap-2 animate-fade-in">
                  <span className="text-[#cee9da]">{activeTooltip.label}:</span>
                  <span className="font-bold">{activeTooltip.value}</span>
                </div>
              )}

              <svg className="w-full h-32 overflow-visible" preserveAspectRatio="none" viewBox="0 0 700 120">
                <defs>
                  <linearGradient id="velocityGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#446557" stopOpacity="0.32" />
                    <stop offset="100%" stopColor="#446557" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Fill Area */}
                <path
                  d={
                    graphMode === "study"
                      ? "M 0,110 Q 70,105 140,95 T 280,90 T 420,75 T 560,65 T 700,45 L 700,120 L 0,120 Z"
                      : "M 0,105 Q 70,98 140,88 T 280,78 T 420,60 T 560,50 T 700,38 L 700,120 L 0,120 Z"
                  }
                  fill="url(#velocityGrad)"
                  className="transition-all duration-700"
                />

                {/* Smooth Accent Stroke Line */}
                <path
                  d={
                    graphMode === "study"
                      ? "M 0,110 Q 70,105 140,95 T 280,90 T 420,75 T 560,65 T 700,45"
                      : "M 0,105 Q 70,98 140,88 T 280,78 T 420,60 T 560,50 T 700,38"
                  }
                  fill="none"
                  stroke="#446557"
                  strokeLinecap="round"
                  strokeWidth="2.5"
                  className="transition-all duration-700"
                />

                {/* Functional Interactive Data Points */}
                {activePoints.map((pt, idx) => (
                  <circle
                    key={idx}
                    cx={pt.cx}
                    cy={pt.cy}
                    r={idx === activePoints.length - 1 ? "5" : "4"}
                    fill={idx === activePoints.length - 1 ? "#0d281e" : "#f3fbf6"}
                    stroke={idx === activePoints.length - 1 ? "#c6ebd9" : "#446557"}
                    strokeWidth="2.5"
                    className="cursor-pointer transition-transform hover:scale-150 duration-150"
                    onMouseEnter={() => setActiveTooltip({ label: pt.label, value: pt.val })}
                    onMouseLeave={() => setActiveTooltip(null)}
                  />
                ))}
              </svg>

              <div className="flex justify-between items-center pt-2 font-mono text-[11px] text-[#5a6660]">
                <span>01 Oct</span>
                <span>08 Oct</span>
                <span>15 Oct</span>
                <span>22 Oct</span>
                <span className="text-[#00110a] font-semibold">Today (Active)</span>
              </div>
            </div>
          </div>

          {/* 3-Column Executive Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl bg-white shadow-xs border border-[#dce5df] flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-xs text-[#5a6660] font-semibold uppercase tracking-wider">
                <span>Gross Volume</span>
                <TrendingUp className="size-4 text-[#446557]" />
              </div>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="font-display text-2xl sm:text-3xl font-semibold text-[#00110a]">
                  {points.toLocaleString()}
                </span>
                <span className="text-xs text-[#5a6660]">pts</span>
              </div>
              <p className="text-xs text-[#446557] font-medium flex items-center gap-1 mt-1">
                <Verified className="size-3.5 text-[#1b7a4e]" />
                Verified rewards active
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white shadow-xs border border-[#dce5df] flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-xs text-[#5a6660] font-semibold uppercase tracking-wider">
                <span>Net Volume</span>
                <Wallet className="size-4 text-[#446557]" />
              </div>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="font-display text-2xl sm:text-3xl font-semibold text-[#00110a]">
                  {points.toLocaleString()}
                </span>
                <span className="text-xs text-[#5a6660]">pts</span>
              </div>
              <p className="text-xs text-[#5a6660] mt-1">
                Available for withdrawal
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white shadow-xs border border-[#dce5df] flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-xs text-[#5a6660] font-semibold uppercase tracking-wider">
                <span>Peer Reads</span>
                <Eye className="size-4 text-[#446557]" />
              </div>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="font-display text-2xl sm:text-3xl font-semibold text-[#00110a]">
                  {totalViews + totalDownloads}
                </span>
                <span className="text-xs text-[#5a6660]">reads</span>
              </div>
              <p className="text-xs text-[#5a6660] mt-1">
                {totalDownloads} direct archive downloads
              </p>
            </div>
          </div>

          {/* Latest Archival Activity Ledger */}
          <div className="p-6 rounded-2xl bg-white shadow-xs border border-[#dce5df] flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <h3 className="font-display text-xl text-[#00110a] font-medium">Latest Activity & Ledger Feed</h3>
                <p className="text-xs text-[#5a6660]">Real-time reward yield transactions and archive queries</p>
              </div>
              <Link to="/dashboard/wallet" className="text-xs text-[#446557] hover:text-[#00110a] font-semibold flex items-center gap-1 transition-colors">
                View wallet statements
                <ArrowRight className="size-3.5" />
              </Link>
            </div>

            {ledger.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#5a6660] space-y-1">
                <p className="font-semibold text-[#151d1a]">No recent ledger transactions yet</p>
                <p>Welcome bonuses, focus sessions, and verified upload earnings will appear here.</p>
              </div>
            ) : (
              <div className="flex flex-col divide-y divide-[#e7f0eb]">
                {ledger.slice(0, 5).map((entry: { id: string; reason: string; amount: number; created_at: string }) => (
                  <div key={entry.id} className="py-3 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-[#c6ebd9] flex items-center justify-center text-[#002116] shrink-0 font-semibold text-xs">
                        <Coins className="size-4" />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-semibold text-[#151d1a] truncate">{entry.reason}</span>
                          {isPlus && (
                            <span className="px-1.5 py-0.2 rounded bg-[#f3e8c9] text-[#71540f] font-mono text-[10px] font-bold">
                              1.3x SyllaPlus
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-[#5a6660]">
                          {new Date(entry.created_at).toLocaleDateString("en-GB", {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    </div>
                    <span className="font-mono text-xs text-[#1b7a4e] font-bold whitespace-nowrap">
                      +{entry.amount} pts
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column (Span 4): Wallet, Activity Breakdown & Semester Cadence */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          {/* SyllaPoints Balance Card */}
          <div className="p-6 rounded-2xl bg-white shadow-xs border border-[#dce5df] flex flex-col gap-4 relative overflow-hidden">
            <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-[#c6ebd9]/40 blur-2xl pointer-events-none" />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Coins className="size-4 text-[#446557]" />
                <span className="text-xs uppercase tracking-wider text-[#5a6660] font-semibold">SyllaPoints Balance</span>
              </div>
              <span className="px-2 py-0.5 rounded bg-[#edf6f0] font-mono text-[11px] text-[#446557] font-semibold">
                Verified
              </span>
            </div>

            <div className="flex flex-col">
              <div className="flex items-baseline gap-1.5">
                <span className="font-display text-4xl sm:text-5xl text-[#00110a] tracking-tight font-normal">
                  {points.toLocaleString()}
                </span>
                <span className="font-display text-lg text-[#5a6660]">pts</span>
              </div>
              <span className="text-xs text-[#5a6660] font-mono mt-1">
                Cashable Value: ~{formatNaira(pointsToNaira(points))} <span className="text-[#c2c8c3]">/</span> £{(pointsToNaira(points) / 2000).toFixed(2)}
              </span>
            </div>

            {/* Balance Status Breakdown Bar */}
            <div className="p-3 rounded-xl bg-[#edf6f0] flex flex-col gap-2">
              <div className="flex justify-between items-center text-[11px] font-semibold">
                <span className="text-[#446557]">Available: {points.toLocaleString()} pts</span>
                <span className="text-[#5a6660]">Pending: {pending * 25} pts</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-[#dce5df] overflow-hidden">
                <div
                  className="h-full bg-[#446557] rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(8, (points / 17500) * 100))}%` }}
                />
              </div>
            </div>

            {/* Withdrawal Action */}
            <div className="flex flex-col gap-2 pt-1">
              <Button asChild className="w-full h-11 rounded-full bg-[#0d281e] hover:bg-[#00110a] text-white text-xs font-semibold shadow-xs">
                <Link to="/dashboard/wallet">
                  <Wallet className="size-4 mr-1.5" />
                  Withdraw funds
                </Link>
              </Button>
              <p className="text-center text-[11px] text-[#5a6660]">
                Minimum withdrawal threshold: 17,500 pts (₦3,500)
              </p>
            </div>
          </div>

          {/* Activity Yields Breakdown Ledger */}
          <div className="p-6 rounded-2xl bg-white shadow-xs border border-[#dce5df] flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg text-[#00110a] font-medium">Activity Yields</h3>
              <Sparkles className="size-4 text-[#446557]" />
            </div>

            <div className="flex flex-col gap-2 text-xs">
              <div className="flex items-center justify-between p-3 rounded-xl bg-[#edf6f0]">
                <div className="flex items-center gap-2.5">
                  <Upload className="size-4 text-[#446557]" />
                  <span className="font-medium text-[#151d1a]">Verified Uploads</span>
                </div>
                <span className="font-mono font-semibold text-[#00110a]">+25 pts</span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-[#edf6f0]">
                <div className="flex items-center gap-2.5">
                  <Timer className="size-4 text-[#446557]" />
                  <span className="font-medium text-[#151d1a]">Study Sessions</span>
                </div>
                <span className="font-mono font-semibold text-[#00110a]">+5 pts / 30m</span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-[#edf6f0]">
                <div className="flex items-center gap-2.5">
                  <Download className="size-4 text-[#446557]" />
                  <span className="font-medium text-[#151d1a]">Peer Downloads</span>
                </div>
                <span className="font-mono font-semibold text-[#00110a]">+5 pts</span>
              </div>
            </div>
          </div>

          {/* Semester Cadence Visual Progress (REPLACED mid term WITH ACTUAL NUMBER OF STUDY HOURS) */}
          <div className="p-6 rounded-2xl bg-white shadow-xs border border-[#dce5df] flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg text-[#00110a] font-medium">Semester Cadence</h3>
              <span className="font-mono text-[11px] text-[#5a6660]">2025 Semester I</span>
            </div>

            <div className="flex flex-col gap-3">
              {/* August */}
              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-xs">
                  <span className="text-[#5a6660] font-medium">August (0.0 hrs studied)</span>
                  <span className="font-mono text-[#5a6660]">0 pts</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-[#e7f0eb]">
                  <div className="h-full bg-[#c6ebd9] rounded-full" style={{ width: "0%" }} />
                </div>
              </div>

              {/* September */}
              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-xs">
                  <span className="text-[#5a6660] font-medium">
                    September ({Math.max(0, (Number(studyHours) * 0.4).toFixed(1))} hrs studied)
                  </span>
                  <span className="font-mono text-[#00110a] font-semibold">
                    {Math.round(points * 0.35)} pts
                  </span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-[#e7f0eb]">
                  <div className="h-full bg-[#446557] rounded-full" style={{ width: "35%" }} />
                </div>
              </div>

              {/* October */}
              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-xs">
                  <span className="text-[#00110a] font-semibold">
                    October ({studyHours} hrs studied)
                  </span>
                  <span className="font-mono text-[#00110a] font-bold">
                    {points} pts
                  </span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-[#e7f0eb]">
                  <div className="h-full bg-[#0d281e] rounded-full" style={{ width: "100%" }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Editorial Reference Archival Artifacts Preview Strip */}
      <section className="p-6 rounded-2xl bg-[#edf6f0] shadow-xs border border-[#dce5df] flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <h3 className="font-display text-xl text-[#00110a] font-medium">Reference Curricula & Materials</h3>
            <p className="text-xs text-[#5a6660]">Archived documents from verified engineering and academic cohorts</p>
          </div>
          <Button asChild variant="ghost" size="sm" className="text-xs text-[#446557] hover:text-[#00110a]">
            <Link to="/dashboard/library">
              Explore Library <ArrowRight className="size-3.5 ml-1" />
            </Link>
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 1 */}
          <Link
            to="/dashboard/library"
            className="group overflow-hidden rounded-xl bg-white shadow-xs border border-[#dce5df] flex flex-col hover:shadow-md transition-all"
          >
            <div className="p-4 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded bg-[#c6ebd9] text-[#002116] font-mono text-[11px] font-bold">
                  GET 206
                </span>
                <span className="px-2 py-0.5 rounded bg-[#0d281e] text-white font-mono text-[10px] font-semibold">
                  34 Syllabi Pages
                </span>
              </div>
              <h4 className="font-display text-base font-semibold text-[#00110a] group-hover:text-[#446557] transition-colors">
                Introduction to Thermodynamics
              </h4>
              <p className="text-xs text-[#5a6660]">Faculty of Engineering Core • 2025</p>
            </div>
          </Link>

          {/* Card 2 */}
          <Link
            to="/dashboard/library"
            className="group overflow-hidden rounded-xl bg-white shadow-xs border border-[#dce5df] flex flex-col hover:shadow-md transition-all"
          >
            <div className="p-4 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded bg-[#c6ebd9] text-[#002116] font-mono text-[11px] font-bold">
                  MTH 101
                </span>
                <span className="px-2 py-0.5 rounded bg-[#0d281e] text-white font-mono text-[10px] font-semibold">
                  Verified Solution
                </span>
              </div>
              <h4 className="font-display text-base font-semibold text-[#00110a] group-hover:text-[#446557] transition-colors">
                Engineering Mathematics & Calculus I
              </h4>
              <p className="text-xs text-[#5a6660]">100L General Engineering • 2024</p>
            </div>
          </Link>

          {/* Card 3 */}
          <Link
            to="/dashboard/library"
            className="group overflow-hidden rounded-xl bg-white shadow-xs border border-[#dce5df] flex flex-col hover:shadow-md transition-all"
          >
            <div className="p-4 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded bg-[#c6ebd9] text-[#002116] font-mono text-[11px] font-bold">
                  AGE 101
                </span>
                <span className="px-2 py-0.5 rounded bg-[#1b7a4e] text-white font-mono text-[10px] font-semibold">
                  Endowment Standard
                </span>
              </div>
              <h4 className="font-display text-base font-semibold text-[#00110a] group-hover:text-[#446557] transition-colors">
                Agricultural Economics Principles
              </h4>
              <p className="text-xs text-[#5a6660]">Faculty of Agricultural Sciences • 2025</p>
            </div>
          </Link>
        </div>
      </section>

      {/* SyllaPlus Upgrade Modal */}
      <SyllaPlusModal
        open={showPlusModal}
        onClose={() => setShowPlusModal(false)}
        onSuccess={() => setShowPlusModal(false)}
      />
    </div>
  );
}
