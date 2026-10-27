import {
  Download,
  Share,
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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
        icon: <Check className="size-4 text-brand" />,
      });
      navigate({ to: "/dashboard" });
      return;
    }

    if (canPrompt && platform !== "android") {
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
      ? "Download Android app"
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
          <Check className="size-4.5 shrink-0 text-brand" />
        ) : platform === "android" ? (
          <AndroidOutlineIcon className="size-4.5 shrink-0" />
        ) : platform === "windows" ? (
          <WindowsOutlineIcon className="size-4.5 shrink-0" />
        ) : platform === "ios" ? (
          <AppleOutlineIcon className="size-4.5 shrink-0" />
        ) : (
          <Download className="size-4.5 shrink-0" />
        )}
        {label ? (
          <span>{label}</span>
        ) : (
          <>
            <span className="sm:hidden">{installed ? "Open App" : "Install App"}</span>
            <span className="hidden sm:inline">{displayLabel}</span>
          </>
        )}
      </Button>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg p-4 sm:p-6">
          <div className="w-full text-card-foreground">
            <div className="flex items-start justify-between pb-3 border-b border-border/80">
              <DialogHeader className="text-left">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-brand/10 text-brand dark:text-brand text-[10px] font-bold mb-1">
                  <Sparkles className="size-3" />
                  <span>Syllaboss on your device</span>
                </div>
                <DialogTitle className="font-display text-xl font-medium text-foreground sm:text-2xl">
                  Install Syllaboss
                </DialogTitle>
                <DialogDescription className="mt-1 text-sm text-muted-foreground">
                  {activeTab === "android" ? "Download the Android app and open your study space from your app drawer." : "Open Syllaboss from your home screen."} An internet connection is required.
                </DialogDescription>
              </DialogHeader>
            </div>

            {/* Platform selector */}
            <div className="mt-4 grid grid-cols-2 gap-1 rounded-2xl bg-secondary p-1 sm:grid-cols-4">
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
                <AndroidOutlineIcon className="size-4 text-brand" />
                <span>Android</span>
                <span className="text-[9px] font-mono opacity-70">APK download</span>
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
                <AppleOutlineIcon className="size-4 text-brass-ink" />
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
                <WindowsOutlineIcon className="size-4 text-brand" />
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
                        <AndroidOutlineIcon className="size-4 text-brand" />
                        Syllaboss for Android
                      </h4>
                      <p className="text-[11px] text-muted-foreground">Android 7.0 or later · Chrome or a compatible browser</p>
                    </div>
                    <span className="px-2 py-0.5 rounded-md bg-accent text-forest font-bold text-[10px]">
                      Signed APK
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-card border border-border/80 space-y-2">
                    <p className="text-[11px] font-semibold text-foreground">
                      Install the Android app:
                    </p>
                    <ol className="list-decimal pl-4 text-[11px] space-y-1.5 text-foreground/80">
                      <li>
                        Tap <strong>Download APK</strong> below.
                      </li>
                      <li>
                        Open <strong>syllaboss.apk</strong> from your downloads.
                      </li>
                      <li>
                        Follow Android’s installation prompt, then open <strong>Syllaboss</strong>. Your study space stays up to date online.
                      </li>
                    </ol>
                  </div>

                  <Button
                    asChild
                    className="w-full h-11 rounded-xl bg-brand hover:bg-brand/90 text-white font-bold gap-2 text-sm shadow-sm"
                  >
                    <a href="/downloads/syllaboss.apk?v=1.0.0" download="syllaboss.apk"><Download className="size-4" /><span>Download APK · 3.6 MB</span></a>
                  </Button>
                </div>
              )}

              {activeTab === "ios" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-foreground text-sm flex items-center gap-1.5">
                        <AppleOutlineIcon className="size-4 text-brass-ink" />
                        Apple iPhone & iPad (iOS)
                      </h4>
                      <p className="text-[11px] text-muted-foreground">Add directly to your iOS Home Screen via Safari.</p>
                    </div>
                    <span className="px-2 py-0.5 rounded-md bg-brass-soft dark:bg-brass-ink text-brass-ink dark:text-brass font-medium text-[10px]">
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
                      <li>Tap <strong className="text-foreground">Add</strong> in the top-right corner. Open Syllaboss from the new home-screen icon.</li>
                    </ol>
                  </div>

                  <Button
                    className="w-full h-11 rounded-xl bg-forest hover:bg-forest/90 text-white font-bold gap-2 text-sm shadow-sm"
                    onClick={() => {
                      window.location.href = "/dashboard";
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
                        <WindowsOutlineIcon className="size-4 text-brand" />
                        Windows 10 & 11 PWA
                      </h4>
                      <p className="text-[11px] text-muted-foreground">Chrome or Microsoft Edge desktop app.</p>
                    </div>
                    <span className="px-2 py-0.5 rounded-md bg-accent text-forest font-bold text-[10px]">
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
                        Confirm if your browser asks, then open Syllaboss from the new app shortcut.
                      </li>
                    </ol>
                  </div>

                  <Button
                    className="w-full h-11 rounded-xl bg-brand hover:bg-brand/90 text-white font-bold gap-2 text-sm shadow-sm"
                    onClick={() => {
                      if (canPrompt) {
                        install();
                      } else {
                        window.location.href = "/dashboard";
                      }
                      setModalOpen(false);
                    }}
                  >
                    <span>{canPrompt ? "Install now" : "Open Syllaboss"}</span>
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
                        Open Syllaboss from the new Dock item. An internet connection is required.
                      </li>
                    </ol>
                  </div>

                  <Button
                    className="w-full h-11 rounded-xl bg-forest hover:bg-forest/90 text-white font-bold gap-2 text-sm shadow-sm"
                    onClick={() => {
                      window.location.href = "/dashboard";
                      setModalOpen(false);
                    }}
                  >
                    <span>Open Syllaboss</span>
                    <ArrowRight className="size-4" />
                  </Button>
                </div>
              )}
            </div>

            <div className="mt-4 flex items-center justify-between text-[11px] text-muted-foreground pt-3 border-t border-border/60">
              <span>{activeTab === "android" ? "Direct download from syllaboss.org" : "No app-store download is needed"}</span>
              <button type="button" onClick={() => setModalOpen(false)} className="min-h-11 font-bold text-forest hover:underline">
                Stay in browser <ArrowRight aria-hidden="true" className="ml-1 inline size-3.5" />
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

