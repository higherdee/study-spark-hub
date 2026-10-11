import {
  Download,
  Share,
  X,
  Check,
  Sparkles,
  Laptop,
  ArrowRight,
  Monitor,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useInstall, type DevicePlatform } from "@/hooks/use-install";
import { cn } from "@/lib/utils";
import {
  WindowsOutlineIcon,
  AndroidOutlineIcon,
  AppleOutlineIcon,
} from "@/components/device-icons";

export function InstallButton({
  variant = "default",
  size = "default",
  className,
  label,
}: {
  variant?: "outline" | "default" | "secondary" | "ghost";
  size?: "sm" | "lg" | "default";
  className?: string;
  label?: string;
  showDropdown?: boolean;
}) {
  const { installed, platform, canPrompt, install } = useInstall();
  const [modalOpen, setModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<DevicePlatform>(platform);
  const navigate = useNavigate();

  useEffect(() => {
    setActiveTab(platform);
  }, [platform]);

  async function handleMainClick() {
    if (installed) {
      toast.success("Opening Syllaboss...", {
        icon: <Check className="size-4 text-emerald-500" />,
      });
      navigate({ to: "/dashboard" });
      return;
    }

    if (canPrompt) {
      try {
        const success = await install();
        if (success) {
          toast.success("Syllaboss installed successfully!");
          return;
        }
      } catch (e) {
        console.warn("PWA install prompt error:", e);
      }
    }

    // Open clean PWA installation modal for device-specific instructions
    setActiveTab(platform);
    setModalOpen(true);
  }

  // Derive dynamic label according to user platform & installed state
  const displayLabel =
    label ||
    (installed
      ? "Open Syllaboss App"
      : platform === "ios"
      ? "Install on iPhone / iPad"
      : platform === "android"
      ? "Install Web App"
      : platform === "windows"
      ? "Install for Windows"
      : platform === "mac"
      ? "Install on Mac"
      : "Install Web App (PWA)");

  return (
    <>
      <Button
        variant={variant}
        size={size}
        className={cn("gap-2 font-semibold shadow-xs transition-all active:scale-[0.98]", className)}
        onClick={handleMainClick}
      >
        {installed ? (
          <Check className="size-4.5 shrink-0 text-emerald-400" />
        ) : platform === "android" ? (
          <AndroidOutlineIcon className="size-4.5 shrink-0" />
        ) : platform === "windows" ? (
          <WindowsOutlineIcon className="size-4.5 shrink-0" />
        ) : platform === "ios" ? (
          <AppleOutlineIcon className="size-4.5 shrink-0" />
        ) : (
          <Download className="size-4.5 shrink-0" />
        )}
        <span>{displayLabel}</span>
      </Button>

      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-md p-3 sm:p-4 animate-fade-in"
          onClick={() => setModalOpen(false)}
        >
          <div
            className="w-full max-w-lg rounded-3xl border border-border bg-card p-6 shadow-2xl animate-scale-in text-card-foreground"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between pb-3 border-b border-border/80">
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold mb-1">
                  <Sparkles className="size-3" />
                  <span>Ultra-Clean PWA · Zero Friction</span>
                </div>
                <h2 className="font-display text-xl sm:text-2xl font-bold text-foreground">
                  Install Syllaboss
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Instant offline access, automated updates, and zero app store clutter.
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full size-8"
                aria-label="Close"
                onClick={() => setModalOpen(false)}
              >
                <X className="size-4" />
              </Button>
            </div>

            {/* Platform selector grid / tabs */}
            <div className="grid grid-cols-4 gap-1 p-1 rounded-2xl bg-secondary mt-4">
              <button
                type="button"
                onClick={() => setActiveTab("android")}
                className={cn(
                  "py-2.5 px-2 rounded-xl text-xs font-semibold flex flex-col items-center justify-center gap-1 transition-all",
                  activeTab === "android"
                    ? "bg-card text-foreground shadow-xs font-bold"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <AndroidOutlineIcon className="size-4 text-emerald-600" />
                <span>Android</span>
                <span className="text-[9px] font-mono opacity-70">Chrome PWA</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("ios")}
                className={cn(
                  "py-2.5 px-2 rounded-xl text-xs font-semibold flex flex-col items-center justify-center gap-1 transition-all",
                  activeTab === "ios"
                    ? "bg-card text-foreground shadow-xs font-bold"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <AppleOutlineIcon className="size-4 text-amber-600" />
                <span>iPhone / iPad</span>
                <span className="text-[9px] font-mono opacity-70">Safari PWA</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("windows")}
                className={cn(
                  "py-2.5 px-2 rounded-xl text-xs font-semibold flex flex-col items-center justify-center gap-1 transition-all",
                  activeTab === "windows"
                    ? "bg-card text-foreground shadow-xs font-bold"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <WindowsOutlineIcon className="size-4 text-blue-600" />
                <span>Windows</span>
                <span className="text-[9px] font-mono opacity-70">Desktop PWA</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("mac")}
                className={cn(
                  "py-2.5 px-2 rounded-xl text-xs font-semibold flex flex-col items-center justify-center gap-1 transition-all",
                  activeTab === "mac"
                    ? "bg-card text-foreground shadow-xs font-bold"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Laptop className="size-4 text-stone-600" />
                <span>Mac</span>
                <span className="text-[9px] font-mono opacity-70">macOS PWA</span>
              </button>
            </div>

            {/* Platform Details Card */}
            <div className="mt-4 p-4.5 rounded-2xl bg-secondary/50 border border-border/70 text-xs text-muted-foreground leading-relaxed">
              {activeTab === "android" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-foreground text-sm flex items-center gap-1.5">
                        <AndroidOutlineIcon className="size-4 text-emerald-600" />
                        Android Progressive Web App
                      </h4>
                      <p className="text-[11px] text-muted-foreground">Samsung, Xiaomi, Tecno, Infinix, Pixel, Redmi, etc.</p>
                    </div>
                    <span className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold text-[10px]">
                      Instant PWA
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-card border border-border/80 space-y-2">
                    <p className="text-[11px] font-semibold text-foreground">
                      How to install on Android in 2 taps:
                    </p>
                    <ol className="list-decimal pl-4 text-[11px] space-y-1.5 text-foreground/80">
                      <li>
                        Tap the browser menu (<strong>⋮</strong> three dots in Chrome or Brave).
                      </li>
                      <li>
                        Select <strong>"Install App"</strong> or <strong>"Add to Home screen"</strong>.
                      </li>
                      <li>
                        Confirm <strong>Install</strong>. Syllaboss launches instantly from your app drawer like a native app!
                      </li>
                    </ol>
                  </div>

                  <Button
                    className="w-full h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2 text-sm shadow-sm"
                    onClick={() => {
                      if (canPrompt) {
                        install();
                      } else {
                        navigate({ to: "/dashboard" });
                      }
                      setModalOpen(false);
                    }}
                  >
                    <span>Launch Web App Now</span>
                    <ArrowRight className="size-4" />
                  </Button>
                </div>
              )}

              {activeTab === "ios" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-foreground text-sm flex items-center gap-1.5">
                        <AppleOutlineIcon className="size-4 text-amber-600" />
                        Apple iPhone & iPad (iOS)
                      </h4>
                      <p className="text-[11px] text-muted-foreground">Add directly to your iOS Home Screen via Safari.</p>
                    </div>
                    <span className="px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 font-medium text-[10px]">
                      iOS Home Screen
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-card border border-border/80 space-y-2">
                    <ol className="list-decimal space-y-2 pl-4 text-[11px] text-foreground/80">
                      <li>
                        Open this page in the <strong className="text-foreground">Safari browser</strong>.
                      </li>
                      <li>
                        Tap the <Share className="inline size-3.5 text-primary" /> <strong className="text-foreground">Share icon</strong> at the bottom of Safari.
                      </li>
                      <li>
                        Scroll down and tap <strong className="text-foreground">"Add to Home Screen"</strong>.
                      </li>
                      <li>
                        Tap <strong className="text-foreground">Add</strong> in the top-right corner. Launches fullscreen with 120Hz native smoothness!
                      </li>
                    </ol>
                  </div>

                  <Button
                    className="w-full h-11 rounded-xl bg-neutral-900 hover:bg-black text-white font-bold gap-2 text-sm shadow-sm"
                    onClick={() => {
                      navigate({ to: "/dashboard" });
                      setModalOpen(false);
                    }}
                  >
                    <span>Open Web Dashboard</span>
                    <ArrowRight className="size-4" />
                  </Button>
                </div>
              )}

              {activeTab === "windows" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-foreground text-sm flex items-center gap-1.5">
                        <WindowsOutlineIcon className="size-4 text-blue-600" />
                        Windows 10 & 11 PWA
                      </h4>
                      <p className="text-[11px] text-muted-foreground">Chrome or Microsoft Edge desktop app.</p>
                    </div>
                    <span className="px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold text-[10px]">
                      Desktop PWA
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-card border border-border/80 space-y-2">
                    <ol className="list-decimal space-y-2 pl-4 text-[11px] text-foreground/80">
                      <li>
                        In Google Chrome or Microsoft Edge, look at the right side of the address bar.
                      </li>
                      <li>
                        Click the <Monitor className="inline size-3.5 text-primary" /> <strong className="text-foreground">"Install App" icon</strong>.
                      </li>
                      <li>
                        Confirm <strong className="text-foreground">Install</strong>. A dedicated, distraction-free desktop window will open!
                      </li>
                    </ol>
                  </div>

                  <Button
                    className="w-full h-11 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold gap-2 text-sm shadow-sm"
                    onClick={() => {
                      if (canPrompt) {
                        install();
                      } else {
                        navigate({ to: "/dashboard" });
                      }
                      setModalOpen(false);
                    }}
                  >
                    <span>Launch Web App Now</span>
                    <ArrowRight className="size-4" />
                  </Button>
                </div>
              )}

              {activeTab === "mac" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-foreground text-sm flex items-center gap-1.5">
                        <Laptop className="size-4 text-stone-600" />
                        Apple MacBook & iMac
                      </h4>
                      <p className="text-[11px] text-muted-foreground">macOS Dock standalone web app.</p>
                    </div>
                    <span className="px-2 py-0.5 rounded-md bg-stone-200 dark:bg-stone-800 text-stone-800 dark:text-stone-200 font-medium text-[10px]">
                      macOS Dock
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-card border border-border/80 space-y-2">
                    <ol className="list-decimal space-y-2 pl-4 text-[11px] text-foreground/80">
                      <li>
                        In Safari on Sonoma / Sequoia: Click <strong className="text-foreground">File &rarr; Add to Dock</strong>.
                      </li>
                      <li>
                        In Chrome on Mac: Click the <strong className="text-foreground">Install icon</strong> in the address bar.
                      </li>
                      <li>
                        Syllaboss will run as an independent app straight from your Mac Dock!
                      </li>
                    </ol>
                  </div>

                  <Button
                    className="w-full h-11 rounded-xl bg-stone-800 hover:bg-black text-white font-bold gap-2 text-sm shadow-sm"
                    onClick={() => {
                      navigate({ to: "/dashboard" });
                      setModalOpen(false);
                    }}
                  >
                    <span>Launch Web App Now</span>
                    <ArrowRight className="size-4" />
                  </Button>
                </div>
              )}
            </div>

            <div className="mt-4 flex items-center justify-between text-[11px] text-muted-foreground pt-3 border-t border-border/60">
              <span>Zero downloads or installers required</span>
              <button
                type="button"
                onClick={() => {
                  setModalOpen(false);
                  navigate({ to: "/dashboard" });
                }}
                className="font-bold text-primary hover:underline"
              >
                Continue in browser &rarr;
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

