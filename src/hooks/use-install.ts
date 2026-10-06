import { useEffect, useState } from "react";

type PromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

let deferred: PromptEvent | null = null;
const listeners = new Set<() => void>();
if (typeof window !== "undefined") {
  const w = window as unknown as { __bip?: PromptEvent };
  if (w.__bip) deferred = w.__bip;
  window.addEventListener("bip-ready", () => {
    deferred = w.__bip ?? null;
    listeners.forEach((l) => l());
  });
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferred = e as PromptEvent;
    listeners.forEach((l) => l());
  });
  window.addEventListener("appinstalled", () => {
    deferred = null;
    listeners.forEach((l) => l());
  });
}

export type DevicePlatform = "android" | "ios" | "windows" | "mac" | "linux";

export function detectPlatform(): DevicePlatform {
  if (typeof window === "undefined") return "android";
  const ua = navigator.userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) return "ios";
  if (/android/.test(ua)) return "android";
  if (/win/.test(ua)) return "windows";
  if (/macintosh|mac os x/.test(ua)) return "mac";
  if (/linux/.test(ua)) return "linux";
  return "android";
}

export function useInstall() {
  const [, force] = useState(0);
  const [installed, setInstalled] = useState(false);
  const [platform, setPlatform] = useState<DevicePlatform>("android");

  useEffect(() => {
    const l = () => force((n) => n + 1);
    listeners.add(l);

    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true ||
      document.referrer.includes("android-app://");
    setInstalled(isStandalone);
    setPlatform(detectPlatform());

    // Listen for display mode changes (e.g. launched after install)
    const mediaQuery = window.matchMedia("(display-mode: standalone)");
    const handler = (e: MediaQueryListEvent) => {
      if (e.matches) setInstalled(true);
    };
    mediaQuery.addEventListener("change", handler);

    return () => {
      listeners.delete(l);
      mediaQuery.removeEventListener("change", handler);
    };
  }, []);

  const canPrompt = Boolean(deferred || (typeof window !== "undefined" && (window as unknown as { __bip?: PromptEvent }).__bip));

  const install = async (): Promise<boolean> => {
    // If deferred wasn't set yet, check window.__bip
    if (!deferred && typeof window !== "undefined") {
      const w = window as unknown as { __bip?: PromptEvent };
      if (w.__bip) deferred = w.__bip;
    }

    // Wait a brief tick if deferred is arriving
    if (!deferred) {
      await new Promise<void>((resolve) => {
        let count = 0;
        const interval = setInterval(() => {
          count++;
          if (deferred || count > 6) {
            clearInterval(interval);
            resolve();
          }
        }, 100);
      });
    }

    if (!deferred) return false;

    try {
      await deferred.prompt();
      const { outcome } = await deferred.userChoice;
      deferred = null;
      if (typeof window !== "undefined") {
        delete (window as unknown as { __bip?: PromptEvent }).__bip;
      }
      force((n) => n + 1);
      if (outcome === "accepted") {
        setInstalled(true);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  return {
    canPrompt,
    installed,
    platform,
    ios: platform === "ios",
    install,
  };
}
