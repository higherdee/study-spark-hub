import { createContext, useContext, type ReactNode } from "react";

import { useStudyTimer } from "@/hooks/use-study-timer";

type StudyTimerState = ReturnType<typeof useStudyTimer>;

const StudyTimerContext = createContext<StudyTimerState | null>(null);

/**
 * Mounts the study timer exactly once for the whole signed-in app shell and
 * shares its state. Screens that want to display the focus session (sidebar,
 * home) must read from here instead of calling useStudyTimer() again, which
 * would start a second timer and record sessions twice.
 */
export function StudyTimerProvider({ children }: { children: ReactNode }) {
  const timer = useStudyTimer();
  return <StudyTimerContext.Provider value={timer}>{children}</StudyTimerContext.Provider>;
}

export function useSharedStudyTimer(): StudyTimerState | null {
  return useContext(StudyTimerContext);
}

/** Seconds remaining until the next +points milestone (every 30 minutes). */
export function milestoneRemaining(seconds: number) {
  const remaining = Math.max(0, 1800 - (seconds % 1800));
  const mm = String(Math.floor(remaining / 60)).padStart(2, "0");
  const ss = String(remaining % 60).padStart(2, "0");
  return { remaining, label: `${mm}:${ss}`, progress: 1 - remaining / 1800 };
}
