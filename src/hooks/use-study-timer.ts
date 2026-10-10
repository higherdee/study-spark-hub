import { useEffect, useState, useRef, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { sendDeviceNotification } from "@/lib/notifications";
import { useAuth } from "@/hooks/use-auth";
import { useProfile } from "@/lib/profile";
import { recordStudySessionServerFn } from "@/lib/upload.functions";
import { STUDY_TIMER_INTERVAL_SECONDS, STUDY_INACTIVITY_LIMIT_MS } from "@/lib/constants";

export function useStudyTimer() {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const qc = useQueryClient();

  const storageKey = user?.id ? `syllaboss_study_timer_${user.id}` : "syllaboss_study_timer_guest";

  const [seconds, setSeconds] = useState<number>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(storageKey);
        if (stored) {
          const val = Number(stored);
          if (!isNaN(val) && val >= 0) return val;
        }
      } catch {
        // Fallback for private browsing
      }
    }
    return 0;
  });

  const [isInactive, setIsInactive] = useState(false);
  const [manualPause, setManualPause] = useState(false);
  const [isAppFocused, setIsAppFocused] = useState(true);

  const lastActiveRef = useRef(Date.now());
  const secondsRef = useRef(seconds);

  // Keep secondsRef in sync with state
  useEffect(() => {
    secondsRef.current = seconds;
  }, [seconds]);

  // Update activity timestamp on user interaction
  const markActive = useCallback(() => {
    lastActiveRef.current = Date.now();
    if (isInactive) {
      setIsInactive(false);
      toast.info("Study timer resumed. Keep up the good work!");
    }
  }, [isInactive]);

  // Detect user interactions across the app
  useEffect(() => {
    if (typeof window === "undefined") return;

    const events = ["mousedown", "mousemove", "keydown", "scroll", "touchstart"];
    const handler = () => markActive();

    events.forEach((ev) => window.addEventListener(ev, handler, { passive: true }));
    return () => {
      events.forEach((ev) => window.removeEventListener(ev, handler));
    };
  }, [markActive]);

  // Track app visibility & focus: pauses when user leaves, resumes when user enters
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        setIsAppFocused(false);
        try {
          localStorage.setItem(storageKey, String(secondsRef.current));
        } catch {}
      } else {
        setIsAppFocused(true);
        lastActiveRef.current = Date.now();
      }
    };

    const handleBlur = () => {
      setIsAppFocused(false);
      try {
        localStorage.setItem(storageKey, String(secondsRef.current));
      } catch {}
    };

    const handleFocus = () => {
      setIsAppFocused(true);
      lastActiveRef.current = Date.now();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleBlur);
    window.addEventListener("focus", handleFocus);
    window.addEventListener("beforeunload", () => {
      try {
        localStorage.setItem(storageKey, String(secondsRef.current));
      } catch {}
    });

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("focus", handleFocus);
    };
  }, [storageKey]);

  // Main timer engine: starts automatically, pauses when user leaves, resumes seamlessly
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(async () => {
      if (manualPause || !isAppFocused) return;

      const idleDuration = Date.now() - lastActiveRef.current;
      if (idleDuration >= STUDY_INACTIVITY_LIMIT_MS) {
        if (!isInactive) {
          setIsInactive(true);
        }
        return; // Paused due to 1-hour inactivity timeout
      }

      const next = secondsRef.current + 1;
      secondsRef.current = next;
      setSeconds(next);

      // Save to localStorage every 5 seconds or upon milestones
      if (next % 5 === 0) {
        try {
          localStorage.setItem(storageKey, String(next));
        } catch {}
      }

      // Award 5 SyllaPoints every 30 minutes (1800 seconds)
      if (next >= STUDY_TIMER_INTERVAL_SECONDS) {
        secondsRef.current = 0;
        setSeconds(0);
        try {
          localStorage.setItem(storageKey, "0");
        } catch {}

        try {
          await recordStudySessionServerFn({
            data: { userId: user.id, minutes: 30 },
          });
          toast.success("+5 SyllaPoints earned! 30 minutes of study recorded.");
          sendDeviceNotification("Study Milestone Achieved!", {
            body: "+5 SyllaPoints earned for 30 minutes of study.",
          });
          qc.invalidateQueries({ queryKey: ["profile"] });
          qc.invalidateQueries({ queryKey: ["ledger"] });
        } catch (err) {
          console.error("Failed to record study session points:", err);
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [user, manualPause, isInactive, isAppFocused, storageKey, qc]);

  const togglePause = () => setManualPause((p) => !p);

  return {
    seconds,
    isInactive,
    manualPause,
    isPaused: manualPause || isInactive || !isAppFocused,
    totalStudyMinutes: profile?.study_minutes ?? 0,
    togglePause,
    markActive,
  };
}
