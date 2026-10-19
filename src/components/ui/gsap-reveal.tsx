import { useRef, useEffect, type ReactNode } from "react";
import gsap from "gsap";
import { cn } from "@/lib/utils";

interface GsapRevealProps {
  children: ReactNode;
  className?: string;
  stagger?: number;
  delay?: number;
  yOffset?: number;
}

export function GsapReveal({
  children,
  className,
  stagger = 0.08,
  delay = 0.05,
  yOffset = 16,
}: GsapRevealProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const childrenElements = Array.from(el.children);
    if (!childrenElements.length) return;

    gsap.fromTo(
      childrenElements,
      {
        opacity: 0,
        y: yOffset,
      },
      {
        opacity: 1,
        y: 0,
        duration: 0.55,
        stagger,
        delay,
        ease: "power3.out",
        clearProps: "all",
      }
    );

    return () => {
      gsap.killTweensOf(childrenElements);
    };
  }, [stagger, delay, yOffset]);

  return (
    <div ref={containerRef} className={cn("will-change-transform", className)}>
      {children}
    </div>
  );
}
