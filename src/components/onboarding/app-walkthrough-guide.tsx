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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";

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
      "Browse course notes and past questions shared by students. Ask Boss AI to explain a topic or help you practise; check important answers against your course materials.",
    icon: BookOpen,
    accent: "text-forest bg-forest/10 border-forest/20",
    badge: "Slide 1 of 3",
    features: [
      { icon: BookOpen, text: "Curated past papers & lecture notes" },
      { icon: Bot, text: "Boss AI with LaTeX formula step solver" },
      { icon: ShieldCheck, text: "Review status is shown on each material" },
    ],
  },
  {
    step: 2,
    title: "Focus Timer & Study Battles",
    eyebrow: "Earn As You Focus",
    description:
      "Use the focus timer to give a study session some structure, build a routine, and join study activities with your peers. Eligible rewards are shown in your wallet.",
    icon: Flame,
    accent: "text-brass bg-brass/15 border-brass/30",
    badge: "Slide 2 of 3",
    features: [
      { icon: Clock, text: "A focus timer for study sessions" },
      { icon: Flame, text: "A streak to help you keep a routine" },
      { icon: Swords, text: "Shared study activities with peers" },
    ],
  },
  {
    step: 3,
    title: "Your wallet & activity",
    eyebrow: "Keep track",
    description:
      "Review your SyllaPoints balance, activity, and current payout options in the wallet. Availability and requirements can vary. Subscription purchases are not available at the moment.",
    icon: Wallet,
    accent: "text-brand bg-brand/10 border-brand/20",
    badge: "Slide 3 of 3",
    features: [
      { icon: Wallet, text: "See the latest payout options in your wallet" },
      { icon: Sparkles, text: "Review your rewards and contributions" },
      { icon: Zap, text: "Your current account access stays the same" },
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

  const current = GUIDE_SLIDES[currentSlideIndex]!;
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
    <Dialog
      open={isOpen}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) handleSkip();
      }}
    >
      <DialogContent showCloseButton={false} className="relative max-h-[min(90dvh,56rem)] max-w-lg overflow-y-auto rounded-[1.75rem] border-border bg-card p-5 shadow-pop sm:p-8">
        <DialogTitle className="sr-only">{current.title}</DialogTitle>
        <DialogDescription className="sr-only">{current.description}</DialogDescription>
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
      </DialogContent>
    </Dialog>
  );
}
