import { Download, Share, X, Smartphone, Laptop, Tablet, Monitor } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useInstall } from "@/hooks/use-install";
import { cn } from "@/lib/utils";

export function InstallButton({
  variant = "default",
  size = "default",
  className,
  label = "Install Syllaboss App",
}: {
  variant?: "outline" | "default" | "secondary" | "ghost";
  size?: "sm" | "lg" | "default";
  className?: string;
  label?: string;
}) {
  const { canPrompt, installed, ios, install } = useInstall();
  const [help, setHelp] = useState(false);
  const [activeTab, setActiveTab] = useState<"ios" | "android" | "desktop">(
    ios ? "ios" : "android"
  );

  async function onClick() {
    if (canPrompt) {
      const ok = await install();
      if (ok) {
        toast.success("Syllaboss is installed on your device!");
        return;
      }
    }
    setHelp(true);
  }

  return (
    <>
      <Button
        variant={variant}
        size={size}
        className={cn("gap-2 font-semibold shadow-xs", className)}
        onClick={onClick}
      >
        <Download className="size-4.5 shrink-0" />
        <span>{label}</span>
      </Button>

      {help && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-xs p-3 sm:p-4 animate-fade-in"
          onClick={() => setHelp(false)}
        >
          <div
            className="w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-2xl animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between pb-3 border-b border-border/80">
              <div>
                <h2 className="font-display text-xl sm:text-2xl font-bold text-foreground">
                  Install Syllaboss App
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Available for iPhone, Android, MacBook & Windows
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full size-8"
                aria-label="Close"
                onClick={() => setHelp(false)}
              >
                <X className="size-4" />
              </Button>
            </div>

            {/* Device tabs */}
            <div className="flex items-center gap-1.5 p-1 rounded-full bg-secondary mt-4">
              <button
                type="button"
                onClick={() => setActiveTab("ios")}
                className={cn(
                  "flex-1 py-1.5 px-2 rounded-full text-xs font-semibold flex items-center justify-center gap-1 transition-all",
                  activeTab === "ios"
                    ? "bg-card text-foreground shadow-xs font-bold"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Smartphone className="size-3.5" /> iPhone / iPad
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("android")}
                className={cn(
                  "flex-1 py-1.5 px-2 rounded-full text-xs font-semibold flex items-center justify-center gap-1 transition-all",
                  activeTab === "android"
                    ? "bg-card text-foreground shadow-xs font-bold"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Smartphone className="size-3.5" /> Android
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("desktop")}
                className={cn(
                  "flex-1 py-1.5 px-2 rounded-full text-xs font-semibold flex items-center justify-center gap-1 transition-all",
                  activeTab === "desktop"
                    ? "bg-card text-foreground shadow-xs font-bold"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Laptop className="size-3.5" /> Mac / PC
              </button>
            </div>

            {/* Tab content */}
            <div className="mt-4 p-4 rounded-2xl bg-secondary/50 border border-border/70 text-xs text-muted-foreground leading-relaxed">
              {activeTab === "ios" && (
                <ol className="list-decimal space-y-2.5 pl-4">
                  <li>
                    Open <span className="font-semibold text-foreground">Syllaboss</span> in the <span className="font-semibold text-foreground">Safari browser</span> on your iPhone or iPad.
                  </li>
                  <li>
                    Tap the <Share className="inline size-3.5 text-primary" /> <span className="font-semibold text-foreground">Share button</span> at the bottom of the screen.
                  </li>
                  <li>
                    Scroll down and tap <span className="font-semibold text-foreground">"Add to Home Screen"</span>.
                  </li>
                  <li>
                    Tap <span className="font-semibold text-foreground">Add</span> in the top-right corner. The app icon will appear directly on your home screen!
                  </li>
                </ol>
              )}

              {activeTab === "android" && (
                <ol className="list-decimal space-y-2.5 pl-4">
                  <li>
                    Open this page in <span className="font-semibold text-foreground">Google Chrome</span> or your default Android browser.
                  </li>
                  <li>
                    Tap the <span className="font-semibold text-foreground">three dots (⋮)</span> menu icon in the top right.
                  </li>
                  <li>
                    Select <span className="font-semibold text-foreground">"Install app"</span> or <span className="font-semibold text-foreground">"Add to Home screen"</span>.
                  </li>
                  <li>
                    Confirm install. The Syllaboss app will download to your app drawer and home screen instantly!
                  </li>
                </ol>
              )}

              {activeTab === "desktop" && (
                <ol className="list-decimal space-y-2.5 pl-4">
                  <li>
                    Open this page on your <span className="font-semibold text-foreground">MacBook or Windows PC</span> in Google Chrome, Microsoft Edge, or Safari.
                  </li>
                  <li>
                    Look at the right side of the address bar at the top of the browser for the <span className="font-semibold text-foreground">Install App</span> icon (computer with down arrow).
                  </li>
                  <li>
                    Click <span className="font-semibold text-foreground">"Install"</span> to place the Syllaboss desktop app in your Applications or Start Menu!
                  </li>
                </ol>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-border/80 flex items-center justify-between">
              <span className="text-[11px] text-muted-foreground">No app store download required</span>
              <Button
                variant="outline"
                size="sm"
                className="rounded-full text-xs h-8"
                onClick={() => setHelp(false)}
              >
                Got it
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
