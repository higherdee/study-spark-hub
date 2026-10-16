import { useState, useEffect } from "react";
import {
  Compass,
  Flame,
  Clock,
  BookOpen,
  UploadCloud,
  Bot,
  Swords,
  Users,
  Trophy,
  Wallet,
  ArrowRight,
  ArrowLeft,
  X,
  Sparkles,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface AppWalkthroughGuideProps {
  isOpen: boolean;
  onClose: () => void;
}

const GUIDE_STEPS = [
  {
    step: 1,
    title: "Welcome to SyllaBoss",
    eyebrow: "Global Academic Hub",
    description:
      "Your international academic workspace. Study smarter, collaborate with classmates worldwide, and earn SyllaPoints for your academic efforts.",
    icon: Compass,
    accent: "text-forest bg-forest/10 border-forest/20",
    badge: "Step 1 of 10",
  },
  {
    step: 2,
    title: "Daily Study Streaks",
    eyebrow: "Habit & Discipline",
    description:
      "Maintain active study streaks every day. Consistent scholars unlock bonus SyllaPoints and exclusive academic badges.",
    icon: Flame,
    accent: "text-orange-500 bg-orange-500/10 border-orange-500/20",
    badge: "Step 2 of 10",
  },
  {
    step: 3,
    title: "Synchronized Study Timer",
    eyebrow: "Earn While You Focus",
    description:
      "The shared focus timer runs quietly across all pages. You earn +5 SyllaPoints automatically every 30 minutes of active reading.",
    icon: Clock,
    accent: "text-brand bg-brand/10 border-brand/20",
    badge: "Step 3 of 10",
  },
  {
    step: 4,
    title: "Courseware & Past Papers",
    eyebrow: "Curated Library",
    description:
      "Access thousands of past examination questions, textbook derivations, and lecture notes. Search by course code or topic in real time.",
    icon: BookOpen,
    accent: "text-blue-500 bg-blue-500/10 border-blue-500/20",
    badge: "Step 4 of 10",
  },
  {
    step: 5,
    title: "Upload & Academic Royalties",
    eyebrow: "Share Your Knowledge",
    description:
      "Upload verified academic materials to earn +25 SyllaPoints instantly upon AI verification, plus recurring points whenever peers view or download your work.",
    icon: UploadCloud,
    accent: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
    badge: "Step 5 of 10",
  },
  {
    step: 6,
    title: "Boss AI with LaTeX & KaTeX",
    eyebrow: "Step-by-Step Solver",
    description:
      "Your intelligent academic mentor. Solves rigorous mathematics, physics, engineering, and economics problems with formatted formulas, quizzes, and voice queries.",
    icon: Bot,
    accent: "text-purple-500 bg-purple-500/10 border-purple-500/20",
    badge: "Step 6 of 10",
  },
  {
    step: 7,
    title: "Study Battles & 1v1 Blitz",
    eyebrow: "Multiplayer Exam Arena",
    description:
      "Host live timed MCQ speed blitzes or theory duels against classmates. Choose your question count, lock stakes in escrow, and crown winners.",
    icon: Swords,
    accent: "text-rose-500 bg-rose-500/10 border-rose-500/20",
    badge: "Step 7 of 10",
  },
  {
    step: 8,
    title: "Community Study Groups",
    eyebrow: "Peer Discussions",
    description:
      "Collaborate inside subject groups, exchange peer-to-peer direct messages, share course materials, and challenge scholars directly in chat.",
    icon: Users,
    accent: "text-indigo-500 bg-indigo-500/10 border-indigo-500/20",
    badge: "Step 8 of 10",
  },
  {
    step: 9,
    title: "Student Leaderboard",
    eyebrow: "Academic Prestige",
    description:
      "Showcase your study dedication. Rankings display only your clean @username, protecting your privacy while highlighting your standing.",
    icon: Trophy,
    accent: "text-brass bg-brass/10 border-brass/20",
    badge: "Step 9 of 10",
  },
  {
    step: 10,
    title: "SyllaPoints & Weekend Payouts",
    eyebrow: "Global Cash Yields",
    description:
      "1 SyllaPoint = ₦0.83 or $0.004 USD. Accumulate at least 5,700 points to cash out every weekend directly to your bank account, card (Capitalist), or digital gift card.",
    icon: Wallet,
    accent: "text-forest bg-forest/15 border-forest/30",
    badge: "Step 10 of 10",
  },
];

export function AppWalkthroughGuide({ isOpen, onClose }: AppWalkthroughGuideProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  useEffect(() => {
    if (isOpen) {
      setCurrentStepIndex(0);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const current = GUIDE_STEPS[currentStepIndex];
  const Icon = current.icon;
  const isFirst = currentStepIndex === 0;
  const isLast = currentStepIndex === GUIDE_STEPS.length - 1;

  const handleNext = () => {
    if (isLast) {
      localStorage.setItem("syllaboss_guide_completed", "true");
      onClose();
    } else {
      setCurrentStepIndex((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (!isFirst) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  };

  const handleSkip = () => {
    localStorage.setItem("syllaboss_guide_completed", "true");
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[100] grid place-items-center bg-black/60 p-4 backdrop-blur-md animate-fade-in"
      onClick={handleSkip}
    >
      <div
        className="relative w-full max-w-lg overflow-hidden rounded-[2rem] border border-white/20 bg-card p-6 sm:p-8 shadow-2xl backdrop-blur-2xl animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow ambient background */}
        <div className="absolute -top-24 -right-24 size-56 rounded-full bg-gradient-to-br from-forest/20 via-brand/15 to-brass/20 blur-3xl pointer-events-none" />

        {/* Top Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-mono font-bold bg-surface-container border border-border text-ink">
              <Sparkles className="size-3 text-brass" />
              <span>{current.badge}</span>
            </span>
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              {current.eyebrow}
            </span>
          </div>

          <button
            onClick={handleSkip}
            aria-label="Close Guide"
            className="grid size-8 place-items-center rounded-full text-muted-foreground hover:bg-secondary transition-all"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Hero Card */}
        <div className="mt-6 flex flex-col items-center text-center space-y-4">
          <div
            className={cn(
              "size-18 rounded-3xl flex items-center justify-center border shadow-lift transition-transform duration-300",
              current.accent
            )}
          >
            <Icon className="size-9" />
          </div>

          <div className="space-y-2 max-w-md">
            <h3 className="font-display text-2xl sm:text-[1.75rem] font-medium text-ink tracking-tight">
              {current.title}
            </h3>
            <p className="text-xs sm:text-sm text-ink-soft leading-relaxed">
              {current.description}
            </p>
          </div>
        </div>

        {/* Progress Dots */}
        <div className="mt-8 flex items-center justify-center gap-1.5">
          {GUIDE_STEPS.map((step, idx) => (
            <button
              key={step.step}
              type="button"
              onClick={() => setCurrentStepIndex(idx)}
              className={cn(
                "h-1.5 rounded-full transition-all duration-300",
                idx === currentStepIndex
                  ? "w-7 bg-forest"
                  : idx < currentStepIndex
                  ? "w-2 bg-brand/60"
                  : "w-2 bg-border"
              )}
              aria-label={`Go to step ${idx + 1}`}
            />
          ))}
        </div>

        {/* Controls */}
        <div className="mt-8 flex items-center justify-between gap-3 pt-4 border-t border-border/60">
          <Button
            variant="ghost"
            onClick={isFirst ? handleSkip : handlePrev}
            className="h-10 text-xs font-semibold text-muted-foreground hover:text-ink px-4 rounded-xl"
          >
            {isFirst ? "Skip Tour" : (
              <>
                <ArrowLeft className="size-3.5 mr-1.5" />
                Previous
              </>
            )}
          </Button>

          <Button
            onClick={handleNext}
            className="h-10 px-6 rounded-xl text-xs font-semibold bg-forest text-white hover:bg-forest/90 shadow-xs gap-1.5 transition-all active:scale-[0.98]"
          >
            {isLast ? (
              <>
                <CheckCircle2 className="size-4 text-brass-soft" />
                <span>Get Started</span>
              </>
            ) : (
              <>
                <span>Next</span>
                <ArrowRight className="size-3.5" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
