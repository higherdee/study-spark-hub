import { useState, useEffect } from "react";
import {
  Compass,
  Flame,
  Clock,
  BookOpen,
  Bot,
  Swords,
  Wallet,
  ArrowRight,
  ArrowLeft,
  X,
  Sparkles,
  CheckCircle2,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface AppWalkthroughGuideProps {
  isOpen: boolean;
  onClose: () => void;
}

const GUIDE_SLIDES = [
  {
    step: 1,
    title: "Course Library & Boss AI",
    eyebrow: "Learn Faster",
    description:
      "Instant access to verified past exam questions, textbook derivations, and lecture notes. Need clarity? Boss AI works out complex LaTeX math, summarizes dense documents, and creates instant practice quizzes.",
    icon: BookOpen,
    accent: "text-forest bg-forest/10 border-forest/20",
    badge: "Slide 1 of 3",
    features: [
      { icon: BookOpen, text: "Curated past papers & lecture notes" },
      { icon: Bot, text: "Boss AI with LaTeX formula step solver" },
      { icon: ShieldCheck, text: "Strictly verified academic material" },
    ],
  },
  {
    step: 2,
    title: "Focus Timer & Study Battles",
    eyebrow: "Earn As You Focus",
    description:
      "Earn +5 SyllaPoints automatically every 30 minutes of active study. Build your daily habit streak for bonus multipliers, and host live 1v1 timed study battles against classmates.",
    icon: Flame,
    accent: "text-brass bg-brass/15 border-brass/30",
    badge: "Slide 2 of 3",
    features: [
      { icon: Clock, text: "+5 SyllaPoints per 30-min study sprint" },
      { icon: Flame, text: "Daily study streaks with bonus rewards" },
      { icon: Swords, text: "Multiplayer 1v1 study battle arenas" },
    ],
  },
  {
    step: 3,
    title: "Weekend Cashouts & SyllaPlus VIP",
    eyebrow: "Global Payouts",
    description:
      "Convert your SyllaPoints into real money every weekend via direct bank transfer, card disbursement (Capitalist), or digital gift cards ($5, $10, $20). Upgrade to SyllaPlus for 1.3x earnings and unlimited AI.",
    icon: Wallet,
    accent: "text-brand bg-brand/10 border-brand/20",
    badge: "Slide 3 of 3",
    features: [
      { icon: Wallet, text: "Weekend cashouts to Bank or Card" },
      { icon: Sparkles, text: "$5, $10, $20 digital gift card vouchers" },
      { icon: Zap, text: "1.3x VIP multiplier & priority review" },
    ],
  },
];

export function AppWalkthroughGuide({ isOpen, onClose }: AppWalkthroughGuideProps) {
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);

  useEffect(() => {
    if (isOpen) {
      setCurrentSlideIndex(0);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const current = GUIDE_SLIDES[currentSlideIndex];
  const Icon = current.icon;
  const isFirst = currentSlideIndex === 0;
  const isLast = currentSlideIndex === GUIDE_SLIDES.length - 1;

  const handleNext = () => {
    if (isLast) {
      localStorage.setItem("syllaboss_guide_completed", "true");
      onClose();
    } else {
      setCurrentSlideIndex((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (!isFirst) {
      setCurrentSlideIndex((prev) => prev - 1);
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
            className="grid size-8 place-items-center rounded-full text-muted-foreground hover:bg-secondary transition-all cursor-pointer"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Hero Card */}
        <div className="mt-5 flex flex-col items-center text-center space-y-4">
          <div
            className={cn(
              "size-16 rounded-2xl flex items-center justify-center border shadow-lift transition-transform duration-300",
              current.accent
            )}
          >
            <Icon className="size-8" />
          </div>

          <div className="space-y-1.5 max-w-md">
            <h3 className="font-display text-2xl font-bold text-ink tracking-tight">
              {current.title}
            </h3>
            <p className="text-xs sm:text-sm text-ink-soft leading-relaxed">
              {current.description}
            </p>
          </div>

          {/* Key Feature Bullets */}
          <div className="w-full space-y-2 text-left pt-1">
            {current.features.map((feat, i) => {
              const FeatIcon = feat.icon;
              return (
                <div
                  key={i}
                  className="flex items-center gap-2.5 rounded-xl border border-border/70 bg-card/80 p-2.5 text-xs text-ink"
                >
                  <div className="grid size-6 shrink-0 place-items-center rounded-lg bg-surface-container text-forest border border-border/50">
                    <FeatIcon className="size-3.5" />
                  </div>
                  <span className="font-medium text-foreground">{feat.text}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Progress Dots */}
        <div className="mt-6 flex items-center justify-center gap-2">
          {GUIDE_SLIDES.map((slide, idx) => (
            <button
              key={slide.step}
              type="button"
              onClick={() => setCurrentSlideIndex(idx)}
              className={cn(
                "h-1.5 rounded-full transition-all duration-300 cursor-pointer",
                idx === currentSlideIndex
                  ? "w-8 bg-forest"
                  : idx < currentSlideIndex
                  ? "w-2.5 bg-brand/60"
                  : "w-2.5 bg-border"
              )}
              aria-label={`Go to slide ${idx + 1}`}
            />
          ))}
        </div>

        {/* Controls */}
        <div className="mt-6 flex items-center justify-between gap-3 pt-4 border-t border-border/60">
          <Button
            variant="ghost"
            onClick={isFirst ? handleSkip : handlePrev}
            className="h-10 text-xs font-semibold text-muted-foreground hover:text-ink px-4 rounded-xl cursor-pointer"
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
            className="h-10 px-6 rounded-xl text-xs font-semibold bg-forest text-white hover:bg-forest/90 shadow-xs gap-1.5 transition-all active:scale-[0.98] cursor-pointer"
          >
            {isLast ? (
              <>
                <CheckCircle2 className="size-4 text-brass-soft" />
                <span>Enter Workspace</span>
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
