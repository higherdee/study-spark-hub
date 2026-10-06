import React from "react";
import { cn } from "@/lib/utils";

/**
 * Official Syllaboss Academic Emblem (Book & Sprout)
 */
export function SyllabossEmblem({
  className,
  alt = "Syllaboss",
  ...props
}: React.ImgHTMLAttributes<HTMLImageElement>) {
  return (
    <img
      src="/icon-512.png"
      alt={alt}
      className={cn("size-8 shrink-0 object-contain rounded-lg", className)}
      {...props}
    />
  );
}

/**
 * Full Brand Logo Header Component
 */
export function SyllabossLogo({
  compact = false,
  href = "/",
  asDiv = false,
  showPlusBadge = false,
  className,
}: {
  compact?: boolean;
  href?: string;
  asDiv?: boolean;
  showPlusBadge?: boolean;
  className?: string;
}) {
  const content = (
    <>
      <SyllabossEmblem className="size-8 group-hover:scale-105 transition-transform duration-200" />
      {!compact && (
        <div className="flex items-center gap-1.5">
          <span className="font-headline tracking-tight text-xl sm:text-2xl font-semibold text-primary">
            Syllaboss
          </span>
          {showPlusBadge && (
            <span className="px-1.5 py-0.5 rounded bg-[#f3e8c9] text-[#71540f] text-[10px] tracking-wider uppercase font-bold shadow-[0_1px_2px_rgba(113,84,15,0.08)]">
              SyllaPlus
            </span>
          )}
        </div>
      )}
    </>
  );

  if (asDiv) {
    return (
      <div className={cn("inline-flex items-center gap-2.5 group select-none", className)}>
        {content}
      </div>
    );
  }

  return (
    <a
      href={href}
      aria-label="Syllaboss home"
      className={cn("inline-flex items-center gap-2.5 transition-transform active:scale-95 group", className)}
    >
      {content}
    </a>
  );
}

/**
 * Breathing Full-Page Loading Screen
 * Displays the Syllaboss logo gently zooming in and out like it's breathing,
 * then zooms page smoothly into frame when loaded.
 */
export function PageBreathingLoader({
  message = "Loading your academic workspace...",
}: {
  message?: string;
}) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#f3fbf6] transition-all duration-300">
      <div className="relative flex flex-col items-center gap-4">
        {/* Breathing aura blur */}
        <div className="absolute -inset-8 rounded-full bg-secondary-fixed/40 blur-2xl animate-pulse pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center">
          <div className="animate-breathe-zoom">
            <SyllabossEmblem className="size-20 sm:size-24 drop-shadow-md" />
          </div>
          <span className="mt-4 font-headline text-2xl font-semibold tracking-tight text-primary">
            Syllaboss
          </span>
          <p className="mt-2 text-xs font-medium text-secondary animate-pulse tracking-wide">
            {message}
          </p>
        </div>
      </div>
    </div>
  );
}