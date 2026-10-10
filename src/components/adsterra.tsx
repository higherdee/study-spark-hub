import { useEffect, useRef } from "react";

/**
 * Adsterra Ad Formats & Keys Configuration
 * Domain: syllaboss.org
 */
export const ADSTERRA_CONFIG = {
  BANNER_160x300: {
    key: "3fdc378a8547e530080718c05a19ade2",
    width: 160,
    height: 300,
  },
  BANNER_160x600: {
    key: "e9b2518fc274bc7ae8a9fdf7404c1973",
    width: 160,
    height: 600,
  },
  BANNER_300x250: {
    key: "b851135b4c012d24bb206c404ba92527",
    width: 300,
    height: 250,
  },
  BANNER_320x50: {
    key: "da543edd9cb099b70bf8f4edfed574d2",
    width: 320,
    height: 50,
  },
  BANNER_468x60: {
    key: "4fda5fa08d0629267a970c5587adcdb7",
    width: 468,
    height: 60,
  },
  BANNER_728x90: {
    key: "b3720c8d5e2995c13dd1de1ef899c05e",
    width: 728,
    height: 90,
  },
  NATIVE_BANNER: {
    key: "03d2b5583243eacd225e5c89c3ff554c",
    script: "https://pl31765394.profitableratecpmnetwork.com/03d2b5583243eacd225e5c89c3ff554c/invoke.js",
  },
  POPUNDER_SCRIPT: "https://pl31765393.profitableratecpmnetwork.com/42/91/76/429176159e717cb765d70bc7a6385d24.js",
  SOCIALBAR_SCRIPT: "https://pl31765395.profitableratecpmnetwork.com/89/f0/b6/89f0b61bb99a240e575724b1c748ae33.js",
  SMARTLINK_URL: "https://www.profitableratecpmnetwork.com/f75mdf5t?key=54987c8d6ece5e4ab0650e2f8a746b5d",
} as const;

export type AdsterraBannerFormat =
  | "160x300"
  | "160x600"
  | "300x250"
  | "320x50"
  | "468x60"
  | "728x90";

interface AdsterraBannerProps {
  format: AdsterraBannerFormat;
  className?: string;
  autoClickOnEnter?: boolean;
}

/**
 * Isolated Iframe Adsterra Display Banner
 */
export function AdsterraBanner({
  format,
  className = "",
  autoClickOnEnter = false,
}: AdsterraBannerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const getFormatConfig = () => {
    switch (format) {
      case "160x300":
        return ADSTERRA_CONFIG.BANNER_160x300;
      case "160x600":
        return ADSTERRA_CONFIG.BANNER_160x600;
      case "300x250":
        return ADSTERRA_CONFIG.BANNER_300x250;
      case "320x50":
        return ADSTERRA_CONFIG.BANNER_320x50;
      case "468x60":
        return ADSTERRA_CONFIG.BANNER_468x60;
      case "728x90":
        return ADSTERRA_CONFIG.BANNER_728x90;
    }
  };

  const ad = getFormatConfig();

  const iframeSrcDoc = `<!DOCTYPE html>
<html>
<head>
  <style>
    html, body {
      margin: 0;
      padding: 0;
      display: flex;
      justify-content: center;
      align-items: center;
      background: transparent;
      overflow: hidden;
      width: 100%;
      height: 100%;
    }
  </style>
</head>
<body>
  <script type="text/javascript">
    atOptions = {
      'key' : '${ad.key}',
      'format' : 'iframe',
      'height' : ${ad.height},
      'width' : ${ad.width},
      'params' : {}
    };
  </script>
  <script type="text/javascript" src="https://www.highrevenueformat.com/${ad.key}/invoke.js"></script>
</body>
</html>`;

  return (
    <div
      ref={containerRef}
      data-adsterra-format={format}
      className={`adsterra-unit flex items-center justify-center my-4 overflow-hidden rounded-xl border border-border/40 bg-card/40 p-1 shadow-xs transition-all ${className}`}
      style={{ minHeight: `${ad.height}px`, minWidth: `${Math.min(ad.width, 300)}px` }}
    >
      <iframe
        srcDoc={iframeSrcDoc}
        width={ad.width}
        height={ad.height}
        title={`Syllaboss Sponsored Ad ${format}`}
        className="border-0 overflow-hidden max-w-full"
        loading="lazy"
        sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-forms"
      />
    </div>
  );
}

/**
 * Adsterra Native Banner (4 Images Grid)
 */
export function AdsterraNativeBanner({ className = "" }: { className?: string }) {
  const nativeSrcDoc = `<!DOCTYPE html>
<html>
<head>
  <style>
    html, body {
      margin: 0;
      padding: 0;
      background: transparent;
      font-family: system-ui, -apple-system, sans-serif;
      overflow: hidden;
    }
  </style>
</head>
<body>
  <script async="async" data-cfasync="false" src="${ADSTERRA_CONFIG.NATIVE_BANNER.script}"></script>
  <div id="container-${ADSTERRA_CONFIG.NATIVE_BANNER.key}"></div>
</body>
</html>`;

  return (
    <div
      className={`adsterra-unit adsterra-native w-full my-6 rounded-2xl border border-border/50 bg-card/50 p-2 shadow-xs ${className}`}
    >
      <iframe
        srcDoc={nativeSrcDoc}
        title="Syllaboss Native Recommendation"
        className="w-full h-[280px] border-0 overflow-hidden"
        loading="lazy"
        sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-forms"
      />
    </div>
  );
}

/**
 * Adsterra Auto-Clicker & Interaction Dispatcher
 * Automatically targets and triggers the nearest ad in sight on landing,
 * and sets up a one-time gesture bridge to trigger Adsterra's popunder and smartlink.
 */
export function AdsterraAutoClicker() {
  const firedRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // 1. Function to simulate click on the nearest ad
    const triggerNearestAdClick = () => {
      if (firedRef.current) return;
      firedRef.current = true;

      try {
        // Find all ad units on page
        const ads = document.querySelectorAll(".adsterra-unit");
        if (ads.length > 0) {
          // Find nearest ad in or close to current viewport
          let nearestAd: Element | null = null;
          let minDistance = Infinity;

          ads.forEach((ad) => {
            const rect = ad.getBoundingClientRect();
            const distance = Math.abs(rect.top);
            if (distance < minDistance) {
              minDistance = distance;
              nearestAd = ad;
            }
          });

          const target = nearestAd || ads[0];
          if (target) {
            // Trigger focus & simulated click sequence
            const iframe = target.querySelector("iframe");
            if (iframe) {
              iframe.focus();
            }

            const evtInit = { bubbles: true, cancelable: true, view: window };
            target.dispatchEvent(new MouseEvent("mousedown", evtInit));
            target.dispatchEvent(new MouseEvent("mouseup", evtInit));
            target.dispatchEvent(new MouseEvent("click", evtInit));
          }
        }
      } catch {
        // Fallback handled by gesture listener
      }
    };

    // 2. Automated trigger after slight mount delay
    const autoTimer = setTimeout(() => {
      triggerNearestAdClick();
    }, 450);

    // 3. One-time gesture listener on first touch/click
    const handleFirstUserGesture = (e: MouseEvent | TouchEvent) => {
      triggerNearestAdClick();
      window.removeEventListener("pointerdown", handleFirstUserGesture, true);
      window.removeEventListener("touchstart", handleFirstUserGesture, true);
      window.removeEventListener("click", handleFirstUserGesture, true);
    };

    window.addEventListener("pointerdown", handleFirstUserGesture, { capture: true, once: true });
    window.addEventListener("touchstart", handleFirstUserGesture, { capture: true, once: true });
    window.addEventListener("click", handleFirstUserGesture, { capture: true, once: true });

    return () => {
      clearTimeout(autoTimer);
      window.removeEventListener("pointerdown", handleFirstUserGesture, true);
      window.removeEventListener("touchstart", handleFirstUserGesture, true);
      window.removeEventListener("click", handleFirstUserGesture, true);
    };
  }, []);

  return null;
}
