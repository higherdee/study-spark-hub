import {
  Download,
  Share,
  X,
  Smartphone,
  Laptop,
  Monitor,
  ChevronDown,
  Check,
  Sparkles,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useInstall, type DevicePlatform } from "@/hooks/use-install";
import { cn } from "@/lib/utils";

export function InstallButton({
  variant = "default",
  size = "default",
  className,
  label,
  showDropdown = false,
}: {
  variant?: "outline" | "default" | "secondary" | "ghost";
  size?: "sm" | "lg" | "default";
  className?: string;
  label?: string;
  showDropdown?: boolean;
}) {
  const { installed, platform } = useInstall();
  const [modalOpen, setModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<DevicePlatform>(platform);
  const navigate = useNavigate();

  useEffect(() => {
    setActiveTab(platform);
  }, [platform]);

  function triggerDownload(target: "windows" | "android" | "linux") {
    if (target === "windows") {
      toast.success("Downloading Syllaboss for Windows (.EXE)...", {
        description: "Run Syllaboss-Setup.exe once downloaded to install.",
      });
      const link = document.createElement("a");
      link.href = "/downloads/syllaboss-setup.exe";
      link.download = "Syllaboss-Setup.exe";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else if (target === "android") {
      toast.success("Downloading Syllaboss APK...", {
        description: "Tap the downloaded Syllaboss.apk file to install on your phone.",
      });
      // Direct anchor download
      const link = document.createElement("a");
      link.href = "/downloads/syllaboss.apk";
      link.download = "Syllaboss.apk";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      // Fallback navigation ensures all mobile browsers (Chrome, Samsung Internet, Firefox) initiate download
      setTimeout(() => {
        window.location.assign("/downloads/syllaboss.apk");
      }, 100);
    } else if (target === "linux") {
      toast.success("Downloading Syllaboss for Linux (.AppImage)...");
      const link = document.createElement("a");
      link.href = "/downloads/syllaboss.AppImage";
      link.download = "Syllaboss.AppImage";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }

  async function handleMainClick() {
    if (installed) {
      toast.success("Syllaboss is installed! Opening dashboard...", {
        icon: <Check className="size-4 text-emerald-500" />,
      });
      navigate({ to: "/dashboard" });
      return;
    }

    // Android: Instant direct APK download
    if (platform === "android") {
      triggerDownload("android");
      return;
    }

    // Windows: Instant direct setup executable download
    if (platform === "windows") {
      triggerDownload("windows");
      return;
    }

    // Linux: Instant direct AppImage download
    if (platform === "linux") {
      triggerDownload("linux");
      return;
    }

    // iOS & Mac: Open device-specific installation guide
    setActiveTab(platform);
    setModalOpen(true);
  }

  // Derive dynamic label according to user platform & installed state
  const displayLabel =
    label ||
    (installed
      ? "Open Syllaboss App"
      : platform === "windows"
      ? "Download for Windows (.EXE)"
      : platform === "android"
      ? "Download for Android (.APK)"
      : platform === "linux"
      ? "Download for Linux (.AppImage)"
      : platform === "ios"
      ? "Install on iPhone / iPad"
      : platform === "mac"
      ? "Install on Mac"
      : "Download Syllaboss App");

  return (
    <>
      <div className="inline-flex items-center gap-1">
        <Button
          variant={variant}
          size={size}
          className={cn("gap-2 font-semibold shadow-xs transition-all", className)}
          onClick={handleMainClick}
        >
          {installed ? (
            <Check className="size-4.5 shrink-0 text-emerald-400" />
          ) : platform === "android" || platform === "ios" ? (
            <Smartphone className="size-4.5 shrink-0" />
          ) : platform === "windows" || platform === "mac" ? (
            <Laptop className="size-4.5 shrink-0" />
          ) : (
            <Download className="size-4.5 shrink-0" />
          )}
          <span>{displayLabel}</span>
        </Button>

        {showDropdown && (
          <Button
            variant={variant}
            size={size}
            className={cn("px-2.5 shadow-xs", className)}
            onClick={() => {
              setActiveTab(platform);
              setModalOpen(true);
            }}
            title="Choose platform"
            aria-label="Choose platform"
          >
            <ChevronDown className="size-4" />
          </Button>
        )}
      </div>

      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 animate-fade-in"
          onClick={() => setModalOpen(false)}
        >
          <div
            className="w-full max-w-lg rounded-3xl border border-border bg-card p-6 shadow-2xl animate-scale-in text-card-foreground"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between pb-3 border-b border-border/80">
              <div>
                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold mb-1">
                  <Sparkles className="size-3" />
                  <span>Available on all devices</span>
                </div>
                <h2 className="font-display text-xl sm:text-2xl font-bold text-foreground">
                  Get Syllaboss App
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Select your operating system to download or install.
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
                  "py-2 px-2 rounded-xl text-xs font-semibold flex flex-col items-center justify-center gap-1 transition-all",
                  activeTab === "android"
                    ? "bg-card text-foreground shadow-xs font-bold"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Smartphone className="size-4 text-emerald-600" />
                <span>Android</span>
                <span className="text-[9px] font-mono opacity-70">.APK</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("windows")}
                className={cn(
                  "py-2 px-2 rounded-xl text-xs font-semibold flex flex-col items-center justify-center gap-1 transition-all",
                  activeTab === "windows"
                    ? "bg-card text-foreground shadow-xs font-bold"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Monitor className="size-4 text-blue-600" />
                <span>Windows</span>
                <span className="text-[9px] font-mono opacity-70">.EXE</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("ios")}
                className={cn(
                  "py-2 px-2 rounded-xl text-xs font-semibold flex flex-col items-center justify-center gap-1 transition-all",
                  activeTab === "ios"
                    ? "bg-card text-foreground shadow-xs font-bold"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Smartphone className="size-4 text-amber-600" />
                <span>iPhone / iPad</span>
                <span className="text-[9px] font-mono opacity-70">iOS</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("mac")}
                className={cn(
                  "py-2 px-2 rounded-xl text-xs font-semibold flex flex-col items-center justify-center gap-1 transition-all",
                  activeTab === "mac"
                    ? "bg-card text-foreground shadow-xs font-bold"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Laptop className="size-4 text-stone-600" />
                <span>Mac</span>
                <span className="text-[9px] font-mono opacity-70">macOS</span>
              </button>
            </div>

            {/* Platform Details Card */}
            <div className="mt-4 p-4.5 rounded-2xl bg-secondary/50 border border-border/70 text-xs text-muted-foreground leading-relaxed">
              {activeTab === "android" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-foreground text-sm">Android App (.APK)</h4>
                      <p className="text-[11px] text-muted-foreground">For Samsung, Xiaomi, Tecno, Infinix, Pixel, Redmi, etc.</p>
                    </div>
                    <span className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold text-[10px]">
                      .APK
                    </span>
                  </div>

                  <Button
                    className="w-full h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2 text-sm shadow-sm"
                    onClick={() => {
                      triggerDownload("android");
                      setModalOpen(false);
                    }}
                  >
                    <Download className="size-4.5" />
                    Download Syllaboss.apk (Android)
                  </Button>

                  <div className="p-3 rounded-xl bg-card border border-border/80 space-y-2">
                    <p className="text-[11px] font-semibold text-foreground">
                      How to install on Android:
                    </p>
                    <ol className="list-decimal pl-4 text-[11px] space-y-1.5 text-foreground/80">
                      <li>
                        Tap <strong>Download Syllaboss.apk</strong> above.
                      </li>
                      <li>
                        Open the downloaded file from your browser downloads or notification bar.
                      </li>
                      <li>
                        Tap <strong>Install</strong> (allow install from this source if prompted).
                      </li>
                      <li>
                        Syllaboss will appear directly in your app drawer and home screen!
                      </li>
                    </ol>
                  </div>
                </div>
              )}

              {activeTab === "windows" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-foreground text-sm">Windows Setup Installer</h4>
                      <p className="text-[11px] text-muted-foreground">Standalone 64-bit installer for Windows 10 & 11.</p>
                    </div>
                    <span className="px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold text-[10px]">
                      .EXE
                    </span>
                  </div>

                  <Button
                    className="w-full h-11 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold gap-2 text-sm shadow-sm"
                    onClick={() => {
                      triggerDownload("windows");
                      setModalOpen(false);
                    }}
                  >
                    <Download className="size-4.5" />
                    Download Syllaboss-Setup.exe (Windows 10/11)
                  </Button>

                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Downloads <code className="px-1.5 py-0.5 rounded bg-muted text-foreground font-mono">Syllaboss-Setup.exe</code>. Run the file once to create Desktop and Start Menu shortcuts and launch Syllaboss in a dedicated window.
                  </p>
                </div>
              )}

              {activeTab === "ios" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-foreground text-sm">Apple iPhone & iPad</h4>
                      <p className="text-[11px] text-muted-foreground">Add directly to your iOS Home Screen via Safari.</p>
                    </div>
                    <span className="px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 font-medium text-[10px]">
                      iOS Home Screen
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-card border border-border/80 space-y-2">
                    <ol className="list-decimal space-y-2 pl-4 text-[11px] text-foreground/80">
                      <li>
                        Open this page in the <strong className="text-foreground">Safari browser</strong>.
                      </li>
                      <li>
                        Tap the <Share className="inline size-3.5 text-primary" /> <strong className="text-foreground">Share button</strong> at the bottom of Safari.
                      </li>
                      <li>
                        Scroll down and tap <strong className="text-foreground">"Add to Home Screen"</strong>.
                      </li>
                      <li>
                        Tap <strong className="text-foreground">Add</strong> in the top-right corner. The app icon appears directly on your home screen!
                      </li>
                    </ol>
                  </div>
                </div>
              )}

              {activeTab === "mac" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-foreground text-sm">Apple MacBook & iMac</h4>
                      <p className="text-[11px] text-muted-foreground">Instant macOS desktop app.</p>
                    </div>
                    <span className="px-2 py-0.5 rounded-md bg-stone-200 dark:bg-stone-800 text-stone-800 dark:text-stone-200 font-medium text-[10px]">
                      macOS App
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-card border border-border/80 space-y-2">
                    <ol className="list-decimal space-y-2 pl-4 text-[11px] text-foreground/80">
                      <li>
                        In Safari: Click <strong className="text-foreground">File &rarr; Add to Dock</strong>.
                      </li>
                      <li>
                        In Chrome on Mac: Click the <strong className="text-foreground">Install icon</strong> in the address bar.
                      </li>
                      <li>
                        Syllaboss will run as a standalone desktop window from your Mac Dock!
                      </li>
                    </ol>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-border/80 flex items-center justify-between">
              <span className="text-[11px] text-muted-foreground">
                No App Store account needed · Free forever
              </span>
              <Button
                variant="outline"
                size="sm"
                className="rounded-full text-xs h-8"
                onClick={() => setModalOpen(false)}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
