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
          score: 0, // Score will be computed during AI grading
          answersJson: JSON.stringify(theoryAnswers),
        },
      });

      toast.success("Theory solutions submitted! Awaiting other fighters to grade.");
      refetch();

      // If all submitted, trigger grading
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
        // Check if current user passed for floating points animation
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
  const allFightersSubmitted = allFighters.length > 0 && submittedFighters.length >= allFighters.length;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto rounded-3xl p-5 border-border bg-card shadow-2xl relative">
        {/* Floating +10 pts Emerald Glow Animation */}
        <AnimatePresence>
          {floatingPoints.map((fp) => (
            <motion.div
              key={fp.id}
              initial={{ opacity: 0, y: 30, scale: 0.6 }}
              animate={{ opacity: 1, y: -40, scale: 1.2 }}
              exit={{ opacity: 0, y: -80, scale: 0.8 }}
              transition={{ duration: 1.8, ease: "easeOut" }}
              className="absolute top-1/3 left-1/2 -translate-x-1/2 z-50 pointer-events-none"
            >
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/20 border-2 border-emerald-400 text-emerald-400 font-black text-xl shadow-[0_0_35px_rgba(16,185,129,0.8)] backdrop-blur-md">
                <Sparkles className="size-5 fill-current animate-spin" />
                <span>{fp.text}</span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        <DialogHeader className="border-b border-border/70 pb-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="size-8 rounded-xl bg-amber-500/20 text-amber-500 grid place-items-center">
                <Swords className="size-4" />
              </div>
              <div>
                <DialogTitle className="text-sm sm:text-base font-black text-foreground">
                  {battle.title}
                </DialogTitle>
                <p className="text-[10px] text-muted-foreground">
                  {battle.mode === "mcq" ? "⚡ MCQ Blitz" : "🥋 Theory Showdown (Untimed)"}
                  {" • "}Pot: <strong className="text-amber-500">{battle.total_pot} pts</strong>
                </p>
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
                  className="h-7 rounded-full text-[10px] font-bold border-amber-500/40 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 gap-1"
                >
                  <Bell className="size-3" />
                  <span>Nudge Slowpokes</span>
                </Button>
              )}

              {/* Host Force Grade Button */}
              {isHost && !isCompleted && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={isForceGrading}
                  onClick={handleForceGrade}
                  className="h-7 rounded-full text-[10px] font-bold border-primary/40 text-primary hover:bg-primary/10 gap-1"
                >
                  <Sparkles className="size-3" />
                  <span>Force Grade</span>
                </Button>
              )}

              <Badge variant="outline" className="text-[10px] h-6 px-2.5 font-bold">
                {isCompleted ? "Completed 🏆" : isGrading ? "Grading..." : `Q ${currentQIndex + 1} of ${questions.length}`}
              </Badge>
            </div>
          </div>
        </DialogHeader>

        {/* ========================================================================= */}
        {/* COMPLETED VIEW: Leaderboard & Review */}
        {/* ========================================================================= */}
        {isCompleted ? (
          <div className="space-y-4 py-2">
            <div className="p-4 rounded-3xl bg-gradient-to-br from-amber-500/15 via-card to-emerald-500/15 border border-amber-500/40 text-center space-y-2">
              <div className="size-12 rounded-full bg-amber-500 text-black mx-auto grid place-items-center shadow-lg shadow-amber-500/30">
                <Trophy className="size-6" />
              </div>
              <h3 className="text-base font-black text-foreground">Battle Completed!</h3>
              <p className="text-xs text-muted-foreground">
                Total Pot of <strong>{battle.total_pot} pts</strong> distributed to the winner(s)!
              </p>

              {/* Run It Back Button */}
              {onRunItBack && (
                <div className="pt-2">
                  <Button
                    type="button"
                    onClick={() => onRunItBack(battle)}
                    className="h-9 rounded-2xl bg-amber-500 hover:bg-amber-600 text-black font-black text-xs gap-1.5 shadow-md shadow-amber-500/20"
                  >
                    <RotateCcw className="size-3.5" />
                    <span>Run It Back 🔄 (Revenge Match)</span>
                  </Button>
                </div>
              )}
            </div>

            {/* Leaderboard Table */}
            <div className="space-y-1.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">
                Final Leaderboard
              </h4>
              <div className="space-y-1">
                {allFighters
                  .sort((a, b) => b.score - a.score)
                  .map((fighter, rank) => {
                    const isWinner = rank === 0;
                    return (
                      <div
                        key={fighter.id}
                        className={cn(
                          "flex items-center justify-between p-2.5 rounded-2xl border text-xs",
                          isWinner
                            ? "border-amber-500/60 bg-amber-500/10 font-bold"
                            : "border-border bg-card"
                        )}
                      >
                        <div className="flex items-center gap-2.5">
                          <span
                            className={cn(
                              "size-5 rounded-full grid place-items-center text-[10px] font-black",
                              isWinner ? "bg-amber-500 text-black" : "bg-secondary text-muted-foreground"
                            )}
                          >
                            {rank + 1}
                          </span>
                          <Avatar className="size-6 border border-border">
                            <AvatarImage src={fighter.avatar_url || undefined} />
                            <AvatarFallback className="text-[9px]">{fighter.user_name[0]}</AvatarFallback>
                          </Avatar>
                          <span className="truncate max-w-[140px] text-foreground">{fighter.user_name}</span>
                          {isWinner && <span className="text-xs">👑</span>}
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="font-extrabold text-foreground">{fighter.score} pts</span>
                          {isWinner && battle.total_pot > 0 && (
                            <Badge className="bg-amber-500 text-black text-[10px] font-black">
                              +{battle.total_pot} pts Won!
                            </Badge>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Question Review & Solutions */}
            <div className="space-y-2 pt-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">
                Official Exam Solutions & Rubric
              </h4>
              <div className="space-y-2">
                {questions.map((q, idx) => (
                  <div key={idx} className="p-3 rounded-2xl border border-border bg-card text-xs space-y-1.5">
                    <p className="font-bold text-foreground">
                      Q{idx + 1}. {q.question}
                    </p>
                    {battle.mode === "mcq" ? (
                      <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-500/10 p-2 rounded-xl">
                        Correct Answer: {q.options?.[q.correctAnswer]}
                      </div>
                    ) : (
                      <div className="text-[11px] text-muted-foreground bg-secondary/30 p-2 rounded-xl space-y-1">
                        <span className="font-bold text-foreground block">Model Answer & Rubric:</span>
                        <p>{q.modelAnswer || q.explanation || "Official theoretical derivation rubric."}</p>
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
          <div className="space-y-4 py-2">
            {/* MCQ Timer Bar */}
            {battle.mode === "mcq" && (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <span className="text-muted-foreground">Speed Countdown</span>
                  <span
                    className={cn(
                      "font-black text-xs",
                      timeLeft <= 5 ? "text-red-500 animate-pulse" : "text-amber-500"
                    )}
                  >
                    ⏱️ {timeLeft}s remaining
                  </span>
                </div>
                <Progress
                  value={(timeLeft / (battle.time_per_question || 20)) * 100}
                  className={cn(
                    "h-2 rounded-full",
                    timeLeft <= 5 ? "[&>div]:bg-red-500" : "[&>div]:bg-amber-500"
                  )}
                />
              </div>
            )}

            {/* Question Prompt Card */}
            <div className="p-4 rounded-3xl border border-border/80 bg-secondary/15 space-y-2">
              <div className="flex items-center justify-between text-[10px] text-muted-foreground font-bold">
                <span>QUESTION {currentQIndex + 1} OF {questions.length}</span>
                {battle.mode === "theory" && <span className="text-emerald-500">Untimed Session</span>}
              </div>
              <h3 className="text-sm sm:text-base font-bold text-foreground leading-relaxed">
                {currentQ?.question || "Exam Question Prompt"}
              </h3>
            </div>

            {/* ========================================================================= */}
            {/* MCQ OPTIONS */}
            {/* ========================================================================= */}
            {battle.mode === "mcq" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {currentQ?.options?.map((opt: string, optIdx: number) => {
                  const isSelected = mcqAnswers[currentQIndex] === optIdx;
                  return (
                    <button
                      key={optIdx}
                      type="button"
                      disabled={hasSubmitted || isSpectator}
                      onClick={() => handleSelectOption(optIdx)}
                      className={cn(
                        "p-3.5 rounded-2xl border text-left text-xs font-semibold flex items-center justify-between gap-2 transition-all active:scale-[0.98]",
                        isSelected
                          ? "border-primary bg-primary text-primary-foreground shadow-md"
                          : "border-border/80 bg-card hover:bg-secondary/60 text-foreground"
                      )}
                    >
                      <div className="flex items-center gap-2.5">
                        <span
                          className={cn(
                            "size-6 rounded-lg grid place-items-center text-xs font-black",
                            isSelected
                              ? "bg-primary-foreground text-primary"
                              : "bg-secondary text-muted-foreground"
                          )}
                        >
                          {String.fromCharCode(65 + optIdx)}
                        </span>
                        <span>{opt}</span>
                      </div>
                      {isSelected && <CheckCircle2 className="size-4 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            )}

            {/* ========================================================================= */}
            {/* THEORY SHOWDOWN INPUT (Multimodal) */}
            {/* ========================================================================= */}
            {battle.mode === "theory" && (
              <div className="space-y-3">
                <div className="p-3.5 rounded-2xl border border-border bg-card space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground">Your Solution / Derivation</span>
                    <div className="flex items-center gap-1.5">
                      {/* Photo / Camera button */}
                      <label className="h-7 px-2.5 rounded-full border border-border text-[10px] font-bold flex items-center gap-1 text-muted-foreground hover:text-foreground cursor-pointer bg-secondary/50">
                        <Camera className="size-3 text-emerald-500" />
                        <span>Snap Notes</span>
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          onChange={handleTheoryImageUpload}
                          className="hidden"
                        />
                      </label>

                      {/* Voice Note Derivation button */}
                      {isRecordingAudio ? (
                        <Button
                          type="button"
                          size="sm"
                          onClick={handleStopVoiceRecording}
                          className="h-7 px-2.5 rounded-full bg-red-600 text-white text-[10px] font-bold gap-1 animate-pulse"
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
                          className="h-7 px-2.5 rounded-full text-[10px] font-bold gap-1 text-amber-600 dark:text-amber-400 border-amber-500/40 hover:bg-amber-500/10"
                        >
                          <Mic className="size-3" />
                          <span>Voice Note</span>
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Photo Preview if attached */}
                  {theoryAnswers[currentQIndex]?.imageBase64 && (
                    <div className="p-2 rounded-xl bg-secondary/40 border border-emerald-500/40 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <FileText className="size-4 text-emerald-500" />
                        <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                          Handwritten notes photo attached
                        </span>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          setTheoryAnswers((prev) => ({
                            ...prev,
                            [currentQIndex]: { ...prev[currentQIndex], imageBase64: undefined },
                          }))
                        }
                        className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                      >
                        <X className="size-3" />
                      </Button>
                    </div>
                  )}

                  {/* Voice Transcription Preview */}
                  {theoryAnswers[currentQIndex]?.audioTranscript && (
                    <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-[11px] text-foreground">
                      <span className="font-bold text-amber-500 block text-[9px] uppercase">Voice Derivation:</span>
                      "{theoryAnswers[currentQIndex]?.audioTranscript}"
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
                    placeholder="Type derivation steps, equations, or academic definitions..."
                    rows={4}
                    disabled={hasSubmitted || isSpectator}
                    className="w-full resize-none bg-transparent text-xs text-foreground focus:outline-hidden leading-relaxed"
                  />
                </div>

                {/* Question Navigation */}
                <div className="flex items-center justify-between">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={currentQIndex === 0}
                    onClick={() => setCurrentQIndex((i) => i - 1)}
                    className="h-8 rounded-xl text-xs gap-1"
                  >
                    <ChevronLeft className="size-3.5" /> Previous
                  </Button>

                  {currentQIndex < questions.length - 1 ? (
                    <Button
                      type="button"
                      onClick={() => setCurrentQIndex((i) => i + 1)}
                      className="h-8 rounded-xl text-xs gap-1"
                    >
                      Next Question <ChevronRight className="size-3.5" />
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      disabled={isSubmitting || hasSubmitted || isSpectator}
                      onClick={handleSubmitTheory}
                      className="h-9 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1.5 shadow-md shadow-emerald-500/20"
                    >
                      <Send className="size-3.5" />
                      <span>{hasSubmitted ? "Already Submitted" : "Submit All 5 Solutions"}</span>
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* ANTI-PEEK PARTICIPANT STATUS STRIP */}
            {/* ========================================================================= */}
            <div className="pt-2 border-t border-border/70 space-y-2">
              <div className="flex items-center justify-between text-[10px] text-muted-foreground font-semibold">
                <div className="flex items-center gap-1.5">
                  <Lock className="size-3 text-amber-500" />
                  <span>Anti-Peek Protocol: Answers blurred until all fighters submit</span>
                </div>
                <span>
                  {submittedFighters.length}/{allFighters.length} Submitted
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                {allFighters.map((f) => {
                  const isUser = f.user_id === currentUserId;
                  const isDone = f.status === "submitted";

                  return (
                    <div
                      key={f.id}
                      className={cn(
                        "p-2 rounded-xl border flex items-center justify-between text-[11px]",
                        isDone
                          ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                          : "border-border bg-card text-muted-foreground"
                      )}
                    >
                      <div className="flex items-center gap-1.5 truncate">
                        <Avatar className="size-5 border border-border">
                          <AvatarImage src={f.avatar_url || undefined} />
                          <AvatarFallback className="text-[8px]">{f.user_name[0]}</AvatarFallback>
                        </Avatar>
                        <span className="truncate font-semibold text-foreground">
                          {isUser ? "You" : f.user_name}
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        {isDone ? (
                          <CheckCircle2 className="size-3.5 text-emerald-500" />
                        ) : (
                          <div className="size-2 rounded-full bg-amber-500 animate-pulse" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
