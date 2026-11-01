import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "./use-auth";
import { useProfile } from "@/lib/profile";
import { sendDeviceNotification } from "@/lib/notifications";

export function useVerifiedStudyTimer() {
  const { user, getToken } = useAuth();
  const tokenProvider = useRef(getToken);
  tokenProvider.current = getToken;
  const { data: profile } = useProfile();
  const query = useQueryClient();
  const [seconds, setSeconds] = useState(0);
  const [dailyMinutes, setDailyMinutes] = useState(0);
  const [manualPause, setManualPause] = useState(false);
  const [isInactive, setIsInactive] = useState(false);
  const [focused, setFocused] = useState(true);
  const [dailyGoalMinutes, setDailyGoalMinutes] = useState(() => [0, 6].includes(new Date().getDay()) ? 150 : 90);
  const activity = useRef(Date.now());
  const secondsRef = useRef(0);
  const paused = useRef(false);
  const idle = useRef(false);
  const idleMinutes = useRef(60);
  const pending = useRef(false);
  const lastPulse = useRef(0);
  const pulse = useCallback(async () => {
    if (!user || pending.current) return;
    const active = !paused.current && Date.now() - activity.current < idleMinutes.current * 60_000 && document.visibilityState === "visible" && document.hasFocus();
    pending.current = true; lastPulse.current = Date.now();
    try {
      const token = await tokenProvider.current();
      if (!token) return;
      const response = await fetch("/api/membership", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ action: "study-heartbeat", active }) });
      if (!response.ok) return;
      const result = await response.json();
      secondsRef.current = result.activeSeconds; setSeconds(result.activeSeconds); setDailyMinutes(result.dailyMinutes);
      if (result.pointsAwarded > 0) {
        toast.success(`+${result.pointsAwarded} SyllaPoints for your focus session.`);
        if (localStorage.getItem("syllaboss_study_reminders") !== "false") sendDeviceNotification("Focus session complete", { body: `You earned ${result.pointsAwarded} SyllaPoints. Your next round has started.` });
        void query.invalidateQueries({ queryKey: ["profile"] }); void query.invalidateQueries({ queryKey: ["ledger"] });
      }
    } catch { /* Preserve the counter until the server can confirm progress. */ }
    finally { pending.current = false; }
  }, [user?.id, query]);
  const markActive = useCallback(() => { activity.current = Date.now(); if (idle.current) { idle.current = false; setIsInactive(false); } }, []);
  useEffect(() => {
    const preferences = profile?.study_plan?.["preferences"] as { studyGoalMinutes?: number; idleTimeoutMinutes?: number } | undefined;
    const refresh = () => {
      const target = preferences?.studyGoalMinutes || Number(localStorage.getItem("syllaboss_study_goal")) || ([0, 6].includes(new Date().getDay()) ? 150 : 90);
      idleMinutes.current = preferences?.idleTimeoutMinutes || Number(localStorage.getItem("syllaboss_idle_timeout")) || 60;
      setDailyGoalMinutes(target);
    };
    refresh(); window.addEventListener("syllaboss:study-preferences", refresh);
    return () => window.removeEventListener("syllaboss:study-preferences", refresh);
  }, [profile?.study_plan]);
  useEffect(() => {
    secondsRef.current = 0; setSeconds(0); setDailyMinutes(0); activity.current = Date.now();
    void pulse();
    const heartbeat = window.setInterval(() => void pulse(), 30_000);
    const events = ["pointerdown", "pointermove", "keydown", "scroll", "touchstart"];
    events.forEach((event) => window.addEventListener(event, markActive, { passive: true }));
    const visibility = () => { setFocused(!document.hidden && document.hasFocus()); if (!document.hidden) markActive(); void pulse(); };
    document.addEventListener("visibilitychange", visibility); window.addEventListener("focus", visibility); window.addEventListener("blur", visibility);
    const clock = window.setInterval(() => {
      const inactive = Date.now() - activity.current >= idleMinutes.current * 60_000;
      idle.current = inactive; setIsInactive(inactive);
      const hasFocus = !document.hidden && document.hasFocus(); setFocused(hasFocus);
      if (!paused.current && !inactive && hasFocus && user) {
        secondsRef.current = Math.min(1800, secondsRef.current + 1); setSeconds(secondsRef.current);
        if (secondsRef.current >= 1800 && Date.now() - lastPulse.current > 2000) void pulse();
      }
    }, 1000);
    return () => { window.clearInterval(clock); window.clearInterval(heartbeat); events.forEach((event) => window.removeEventListener(event, markActive)); document.removeEventListener("visibilitychange", visibility); window.removeEventListener("focus", visibility); window.removeEventListener("blur", visibility); };
  }, [user?.id, pulse, markActive]);
  const togglePause = () => { paused.current = !paused.current; setManualPause(paused.current); if (!paused.current) markActive(); void pulse(); };
  return { seconds, isInactive, manualPause, isPaused: manualPause || isInactive || !focused, totalStudyMinutes: profile?.study_minutes ?? 0, dailyMinutes, completedRounds: Math.floor(dailyMinutes / 30), dailyGoalMinutes, togglePause, markActive };
}
