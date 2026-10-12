"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import {
  Sparkles,
  ArrowUp,
  Delete,
  CornerDownLeft,
  Send,
  Volume2,
  VolumeX,
  Keyboard,
  ChevronDown,
  Hash,
  Pi,
  BookOpen,
  HelpCircle,
  Calculator,
  ListOrdered,
  FileCheck,
  Check,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";

export type KeyboardMode = "alpha" | "num_sym" | "math" | "prompts";

interface MobileCustomKeyboardProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  isOpen: boolean;
  onClose: () => void;
  inputRef?: React.RefObject<HTMLTextAreaElement | HTMLInputElement | null>;
  disabled?: boolean;
  activeDocTitle?: string;
}

// Academic prompt quick suggestions
const GENERAL_PROMPT_PRESETS = [
  { label: "Explain step-by-step", icon: BookOpen, prompt: "Can you explain this step-by-step with simple examples?" },
  { label: "5 Practice MCQs", icon: HelpCircle, prompt: "Generate 5 exam-standard practice multiple choice questions on this with answers." },
  { label: "Formula cheat sheet", icon: Calculator, prompt: "Give me the formula sheet and units for this topic." },
  { label: "Summarize key points", icon: ListOrdered, prompt: "Summarize the core takeaways and exam highlights in bullet points." },
  { label: "Nigerian university example", icon: Sparkles, prompt: "Explain this with a real-world Nigerian scenario or university case study." },
  { label: "Mark my theory answer", icon: FileCheck, prompt: "I will provide my answer to a theory question. Grade it and suggest improvements." },
];

// Predictive suggestions dictionary based on what the student is typing
const PREDICTIVE_RULES: Array<{ prefix: RegExp; suggestions: string[] }> = [
  {
    prefix: /^wh(at|y|ere|en)?\s*$/i,
    suggestions: [
      "What is the core definition and concept?",
      "Why is this tested frequently in exams?",
      "Where does this formula apply in real life?",
      "What are the key assumptions made here?",
    ],
  },
  {
    prefix: /^ho(w)?\s*$/i,
    suggestions: [
      "How do I solve this step-by-step?",
      "How is this mathematical equation derived?",
      "How does this compare to related topics?",
      "How will this be asked in semester exams?",
    ],
  },
  {
    prefix: /^(ex|explain)\s*$/i,
    suggestions: [
      "Explain this concept like I am in 100 level.",
      "Explain with worked examples and numerical values.",
      "Explain the physical significance of this result.",
      "Explain the difference between these two terms.",
    ],
  },
  {
    prefix: /^(so|solv|calculate)\s*$/i,
    suggestions: [
      "Solve this question showing all working steps.",
      "Solve this step-by-step using standard formulas.",
      "Calculate the final numerical answer.",
    ],
  },
  {
    prefix: /^(qu|quiz|test)\s*$/i,
    suggestions: [
      "Quiz me on this topic with 4 multiple choice questions.",
      "Give me a past question theory problem to solve.",
      "Quick revision questions for this chapter.",
    ],
  },
  {
    prefix: /^(de|derive|define)\s*$/i,
    suggestions: [
      "Derive the formula step-by-step from first principles.",
      "Define all technical terms and variables.",
      "Derive the loop equations and show cancellations.",
    ],
  },
  {
    prefix: /^(diff|compare)\s*$/i,
    suggestions: [
      "Differentiate between both concepts in a clean Markdown table.",
      "Compare advantages and disadvantages of each method.",
    ],
  },
  {
    prefix: /^(form|formula|eq)\s*$/i,
    suggestions: [
      "Formula summary sheet with SI units.",
      "Equations cheat sheet for upcoming exam revision.",
    ],
  },
];

export function getPredictiveSuggestions(value: string, activeDocTitle?: string): string[] {
  const trimmed = value.trim();
  if (!trimmed) {
    if (activeDocTitle) {
      return [
        `Summarize "${activeDocTitle}" in 5 bullet points`,
        `Give me 5 exam MCQs on "${activeDocTitle}"`,
        `What are the most tested formulas in this document?`,
        `Explain the difficult concepts in "${activeDocTitle}"`,
      ];
    }
    return GENERAL_PROMPT_PRESETS.map((p) => p.prompt);
  }

  // Match rules
  for (const rule of PREDICTIVE_RULES) {
    if (rule.prefix.test(trimmed)) {
      return rule.suggestions;
    }
  }

  // Dynamic smart completions based on whatever user typed
  return [
    `${trimmed} explained step-by-step with examples`,
    `${trimmed} exam past questions and answers`,
    `${trimmed} formula sheet and calculation rules`,
    `${trimmed} summary in simple words`,
  ];
}

export function MobileCustomKeyboard({
  value,
  onChange,
  onSend,
  isOpen,
  onClose,
  inputRef,
  disabled = false,
  activeDocTitle,
}: MobileCustomKeyboardProps) {
  const [mode, setMode] = useState<KeyboardMode>("alpha");
  const [isShift, setIsShift] = useState(false);
  const [isCapsLock, setIsCapsLock] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const lastShiftTapRef = useRef<number>(0);
  const backspaceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const backspaceIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Soft tactile acoustic feedback
  const playClickAudio = useCallback(() => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(680, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(320, ctx.currentTime + 0.025);

      gain.gain.setValueAtTime(0.035, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.025);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.025);
    } catch {
      // AudioContext unavailable or autoplay blocked
    }
  }, [soundEnabled]);

  // Haptic feedback
  const triggerHaptic = useCallback(() => {
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate(10);
    }
    playClickAudio();
  }, [playClickAudio]);

  // Insert character or string at current cursor or append
  const handleInsert = useCallback(
    (char: string) => {
      triggerHaptic();
      const textarea = inputRef?.current;
      if (textarea && textarea.selectionStart !== null && textarea.selectionEnd !== null) {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const nextVal = value.substring(0, start) + char + value.substring(end);
        onChange(nextVal);

        // Schedule cursor update
        setTimeout(() => {
          if (textarea) {
            textarea.selectionStart = textarea.selectionEnd = start + char.length;
          }
        }, 0);
      } else {
        onChange(value + char);
      }

      // If single shift was active and not caps locked, reset after one letter
      if (isShift && !isCapsLock) {
        setIsShift(false);
      }
    },
    [value, onChange, triggerHaptic, inputRef, isShift, isCapsLock]
  );

  // Handle Backspace
  const handleBackspace = useCallback(() => {
    triggerHaptic();
    const textarea = inputRef?.current;
    if (textarea && textarea.selectionStart !== null && textarea.selectionEnd !== null) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      if (start !== end) {
        const nextVal = value.substring(0, start) + value.substring(end);
        onChange(nextVal);
        setTimeout(() => {
          if (textarea) textarea.selectionStart = textarea.selectionEnd = start;
        }, 0);
      } else if (start > 0) {
        const nextVal = value.substring(0, start - 1) + value.substring(start);
        onChange(nextVal);
        setTimeout(() => {
          if (textarea) textarea.selectionStart = textarea.selectionEnd = start - 1;
        }, 0);
      }
    } else {
      onChange(value.slice(0, -1));
    }
  }, [value, onChange, triggerHaptic, inputRef]);

  // Start continuous backspace on long press
  const startBackspaceHold = () => {
    handleBackspace();
    backspaceTimerRef.current = setTimeout(() => {
      backspaceIntervalRef.current = setInterval(() => {
        handleBackspace();
      }, 75);
    }, 350);
  };

  const stopBackspaceHold = () => {
    if (backspaceTimerRef.current) clearTimeout(backspaceTimerRef.current);
    if (backspaceIntervalRef.current) clearInterval(backspaceIntervalRef.current);
  };

  useEffect(() => {
    return () => stopBackspaceHold();
  }, []);

  // Double tap Shift for Caps Lock
  const handleShiftClick = () => {
    triggerHaptic();
    const now = Date.now();
    if (now - lastShiftTapRef.current < 320) {
      // Double tap -> Toggle Caps Lock
      setIsCapsLock((prev) => !prev);
      setIsShift(true);
    } else {
      if (isCapsLock) {
        setIsCapsLock(false);
        setIsShift(false);
      } else {
        setIsShift((prev) => !prev);
      }
    }
    lastShiftTapRef.current = now;
  };

  // Compute live predictive suggestions based on current value
  const predictiveSuggestions = useMemo(() => {
    return getPredictiveSuggestions(value, activeDocTitle);
  }, [value, activeDocTitle]);

  // QWERTY Layout Rows
  const alphaRows = useMemo(() => {
    const caps = isShift || isCapsLock;
    const r1 = ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"];
    const r2 = ["a", "s", "d", "f", "g", "h", "j", "k", "l"];
    const r3 = ["z", "x", "c", "v", "b", "n", "m"];

    return {
      r1: caps ? r1.map((k) => k.toUpperCase()) : r1,
      r2: caps ? r2.map((k) => k.toUpperCase()) : r2,
      r3: caps ? r3.map((k) => k.toUpperCase()) : r3,
    };
  }, [isShift, isCapsLock]);

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ y: "100%", opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: "100%", opacity: 0 }}
      transition={{ type: "spring", damping: 28, stiffness: 320 }}
      className="w-full shrink-0 border-t border-border/80 bg-card/95 backdrop-blur-2xl shadow-[0_-12px_40px_rgba(0,0,0,0.15)] flex flex-col z-30 select-none touch-manipulation pb-[calc(0.75rem+env(safe-area-inset-bottom))]"
    >
      {/* Top Header / Mode Switcher & Live Suggestions Bar */}
      <div className="flex flex-col border-b border-border/60 bg-muted/40">
        {/* Quick Toolbar */}
        <div className="flex items-center justify-between px-3 py-1.5 text-xs">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setMode("alpha")}
              className={cn(
                "px-2.5 py-1 rounded-lg font-semibold transition-all text-[11px]",
                mode === "alpha"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
              )}
            >
              ABC
            </button>
            <button
              type="button"
              onClick={() => setMode("num_sym")}
              className={cn(
                "px-2.5 py-1 rounded-lg font-semibold transition-all text-[11px]",
                mode === "num_sym"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
              )}
            >
              123 / #
            </button>
            <button
              type="button"
              onClick={() => setMode("math")}
              className={cn(
                "px-2.5 py-1 rounded-lg font-semibold transition-all text-[11px] flex items-center gap-1",
                mode === "math"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
              )}
            >
              <Pi className="size-3" /> Math
            </button>
            <button
              type="button"
              onClick={() => setMode("prompts")}
              className={cn(
                "px-2.5 py-1 rounded-lg font-semibold transition-all text-[11px] flex items-center gap-1",
                mode === "prompts"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
              )}
            >
              <Sparkles className="size-3 text-amber-500" /> Prompts
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setSoundEnabled((prev) => !prev)}
              title={soundEnabled ? "Mute typing sound" : "Enable typing sound"}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
            >
              {soundEnabled ? <Volume2 className="size-3.5" /> : <VolumeX className="size-3.5 opacity-50" />}
            </button>
            <button
              type="button"
              onClick={onClose}
              title="Hide keyboard / switch to native phone keyboard"
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors flex items-center gap-1 text-[11px] font-medium"
            >
              <ChevronDown className="size-3.5" />
            </button>
          </div>
        </div>

        {/* Live Predictive Suggestions Carousel */}
        <div className="flex items-center gap-1.5 overflow-x-auto px-2.5 py-1.5 [scrollbar-width:none]">
          <span className="text-[10px] font-bold uppercase tracking-wider text-primary/70 shrink-0 flex items-center gap-1 pl-1">
            <Sparkles className="size-2.5 text-amber-500 animate-pulse" />
            Suggestions:
          </span>
          {predictiveSuggestions.map((suggestion, idx) => (
            <motion.button
              key={`${idx}-${suggestion.slice(0, 10)}`}
              type="button"
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.15 }}
              onClick={() => {
                triggerHaptic();
                onChange(suggestion);
              }}
              className="group flex shrink-0 items-center gap-1.5 rounded-full border border-border/80 bg-card/90 px-3 py-1 text-[11px] font-medium text-foreground shadow-xs transition-all hover:border-primary/50 hover:bg-primary/5 active:scale-95"
            >
              <span className="truncate max-w-[200px]">{suggestion}</span>
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  triggerHaptic();
                  onChange(suggestion);
                  setTimeout(() => onSend(), 50);
                }}
                title="Send immediately"
                className="size-4 rounded-full bg-primary/10 grid place-items-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors ml-0.5"
              >
                <CornerDownLeft className="size-2.5" />
              </span>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Main Keys Body */}
      <div className="p-2 sm:p-3 flex flex-col gap-1.5 sm:gap-2">
        {/* MODE: ALPHA (QWERTY) */}
        {mode === "alpha" && (
          <div className="flex flex-col gap-1.5">
            {/* Row 1 */}
            <div className="flex justify-center gap-1 sm:gap-1.5">
              {alphaRows.r1.map((char) => (
                <KeyCap key={char} char={char} onPress={() => handleInsert(char)} />
              ))}
            </div>

            {/* Row 2 */}
            <div className="flex justify-center gap-1 sm:gap-1.5 px-3">
              {alphaRows.r2.map((char) => (
                <KeyCap key={char} char={char} onPress={() => handleInsert(char)} />
              ))}
            </div>

            {/* Row 3: Shift, Z-M, Backspace */}
            <div className="flex justify-between gap-1 sm:gap-1.5">
              <button
                type="button"
                onClick={handleShiftClick}
                className={cn(
                  "flex items-center justify-center rounded-xl h-10 min-w-10 sm:min-w-12 px-2 border transition-all active:scale-95 relative",
                  isShift || isCapsLock
                    ? "bg-primary text-primary-foreground border-primary shadow-xs"
                    : "bg-muted/70 text-foreground border-border/70 hover:bg-muted"
                )}
              >
                <ArrowUp className={cn("size-4 transition-transform", isCapsLock && "stroke-[3]")} />
                {isCapsLock && (
                  <span className="absolute bottom-1 size-1 rounded-full bg-emerald-400" />
                )}
              </button>

              <div className="flex justify-center gap-1 sm:gap-1.5 flex-1">
                {alphaRows.r3.map((char) => (
                  <KeyCap key={char} char={char} onPress={() => handleInsert(char)} />
                ))}
              </div>

              <button
                type="button"
                onPointerDown={startBackspaceHold}
                onPointerUp={stopBackspaceHold}
                onPointerLeave={stopBackspaceHold}
                className="flex items-center justify-center rounded-xl h-10 min-w-10 sm:min-w-12 px-2 bg-muted/70 text-foreground border border-border/70 transition-all active:scale-95 hover:bg-muted"
              >
                <Delete className="size-4" />
              </button>
            </div>

            {/* Row 4: Switcher, Space, Period, Send */}
            <div className="flex items-center justify-between gap-1 sm:gap-1.5 pt-0.5">
              <button
                type="button"
                onClick={() => {
                  triggerHaptic();
                  setMode("num_sym");
                }}
                className="h-10 min-w-12 sm:min-w-14 rounded-xl bg-muted/80 text-foreground text-xs font-bold border border-border/80 flex items-center justify-center transition-all active:scale-95"
              >
                123
              </button>

              <button
                type="button"
                onClick={() => handleInsert(",")}
                className="h-10 w-9 sm:w-11 rounded-xl bg-card text-foreground font-semibold text-sm border border-border/80 shadow-xs flex items-center justify-center transition-all active:scale-95"
              >
                ,
              </button>

              {/* Spacebar */}
              <button
                type="button"
                onClick={() => handleInsert(" ")}
                className="h-10 flex-1 rounded-xl bg-card text-muted-foreground font-medium text-xs border border-border/80 shadow-xs flex items-center justify-center transition-all active:scale-98 active:bg-secondary/20"
              >
                <span className="text-[11px] font-semibold text-foreground/70 uppercase tracking-widest">
                  space
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleInsert(".")}
                className="h-10 w-9 sm:w-11 rounded-xl bg-card text-foreground font-semibold text-sm border border-border/80 shadow-xs flex items-center justify-center transition-all active:scale-95"
              >
                .
              </button>

              {/* Send Button */}
              <button
                type="button"
                disabled={disabled || !value.trim()}
                onClick={() => {
                  triggerHaptic();
                  onSend();
                }}
                className={cn(
                  "h-10 min-w-14 sm:min-w-16 rounded-xl font-bold text-xs flex items-center justify-center gap-1 transition-all active:scale-95 shadow-xs",
                  value.trim() && !disabled
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "bg-muted text-muted-foreground opacity-50 cursor-not-allowed"
                )}
              >
                <Send className="size-3.5" />
                <span className="hidden sm:inline">Send</span>
              </button>
            </div>
          </div>
        )}

        {/* MODE: NUM & SYMBOLS */}
        {mode === "num_sym" && (
          <div className="flex flex-col gap-1.5">
            {/* Numbers Row */}
            <div className="flex justify-center gap-1 sm:gap-1.5">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"].map((n) => (
                <KeyCap key={n} char={n} onPress={() => handleInsert(n)} />
              ))}
            </div>

            {/* Row 2: Standard Symbols */}
            <div className="flex justify-center gap-1 sm:gap-1.5">
              {["@", "#", "$", "%", "&", "*", "-", "+", "=", "/"].map((s) => (
                <KeyCap key={s} char={s} onPress={() => handleInsert(s)} />
              ))}
            </div>

            {/* Row 3: Brackets & Punctuation */}
            <div className="flex justify-between gap-1 sm:gap-1.5">
              <button
                type="button"
                onClick={() => {
                  triggerHaptic();
                  setMode("math");
                }}
                className="flex items-center justify-center rounded-xl h-10 min-w-11 sm:min-w-14 px-2 bg-muted/80 text-foreground border border-border/70 text-xs font-bold transition-all active:scale-95"
              >
                <Pi className="size-3.5 mr-1" />
                Math
              </button>

              <div className="flex justify-center gap-1 sm:gap-1.5 flex-1">
                {["(", ")", "\"", "'", ":", ";", "!", "?"].map((s) => (
                  <KeyCap key={s} char={s} onPress={() => handleInsert(s)} />
                ))}
              </div>

              <button
                type="button"
                onPointerDown={startBackspaceHold}
                onPointerUp={stopBackspaceHold}
                onPointerLeave={stopBackspaceHold}
                className="flex items-center justify-center rounded-xl h-10 min-w-10 sm:min-w-12 px-2 bg-muted/70 text-foreground border border-border/70 transition-all active:scale-95 hover:bg-muted"
              >
                <Delete className="size-4" />
              </button>
            </div>

            {/* Row 4 */}
            <div className="flex items-center justify-between gap-1 sm:gap-1.5 pt-0.5">
              <button
                type="button"
                onClick={() => {
                  triggerHaptic();
                  setMode("alpha");
                }}
                className="h-10 min-w-12 sm:min-w-14 rounded-xl bg-primary text-primary-foreground text-xs font-bold border border-primary flex items-center justify-center transition-all active:scale-95 shadow-xs"
              >
                ABC
              </button>

              <button
                type="button"
                onClick={() => handleInsert("_")}
                className="h-10 w-9 sm:w-11 rounded-xl bg-card text-foreground font-semibold text-sm border border-border/80 shadow-xs flex items-center justify-center transition-all active:scale-95"
              >
                _
              </button>

              <button
                type="button"
                onClick={() => handleInsert(" ")}
                className="h-10 flex-1 rounded-xl bg-card text-muted-foreground font-medium text-xs border border-border/80 shadow-xs flex items-center justify-center transition-all active:scale-98"
              >
                <span className="text-[11px] font-semibold text-foreground/70 uppercase tracking-widest">
                  space
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleInsert("/ ")}
                className="h-10 w-9 sm:w-11 rounded-xl bg-card text-foreground font-semibold text-sm border border-border/80 shadow-xs flex items-center justify-center transition-all active:scale-95"
              >
                /
              </button>

              <button
                type="button"
                disabled={disabled || !value.trim()}
                onClick={() => {
                  triggerHaptic();
                  onSend();
                }}
                className={cn(
                  "h-10 min-w-14 sm:min-w-16 rounded-xl font-bold text-xs flex items-center justify-center gap-1 transition-all active:scale-95 shadow-xs",
                  value.trim() && !disabled
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "bg-muted text-muted-foreground opacity-50 cursor-not-allowed"
                )}
              >
                <Send className="size-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* MODE: MATH & GREEK ACADEMIC SYMBOLS */}
        {mode === "math" && (
          <div className="flex flex-col gap-1.5">
            {/* Greek Letters Row */}
            <div className="flex justify-center gap-1 sm:gap-1.5">
              {["π", "θ", "λ", "μ", "α", "β", "Δ", "Ω", "∞", "√"].map((s) => (
                <KeyCap key={s} char={s} onPress={() => handleInsert(s)} />
              ))}
            </div>

            {/* Math Notation Row */}
            <div className="flex justify-center gap-1 sm:gap-1.5">
              {[
                { label: "x²", val: "²" },
                { label: "xⁿ", val: "^" },
                { label: "±", val: "±" },
                { label: "≈", val: "≈" },
                { label: "≠", val: "≠" },
                { label: "≤", val: "≤" },
                { label: "≥", val: "≥" },
                { label: "∫", val: "∫" },
                { label: "Σ", val: "Σ" },
                { label: "÷", val: "÷" },
              ].map((item) => (
                <KeyCap key={item.label} char={item.label} onPress={() => handleInsert(item.val)} />
              ))}
            </div>

            {/* LaTeX Functions & Calculus Row */}
            <div className="flex justify-between gap-1 sm:gap-1.5">
              <button
                type="button"
                onClick={() => {
                  triggerHaptic();
                  setMode("prompts");
                }}
                className="flex items-center justify-center rounded-xl h-10 min-w-12 sm:min-w-14 px-2 bg-muted/80 text-foreground border border-border/70 text-xs font-bold transition-all active:scale-95"
              >
                <Sparkles className="size-3 mr-1 text-amber-500" /> Prompts
              </button>

              <div className="flex justify-center gap-1 sm:gap-1.5 flex-1">
                {[
                  { label: "sin", val: "sin(" },
                  { label: "cos", val: "cos(" },
                  { label: "tan", val: "tan(" },
                  { label: "log", val: "log(" },
                  { label: "ln", val: "ln(" },
                  { label: "d/dx", val: "d/dx " },
                  { label: "frac", val: "\\frac{a}{b} " },
                ].map((item) => (
                  <KeyCap key={item.label} char={item.label} onPress={() => handleInsert(item.val)} isWide />
                ))}
              </div>

              <button
                type="button"
                onPointerDown={startBackspaceHold}
                onPointerUp={stopBackspaceHold}
                onPointerLeave={stopBackspaceHold}
                className="flex items-center justify-center rounded-xl h-10 min-w-10 sm:min-w-12 px-2 bg-muted/70 text-foreground border border-border/70 transition-all active:scale-95 hover:bg-muted"
              >
                <Delete className="size-4" />
              </button>
            </div>

            {/* Row 4 */}
            <div className="flex items-center justify-between gap-1 sm:gap-1.5 pt-0.5">
              <button
                type="button"
                onClick={() => {
                  triggerHaptic();
                  setMode("alpha");
                }}
                className="h-10 min-w-12 sm:min-w-14 rounded-xl bg-primary text-primary-foreground text-xs font-bold border border-primary flex items-center justify-center transition-all active:scale-95 shadow-xs"
              >
                ABC
              </button>

              <button
                type="button"
                onClick={() => handleInsert(" = ")}
                className="h-10 w-9 sm:w-11 rounded-xl bg-card text-foreground font-semibold text-sm border border-border/80 shadow-xs flex items-center justify-center transition-all active:scale-95"
              >
                =
              </button>

              <button
                type="button"
                onClick={() => handleInsert(" ")}
                className="h-10 flex-1 rounded-xl bg-card text-muted-foreground font-medium text-xs border border-border/80 shadow-xs flex items-center justify-center transition-all active:scale-98"
              >
                <span className="text-[11px] font-semibold text-foreground/70 uppercase tracking-widest">
                  space
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleInsert("dx")}
                className="h-10 w-10 sm:w-12 rounded-xl bg-card text-foreground font-semibold text-xs border border-border/80 shadow-xs flex items-center justify-center transition-all active:scale-95"
              >
                dx
              </button>

              <button
                type="button"
                disabled={disabled || !value.trim()}
                onClick={() => {
                  triggerHaptic();
                  onSend();
                }}
                className={cn(
                  "h-10 min-w-14 sm:min-w-16 rounded-xl font-bold text-xs flex items-center justify-center gap-1 transition-all active:scale-95 shadow-xs",
                  value.trim() && !disabled
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "bg-muted text-muted-foreground opacity-50 cursor-not-allowed"
                )}
              >
                <Send className="size-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* MODE: ACADEMIC POWER PROMPTS */}
        {mode === "prompts" && (
          <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
            {GENERAL_PROMPT_PRESETS.map((preset, i) => (
              <button
                key={i}
                type="button"
                onClick={() => {
                  triggerHaptic();
                  onChange(preset.prompt);
                }}
                className="flex items-center gap-2 p-2.5 rounded-xl border border-border/80 bg-card hover:border-primary/50 text-left transition-all active:scale-95 shadow-xs"
              >
                <div className="grid size-7 place-items-center rounded-lg bg-primary/10 text-primary shrink-0">
                  <preset.icon className="size-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-foreground truncate">{preset.label}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{preset.prompt}</p>
                </div>
              </button>
            ))}

            <div className="col-span-2 flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={() => setMode("alpha")}
                className="h-9 px-4 rounded-xl bg-muted text-foreground text-xs font-bold border border-border/80 transition-all active:scale-95"
              >
                Back to ABC Keyboard
              </button>

              <button
                type="button"
                disabled={disabled || !value.trim()}
                onClick={() => {
                  triggerHaptic();
                  onSend();
                }}
                className={cn(
                  "h-9 px-4 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all active:scale-95 shadow-xs",
                  value.trim() && !disabled
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "bg-muted text-muted-foreground opacity-50 cursor-not-allowed"
                )}
              >
                <Send className="size-3.5" /> Send Prompt
              </button>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// Individual animated keycap with Trust Wallet tactile feel
function KeyCap({
  char,
  onPress,
  isWide = false,
}: {
  char: string;
  onPress: () => void;
  isWide?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onPress}
      className={cn(
        "h-10 rounded-xl bg-card text-foreground font-semibold text-sm border border-border/80 shadow-[0_1.5px_2px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.8)] dark:shadow-[0_1.5px_2px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.1)] transition-all select-none",
        "active:translate-y-0.5 active:scale-95 active:bg-primary/10 active:border-primary/40",
        isWide ? "flex-1 min-w-9 px-1 text-xs" : "flex-1 max-w-10 min-w-7 sm:max-w-12 sm:min-w-9"
      )}
    >
      {char}
    </button>
  );
}
