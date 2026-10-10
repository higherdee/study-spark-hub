import { useEffect, useRef } from "react";

// PopAds Publisher Integration
// PopAds API Key: 8dc5b2055d79d2ce497cd800a2a0480bda1a1cf6
const DEFAULT_SITE_ID = 5104928; // Fallback PopAds Site ID placeholder

declare global {
  interface Window {
    _pop?: unknown[];
  }
}

interface PopAdsTriggerProps {
  siteId?: number;
}

export function PopAdsTrigger({ siteId = DEFAULT_SITE_ID }: PopAdsTriggerProps) {
  const triggerRef = useRef<HTMLDivElement>(null);
  const firedRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // 1. Initialize PopAds configuration array
    window._pop = window._pop || [];
    window._pop.push(["siteId", siteId]);
    window._pop.push(["minBid", 0]);
    window._pop.push(["popundersPerIP", 0]);
    window._pop.push(["delay", 0]);
    window._pop.push(["default", false]);
    window._pop.push(["defaultPerDay", 0]);
    window._pop.push(["topmostLayer", false]);

    // 2. Load PopAds script if not already present
    const existingScript = document.getElementById("popads-script");
    if (!existingScript) {
      const pa = document.createElement("script");
      pa.id = "popads-script";
      pa.type = "text/javascript";
      pa.async = true;
      pa.src = "//c1.popads.net/pop.js";
      pa.onerror = () => {
        const sa = document.createElement("script");
        sa.type = "text/javascript";
        sa.async = true;
        sa.src = "//c2.popads.net/pop.js";
        document.head.appendChild(sa);
      };
      document.head.appendChild(pa);
    }

    // 3. Automated trigger system
    // Many browsers require a trusted user gesture to prevent popup blockers from suppressing window.open.
    // We attach both an immediate auto-click dispatch AND a full-screen transparent capture layer
    // so the very millisecond the user touches the screen, clicks, or scrolls, the popunder triggers seamlessly.

    const triggerPopunder = (e?: Event) => {
      if (firedRef.current) return;
      firedRef.current = true;

      // Clean up the transparent overlay so normal clicks flow freely
      if (triggerRef.current) {
        triggerRef.current.style.pointerEvents = "none";
        triggerRef.current.remove();
      }

      // If triggered by a user event on the overlay, let the native click pass down
      if (e && e.target === triggerRef.current) {
        // PopAds catches the window/document click event
      }
    };

    // A. Attempt immediate programmatic dispatch on landing load
    const timer = setTimeout(() => {
      try {
        const dummy = document.createElement("a");
        dummy.href = "#";
        dummy.style.display = "none";
        document.body.appendChild(dummy);
        dummy.click();
        dummy.remove();
      } catch {
        // Fallback to capture layer
      }
    }, 400);

    // B. Global one-time interaction listeners (tap, click, scroll, touch)
    const handleFirstInteraction = (e: Event) => {
      triggerPopunder(e);
      window.removeEventListener("pointerdown", handleFirstInteraction, true);
      window.removeEventListener("touchstart", handleFirstInteraction, true);
      window.removeEventListener("click", handleFirstInteraction, true);
    };

    window.addEventListener("pointerdown", handleFirstInteraction, { capture: true, once: true });
    window.addEventListener("touchstart", handleFirstInteraction, { capture: true, once: true });
    window.addEventListener("click", handleFirstInteraction, { capture: true, once: true });

    return () => {
      clearTimeout(timer);
      window.removeEventListener("pointerdown", handleFirstInteraction, true);
      window.removeEventListener("touchstart", handleFirstInteraction, true);
      window.removeEventListener("click", handleFirstInteraction, true);
    };
  }, [siteId]);

  return (
    <div
      ref={triggerRef}
      id="popads-auto-capture"
      aria-hidden="true"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        zIndex: 9999,
        background: "transparent",
        pointerEvents: "auto",
      }}
      onClick={(e) => {
        // Dismiss overlay so next clicks target actual buttons
        if (triggerRef.current) {
          triggerRef.current.style.pointerEvents = "none";
          triggerRef.current.remove();
        }
      }}
    />
  );
}
