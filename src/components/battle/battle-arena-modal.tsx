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
  Eye,
  EyeOff,
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

  // Active Battle Query
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

  // Parse Questions
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
    const isCorrect = optionIndex === currentQ?.correctAnswer;

    if (isCorrect) {
      battleAudio.playEmeraldChime();
    } else {
      battleAudio.playBuzz();
    }

    setMcqAnswers((prev) => ({ ...prev, [currentQIndex]: optionIndex }));

    // Move to next question or auto-submit
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
    questions.forEach((q, idx) => {
      if (finalAnswers[idx] === q.correctAnswer) {
        score += 20; // 5 questions * 20 = 100 max
      }
    });

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
              toast.info("Transcribing voice derivation with Groq Whisper...");
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
            toast.error("Whisper transcription failed, please type your answer.");
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
      toast.error("Microphone access required.");
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
        toast.info("All fighters have submitted! Boss AI is now grading...");
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

  // Floating Points Animation for Passing Grades (+10 pts with emerald glow)
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
        toast.success(`Nudged ${res.count} slowpoke(s) in group chat!`);
      } else {
        toast.info("All fighters have submitted!");
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
      toast.success("Force-grade completed! Solutions and winners unlocked.");
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
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto rounded-3xl p-0 border border-border bg-card shadow-2xl relative text-foreground">
        {/* Floating +10 pts Emerald Glow Animation */}
        <AnimatePresence>
          {floatingPoints.map((fp) => (
            <motion.div
              key={fp.id}
              initial={{ opacity: 0, y: 30, scale: 0.7 }}
              animate={{ opacity: 1, y: -45, scale: 1.15 }}
              exit={{ opacity: 0, y: -80, scale: 0.8 }}
              transition={{ duration: 1.6, ease: "easeOut" }}
              className="absolute top-1/3 left-1/2 -translate-x-1/2 z-50 pointer-events-none"
            >
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-forest text-white border border-brand/50 font-bold text-lg shadow-xl backdrop-blur-md">
                <Sparkles className="size-4 text-[#8fd9b6] animate-spin" />
                <span className="tnum">{fp.text}</span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Scholar's Header Docket */}
        <DialogHeader className="border-b border-border/80 bg-surface-container-low px-6 py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-xl border border-brass/40 bg-brass/10 text-brass-ink">
                <Swords className="size-4" />
              </span>
              <div>
                <DialogTitle className="font-display text-base sm:text-lg font-medium text-ink leading-tight tracking-tight">
                  {battle.title}
                </DialogTitle>
                <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="font-semibold text-ink-soft">
                    {isMcq ? "MCQ Blitz" : "Theory Showdown"}
                  </span>
                  <span>•</span>
                  <span className="inline-flex items-center gap-1 font-semibold text-brass-ink">
                    <Coins className="size-3 text-brass" />
                    <span className="tnum">{battle.total_pot}</span> pts escrow
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Nudge Slowpokes Button */}
              {battle.mode === "theory" && !isCompleted && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={isNudging}
                  onClick={handleNudgeSlowpokes}
                  className="h-7 rounded-full text-[11px] font-semibold border-border bg-card text-ink-soft hover:bg-surface-container gap-1 press"
                >
                  <Bell className="size-3 text-brass" />
                  <span className="hidden sm:inline">Nudge</span>
                </Button>
              )}

              {/* Host Force Grade Button */}
              {isHost && !isCompleted && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={isForceGrading}
                  onClick={handleForceGrade}
                  className="h-7 rounded-full text-[11px] font-semibold border-forest/30 text-forest hover:bg-forest/5 gap-1 press"
                >
                  <Sparkles className="size-3 text-brand" />
                  <span className="hidden sm:inline">Grade</span>
                </Button>
              )}

              <Badge
                variant="outline"
                className="h-6 px-2.5 rounded-full border-border bg-card font-mono text-[11px] font-semibold text-ink-soft"
              >
                {isCompleted ? "Completed 🏆" : isGrading ? "Grading..." : `Q ${currentQIndex + 1}/${questions.length}`}
              </Badge>
            </div>
          </div>
        </DialogHeader>

        <div className="p-6 space-y-5">
          {/* ========================================================================= */}
          {/* COMPLETED VIEW: Leaderboard & Review */}
          {/* ========================================================================= */}
          {isCompleted ? (
            <div className="space-y-6">
              {/* Victory Banner */}
              <div className="relative overflow-hidden rounded-2xl border border-brass/40 bg-surface-container-low p-6 text-center">
                <span className="mx-auto grid size-12 place-items-center rounded-2xl border border-brass/50 bg-brass/15 text-brass-ink shadow-sm">
                  <Trophy className="size-6 text-brass" />
                </span>
                <p className="eyebrow mt-3 text-brass-ink">Session Concluded</p>
                <h3 className="mt-1 font-display text-2xl font-medium tracking-tight text-ink">
                  Battle Concluded
                </h3>
                <p className="mt-1 text-xs text-muted-foreground max-w-sm mx-auto">
                  Escrow pool of <strong className="text-ink font-semibold tnum">{battle.total_pot} points</strong> has been awarded to top scholar(s).
                </p>

                {onRunItBack && (
                  <div className="mt-5">
                    <Button
                      type="button"
                      onClick={() => onRunItBack(battle)}
                      className="h-9 rounded-full bg-forest text-white hover:bg-forest/90 font-semibold text-xs gap-1.5 px-5 shadow-sm press"
                    >
                      <RotateCcw className="size-3.5 text-[#8fd9b6]" />
                      <span>Run It Back (Revenge Match)</span>
                    </Button>
                  </div>
                )}
              </div>

              {/* Leaderboard */}
              <div>
                <p className="eyebrow px-1">Final Leaderboard</p>
                <div className="mt-2 divide-y divide-border/60 rounded-2xl border border-border bg-card overflow-hidden">
                  {allFighters
                    .sort((a, b) => b.score - a.score)
                    .map((fighter, rank) => {
                      const isWinner = rank === 0;
                      return (
                        <div
                          key={fighter.id}
                          className={cn(
                            "flex items-center justify-between p-3 text-xs transition-colors",
                            isWinner ? "bg-brass/5 font-medium" : "hover:bg-surface-container-low"
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <span
                              className={cn(
                                "size-6 rounded-lg grid place-items-center font-mono text-[11px] font-bold",
                                isWinner
                                  ? "bg-brass text-white shadow-xs"
                                  : "bg-surface-container text-muted-foreground"
                              )}
                            >
                              {rank + 1}
                            </span>
                            <Avatar className="size-7 border border-border">
                              <AvatarImage src={fighter.avatar_url || undefined} />
                              <AvatarFallback className="text-[10px] font-semibold bg-surface-container">
                                {fighter.user_name[0]}
                              </AvatarFallback>
                            </Avatar>
                            <span className="truncate max-w-[150px] font-medium text-ink">
                              {fighter.user_name}
                            </span>
                            {isWinner && (
                              <Crown className="size-3.5 text-brass shrink-0" />
                            )}
                          </div>

                          <div className="flex items-center gap-3">
                            <span className="font-mono font-bold text-ink text-sm tnum">
                              {fighter.score} pts
                            </span>
                            {isWinner && battle.total_pot > 0 && (
                              <Badge className="bg-brass/15 border-brass/30 text-brass-ink font-mono text-[10px] font-bold">
                                +{battle.total_pot} pts Won
                              </Badge>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* Question Review & Solutions */}
              <div>
                <p className="eyebrow px-1">Examination Solutions & Rubric</p>
                <div className="mt-2 space-y-2.5">
                  {questions.map((q, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-2xl border border-border bg-card text-xs space-y-2"
                    >
                      <div className="flex items-start gap-2">
                        <span className="font-mono text-muted-foreground font-semibold">
                          Q{idx + 1}.
                        </span>
                        <p className="font-display font-medium text-ink text-sm leading-relaxed">
                          {q.question}
                        </p>
                      </div>

                      {battle.mode === "mcq" ? (
                        <div className="mt-2 rounded-xl border border-brand/30 bg-accent/40 p-2.5 text-[11px] font-medium text-brand-deep">
                          Correct Answer: <strong className="font-semibold text-ink">{q.options?.[q.correctAnswer]}</strong>
                        </div>
                      ) : (
                        <div className="mt-2 rounded-xl border border-border bg-surface-container-low p-2.5 text-[11px] text-muted-foreground space-y-1">
                          <span className="eyebrow !text-ink-soft block">Model Answer & Rubric</span>
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
              {/* MCQ Countdown Progress */}
              {isMcq && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-medium">
                    <span className="eyebrow">Time per question</span>
                    <span
                      className={cn(
                        "font-mono font-bold text-xs tnum flex items-center gap-1",
                        timeLeft <= 5 ? "text-destructive animate-pulse" : "text-brass-ink"
                      )}
                    >
                      <Clock className="size-3.5" /> {timeLeft}s remaining
                    </span>
                  </div>
                  <Progress
                    value={(timeLeft / (battle.time_per_question || 20)) * 100}
                    className={cn(
                      "h-1.5 rounded-full bg-surface-container",
                      timeLeft <= 5 ? "[&>div]:bg-destructive" : "[&>div]:bg-forest"
                    )}
                  />
                </div>
              )}

              {/* Question Card */}
              <div className="rounded-2xl border border-border bg-surface-container-low p-5 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="eyebrow">
                    Question {currentQIndex + 1} of {questions.length}
                  </span>
                  {!isMcq && (
                    <Badge variant="outline" className="text-[10px] rounded-full border-brand/30 text-brand bg-accent/30 font-semibold">
                      Untimed Session
                    </Badge>
                  )}
                </div>
                <h3 className="font-display text-base sm:text-lg font-medium text-ink leading-relaxed">
                  {currentQ?.question || "Exam Question Prompt"}
                </h3>
              </div>

              {/* MCQ Choices */}
              {isMcq && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {currentQ?.options?.map((opt: string, optIdx: number) => {
                    const isSelected = mcqAnswers[currentQIndex] === optIdx;
                    return (
                      <button
                        key={optIdx}
                        type="button"
                        disabled={hasSubmitted || isSpectator}
                        onClick={() => handleSelectOption(optIdx)}
                        className={cn(
                          "p-4 rounded-2xl border text-left text-xs font-medium flex items-center justify-between gap-3 transition-all lift press",
                          isSelected
                            ? "border-forest bg-forest text-white shadow-sm"
                            : "border-border bg-card hover:bg-surface-container-low text-ink"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className={cn(
                              "size-6 rounded-lg grid place-items-center font-mono text-xs font-bold shrink-0",
                              isSelected
                                ? "bg-white/20 text-white"
                                : "bg-surface-container text-muted-foreground"
                            )}
                          >
                            {String.fromCharCode(65 + optIdx)}
                          </span>
                          <span className="leading-snug">{opt}</span>
                        </div>
                        {isSelected && <CheckCircle2 className="size-4 shrink-0 text-[#8fd9b6]" />}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Theory Mode: Multimodal Studio */}
              {!isMcq && (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-border bg-card p-4 space-y-3 shadow-xs">
                    <div className="flex items-center justify-between">
                      <span className="eyebrow">Your Solution / Derivation</span>
                      <div className="flex items-center gap-2">
                        {/* Camera attachment */}
                        <label className="h-7 px-3 rounded-full border border-border text-[11px] font-semibold flex items-center gap-1.5 text-ink-soft hover:text-ink cursor-pointer bg-surface-container-low press">
                          <Camera className="size-3.5 text-brand" />
                          <span>Snap Notes</span>
                          <input
                            type="file"
                            accept="image/*"
                            capture="environment"
                            onChange={handleTheoryImageUpload}
                            className="hidden"
                          />
                        </label>

                        {/* Voice note recorder */}
                        {isRecordingAudio ? (
                          <Button
                            type="button"
                            size="sm"
                            onClick={handleStopVoiceRecording}
                            className="h-7 px-3 rounded-full bg-destructive text-white text-[11px] font-semibold gap-1.5 animate-pulse press"
                          >
                            <Square className="size-2.5 fill-current" />
                            <span>Stop ({recordingSeconds}s)</span>
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={handleStartVoiceRecording}
                            className="h-7 px-3 rounded-full text-[11px] font-semibold gap-1.5 text-brass-ink border-brass/40 bg-brass/5 hover:bg-brass/10 press"
                          >
                            <Mic className="size-3.5 text-brass" />
                            <span>Voice Derivation</span>
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Photo preview */}
                    {theoryAnswers[currentQIndex]?.imageBase64 && (
                      <div className="p-2.5 rounded-xl bg-accent/30 border border-brand/30 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <FileText className="size-4 text-brand" />
                          <span className="font-medium text-brand-deep">
                            Handwritten notes attached for AI optical verification
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
                          className="size-6 p-0 text-muted-foreground hover:text-ink"
                        >
                          <X className="size-3.5" />
                        </Button>
                      </div>
                    )}

                    {/* Voice transcript preview */}
                    {theoryAnswers[currentQIndex]?.audioTranscript && (
                      <div className="p-3 rounded-xl bg-brass/10 border border-brass/25 text-xs text-ink space-y-1">
                        <span className="eyebrow !text-brass-ink block">Whisper Transcription</span>
                        <p className="italic text-ink-soft leading-relaxed">
                          "{theoryAnswers[currentQIndex]?.audioTranscript}"
                        </p>
                      </div>
                    )}

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
                      placeholder="Enter derivation steps, mathematical equations, or scholarly explanations..."
                      rows={4}
                      disabled={hasSubmitted || isSpectator}
                      className="w-full resize-none bg-transparent text-sm text-ink placeholder:text-muted-foreground focus:outline-hidden leading-relaxed"
                    />
                  </div>

                  {/* Navigation Footer */}
                  <div className="flex items-center justify-between pt-1">
                    <Button
                      type="button"
                      variant="outline"
                      disabled={currentQIndex === 0}
                      onClick={() => setCurrentQIndex((i) => i - 1)}
                      className="h-9 rounded-full text-xs font-semibold gap-1 px-4 border-border press"
                    >
                      <ChevronLeft className="size-3.5" /> Previous
                    </Button>

                    {currentQIndex < questions.length - 1 ? (
                      <Button
                        type="button"
                        onClick={() => setCurrentQIndex((i) => i + 1)}
                        className="h-9 rounded-full text-xs font-semibold gap-1 px-4 bg-forest text-white hover:bg-forest/90 press"
                      >
                        Next Question <ChevronRight className="size-3.5" />
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        disabled={isSubmitting || hasSubmitted || isSpectator}
                        onClick={handleSubmitTheory}
                        className="h-9 rounded-full bg-brand hover:bg-brand-deep text-white font-semibold text-xs gap-1.5 px-5 shadow-sm press"
                      >
                        {isSubmitting ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <Send className="size-3.5" />
                        )}
                        <span>{hasSubmitted ? "Already Submitted" : "Submit All Solutions"}</span>
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {/* Anti-Peek Status Strip */}
              <div className="pt-3 border-t border-border/80 space-y-2.5">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <Lock className="size-3 text-brass" />
                    <span className="font-medium text-ink-soft">
                      Anti-Peek Protocol: Solutions revealed once all scholars submit
                    </span>
                  </div>
                  <span className="font-mono text-[11px] tnum">
                    {submittedFighters.length}/{allFighters.length} submitted
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
                            ? "border-brand/30 bg-accent/40 text-brand-deep"
                            : "border-border bg-card text-muted-foreground"
                        )}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <Avatar className="size-5 border border-border">
                            <AvatarImage src={f.avatar_url || undefined} />
                            <AvatarFallback className="text-[9px] font-semibold bg-surface-container">
                              {f.user_name[0]}
                            </AvatarFallback>
                          </Avatar>
                          <span className="truncate font-medium text-ink">
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
      </DialogContent>
    </Dialog>
  );
}
