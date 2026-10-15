import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "motion/react";
import {
  Sparkles,
  Flame,
  Swords,
  Trophy,
  Share2,
  ChevronRight,
  ChevronLeft,
  X,
  Loader2,
  RotateCcw,
  BookOpen,
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
      <DialogContent className="max-w-md max-h-[95vh] overflow-y-auto rounded-3xl p-4 sm:p-6 border-white/10 bg-[#070B14] text-white shadow-2xl">
        <DialogHeader className="border-b border-white/10 pb-3 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-xl bg-brass/20 text-brass grid place-items-center">
              <Sparkles className="size-4" />
            </div>
            <div>
              <DialogTitle className="text-sm sm:text-base font-black text-white">
                Campus Wrapped 2026
              </DialogTitle>
              <p className="text-[10px] text-white/50">
                {viewMode === "slides" ? `Story Chapter ${currentSlide + 1} of ${totalSlides}` : "Your Flex Story Card"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setViewMode(viewMode === "slides" ? "card" : "slides")}
              className="text-[10px] font-bold px-2.5 py-1 rounded-full border border-white/15 bg-white/5 hover:bg-white/10 transition-colors text-white"
            >
              {viewMode === "slides" ? "Jump to Card" : "View Slides"}
            </button>
          </div>
        </DialogHeader>

        {isLoading ? (
          <div className="py-24 text-center flex flex-col items-center justify-center gap-3">
            <Loader2 className="size-8 animate-spin text-brand" />
            <p className="text-xs text-white/60 font-semibold">
              Compiling your semester stats & computing AI archetype...
            </p>
          </div>
        ) : !data ? (
          <div className="py-12 text-center text-xs text-white/60">
            Could not compile Campus Wrapped data.
          </div>
        ) : viewMode === "card" ? (
          /* ========================================================================= */
          /* CARD VIEW: Full 9:16 Flex Card */
          /* ========================================================================= */
          <div className="py-2">
            <ScholarFlexCard data={data} showActions={true} />
          </div>
        ) : (
          /* ========================================================================= */
          /* SLIDES VIEW: Spotify Wrapped Style Story Chapters */
          /* ========================================================================= */
          <div className="py-4 space-y-5">
            {/* Slide Progress Indicators */}
            <div className="flex items-center gap-1.5">
              {Array.from({ length: totalSlides }).map((_, idx) => (
                <div
                  key={idx}
                  onClick={() => setCurrentSlide(idx)}
                  className={cn(
                    "h-1.5 flex-1 rounded-full cursor-pointer transition-all",
                    idx === currentSlide
                      ? "bg-brass"
                      : idx < currentSlide
                      ? "bg-white/70"
                      : "bg-white/15"
                  )}
                />
              ))}
            </div>

            {/* Slide Content with Fluid Motion */}
            <AnimatePresence mode="wait">
              {/* SLIDE 1: Welcome & Study Flame */}
              {currentSlide === 0 && (
                <motion.div
                  key="slide-0"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.05 }}
                  transition={{ duration: 0.3 }}
                  className="p-6 rounded-3xl bg-gradient-to-br from-brass/20 via-white/[0.03] to-[#0B111F] border border-brass/40 text-center space-y-4"
                >
                  <div className="size-16 rounded-full bg-brass text-black mx-auto grid place-items-center shadow-xl shadow-brass/30">
                    <Flame className="size-9 fill-current" />
                  </div>

                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-brass">
                      Chapter 1 · The Daily Flame
                    </span>
                    <h3 className="text-2xl font-black text-white mt-1">
                      {data.user.currentStreak}-Day Study Streak
                    </h3>
                    <p className="text-xs text-white/70 max-w-xs mx-auto mt-1">
                      You showed up consistently. Recorded <strong>{data.user.studyHours} study hours</strong> across active university sessions.
                    </p>
                  </div>

                  <div className="p-3 rounded-2xl bg-white/[0.04] border border-white/10 text-xs">
                    <span className="text-white/50 text-[10px] block">Longest Streak Record</span>
                    <span className="text-lg font-black text-brass">
                      {data.user.longestStreak} Consecutive Days 🔥
                    </span>
                  </div>
                </motion.div>
              )}

              {/* SLIDE 2: Battle Arena Dominance */}
              {currentSlide === 1 && (
                <motion.div
                  key="slide-1"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.05 }}
                  transition={{ duration: 0.3 }}
                  className="p-6 rounded-3xl bg-gradient-to-br from-brand/20 via-white/[0.03] to-[#0B111F] border border-brand/40 text-center space-y-4"
                >
                  <div className="size-16 rounded-full bg-brand text-white mx-auto grid place-items-center shadow-xl shadow-brand/30">
                    <Swords className="size-8" />
                  </div>

                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-brand">
                      Chapter 2 · The Quiz Arena
                    </span>
                    <h3 className="text-2xl font-black text-white mt-1">
                      {data.battleWinRate}% Battle Win-Rate
                    </h3>
                    <p className="text-xs text-white/70 max-w-xs mx-auto mt-1">
                      Fought <strong>{data.battlesEntered} study battles</strong> against coursemates with <strong>{data.battlesWon} arena victories</strong>!
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-3 rounded-2xl bg-white/[0.04] border border-white/10">
                      <span className="text-[10px] text-white/50 block">Battles Won</span>
                      <span className="text-base font-black text-brand">{data.battlesWon} Victories</span>
                    </div>
                    <div className="p-3 rounded-2xl bg-white/[0.04] border border-white/10">
                      <span className="text-[10px] text-white/50 block">Win Rate</span>
                      <span className="text-base font-black text-brand">{data.battleWinRate}%</span>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* SLIDE 3: Department Clout */}
              {currentSlide === 2 && (
                <motion.div
                  key="slide-2"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.05 }}
                  transition={{ duration: 0.3 }}
                  className="p-6 rounded-3xl bg-gradient-to-br from-brand/20 via-white/[0.03] to-[#0B111F] border border-brand/40 text-center space-y-4"
                >
                  <div className="size-16 rounded-full bg-brand text-black mx-auto grid place-items-center shadow-xl shadow-brand/30">
                    <Trophy className="size-8" />
                  </div>

                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-brand">
                      Chapter 3 · Campus Clout
                    </span>
                    <h3 className="text-3xl font-black text-white mt-1">
                      TOP {data.departmentPercentile}% RANK
                    </h3>
                    <p className="text-xs text-white/70 max-w-xs mx-auto mt-1">
                      Outscoring peers in <strong>{data.user.course}</strong> at <strong>{data.user.institution}</strong>.
                    </p>
                  </div>

                  <div className="p-3 rounded-2xl bg-white/[0.04] border border-white/10 text-xs">
                    <span className="text-white/50 text-[10px] block">Department Position</span>
                    <span className="text-base font-black text-brand">
                      #{data.departmentRank} of {data.departmentTotal} Active Scholars
                    </span>
                  </div>
                </motion.div>
              )}

              {/* SLIDE 4: AI Scholar Archetype Reveal */}
              {currentSlide === 3 && (
                <motion.div
                  key="slide-3"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.05 }}
                  transition={{ duration: 0.3 }}
                  className="p-6 rounded-3xl bg-gradient-to-br from-fuchsia-500/20 via-white/[0.03] to-[#0B111F] border border-fuchsia-500/40 text-center space-y-4"
                >
                  <div className="text-5xl">{data.archetype.badgeEmoji}</div>

                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-fuchsia-300">
                      Chapter 4 · Boss AI Archetype Analysis
                    </span>
                    <h3 className="text-2xl font-black text-white mt-1">
                      {data.archetype.title}
                    </h3>
                    <Badge className="mt-1 bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/40 text-xs font-bold">
                      {data.archetype.tagline}
                    </Badge>
                  </div>

                  <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/10 text-xs italic text-white/80 leading-relaxed">
                    "{data.archetype.quote}"
                  </div>
                </motion.div>
              )}

              {/* SLIDE 5: Ready to Flex */}
              {currentSlide === 4 && (
                <motion.div
                  key="slide-4"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.05 }}
                  transition={{ duration: 0.3 }}
                  className="p-6 rounded-3xl bg-gradient-to-br from-brass/25 via-brand/15 to-[#0B111F] border-2 border-brass/50 text-center space-y-4"
                >
                  <div className="size-16 rounded-full bg-gradient-to-tr from-brass to-brand text-black mx-auto grid place-items-center shadow-xl shadow-brass/40">
                    <Sparkles className="size-8" />
                  </div>

                  <div>
                    <h3 className="text-2xl font-black text-white">Your Flex Card is Ready!</h3>
                    <p className="text-xs text-white/70 max-w-xs mx-auto mt-1">
                      Share to WhatsApp Status, Instagram Stories, and X. Your friends can scan the QR code to see your live rank!
                    </p>
                  </div>

                  <Button
                    type="button"
                    onClick={() => setViewMode("card")}
                    className="w-full h-11 rounded-2xl bg-gradient-to-r from-brass to-brand hover:from-brass-ink hover:to-brand text-black font-black text-xs sm:text-sm shadow-xl shadow-brass/25 gap-2"
                  >
                    <span>View & Share 9:16 Flex Card 🚀</span>
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Slide Navigation Buttons */}
            <div className="flex items-center justify-between pt-2">
              <Button
                type="button"
                variant="outline"
                disabled={currentSlide === 0}
                onClick={prevSlide}
                className="h-8 rounded-xl border-white/10 text-xs gap-1 bg-transparent hover:bg-white/5 text-white"
              >
                <ChevronLeft className="size-3.5" /> Back
              </Button>

              <Button
                type="button"
                onClick={nextSlide}
                className="h-8 rounded-xl bg-white text-black hover:bg-white/90 text-xs font-bold gap-1"
              >
                {currentSlide === totalSlides - 1 ? "Open Card" : "Next"} <ChevronRight className="size-3.5" />
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
