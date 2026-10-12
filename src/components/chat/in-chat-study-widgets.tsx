import { useState, useRef, useEffect } from "react";
import {
  Layers,
  RotateCcw,
  CheckCircle2,
  Check,
  X,
  ChevronRight,
  ChevronLeft,
  FileText,
  Camera,
  Mic,
  Loader2,
  AlertCircle,
  Award,
  Sparkles,
  Volume2,
  VolumeX,
  Shuffle,
  ThumbsUp,
  RotateCw,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { QuizQuestion, Flashcard } from "@/lib/academic-ai";
import {
  gradeTheoryAnswerServerFn,
  transcribeVoiceAudioServerFn,
} from "@/lib/ai/study-assistant.functions";
import { AiMessageRenderer } from "@/components/ai-message-renderer";

const QUESTION_COUNTS = [5, 10, 15, 20, 25, 30, 40, 50];

// ============================================================================
// 1. IN-CHAT PHYSICAL 3D FLASHCARDS WIDGET (Authentic Index Card Physics + KaTeX)
// ============================================================================
export interface InChatFlashcardsWidgetProps {
  data: {
    cards: Flashcard[];
    topic: string;
    type?: string;
    totalCount?: number;
  };
  onSelectCount?: (count: number) => void;
}

export function InChatFlashcardsWidget({ data, onSelectCount }: InChatFlashcardsWidgetProps) {
  const [cards, setCards] = useState<Flashcard[]>(data.cards || []);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [confidenceMap, setConfidenceMap] = useState<Record<number, "again" | "good" | "mastered">>({});
  const [speakingIndex, setSpeakingIndex] = useState<number | null>(null);

  useEffect(() => {
    setCards(data.cards || []);
    setCurrentIndex(0);
    setIsFlipped(false);
  }, [data.cards]);

  const currentCard = cards[currentIndex] || cards[0];
  const total = cards.length;

  if (total === 0) return null;

  // Text-to-Speech audio reader
  function handleSpeak(text: string) {
    if (!("speechSynthesis" in window)) {
      toast.error("Text-to-speech not supported in this browser.");
      return;
    }

    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
      setSpeakingIndex(null);
      return;
    }

    const cleanText = text
      .replace(/[\$\#\*\_\[\]\(\)]/g, " ")
      .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, "$1 over $2")
      .trim();

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 0.95;
    utterance.onend = () => setSpeakingIndex(null);
    utterance.onerror = () => setSpeakingIndex(null);
    setSpeakingIndex(currentIndex);
    window.speechSynthesis.speak(utterance);
  }

  // Shuffle flashcard deck
  function handleShuffle() {
    const shuffled = [...cards].sort(() => Math.random() - 0.5);
    setCards(shuffled);
    setCurrentIndex(0);
    setIsFlipped(false);
    toast.success("Deck shuffled!");
  }

  // Spaced-repetition rating & auto advance
  function markConfidence(level: "again" | "good" | "mastered") {
    setConfidenceMap((prev) => ({ ...prev, [currentIndex]: level }));
    if (level === "mastered") {
      toast.success("Card marked as Mastered!");
    }
    // Auto advance to next card after a brief moment if not at end
    if (currentIndex < total - 1) {
      setTimeout(() => {
        setIsFlipped(false);
        setCurrentIndex((i) => i + 1);
      }, 350);
    }
  }

  const masteredCount = Object.values(confidenceMap).filter((v) => v === "mastered").length;

  return (
    <div className="w-full mt-3 rounded-2xl border border-border/80 bg-card/60 backdrop-blur-xs p-3.5 sm:p-5 select-none shadow-xs space-y-4 font-sans">
      {/* Deck Header */}
      <div className="flex items-center justify-between pb-2 border-b border-border/60">
        <div className="flex items-center gap-2">
          <span className="size-6 rounded-lg bg-primary/10 text-primary grid place-items-center shrink-0">
            <Layers className="size-3.5" />
          </span>
          <div>
            <span className="text-xs font-bold tracking-tight text-foreground block">
              {data.topic || "Academic Revision"}
            </span>
            <span className="text-[10px] text-muted-foreground font-semibold">
              Card {currentIndex + 1} of {total} {masteredCount > 0 && `· ${masteredCount} Mastered`}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={handleShuffle}
            className="h-7 px-2 text-[11px] rounded-lg text-muted-foreground hover:text-foreground gap-1"
            title="Shuffle deck"
          >
            <Shuffle className="size-3" />
            <span className="hidden sm:inline">Shuffle</span>
          </Button>

          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleSpeak(isFlipped ? currentCard?.back : currentCard?.front)}
            className="h-7 px-2 text-[11px] rounded-lg text-muted-foreground hover:text-foreground gap-1"
            title="Read card aloud"
          >
            {speakingIndex === currentIndex ? (
              <VolumeX className="size-3 text-red-500 animate-pulse" />
            ) : (
              <Volume2 className="size-3" />
            )}
            <span className="hidden sm:inline">Listen</span>
          </Button>
        </div>
      </div>

      {/* Progress track */}
      <div className="w-full h-1.5 rounded-full bg-border/60 overflow-hidden">
        <div
          className="h-full bg-linear-to-r from-primary to-emerald-500 transition-all duration-300 rounded-full"
          style={{ width: `${((currentIndex + 1) / total) * 100}%` }}
        />
      </div>

      {/* ========================================================================= */}
      {/* REAL PHYSICAL 3D FLIP INDEX CARD (Perspective & KaTeX Math Rendering)   */}
      {/* ========================================================================= */}
      <div
        className="w-full relative [perspective:1200px] cursor-pointer group"
        onClick={() => setIsFlipped((prev) => !prev)}
      >
        <div
          className={cn(
            "relative w-full min-h-[220px] sm:min-h-[250px] rounded-2xl transition-transform duration-500 [transform-style:preserve-3d]",
            isFlipped && "[transform:rotateY(180deg)]"
          )}
        >
          {/* FRONT FACE (Question / Concept) */}
          <div className="absolute inset-0 w-full h-full [backface-visibility:hidden] rounded-2xl border border-border/80 bg-card p-5 sm:p-6 flex flex-col justify-between shadow-md hover:shadow-lg transition-all dark:bg-zinc-900/95">
            {/* Index card header margin tab */}
            <div className="flex items-center justify-between pb-2 border-b border-border/40">
              <span className="text-[10px] font-bold uppercase tracking-wider text-primary flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary/10">
                <Sparkles className="size-3" /> Concept / Question
              </span>
              <span className="text-[10px] font-mono text-muted-foreground font-semibold">
                {String(currentIndex + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
              </span>
            </div>

            {/* Question Body with KaTeX Math Rendering */}
            <div className="my-auto py-3 text-center flex flex-col items-center justify-center">
              <AiMessageRenderer
                content={currentCard?.front || ""}
                className="text-center font-bold text-sm sm:text-base leading-relaxed text-foreground [&_p]:text-center [&_p]:font-bold [&_p]:text-sm sm:[&_p]:text-base [&_p]:mb-0"
              />
            </div>

            {/* Flip hint footer */}
            <div className="flex items-center justify-center gap-1.5 pt-2 border-t border-border/40 text-[11px] font-medium text-muted-foreground group-hover:text-foreground transition-colors">
              <RotateCcw className="size-3 transition-transform group-hover:rotate-180 duration-500" />
              <span>Tap card to reveal answer</span>
            </div>
          </div>

          {/* BACK FACE (Answer / Solution / Formula) */}
          <div className="absolute inset-0 w-full h-full [backface-visibility:hidden] [transform:rotateY(180deg)] rounded-2xl border border-emerald-500/40 bg-card p-5 sm:p-6 flex flex-col justify-between shadow-md hover:shadow-lg transition-all dark:bg-zinc-900/95 bg-linear-to-b from-emerald-500/5 to-transparent">
            {/* Index card header margin tab */}
            <div className="flex items-center justify-between pb-2 border-b border-border/40">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10">
                <CheckCircle2 className="size-3" /> Solution &amp; Definition
              </span>
              <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                Answer {String(currentIndex + 1).padStart(2, "0")}
              </span>
            </div>

            {/* Answer Body with KaTeX Math Rendering */}
            <div className="my-auto py-2 overflow-y-auto max-h-[140px] pr-1">
              <AiMessageRenderer
                content={currentCard?.back || ""}
                className="text-xs sm:text-sm leading-relaxed text-foreground [&_p]:mb-1 last:[&_p]:mb-0"
              />
            </div>

            {/* Spaced Repetition Confidence Buttons */}
            <div
              className="pt-2 border-t border-border/40 flex items-center justify-between gap-1.5"
              onClick={(e) => e.stopPropagation()}
            >
              <span className="text-[10px] font-semibold text-muted-foreground hidden sm:inline">
                Rate recall:
              </span>
              <div className="flex items-center gap-1 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => markConfidence("again")}
                  className={cn(
                    "px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all",
                    confidenceMap[currentIndex] === "again"
                      ? "bg-amber-500/20 text-amber-600 border-amber-500/50"
                      : "border-border/70 text-muted-foreground hover:text-amber-600"
                  )}
                >
                  Needs Review
                </button>
                <button
                  type="button"
                  onClick={() => markConfidence("good")}
                  className={cn(
                    "px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all",
                    confidenceMap[currentIndex] === "good"
                      ? "bg-sky-500/20 text-sky-600 border-sky-500/50"
                      : "border-border/70 text-muted-foreground hover:text-sky-600"
                  )}
                >
                  Good
                </button>
                <button
                  type="button"
                  onClick={() => markConfidence("mastered")}
                  className={cn(
                    "px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all",
                    confidenceMap[currentIndex] === "mastered"
                      ? "bg-emerald-500/20 text-emerald-600 border-emerald-500/50"
                      : "border-border/70 text-muted-foreground hover:text-emerald-600"
                  )}
                >
                  Mastered
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Controls */}
      <div className="flex items-center justify-between pt-1">
        <Button
          size="sm"
          variant="ghost"
          disabled={currentIndex === 0}
          onClick={() => {
            setCurrentIndex((i) => Math.max(0, i - 1));
            setIsFlipped(false);
          }}
          className="h-8 rounded-xl text-xs font-semibold"
        >
          <ChevronLeft className="size-3.5 mr-1" /> Prev
        </Button>

        <Button
          size="sm"
          variant="outline"
          onClick={() => setIsFlipped((f) => !f)}
          className="h-8 rounded-xl text-xs font-semibold gap-1.5 border-border/80 shadow-2xs"
        >
          <RotateCcw className="size-3" /> Flip Card
        </Button>

        <Button
          size="sm"
          variant="ghost"
          disabled={currentIndex === total - 1}
          onClick={() => {
            setCurrentIndex((i) => Math.min(total - 1, i + 1));
            setIsFlipped(false);
          }}
          className="h-8 rounded-xl text-xs font-semibold"
        >
          Next <ChevronRight className="size-3.5 ml-1" />
        </Button>
      </div>

      {/* Count Pills */}
      <div className="pt-2 border-t border-border/50">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Generate Cards:
          </span>
          <div className="flex items-center gap-1 flex-wrap">
            {QUESTION_COUNTS.map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => onSelectCount?.(num)}
                className={cn(
                  "px-2.5 py-0.5 rounded-md text-[10px] font-bold border transition-all",
                  total === num
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border/80 text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                )}
              >
                {num}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// 2. IN-CHAT MCQ QUIZ WIDGET (KaTeX Math in Questions & Options)
// ============================================================================
export interface InChatMcqQuizWidgetProps {
  data: {
    questions: QuizQuestion[];
    mode: "objective";
    topic: string;
    markingMode?: "as_you_go" | "at_the_end";
    totalCount?: number;
  };
  onSelectCount?: (count: number) => void;
}

export function InChatMcqQuizWidget({ data, onSelectCount }: InChatMcqQuizWidgetProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showUnansweredModal, setShowUnansweredModal] = useState(false);
  const [unansweredList, setUnansweredList] = useState<number[]>([]);

  const questions = data.questions || [];
  const currentQ = questions[currentIndex] || questions[0];
  const total = questions.length;
  const isAsYouGo = data.markingMode === "as_you_go";

  if (total === 0) return null;

  // Compute Score
  let score = 0;
  questions.forEach((q, idx) => {
    if (selectedAnswers[idx] === q.correctOptionIndex) {
      score += 1;
    }
  });

  function handleSubmitAttempt() {
    const missing: number[] = [];
    questions.forEach((_, idx) => {
      if (selectedAnswers[idx] === undefined) {
        missing.push(idx + 1);
      }
    });

    if (missing.length > 0) {
      setUnansweredList(missing);
      setShowUnansweredModal(true);
      return;
    }

    setIsSubmitted(true);
    toast.success(`Exam submitted! Scored ${score}/${total}`);
  }

  function handleSkipAndSubmit() {
    setShowUnansweredModal(false);
    setIsSubmitted(true);
    toast.success(`Exam submitted! Scored ${score}/${total}`);
  }

  return (
    <div className="w-full mt-3 rounded-2xl border border-border/80 bg-card/60 backdrop-blur-xs p-3.5 sm:p-5 select-none shadow-xs space-y-3.5 font-sans">
      {/* Header */}
      <div className="flex items-center justify-between pb-1.5 border-b border-border/50">
        <span className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
          <CheckCircle2 className="size-3.5" />
          Question {currentIndex + 1} of {total}
        </span>
        <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-secondary text-foreground">
          {isAsYouGo ? "Instant Marking" : isSubmitted ? "Exam Result" : "Exam Mode"}
        </span>
      </div>

      {/* Score Banner when submitted */}
      {isSubmitted && (
        <div className="p-3.5 rounded-2xl border border-primary/30 bg-primary/10 flex items-center justify-between">
          <div>
            <p className="font-bold text-xs text-primary flex items-center gap-1.5">
              <Award className="size-4" /> Score: {score} / {total} ({Math.round((score / total) * 100)}%)
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {score / total >= 0.7
                ? "Excellent performance on university examination material!"
                : "Good attempt! Review the questions and detailed explanations below."}
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setSelectedAnswers({});
              setIsSubmitted(false);
              setCurrentIndex(0);
            }}
            className="h-7 text-xs font-bold rounded-xl"
          >
            Retake
          </Button>
        </div>
      )}

      {/* Question Text with KaTeX Math Rendering */}
      <div className="font-semibold text-xs sm:text-sm text-foreground leading-relaxed">
        <AiMessageRenderer content={currentQ?.question || ""} className="text-xs sm:text-sm font-semibold [&_p]:mb-1" />
      </div>

      {/* Options A, B, C, D with KaTeX Math Rendering */}
      <div className="grid gap-2">
        {currentQ?.options?.map((opt, optIdx) => {
          const letter = String.fromCharCode(65 + optIdx);
          const isSelected = selectedAnswers[currentIndex] === optIdx;
          const isCorrect = currentQ.correctOptionIndex === optIdx;
          const showAnswerFeedback = isSubmitted || (isAsYouGo && selectedAnswers[currentIndex] !== undefined);

          let optionStyle = "border-border/80 bg-card hover:bg-secondary/60 text-foreground";
          if (showAnswerFeedback) {
            if (isCorrect) {
              optionStyle = "border-emerald-500 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 font-bold";
            } else if (isSelected && !isCorrect) {
              optionStyle = "border-red-500 bg-red-500/10 text-red-800 dark:text-red-300";
            }
          } else if (isSelected) {
            optionStyle = "border-primary bg-primary/10 text-primary font-bold";
          }

          return (
            <button
              key={optIdx}
              type="button"
              disabled={isAsYouGo && selectedAnswers[currentIndex] !== undefined}
              onClick={() => {
                if (isAsYouGo && selectedAnswers[currentIndex] !== undefined) return;
                setSelectedAnswers((prev) => ({ ...prev, [currentIndex]: optIdx }));
              }}
              className={cn(
                "w-full text-left p-3 rounded-xl border text-xs transition-all flex items-center justify-between gap-2.5",
                optionStyle
              )}
            >
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <span
                  className={cn(
                    "size-5.5 rounded-full grid place-items-center text-[10px] font-bold shrink-0 border",
                    isSelected
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-secondary text-muted-foreground border-border"
                  )}
                >
                  {letter}
                </span>
                <div className="min-w-0 flex-1 leading-snug [&_p]:mb-0 [&_p]:inline [&_p]:text-inherit">
                  <AiMessageRenderer content={opt} className="text-xs [&_p]:mb-0 [&_p]:inline [&_p]:text-inherit" />
                </div>
              </div>
              {showAnswerFeedback && isCorrect && <Check className="size-4 text-emerald-600 shrink-0" />}
              {showAnswerFeedback && isSelected && !isCorrect && (
                <X className="size-4 text-red-600 shrink-0" />
              )}
            </button>
          );
        })}
      </div>

      {/* Explanation Box with KaTeX Math Rendering */}
      {(isSubmitted || (isAsYouGo && selectedAnswers[currentIndex] !== undefined)) && currentQ?.explanation && (
        <div className="p-3 rounded-xl border border-border/80 bg-muted/30 text-xs space-y-1">
          <p className="font-bold text-[11px] text-primary">Explanation &amp; Exam Criteria:</p>
          <AiMessageRenderer content={currentQ.explanation} className="text-xs text-muted-foreground leading-relaxed" />
        </div>
      )}

      {/* Navigation & Submit Bar */}
      <div className="flex items-center justify-between pt-2 border-t border-border/50">
        <Button
          size="sm"
          variant="ghost"
          disabled={currentIndex === 0}
          onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
          className="h-8 text-xs font-semibold"
        >
          <ChevronLeft className="size-3.5 mr-1" /> Previous
        </Button>

        <span className="text-[11px] text-muted-foreground font-semibold">
          {currentIndex + 1} / {total}
        </span>

        {currentIndex < total - 1 ? (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setCurrentIndex((i) => Math.min(total - 1, i + 1))}
            className="h-8 text-xs font-semibold gap-1"
          >
            Next <ChevronRight className="size-3.5" />
          </Button>
        ) : (
          !isSubmitted && (
            <Button
              size="sm"
              onClick={handleSubmitAttempt}
              className="h-8 text-xs font-bold bg-primary text-primary-foreground rounded-xl"
            >
              Submit Exam
            </Button>
          )
        )}
      </div>

      {/* Count Pills */}
      <div className="pt-2 border-t border-border/50">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Generate Quiz:
          </span>
          <div className="flex items-center gap-1 flex-wrap">
            {QUESTION_COUNTS.map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => onSelectCount?.(num)}
                className={cn(
                  "px-2.5 py-0.5 rounded-md text-[10px] font-bold border transition-all",
                  total === num
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border/80 text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                )}
              >
                {num}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Unanswered Questions Modal */}
      <Dialog open={showUnansweredModal} onOpenChange={setShowUnansweredModal}>
        <DialogContent className="max-w-sm rounded-3xl p-5 border-border bg-card">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-amber-600">
              <AlertCircle className="size-4" /> Unanswered Questions
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 mt-2 text-xs">
            <p className="text-muted-foreground leading-relaxed">
              You haven't answered question(s): <strong>{unansweredList.join(", ")}</strong>.
            </p>
            <p className="text-muted-foreground">
              Would you like to go back and answer them or skip and submit anyway?
            </p>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  if (unansweredList[0]) {
                    setCurrentIndex(unansweredList[0] - 1);
                  }
                  setShowUnansweredModal(false);
                }}
                className="rounded-xl text-xs font-semibold"
              >
                Answer Question
              </Button>
              <Button
                variant="destructive"
                onClick={handleSkipAndSubmit}
                className="rounded-xl text-xs font-semibold"
              >
                Skip &amp; Submit
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================================================
// 3. IN-CHAT THEORY TEST WIDGET (KaTeX Math in Question, Model Answer & Rubric)
// ============================================================================
export interface InChatTheoryWidgetProps {
  data: {
    questions: QuizQuestion[];
    mode: "theory";
    topic: string;
    totalCount?: number;
  };
  onSelectCount?: (count: number) => void;
}

export function InChatTheoryWidget({ data, onSelectCount }: InChatTheoryWidgetProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answersMap, setAnswersMap] = useState<Record<number, string>>({});
  const [feedbackMap, setFeedbackMap] = useState<Record<number, any>>({});
  const [isGrading, setIsGrading] = useState(false);
  const [showModelAnswer, setShowModelAnswer] = useState(false);

  // Audio Recording State for Theory Voice Input
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const snapInputRef = useRef<HTMLInputElement>(null);

  const questions = data.questions || [];
  const currentQ = questions[currentIndex] || questions[0];
  const total = questions.length;
  const currentAnswer = answersMap[currentIndex] || "";
  const currentFeedback = feedbackMap[currentIndex] || null;

  if (total === 0) return null;

  async function handleGradeAnswer() {
    if (!currentAnswer.trim() || isGrading) return;
    setIsGrading(true);
    toast.loading("Marking answer against university rubric...", { id: "grade-th" });

    try {
      const res = await gradeTheoryAnswerServerFn({
        data: {
          question: currentQ.question,
          modelAnswer: currentQ.modelAnswer,
          studentAnswer: currentAnswer,
        },
      });

      setFeedbackMap((prev) => ({ ...prev, [currentIndex]: res }));
      toast.success(`Marked: ${res.score}/10 (${res.verdict})`, { id: "grade-th" });
    } catch {
      toast.error("Grading failed. Please retry.", { id: "grade-th" });
    } finally {
      setIsGrading(false);
    }
  }

  // Voice note speech-to-text recording
  async function toggleTheoryVoiceNote() {
    if (isRecordingAudio) {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
      setIsRecordingAudio(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });

        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          try {
            const base64Data = (reader.result as string)?.split(",")[1];
            if (base64Data) {
              toast.loading("Transcribing voice answer with Groq Whisper...", { id: "whisper-th" });
              const result = await transcribeVoiceAudioServerFn({
                data: {
                  audioBase64: base64Data,
                  mimeType: "audio/webm",
                },
              });
              if (result?.transcript) {
                setAnswersMap((prev) => ({
                  ...prev,
                  [currentIndex]: (prev[currentIndex] ? prev[currentIndex] + " " : "") + result.transcript,
                }));
                toast.success("Voice answer transcribed!", { id: "whisper-th" });
              }
            }
          } catch {
            toast.error("Transcription failed", { id: "whisper-th" });
          }
        };
      };

      mediaRecorder.start(250);
      setIsRecordingAudio(true);
      toast.info("Recording answer... Tap mic again when finished speaking.");
    } catch {
      toast.error("Microphone access unavailable or denied.");
    }
  }

  // Snap handwritten photo attachment
  function handleSnapUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAnswersMap((prev) => ({
      ...prev,
      [currentIndex]:
        (prev[currentIndex] ? prev[currentIndex] + "\n\n" : "") +
        `[Attached handwritten notes: ${file.name}]`,
    }));
    toast.success(`Attached photo: ${file.name}`);
  }

  return (
    <div className="w-full mt-3 rounded-2xl border border-border/80 bg-card/60 backdrop-blur-xs p-3.5 sm:p-5 select-none shadow-xs space-y-3.5 font-sans">
      {/* Header */}
      <div className="flex items-center justify-between pb-1.5 border-b border-border/50">
        <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 flex items-center gap-1.5">
          <FileText className="size-3.5" />
          Question {currentIndex + 1} of {total} ({currentQ.marks || 5} Marks)
        </span>
        <span className="text-[11px] font-semibold text-muted-foreground truncate max-w-[180px]">
          {data.topic}
        </span>
      </div>

      {/* Question Prompt with KaTeX Math Rendering */}
      <div className="font-semibold text-xs sm:text-sm text-foreground leading-relaxed">
        <AiMessageRenderer content={currentQ?.question || ""} className="text-xs sm:text-sm font-semibold [&_p]:mb-1" />
      </div>

      {/* Answer Box */}
      <div className="rounded-xl border border-border/80 bg-card p-3 space-y-2">
        <textarea
          value={currentAnswer}
          onChange={(e) =>
            setAnswersMap((prev) => ({ ...prev, [currentIndex]: e.target.value }))
          }
          placeholder="Type, speak, or snap your structured academic answer here..."
          rows={3}
          className="w-full resize-none bg-transparent text-xs text-foreground focus:outline-hidden leading-relaxed"
        />

        <div className="flex items-center justify-between pt-2 border-t border-border/50">
          <div className="flex items-center gap-1.5">
            <input
              ref={snapInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleSnapUpload}
              className="hidden"
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => snapInputRef.current?.click()}
              className="h-7 px-2 text-[11px] rounded-lg gap-1 border-border/80"
              title="Snap photo of handwritten work"
            >
              <Camera className="size-3 text-primary" /> Snap
            </Button>

            <Button
              type="button"
              size="sm"
              variant={isRecordingAudio ? "destructive" : "outline"}
              onClick={toggleTheoryVoiceNote}
              className="h-7 px-2 text-[11px] rounded-lg gap-1 border-border/80"
              title="Speak your answer"
            >
              <Mic className={cn("size-3", isRecordingAudio ? "animate-pulse" : "text-emerald-600")} />
              {isRecordingAudio ? "Stop Recording" : "Record Audio"}
            </Button>
          </div>

          <Button
            type="button"
            size="sm"
            disabled={!currentAnswer.trim() || isGrading}
            onClick={handleGradeAnswer}
            className="h-7 px-3 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {isGrading ? <Loader2 className="size-3 animate-spin mr-1" /> : null}
            Grade Answer
          </Button>
        </div>
      </div>

      {/* Graded Rubric Feedback Display with KaTeX Math Rendering */}
      {currentFeedback && (
        <div className="p-3.5 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 text-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
              <Award className="size-3.5" /> Mark: {currentFeedback.score} / 10 ({currentFeedback.verdict})
            </span>
            <button
              type="button"
              onClick={() => setShowModelAnswer((v) => !v)}
              className="text-[10px] font-bold text-primary underline"
            >
              {showModelAnswer ? "Hide Model Answer" : "View Model Answer"}
            </button>
          </div>

          <AiMessageRenderer content={currentFeedback.feedback} className="text-xs text-muted-foreground leading-relaxed" />

          {currentFeedback.strengths && currentFeedback.strengths.length > 0 && (
            <div className="space-y-0.5 pt-1">
              <p className="font-bold text-[10px] text-emerald-700 dark:text-emerald-400">Strengths:</p>
              <ul className="list-disc list-inside text-[11px] text-muted-foreground">
                {currentFeedback.strengths.map((s: string, idx: number) => (
                  <li key={idx}>{s}</li>
                ))}
              </ul>
            </div>
          )}

          {currentFeedback.areasToImprove && currentFeedback.areasToImprove.length > 0 && (
            <div className="space-y-0.5 pt-1">
              <p className="font-bold text-[10px] text-amber-700 dark:text-amber-400">Areas to Improve:</p>
              <ul className="list-disc list-inside text-[11px] text-muted-foreground">
                {currentFeedback.areasToImprove.map((a: string, idx: number) => (
                  <li key={idx}>{a}</li>
                ))}
              </ul>
            </div>
          )}

          {showModelAnswer && (
            <div className="pt-2 border-t border-emerald-500/20 text-xs space-y-1">
              <p className="font-bold text-[11px] text-primary">Expected Model Answer:</p>
              <AiMessageRenderer content={currentQ.modelAnswer} className="text-xs text-muted-foreground leading-relaxed" />
            </div>
          )}
        </div>
      )}

      {/* Navigation Bar */}
      <div className="flex items-center justify-between pt-1 border-t border-border/50">
        <Button
          size="sm"
          variant="ghost"
          disabled={currentIndex === 0}
          onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
          className="h-8 text-xs font-semibold"
        >
          <ChevronLeft className="size-3.5 mr-1" /> Previous
        </Button>

        <span className="text-[11px] text-muted-foreground font-semibold">
          {currentIndex + 1} / {total}
        </span>

        <Button
          size="sm"
          variant="outline"
          disabled={currentIndex === total - 1}
          onClick={() => setCurrentIndex((i) => Math.min(total - 1, i + 1))}
          className="h-8 text-xs font-semibold gap-1"
        >
          Next <ChevronRight className="size-3.5" />
        </Button>
      </div>

      {/* Count Pills */}
      <div className="pt-2 border-t border-border/50">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Generate Theory Test:
          </span>
          <div className="flex items-center gap-1 flex-wrap">
            {QUESTION_COUNTS.map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => onSelectCount?.(num)}
                className={cn(
                  "px-2.5 py-0.5 rounded-md text-[10px] font-bold border transition-all",
                  total === num
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border/80 text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                )}
              >
                {num}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
