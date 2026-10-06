import { useState, useEffect, useRef } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { Bot, Sparkles, Move, X } from "lucide-react";
import { cn } from "@/lib/utils";

type Corner = "top-right" | "top-left" | "bottom-right" | "bottom-left";

export function FloatingBossAi() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  // If already on the assistant page, don't show the floating trigger
  const isAssistantPage = path.startsWith("/dashboard/assistant");

  const [corner, setCorner] = useState<Corner>("top-right");
  const [isPeeking, setIsPeeking] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Reset inactivity peek timer
  const resetTimer = () => {
    setIsPeeking(false);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setIsPeeking(true);
    }, 3800);
  };

  useEffect(() => {
    resetTimer();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [corner]);

  if (isAssistantPage) return null;

  // Corner positioning coordinates
  const cornerStyles: Record<Corner, string> = {
    "top-right": "top-20 right-3 sm:right-6",
    "top-left": "top-20 left-3 sm:left-6",
    "bottom-right": "bottom-24 right-3 sm:right-6",
    "bottom-left": "bottom-24 left-3 sm:left-6",
  };

  const isRightSide = corner === "top-right" || corner === "bottom-right";

  const cycleCorner = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const sequence: Corner[] = ["top-right", "bottom-right", "bottom-left", "top-left"];
    const nextIdx = (sequence.indexOf(corner) + 1) % sequence.length;
    setCorner(sequence[nextIdx]!);
    resetTimer();
  };

  return (
    <div
      className={cn(
        "fixed z-40 transition-all duration-500 ease-out select-none",
        cornerStyles[corner],
        isPeeking && isRightSide && "translate-x-[68%]",
        isPeeking && !isRightSide && "-translate-x-[68%]"
      )}
      onMouseEnter={resetTimer}
      onTouchStart={resetTimer}
    >
      <div className="relative group flex items-center">
        {/* Main interactive pill */}
        <Link
          to="/dashboard/assistant"
          onClick={resetTimer}
          aria-label="Open Boss AI study assistant"
          title="Chat with Boss AI (tap to open)"
          className={cn(
            "flex items-center gap-2.5 rounded-full py-2 px-3 sm:py-2.5 sm:px-4 shadow-2xl border backdrop-blur-xl transition-all duration-300",
            "bg-[#0d281e] text-white border-[#446557]/60 hover:border-[#1b7a4e] hover:shadow-[0_10px_25px_rgba(13,40,30,0.35)]",
            "active:scale-95",
            isPeeking ? "opacity-90 hover:opacity-100" : "opacity-100"
          )}
        >
          {/* Breathing Icon Bubble */}
          <div className="relative flex items-center justify-center shrink-0">
            <div className="size-8 rounded-full bg-[#1b7a4e]/40 flex items-center justify-center border border-[#c6ebd9]/30">
              <Bot className="size-4.5 text-[#c6ebd9] group-hover:scale-110 transition-transform" />
            </div>
            <span className="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-[#34d399] animate-ping" />
            <span className="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-[#34d399]" />
          </div>

          {/* Expanded Label & Status */}
          <div className={cn("flex flex-col text-left transition-opacity duration-300", isPeeking && "opacity-0")}>
            <div className="flex items-center gap-1">
              <span className="text-xs font-bold tracking-tight text-white font-headline">
                Boss AI
              </span>
              <Sparkles className="size-3 text-[#f3e8c9]" />
            </div>
            <span className="text-[10px] text-[#cee9da] font-mono leading-tight">
              Ready to study
            </span>
          </div>

          {/* Quick corner toggle handle button */}
          <button
            type="button"
            onClick={cycleCorner}
            title="Move Boss AI to another corner"
            aria-label="Move widget to another corner"
            className={cn(
              "ml-1 p-1 rounded-full text-white/50 hover:text-white hover:bg-white/10 transition-colors",
              isPeeking && "hidden"
            )}
          >
            <Move className="size-3" />
          </button>
        </Link>

        {/* Peek indicator badge visible when tucked away */}
        {isPeeking && (
          <button
            type="button"
            onClick={resetTimer}
            className="absolute -top-2 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded-full bg-[#1b7a4e] text-[9px] font-mono text-white font-bold shadow-xs animate-bounce"
          >
            TAP
          </button>
        )}
      </div>
    </div>
  );
}
