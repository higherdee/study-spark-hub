import { useState, useEffect, useRef } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { Bot, Sparkles, GripHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

export function FloatingBossAi() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const isAssistantPage = path.startsWith("/dashboard/assistant");

  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ startX: number; startY: number; initX: number; initY: number; moved: boolean } | null>(null);
  const widgetRef = useRef<HTMLDivElement>(null);

  // Load saved position or initialize default position near right edge
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const saved = localStorage.getItem("syllaboss_ai_floating_pos");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.x === "number" && typeof parsed.y === "number") {
          const clampedX = Math.max(12, Math.min(window.innerWidth - 140, parsed.x));
          const clampedY = Math.max(70, Math.min(window.innerHeight - 80, parsed.y));
          setPosition({ x: clampedX, y: clampedY });
          return;
        }
      }
    } catch {}

    // Default: Top right side
    const defX = Math.max(12, window.innerWidth - 150);
    const defY = 88;
    setPosition({ x: defX, y: defY });
  }, []);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (!position) return;
    // Capture pointer
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);

    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initX: position.x,
      initY: position.y,
      moved: false,
    };
    setIsDragging(true);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragStartRef.current || !position) return;

    const deltaX = e.clientX - dragStartRef.current.startX;
    const deltaY = e.clientY - dragStartRef.current.startY;

    if (Math.hypot(deltaX, deltaY) > 5) {
      dragStartRef.current.moved = true;
    }

    const rect = widgetRef.current?.getBoundingClientRect();
    const width = rect?.width || 140;
    const height = rect?.height || 48;

    const newX = Math.max(10, Math.min(window.innerWidth - width - 10, dragStartRef.current.initX + deltaX));
    const newY = Math.max(68, Math.min(window.innerHeight - height - 20, dragStartRef.current.initY + deltaY));

    setPosition({ x: newX, y: newY });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!dragStartRef.current) return;
    const hadMoved = dragStartRef.current.moved;
    dragStartRef.current = null;
    setIsDragging(false);

    if (hadMoved && position) {
      // Save custom placement
      try {
        localStorage.setItem("syllaboss_ai_floating_pos", JSON.stringify(position));
      } catch {}
    } else {
      // Simple tap -> Navigate to Boss AI
      navigate({ to: "/dashboard/assistant" });
    }
  };

  if (isAssistantPage || !position) return null;

  return (
    <div
      ref={widgetRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      style={{
        position: "fixed",
        left: `${position.x}px`,
        top: `${position.y}px`,
        touchAction: "none",
        zIndex: 45,
      }}
      title="Drag anywhere to move Boss AI, or tap to open study assistant"
      className={cn(
        "cursor-grab active:cursor-grabbing select-none transition-shadow duration-200",
        isDragging && "scale-105 shadow-2xl"
      )}
    >
      <div
        className={cn(
          "flex items-center gap-2 rounded-full py-1.5 pl-2 pr-3 shadow-xl border backdrop-blur-xl transition-all duration-150",
          "bg-[#0d281e] text-white border-[#446557]/60 hover:border-[#1b7a4e] hover:shadow-[0_10px_25px_rgba(13,40,30,0.35)]",
          isDragging ? "ring-2 ring-emerald-400/50 shadow-2xl" : "shadow-lg"
        )}
      >
        {/* Bot Icon with glowing pulse */}
        <div className="relative flex items-center justify-center shrink-0">
          <div className="size-8 rounded-full bg-[#1b7a4e]/40 flex items-center justify-center border border-[#c6ebd9]/30">
            <Bot className="size-4.5 text-[#c6ebd9]" />
          </div>
        </div>

        {/* Label */}
        <div className="flex flex-col text-left leading-tight pointer-events-none">
          <div className="flex items-center gap-1">
            <span className="text-xs font-bold tracking-tight text-white font-sans">
              Boss AI
            </span>
            <Sparkles className="size-3 text-[#f3e8c9]" />
          </div>
          <span className="text-[10px] text-[#cee9da] font-sans opacity-80">
            Study Copilot
          </span>
        </div>

        {/* Subtle Grip Drag Handle indicator */}
        <GripHorizontal className="size-3 text-white/40 ml-0.5 shrink-0 pointer-events-none" />
      </div>
    </div>
  );
}
