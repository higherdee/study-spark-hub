import { useEffect, useState, useRef, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { useProfile } from "@/lib/profile";
import { recordStudySessionServerFn } from "@/lib/upload.functions";
import { STUDY_TIMER_INTERVAL_SECONDS, STUDY_INACTIVITY_LIMIT_MS } from "@/lib/constants";

export function useStudyTimer() {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const qc = useQueryClient();

  const [seconds, setSeconds] = useState(0);
  const [isInactive, setIsInactive] = useState(false);
  const [manualPause, setManualPause] = useState(false);

  const lastActiveRef = useRef(Date.now());
  const secondsRef = useRef(0);

  // Update activity timestamp on user interaction
  const markActive = useCallback(() => {
    lastActiveRef.current = Date.now();
    if (isInactive) {
      setIsInactive(false);
      toast.info("Study timer resumed. Keep up the good work!");
    }
  }, [isInactive]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const events = ["mousedown", "mousemove", "keydown", "scroll", "touchstart"];
    const handler = () => markActive();

    events.forEach((ev) => window.addEventListener(ev, handler, { passive: true }));
    return () => {
      events.forEach((ev) => window.removeEventListener(ev, handler));
    };
  }, [markActive]);

  useEffect(() => {
    if (!user) return;

    const interval = setInterval(async () => {
      if (manualPause) return;

      const idleDuration = Date.now() - lastActiveRef.current;
      if (idleDuration >= STUDY_INACTIVITY_LIMIT_MS) {
        if (!isInactive) {
          setIsInactive(true);
        }
        return; // Paused due to 1-hour inactivity
      }

      secondsRef.current += 1;
      setSeconds(secondsRef.current);

      // Award 5 SyllaPoints every 30 minutes (1800 seconds)
      if (secondsRef.current >= STUDY_TIMER_INTERVAL_SECONDS) {
        secondsRef.current = 0;
        setSeconds(0);

        try {
          await recordStudySessionServerFn({
            data: { userId: user.id, minutes: 30 },
          });
          toast.success("🎉 +5 SyllaPoints earned! 30 minutes of study recorded.");
          qc.invalidateQueries({ queryKey: ["profile"] });
          qc.invalidateQueries({ queryKey: ["ledger"] });
        } catch (err) {
          console.error("Failed to record study session points:", err);
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [user, manualPause, isInactive, qc]);

  const togglePause = () => setManualPause((p) => !p);

  return {
    seconds,
    isInactive,
    manualPause,
    isPaused: manualPause || isInactive,
    totalStudyMinutes: profile?.study_minutes ?? 0,
    togglePause,
    markActive,
  };
}
