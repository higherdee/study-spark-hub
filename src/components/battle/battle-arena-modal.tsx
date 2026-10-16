import { useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "motion/react";
import {
  Swords,
  Zap,
  BookOpen,
  Clock,
  Coins,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Send,
  Camera,
  Mic,
  Square,
  Sparkles,
  Trophy,
  RotateCcw,
  Bell,
  Lock,
  ChevronRight,
  ChevronLeft,
  Loader2,
  X,
  FileText,
  AlertTriangle,
  Award,
  Crown,
  Check,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import {
  getBattleDetailsServerFn,
  submitBattleAnswersServerFn,
  gradeTheoryBattleServerFn,
  nudgeSlowpokesServerFn,
  forceGradeBattleServerFn,
} from "@/lib/battle.functions";
import { transcribeVoiceAudioServerFn } from "@/lib/ai/study-assistant.functions";
import { battleAudio } from "@/lib/battle-audio";

interface BattleArenaModalProps {
  isOpen: boolean;
  onClose: () => void;
  battleId: string;
  groupId: string;
  currentUserId: string;
  currentUserName: string;
  userRole?: "fighter" | "spectator";
  onRunItBack?: (battle: any) => void;
}

export function BattleArenaModal({
  isOpen,
  onClose,
  battleId,
  groupId,
  currentUserId,
  currentUserName,
  userRole = "fighter",
  onRunItBack,
}: BattleArenaModalProps) {
  const queryClient = useQueryClient();

  // Active Battle Query with live sync
  const { data, refetch } = useQuery({
    queryKey: ["battle-arena", battleId],
    enabled: isOpen && Boolean(battleId),
    queryFn: async () => {
      return await getBattleDetailsServerFn({ data: { battleId } });
    },
    refetchInterval: 3000,
  });

  const battle = data?.battle;
  const participants = data?.participants || [];

  // Parse Questions safely
  const questions: any[] = (() => {
    try {
      return JSON.parse(battle?.questions_json || "[]");
    } catch {
      return [];
    }
  })();

  // Current User Fighter Record
  const myParticipant = participants.find((p) => p.user_id === currentUserId);
  const isHost = battle?.host_id === currentUserId;
  const isSpectator = userRole === "spectator" || myParticipant?.role === "spectator" || !myParticipant;
  const hasSubmitted = myParticipant?.status === "submitted";
  const isCompleted = battle?.status === "completed";
  const isGrading = battle?.status === "grading";

  // MCQ State
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [mcqAnswers, setMcqAnswers] = useState<Record<number, number>>({});
  const [timeLeft, setTimeLeft] = useState<number>(battle?.time_per_question || 20);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Theory State (Multimodal)
  const [theoryAnswers, setTheoryAnswers] = useState<
    Record<number, { text: string; imageBase64?: string; audioTranscript?: string }>
  >({});
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const audioChunksRef = useRef<Blob[]>([]);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Floating Points Animation for Theory Pass (+10 pts)
  const [floatingPoints, setFloatingPoints] = useState<Array<{ id: string; text: string; qIndex: number }>>([]);

  // Submitting States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isNudging, setIsNudging] = useState(false);
  const [isForceGrading, setIsForceGrading] = useState(false);

  // Initialize Timer for MCQ Blitz
  useEffect(() => {
    if (!isOpen || !battle || battle.mode !== "mcq" || hasSubmitted || isCompleted) return;

    setTimeLeft(battle.time_per_question || 20);
    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          // Time expired for this question, advance or submit
          battleAudio.playBuzz();
          if (currentQIndex < questions.length - 1) {
            setCurrentQIndex((idx) => idx + 1);
            return battle.time_per_question || 20;
          } else {
            // Last question expired, auto-submit
            clearInterval(timerRef.current!);
            handleAutoSubmitMcq();
            return 0;
          }
        }
        if (prev <= 4) {
          battleAudio.playTick(600 + (5 - prev) * 100);
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [currentQIndex, isOpen, battle?.id, hasSubmitted, isCompleted]);

  // Handle MCQ Answer Selection
  const handleSelectOption = (optionIndex: number) => {
    if (hasSubmitted || isCompleted || isSpectator) return;

    const currentQ = questions[currentQIndex];
    const correctIdx =
      typeof currentQ?.correctOptionIndex === "number"
        ? currentQ.correctOptionIndex
        : typeof currentQ?.correctAnswer === "number"
        ? currentQ.correctAnswer
        : 0;
    const isCorrect = optionIndex === correctIdx;

    if (isCorrect) {
      battleAudio.playEmeraldChime();
    } else {
      battleAudio.playBuzz();
    }

    setMcqAnswers((prev) => ({ ...prev, [currentQIndex]: optionIndex }));

    // Move to next question or auto-submit with smooth delay
    if (currentQIndex < questions.length - 1) {
      setTimeout(() => {
        setCurrentQIndex((idx) => idx + 1);
        setTimeLeft(battle?.time_per_question || 20);
      }, 350);
    } else {
      setTimeout(() => {
        handleSubmitMcq({ ...mcqAnswers, [currentQIndex]: optionIndex });
      }, 400);
    }
  };

  // Submit MCQ Answers
  const handleSubmitMcq = async (finalAnswers: Record<number, number>) => {
    if (isSubmitting || hasSubmitted) return;
    setIsSubmitting(true);

    let score = 0;
    const ptsPerQ = questions.length > 0 ? 100 / questions.length : 20;
    questions.forEach((q, idx) => {
      const correctIdx =
        typeof q.correctOptionIndex === "number"
          ? q.correctOptionIndex
          : typeof q.correctAnswer === "number"
          ? q.correctAnswer
          : 0;
      if (finalAnswers[idx] === correctIdx) {
        score += ptsPerQ;
      }
    });
    score = Math.round(score);

    try {
      await submitBattleAnswersServerFn({
        data: {
          battleId,
          groupId,
          userId: currentUserId,
          userName: currentUserName,
          score,
          answersJson: JSON.stringify(finalAnswers),
        },
      });

      battleAudio.playEmeraldChime();
      toast.success(`MCQ Blitz submitted! Your score: ${score}/100`);
      refetch();
    } catch (err: any) {
      toast.error(err?.message || "Failed to submit answers.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAutoSubmitMcq = () => {
    handleSubmitMcq(mcqAnswers);
  };

  // Theory: Handle Image / Camera Upload
  const handleTheoryImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string)?.split(",")[1];
      if (base64) {
        setTheoryAnswers((prev) => ({
          ...prev,
          [currentQIndex]: {
            ...(prev[currentQIndex] || { text: "" }),
            imageBase64: base64,
          },
        }));
        toast.success("Handwritten solution photo attached!");
      }
    };
    reader.readAsDataURL(file);
  };

  // Theory: Voice Note Recording with Groq Whisper
  const handleStartVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        setIsRecordingAudio(false);
        if (recordIntervalRef.current) clearInterval(recordIntervalRef.current);

        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          try {
            const base64 = (reader.result as string)?.split(",")[1];
            if (base64) {
              toast.info("Transcribing derivation with Whisper...");
              const res = await transcribeVoiceAudioServerFn({
                data: { audioBase64: base64, mimeType: "audio/webm" },
              });
              if (res?.transcript) {
                setTheoryAnswers((prev) => ({
                  ...prev,
                  [currentQIndex]: {
                    ...(prev[currentQIndex] || { text: "" }),
                    audioTranscript: res.transcript,
                  },
                }));
                toast.success("Voice transcribed and added to answer!");
              }
            }
          } catch {
            toast.error("Transcription failed, please type your derivation.");
          }
        };
      };

      recorder.start();
      setIsRecordingAudio(true);
      setRecordingSeconds(0);
      recordIntervalRef.current = setInterval(() => {
        setRecordingSeconds((s) => s + 1);
      }, 1000);
    } catch {
      toast.error("Microphone access is required.");
    }
  };

  const handleStopVoiceRecording = () => {
    if (mediaRecorderRef.current && isRecordingAudio) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((t) => t.stop());
    }
  };

  // Submit Theory Answers
  const handleSubmitTheory = async () => {
    if (isSubmitting || hasSubmitted) return;
    setIsSubmitting(true);

    try {
      const res = await submitBattleAnswersServerFn({
        data: {
          battleId,
          groupId,
          userId: currentUserId,
          userName: currentUserName,
          score: 0,
          answersJson: JSON.stringify(theoryAnswers),
        },
      });

      toast.success("Theory solutions submitted! Awaiting other fighters to grade.");
      refetch();

      if (res.allSubmitted) {
        toast.info("All scholars have submitted! Boss AI is now grading...");
        handleTriggerTheoryGrading();
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to submit solutions.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Trigger Theory Grading via Boss AI
  const handleTriggerTheoryGrading = async () => {
    try {
      const res = await gradeTheoryBattleServerFn({
        data: { battleId, groupId },
      });

      if (res.success) {
        battleAudio.playEmeraldChime();
        triggerFloatingAnimation();
        refetch();
      }
    } catch (err: any) {
      toast.error(err?.message || "Grading failed.");
    }
  };

  // Floating Points Animation for Passing Grades
  const triggerFloatingAnimation = () => {
    const id = crypto.randomUUID();
    battleAudio.playEmeraldChime();
    setFloatingPoints((prev) => [...prev, { id, text: "+10 pts", qIndex: currentQIndex }]);
    setTimeout(() => {
      setFloatingPoints((prev) => prev.filter((p) => p.id !== id));
    }, 2800);
  };

  // Nudge Slowpokes Action
  const handleNudgeSlowpokes = async () => {
    setIsNudging(true);
    try {
      const res = await nudgeSlowpokesServerFn({
        data: {
          battleId,
          groupId,
          hostName: currentUserName,
          battleTitle: battle?.title || "Study Battle",
        },
      });
      if (res.count > 0) {
        toast.success(`Nudged ${res.count} scholar(s) in group chat!`);
      } else {
        toast.info("All scholars have submitted!");
      }
    } catch {
      toast.error("Failed to nudge.");
    } finally {
      setIsNudging(false);
    }
  };

  // Host Force Grade Action
  const handleForceGrade = async () => {
    setIsForceGrading(true);
    try {
      await forceGradeBattleServerFn({
        data: {
          battleId,
          groupId,
          hostId: currentUserId,
        },
      });
      toast.success("Force-grade completed! Winners unlocked.");
      refetch();
    } catch (err: any) {
      toast.error(err?.message || "Force grade failed.");
    } finally {
      setIsForceGrading(false);
    }
  };

  if (!battle) return null;

  const currentQ = questions[currentQIndex];
  const allFighters = participants.filter((p) => p.role === "fighter");
  const submittedFighters = allFighters.filter((p) => p.status === "submitted");
  const isMcq = battle.mode === "mcq";

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-hidden rounded-[2rem] p-1.5 sm:p-2 border border-border/80 bg-surface-container-low shadow-[var(--elev-3)]">
        
        {/* Floating Points Animation */}
        <AnimatePresence>
          {floatingPoints.map((fp) => (
            <motion.div
              key={fp.id}
              initial={{ opacity: 0, y: 30, scale: 0.8 }}
              animate={{ opacity: 1, y: -50, scale: 1.1 }}
              exit={{ opacity: 0, y: -90, scale: 0.9 }}
              transition={{ duration: 1.6, ease: [0.23, 1, 0.32, 1] }}
              className="absolute top-1/3 left-1/2 -translate-x-1/2 z-50 pointer-events-none"
            >
              <div className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-forest text-white border border-brand/50 font-bold text-base shadow-lift backdrop-blur-md">
                <Sparkles className="size-4 text-brass-soft animate-spin" />
                <span className="tnum font-mono">{fp.text}</span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Double-Bezel Inner Core */}
        <div className="flex flex-col max-h-[calc(92vh-1rem)] bg-card rounded-[calc(2rem-0.375rem)] border border-border/60 overflow-hidden">
          
          {/* Header Docket */}
          <div className="px-6 py-4 border-b border-border/70 bg-surface-container-low/60 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="size-9 rounded-xl bg-forest text-brass-soft flex items-center justify-center shrink-0 shadow-xs border border-forest/80">
                <Swords className="size-4.5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="eyebrow text-forest font-bold">
                    {isMcq ? "MCQ Blitz Arena" : "Theory Derivation Studio"}
                  </span>
                  <span className="text-border">•</span>
                  <span className="font-mono text-xs text-brass-ink font-semibold flex items-center gap-1 tnum">
                    <Coins className="size-3 text-brass" />
                    <span>{battle.total_pot} pts pot</span>
                  </span>
                </div>
                <DialogTitle className="font-display text-lg sm:text-xl font-normal text-ink tracking-tight truncate">
                  {battle.title}
                </DialogTitle>
              </div>
            </div>

            {/* Top Bar Actions & Progress Indicator */}
            <div className="flex items-center gap-2 shrink-0">
              {battle.mode === "theory" && !isCompleted && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={isNudging}
                  onClick={handleNudgeSlowpokes}
                  className="h-8 rounded-full text-xs font-semibold border-border bg-card text-ink hover:bg-surface-container gap-1.5 px-3 cursor-pointer active:scale-[0.98]"
                >
                  <Bell className="size-3 text-brass" />
                  <span className="hidden sm:inline">Nudge Slowpokes</span>
                </Button>
              )}

              {isHost && !isCompleted && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={isForceGrading}
                  onClick={handleForceGrade}
                  className="h-8 rounded-full text-xs font-semibold border-forest/40 bg-card text-forest hover:bg-forest/5 gap-1.5 px-3 cursor-pointer active:scale-[0.98]"
                >
                  <Sparkles className="size-3 text-brand" />
                  <span className="hidden sm:inline">Force Grade</span>
                </Button>
              )}

              {/* Step indicator */}
              <div className="h-8 px-3 rounded-full bg-surface-container border border-border/80 font-mono text-xs font-semibold text-ink-soft flex items-center gap-1">
                {isCompleted ? "Concluded 🏆" : isGrading ? "Grading..." : `Q ${currentQIndex + 1}/${questions.length}`}
              </div>
            </div>
          </div>

          {/* Main Body */}
          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6 text-ink">
            
            {/* ========================================================================= */}
            {/* COMPLETED VIEW: Podium, Leaderboard & Rubric Solutions */}
            {/* ========================================================================= */}
            {isCompleted ? (
              <div className="space-y-6">
                
                {/* Victory Banner */}
                <div className="relative overflow-hidden rounded-2xl border border-brass/40 bg-surface-container-low/60 p-6 text-center">
                  <div className="mx-auto size-12 rounded-2xl bg-brass/15 text-brass-ink flex items-center justify-center border border-brass/40 shadow-xs">
                    <Trophy className="size-6 text-brass" />
                  </div>
                  <span className="eyebrow block mt-3 text-brass-ink font-bold tracking-[0.14em]">
                    Match Finalized
                  </span>
                  <h3 className="font-display text-2xl font-normal text-ink tracking-tight mt-0.5">
                    Battle Arena Concluded
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
                    The escrow pot of <strong className="font-mono text-brass-ink font-bold tnum">{battle.total_pot} points</strong> has been awarded to the top scholar(s).
                  </p>

                  {onRunItBack && (
                    <div className="mt-4">
                      <Button
                        type="button"
                        onClick={() => onRunItBack(battle)}
                        className="h-10 rounded-full bg-forest text-white hover:bg-forest/90 font-semibold text-xs gap-2 px-6 shadow-lift active:scale-[0.98]"
                      >
                        <RotateCcw className="size-3.5 text-brass-soft" />
                        <span>Run It Back (Revenge Duel)</span>
                      </Button>
                    </div>
                  )}
                </div>

                {/* Ranked Leaderboard */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between px-1">
                    <span className="eyebrow text-ink-soft">
                      Final Standings
                    </span>
                    <span className="text-[11px] font-mono text-muted-foreground">
                      {allFighters.length} Contestants
                    </span>
                  </div>

                  <div className="divide-y divide-border/60 rounded-2xl border border-border/80 bg-surface-container-low/30 overflow-hidden">
                    {allFighters
                      .sort((a, b) => b.score - a.score)
                      .map((fighter, rank) => {
                        const isWinner = rank === 0;
                        return (
                          <div
                            key={fighter.id}
                            className={cn(
                              "flex items-center justify-between p-3.5 text-xs transition-colors",
                              isWinner ? "bg-brass/10 font-medium" : "hover:bg-surface-container-low"
                            )}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <span
                                className={cn(
                                  "size-6 rounded-lg grid place-items-center font-mono text-xs font-bold shrink-0",
                                  isWinner
                                    ? "bg-brass text-white shadow-xs"
                                    : "bg-surface-container text-muted-foreground"
                                )}
                              >
                                {rank + 1}
                              </span>

                              <Avatar className="size-8 border border-border shrink-0">
                                <AvatarImage src={fighter.avatar_url || undefined} />
                                <AvatarFallback className="text-[10px] font-semibold bg-forest text-white">
                                  {fighter.user_name[0]}
                                </AvatarFallback>
                              </Avatar>

                              <div className="truncate">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-semibold text-ink truncate">
                                    {fighter.user_name}
                                  </span>
                                  {isWinner && <Crown className="size-3.5 text-brass shrink-0" />}
                                </div>
                                <span className="text-[10px] text-muted-foreground font-mono block">
                                  {fighter.status === "submitted" ? "Completed" : "Active"}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-3 shrink-0">
                              <span className="font-mono font-bold text-ink text-sm tnum">
                                {fighter.score} pts
                              </span>
                              {isWinner && battle.total_pot > 0 && (
                                <Badge className="bg-brass/20 border-brass/40 text-brass-ink font-mono text-[10px] font-bold">
                                  +{battle.total_pot} pts Won
                                </Badge>
                              )}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>

                {/* Examination Solutions & Official Rubric */}
                <div className="space-y-3">
                  <span className="eyebrow text-ink-soft px-1 block">
                    Examination Solutions & AI Rubric
                  </span>

                  <div className="space-y-3">
                    {questions.map((q, idx) => (
                      <div
                        key={idx}
                        className="p-4 sm:p-5 rounded-2xl border border-border/80 bg-surface-container-low/40 space-y-2.5"
                      >
                        <div className="flex items-start gap-2.5">
                          <span className="font-mono text-xs text-muted-foreground font-semibold mt-0.5">
                            Q{idx + 1}.
                          </span>
                          <p className="font-display font-medium text-ink text-sm sm:text-base leading-relaxed">
                            {q.question}
                          </p>
                        </div>

                        {battle.mode === "mcq" ? (
                          <div className="rounded-xl border border-brand/30 bg-card p-3 text-xs flex flex-col gap-1.5">
                            {(() => {
                              const correctIdx =
                                typeof q.correctOptionIndex === "number"
                                  ? q.correctOptionIndex
                                  : typeof q.correctAnswer === "number"
                                  ? q.correctAnswer
                                  : 0;
                              const optionText = q.options?.[correctIdx] || q.modelAnswer || "Correct Answer";
                              return (
                                <>
                                  <div className="flex items-center justify-between">
                                    <span className="text-muted-foreground font-medium">Certified Answer:</span>
                                    <span className="font-semibold text-forest">
                                      {q.options ? `Option ${String.fromCharCode(65 + correctIdx)}: ${optionText}` : optionText}
                                    </span>
                                  </div>
                                  {q.explanation && (
                                    <p className="text-[11px] text-muted-foreground pt-1 border-t border-border/40">
                                      <span className="font-medium text-ink">Pedagogical Derivation: </span>{q.explanation}
                                    </p>
                                  )}
                                </>
                              );
                            })()}
                          </div>
                        ) : (
                          <div className="rounded-xl border border-border bg-card p-3.5 text-xs text-muted-foreground space-y-1">
                            <span className="eyebrow block text-brass-ink">Model Derivation & Grading Rubric</span>
                            <p className="text-ink leading-relaxed">
                              {q.modelAnswer || q.explanation || "Official theoretical derivation rubric verified by academic ledger."}
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            ) : (
              /* ========================================================================= */
              /* ACTIVE MATCH PLAY VIEW */
              /* ========================================================================= */
              <div className="space-y-5">
                
                {/* MCQ Timer Bar */}
                {isMcq && (
                  <div className="space-y-1.5 p-3 rounded-2xl bg-surface-container-low/60 border border-border/80">
                    <div className="flex items-center justify-between text-xs">
                      <span className="eyebrow text-ink-soft">Pacing Timer</span>
                      <span
                        className={cn(
                          "font-mono font-bold text-xs tnum flex items-center gap-1.5",
                          timeLeft <= 4 ? "text-destructive animate-pulse" : "text-forest"
                        )}
                      >
                        <Clock className="size-3.5" />
                        <span>{timeLeft}s remaining</span>
                      </span>
                    </div>

                    <Progress
                      value={(timeLeft / (battle.time_per_question || 20)) * 100}
                      className={cn(
                        "h-1.5 rounded-full bg-surface-container overflow-hidden",
                        timeLeft <= 4 ? "[&>div]:bg-destructive" : "[&>div]:bg-forest"
                      )}
                    />
                  </div>
                )}

                {/* Question Docket Card */}
                <div className="rounded-2xl border border-border/80 bg-surface-container-low/40 p-5 sm:p-6 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="eyebrow text-forest">
                      Question {currentQIndex + 1} of {questions.length}
                    </span>
                    {!isMcq && (
                      <Badge variant="outline" className="text-[10px] rounded-full border-border bg-card text-ink-soft">
                        Untimed Session
                      </Badge>
                    )}
                  </div>
                  <h3 className="font-display text-xl sm:text-2xl font-normal text-ink leading-relaxed">
                    {currentQ?.question || "Exam Question Prompt"}
                  </h3>
                </div>

                {/* MCQ Choices (Tactile Cards) */}
                {isMcq && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {currentQ?.options?.map((opt: string, optIdx: number) => {
                      const isSelected = mcqAnswers[currentQIndex] === optIdx;
                      return (
                        <button
                          key={optIdx}
                          type="button"
                          disabled={hasSubmitted || isSpectator}
                          onClick={() => handleSelectOption(optIdx)}
                          className={cn(
                            "p-4 rounded-2xl border text-left text-xs sm:text-sm font-medium flex items-center justify-between gap-3 transition-all cursor-pointer active:scale-[0.98]",
                            isSelected
                              ? "border-forest bg-forest text-white shadow-lift"
                              : "border-border/80 bg-card hover:bg-surface-container-low text-ink"
                          )}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span
                              className={cn(
                                "size-7 rounded-xl grid place-items-center font-mono text-xs font-bold shrink-0 border",
                                isSelected
                                  ? "bg-white/20 border-white/30 text-white"
                                  : "bg-surface-container border-border/80 text-muted-foreground"
                              )}
                            >
                              {String.fromCharCode(65 + optIdx)}
                            </span>
                            <span className="leading-snug truncate">{opt}</span>
                          </div>

                          {isSelected && (
                            <CheckCircle2 className="size-4.5 shrink-0 text-brass-soft" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Theory Studio (Multimodal workspace) */}
                {!isMcq && (
                  <div className="space-y-4">
                    <div className="rounded-2xl border border-border/80 bg-surface-container-low/40 p-4 sm:p-5 space-y-3.5 shadow-xs">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <span className="eyebrow text-ink-soft">Your Theoretical Derivation</span>
                        
                        <div className="flex items-center gap-2">
                          {/* Snap Notes Camera */}
                          <label className="h-8 px-3 rounded-full border border-border bg-card text-xs font-semibold flex items-center gap-1.5 text-ink hover:bg-surface-container cursor-pointer transition-colors active:scale-[0.97]">
                            <Camera className="size-3.5 text-forest" />
                            <span>Snap Notes</span>
                            <input
                              type="file"
                              accept="image/*"
                              capture="environment"
                              onChange={handleTheoryImageUpload}
                              className="hidden"
                            />
                          </label>

                          {/* Whisper Voice Note */}
                          {isRecordingAudio ? (
                            <Button
                              type="button"
                              size="sm"
                              onClick={handleStopVoiceRecording}
                              className="h-8 px-3.5 rounded-full bg-destructive text-white text-xs font-semibold gap-1.5 animate-pulse"
                            >
                              <Square className="size-3 fill-current" />
                              <span>Stop ({recordingSeconds}s)</span>
                            </Button>
                          ) : (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={handleStartVoiceRecording}
                              className="h-8 px-3 rounded-full text-xs font-semibold gap-1.5 border-border bg-card text-ink hover:bg-surface-container cursor-pointer active:scale-[0.97]"
                            >
                              <Mic className="size-3.5 text-brass" />
                              <span>Voice Derivation</span>
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Photo attachment preview */}
                      {theoryAnswers[currentQIndex]?.imageBase64 && (
                        <div className="p-3 rounded-xl bg-card border border-brand/40 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <FileText className="size-4 text-brand" />
                            <span className="font-semibold text-forest">
                              Handwritten solution notes attached for AI optical verification
                            </span>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              setTheoryAnswers((prev) => {
                                const cur = prev[currentQIndex];
                                return {
                                  ...prev,
                                  [currentQIndex]: {
                                    text: cur?.text || "",
                                    imageBase64: undefined,
                                    audioTranscript: cur?.audioTranscript,
                                  },
                                };
                              })
                            }
                            className="size-7 p-0 rounded-full text-muted-foreground hover:text-ink"
                          >
                            <X className="size-3.5" />
                          </Button>
                        </div>
                      )}

                      {/* Audio transcription preview */}
                      {theoryAnswers[currentQIndex]?.audioTranscript && (
                        <div className="p-3 rounded-xl bg-card border border-brass/30 text-xs text-ink space-y-1">
                          <span className="eyebrow block text-brass-ink">Whisper Transcription</span>
                          <p className="italic text-ink-soft leading-relaxed">
                            "{theoryAnswers[currentQIndex]?.audioTranscript}"
                          </p>
                        </div>
                      )}

                      {/* Derivation Textarea */}
                      <textarea
                        value={theoryAnswers[currentQIndex]?.text || ""}
                        onChange={(e) =>
                          setTheoryAnswers((prev) => ({
                            ...prev,
                            [currentQIndex]: {
                              ...(prev[currentQIndex] || {}),
                              text: e.target.value,
                            },
                          }))
                        }
                        placeholder="Write derivation steps, equations, or scholarly explanations..."
                        rows={5}
                        disabled={hasSubmitted || isSpectator}
                        className="w-full resize-none rounded-xl border border-border bg-card p-3 text-xs sm:text-sm text-ink placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-forest leading-relaxed font-sans"
                      />
                    </div>

                    {/* Stepper Navigation */}
                    <div className="flex items-center justify-between pt-1">
                      <Button
                        type="button"
                        variant="outline"
                        disabled={currentQIndex === 0}
                        onClick={() => setCurrentQIndex((i) => i - 1)}
                        className="h-10 rounded-full text-xs font-semibold gap-1.5 px-4 border-border bg-card cursor-pointer active:scale-[0.98]"
                      >
                        <ChevronLeft className="size-3.5" /> Previous
                      </Button>

                      {currentQIndex < questions.length - 1 ? (
                        <Button
                          type="button"
                          onClick={() => setCurrentQIndex((i) => i + 1)}
                          className="h-10 rounded-full text-xs font-semibold gap-1.5 px-5 bg-forest text-white hover:bg-forest/90 cursor-pointer active:scale-[0.98]"
                        >
                          Next Question <ChevronRight className="size-3.5" />
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          disabled={isSubmitting || hasSubmitted || isSpectator}
                          onClick={handleSubmitTheory}
                          className="h-10 rounded-full bg-forest hover:bg-forest/90 text-white font-semibold text-xs gap-2 px-6 shadow-lift cursor-pointer active:scale-[0.98]"
                        >
                          {isSubmitting ? (
                            <Loader2 className="size-3.5 animate-spin text-brass-soft" />
                          ) : (
                            <Send className="size-3.5 text-brass-soft" />
                          )}
                          <span>{hasSubmitted ? "Already Submitted" : "Submit All Solutions"}</span>
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                {/* Anti-Peek Status Strip */}
                <div className="pt-4 border-t border-border/80 space-y-3">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <Lock className="size-3.5 text-brass" />
                      <span className="font-semibold text-ink-soft">
                        Anti-Peek Protocol: Solutions revealed once all scholars submit
                      </span>
                    </div>
                    <span className="font-mono text-xs tnum">
                      {submittedFighters.length} of {allFighters.length} submitted
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {allFighters.map((f) => {
                      const isUser = f.user_id === currentUserId;
                      const isDone = f.status === "submitted";

                      return (
                        <div
                          key={f.id}
                          className={cn(
                            "p-2.5 rounded-xl border flex items-center justify-between text-xs transition-colors",
                            isDone
                              ? "border-brand/40 bg-card text-forest shadow-xs"
                              : "border-border/80 bg-surface-container-low/40 text-muted-foreground"
                          )}
                        >
                          <div className="flex items-center gap-2 truncate">
                            <Avatar className="size-5 border border-border">
                              <AvatarImage src={f.avatar_url || undefined} />
                              <AvatarFallback className="text-[9px] font-semibold bg-forest text-white">
                                {f.user_name[0]}
                              </AvatarFallback>
                            </Avatar>
                            <span className="truncate font-semibold text-ink">
                              {isUser ? "You" : f.user_name}
                            </span>
                          </div>

                          {isDone ? (
                            <CheckCircle2 className="size-3.5 text-brand shrink-0" />
                          ) : (
                            <span className="size-2 rounded-full bg-brass animate-pulse shrink-0" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>
            )}

          </div>

        </div>
      </DialogContent>
    </Dialog>
  );
}
