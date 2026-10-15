import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "motion/react";
import {
  Sparkles,
  Flame,
  Swords,
  Trophy,
  ChevronRight,
  ChevronLeft,
  Loader2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getScholarFlexDataServerFn } from "@/lib/scholar.functions";
import { ScholarFlexCard } from "@/components/scholar/scholar-flex-card";
import { battleAudio } from "@/lib/battle-audio";
import { cn } from "@/lib/utils";

interface CampusWrappedModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId?: string | undefined;
  username?: string | undefined;
}

export function CampusWrappedModal({
  isOpen,
  onClose,
  userId,
  username,
}: CampusWrappedModalProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [viewMode, setViewMode] = useState<"slides" | "card">("slides");

  // Fetch Scholar Flex Data
  const { data, isLoading } = useQuery({
    queryKey: ["scholar-flex-data", userId, username],
    enabled: isOpen && Boolean(userId || username),
    queryFn: async () => {
      return await getScholarFlexDataServerFn({ data: { userId, username } });
    },
  });

  const totalSlides = 5;

  const nextSlide = () => {
    if (currentSlide < totalSlides - 1) {
      setCurrentSlide((s) => s + 1);
      battleAudio.playTick(700 + currentSlide * 100);
    } else {
      setViewMode("card");
    }
  };

  const prevSlide = () => {
    if (currentSlide > 0) {
      setCurrentSlide((s) => s - 1);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[92vh] overflow-y-auto rounded-3xl p-0 border-border bg-card text-ink shadow-[var(--elev-3)]">
        {/* Academic Header */}
        <DialogHeader className="border-b border-border bg-forest px-5 py-4 text-white flex flex-row items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="size-9 rounded-xl bg-white/10 text-brass-soft grid place-items-center border border-white/10">
              <Sparkles className="size-4.5" />
            </div>
            <div>
              <DialogTitle className="font-display text-lg font-normal tracking-tight text-white">
                Campus Wrapped 2026
              </DialogTitle>
              <p className="eyebrow text-white/60 text-[9px]">
                {viewMode === "slides" ? `Chapter ${currentSlide + 1} of ${totalSlides}` : "Official Folio Card"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setViewMode(viewMode === "slides" ? "card" : "slides")}
            className="text-[11px] font-medium px-3 py-1 rounded-full border border-white/20 bg-white/10 hover:bg-white/15 transition-colors text-white lift press"
          >
            {viewMode === "slides" ? "Story Card" : "Chapters"}
          </button>
        </DialogHeader>

        <div className="p-5">
          {isLoading ? (
            <div className="py-24 text-center flex flex-col items-center justify-center gap-3">
              <Loader2 className="size-8 animate-spin text-forest" />
              <p className="text-xs text-ink-soft font-semibold">
                Compiling academic registry & calculating department standing...
              </p>
            </div>
          ) : !data ? (
            <div className="py-12 text-center text-xs text-ink-soft">
              Could not retrieve Campus Wrapped registry for this scholar.
            </div>
          ) : viewMode === "card" ? (
            /* Card View */
            <div className="py-1">
              <ScholarFlexCard data={data} showActions={true} />
            </div>
          ) : (
            /* Chapters Slide View */
            <div className="space-y-4">
              {/* Progress Bars */}
              <div className="flex items-center gap-1.5">
                {Array.from({ length: totalSlides }).map((_, idx) => (
                  <div
                    key={idx}
                    onClick={() => setCurrentSlide(idx)}
                    className={cn(
                      "h-1.5 flex-1 rounded-full cursor-pointer transition-all",
                      idx === currentSlide
                        ? "bg-forest"
                        : idx < currentSlide
                        ? "bg-forest/50"
                        : "bg-surface-container-high"
                    )}
                  />
                ))}
              </div>

              {/* Animated Chapter Card */}
              <AnimatePresence mode="wait">
                {/* Chapter 1: The Daily Flame */}
                {currentSlide === 0 && (
                  <motion.div
                    key="slide-0"
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.04 }}
                    transition={{ duration: 0.25 }}
                    className="p-6 rounded-3xl bg-surface-container-low border border-border text-center space-y-4"
                  >
                    <div className="size-16 rounded-full bg-brass/20 text-brass border border-brass/30 mx-auto grid place-items-center shadow-xs">
                      <Flame className="size-8" />
                    </div>

                    <div>
                      <span className="eyebrow text-brass block">
                        Chapter 1 · Daily Study Consistency
                      </span>
                      <h3 className="font-display text-3xl font-bold text-ink mt-1">
                        {data.user.currentStreak}-Day Streak
                      </h3>
                      <p className="text-xs text-ink-soft max-w-xs mx-auto mt-1 leading-relaxed">
                        Recorded <strong>{data.user.studyHours} hours</strong> of verified curriculum study across active sessions.
                      </p>
                    </div>

                    <div className="p-3 rounded-2xl bg-card border border-border text-xs">
                      <span className="eyebrow text-ink-soft text-[9px] block">Longest Milestone Record</span>
                      <span className="text-base font-bold font-mono text-brass mt-0.5 block tnum">
                        {data.user.longestStreak} Consecutive Days 🔥
                      </span>
                    </div>
                  </motion.div>
                )}

                {/* Chapter 2: The Battle Arena */}
                {currentSlide === 1 && (
                  <motion.div
                    key="slide-1"
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.04 }}
                    transition={{ duration: 0.25 }}
                    className="p-6 rounded-3xl bg-surface-container-low border border-border text-center space-y-4"
                  >
                    <div className="size-16 rounded-full bg-brand/15 text-brand border border-brand/30 mx-auto grid place-items-center shadow-xs">
                      <Swords className="size-8" />
                    </div>

                    <div>
                      <span className="eyebrow text-brand block">
                        Chapter 2 · Quiz Arena Record
                      </span>
                      <h3 className="font-display text-3xl font-bold text-ink mt-1">
                        {data.battleWinRate}% Arena Win-Rate
                      </h3>
                      <p className="text-xs text-ink-soft max-w-xs mx-auto mt-1 leading-relaxed">
                        Contested <strong>{data.battlesEntered} study showdowns</strong> against campus peers with <strong>{data.battlesWon} arena victories</strong>!
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="p-3 rounded-2xl bg-card border border-border">
                        <span className="eyebrow text-ink-soft text-[9px] block">Victories</span>
                        <span className="text-base font-bold font-mono text-brand tnum">{data.battlesWon} Won</span>
                      </div>
                      <div className="p-3 rounded-2xl bg-card border border-border">
                        <span className="eyebrow text-ink-soft text-[9px] block">Win Rate</span>
                        <span className="text-base font-bold font-mono text-brand tnum">{data.battleWinRate}%</span>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Chapter 3: Department Standing */}
                {currentSlide === 2 && (
                  <motion.div
                    key="slide-2"
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.04 }}
                    transition={{ duration: 0.25 }}
                    className="p-6 rounded-3xl bg-surface-container-low border border-border text-center space-y-4"
                  >
                    <div className="size-16 rounded-full bg-forest text-brass-soft mx-auto grid place-items-center shadow-md">
                      <Trophy className="size-8" />
                    </div>

                    <div>
                      <span className="eyebrow text-forest block">
                        Chapter 3 · Department Standing
                      </span>
                      <h3 className="font-display text-3xl font-bold text-ink mt-1">
                        TOP {data.departmentPercentile}% RANK
                      </h3>
                      <p className="text-xs text-ink-soft max-w-xs mx-auto mt-1 leading-relaxed">
                        Leading peers in <strong>{data.user.course}</strong> at <strong>{data.user.institution}</strong>.
                      </p>
                    </div>

                    <div className="p-3 rounded-2xl bg-card border border-border text-xs">
                      <span className="eyebrow text-ink-soft text-[9px] block">Current Standing</span>
                      <span className="text-base font-bold font-serif text-forest">
                        #{data.departmentRank} of {data.departmentTotal} Active Scholars
                      </span>
                    </div>
                  </motion.div>
                )}

                {/* Chapter 4: AI Scholar Archetype */}
                {currentSlide === 3 && (
                  <motion.div
                    key="slide-3"
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.04 }}
                    transition={{ duration: 0.25 }}
                    className="p-6 rounded-3xl bg-surface-container-low border border-border text-center space-y-4"
                  >
                    <div className="text-5xl">{data.archetype.badgeEmoji}</div>

                    <div>
                      <span className="eyebrow text-ink-soft block">
                        Chapter 4 · Academic Archetype
                      </span>
                      <h3 className="font-display text-2xl font-bold text-ink mt-1">
                        {data.archetype.title}
                      </h3>
                      <Badge className="mt-1.5 bg-forest text-white border-forest text-xs font-medium">
                        {data.archetype.tagline}
                      </Badge>
                    </div>

                    <div className="p-4 rounded-2xl bg-card border border-border text-xs italic font-serif text-ink leading-relaxed">
                      "{data.archetype.quote}"
                    </div>
                  </motion.div>
                )}

                {/* Chapter 5: Official Folio Ready */}
                {currentSlide === 4 && (
                  <motion.div
                    key="slide-4"
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.04 }}
                    transition={{ duration: 0.25 }}
                    className="p-6 rounded-3xl bg-forest text-white border border-border text-center space-y-4 shadow-sm"
                  >
                    <div className="size-16 rounded-full bg-white/10 text-brass-soft mx-auto grid place-items-center border border-white/20">
                      <Sparkles className="size-8" />
                    </div>

                    <div>
                      <h3 className="font-display text-2xl font-bold text-white">Your Folio Card is Ready</h3>
                      <p className="text-xs text-white/70 max-w-xs mx-auto mt-1 leading-relaxed">
                        Export your verified 9:16 card for WhatsApp Status, Stories, and X. Coursemates can scan your QR code to review your academic rank.
                      </p>
                    </div>

                    <Button
                      type="button"
                      onClick={() => setViewMode("card")}
                      className="w-full h-11 rounded-2xl bg-white hover:bg-white/90 text-forest font-bold text-xs sm:text-sm shadow-md gap-2 lift press"
                    >
                      <span>Inspect & Export Story Folio</span>
                      <ChevronRight className="size-4" />
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Navigation Controls */}
              <div className="flex items-center justify-between pt-1">
                <Button
                  type="button"
                  variant="outline"
                  disabled={currentSlide === 0}
                  onClick={prevSlide}
                  className="h-8 rounded-xl border-border text-xs gap-1 text-ink hover:bg-surface-container-low"
                >
                  <ChevronLeft className="size-3.5" /> Back
                </Button>

                <Button
                  type="button"
                  onClick={nextSlide}
                  className="h-8 rounded-xl bg-forest hover:bg-ink text-white text-xs font-semibold gap-1 lift press"
                >
                  {currentSlide === totalSlides - 1 ? "Open Card" : "Next"} <ChevronRight className="size-3.5" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
