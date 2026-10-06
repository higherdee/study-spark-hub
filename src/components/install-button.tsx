import {
  Download,
  Share,
  X,
  Smartphone,
  Laptop,
  Monitor,
  Terminal,
  ChevronDown,
  Check,
  Sparkles,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useInstall } from "@/hooks/use-install";
import { cn } from "@/lib/utils";

type PlatformType = "android" | "windows" | "linux" | "ios" | "mac";

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
  const { canPrompt, install } = useInstall();
  const [platform, setPlatform] = useState<PlatformType>("android");
  const [modalOpen, setModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<PlatformType>("android");

  // Detect platform on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    const ua = navigator.userAgent.toLowerCase();

    if (/iphone|ipad|ipod/.test(ua)) {
      setPlatform("ios");
      setActiveTab("ios");
    } else if (/android/.test(ua)) {
      setPlatform("android");
      setActiveTab("android");
    } else if (/win/.test(ua)) {
      setPlatform("windows");
      setActiveTab("windows");
    } else if (/macintosh|mac os x/.test(ua)) {
      setPlatform("mac");
      setActiveTab("mac");
    } else if (/linux/.test(ua)) {
      setPlatform("linux");
      setActiveTab("linux");
    }
  }, []);

  function triggerDownload(target: PlatformType) {
    if (target === "android") {
      toast.success("Downloading Syllaboss for Android (.APK)...", {
        description: "Open the file when finished to install on your device.",
      });
      const link = document.createElement("a");
      link.href = "/downloads/syllaboss.apk";
      link.download = "Syllaboss.apk";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else if (target === "windows") {
      toast.success("Downloading Syllaboss for Windows (.EXE)...", {
        description: "Run the setup installer once downloaded.",
      });
      const link = document.createElement("a");
      link.href = "/downloads/syllaboss-setup.exe";
      link.download = "Syllaboss-Setup.exe";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else if (target === "linux") {
      toast.success("Downloading Syllaboss for Linux (.AppImage)...", {
        description: "Make executable (chmod +x) and run.",
      });
      const link = document.createElement("a");
      link.href = "/downloads/syllaboss.AppImage";
      link.download = "Syllaboss.AppImage";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else if (target === "mac") {
      if (canPrompt) {
        install().then((ok) => {
          if (ok) toast.success("Syllaboss added to your Mac apps!");
        });
      } else {
        setActiveTab("mac");
        setModalOpen(true);
      }
    } else if (target === "ios") {
      setActiveTab("ios");
      setModalOpen(true);
    }
  }

  function handleMainClick() {
    triggerDownload(platform);
  }

  // Derive dynamic label according to user platform if no custom label passed
  const displayLabel =
    label ||
    (platform === "android"
      ? "Download for Android (.APK)"
      : platform === "windows"
      ? "Download for Windows (.EXE)"
      : platform === "linux"
      ? "Download for Linux (.AppImage)"
      : platform === "ios"
      ? "Install on iPhone / iPad"
      : "Install on Mac (App)");

  return (
    <>
      <div className="inline-flex items-center gap-1">
        <Button
          variant={variant}
          size={size}
          className={cn("gap-2 font-semibold shadow-xs", className)}
          onClick={handleMainClick}
        >
          {platform === "android" || platform === "ios" ? (
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
            onClick={() => setModalOpen(true)}
            title="Download for another platform"
            aria-label="Choose platform"
          >
            <ChevronDown className="size-4" />
          </Button>
        )}
      </div>

      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-xs p-3 sm:p-4 animate-fade-in"
          onClick={() => setModalOpen(false)}
        >
          <div
            className="w-full max-w-lg rounded-3xl border border-border bg-card p-6 shadow-2xl animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between pb-3 border-b border-border/80">
              <div>
                <h2 className="font-display text-xl sm:text-2xl font-bold text-foreground">
                  Download Syllaboss
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Pick your device format to install or download directly.
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
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5 p-1 rounded-2xl bg-secondary mt-4">
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
                <Smartphone className="size-4" />
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
                <Monitor className="size-4" />
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
                <Smartphone className="size-4" />
                <span>iPhone / iPad</span>
                <span className="text-[9px] font-mono opacity-70">Apple PWA</span>
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
                <Laptop className="size-4" />
                <span>MacBook</span>
                <span className="text-[9px] font-mono opacity-70">Apple App</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("linux")}
                className={cn(
                  "py-2 px-2 rounded-xl text-xs font-semibold flex flex-col items-center justify-center gap-1 transition-all",
                  activeTab === "linux"
                    ? "bg-card text-foreground shadow-xs font-bold"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Terminal className="size-4" />
                <span>Linux</span>
                <span className="text-[9px] font-mono opacity-70">.AppImage</span>
              </button>
            </div>

            {/* Platform Details Card */}
            <div className="mt-4 p-4.5 rounded-2xl bg-secondary/50 border border-border/70 text-xs text-muted-foreground leading-relaxed">
              {activeTab === "android" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-foreground text-sm">Android APK Package</h4>
                      <p className="text-[11px] text-muted-foreground">Direct installation for Samsung, Pixel, Xiaomi, Tecno, Infinix, etc.</p>
                    </div>
                    <span className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-mono text-[10px] font-bold">
                      .APK
                    </span>
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    Downloads <code className="px-1.5 py-0.5 rounded bg-muted text-foreground font-mono">Syllaboss.apk</code> directly. When the download finishes, tap Open in your notifications or Downloads folder to install.
                  </p>
                  <Button
                    className="w-full h-10 rounded-xl bg-primary text-primary-foreground font-bold gap-2"
                    onClick={() => {
                      triggerDownload("android");
                      setModalOpen(false);
                    }}
                  >
                    <Download className="size-4" />
                    Download Syllaboss.apk Now
                  </Button>
                </div>
              )}

              {activeTab === "windows" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-foreground text-sm">Windows Setup Installer</h4>
                      <p className="text-[11px] text-muted-foreground">64-bit installer for Windows 10 & Windows 11 PCs and laptops.</p>
                    </div>
                    <span className="px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-mono text-[10px] font-bold">
                      .EXE
                    </span>
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    Downloads <code className="px-1.5 py-0.5 rounded bg-muted text-foreground font-mono">Syllaboss-Setup.exe</code>. Double-click to install and add Syllaboss to your Desktop and Start Menu.
                  </p>
                  <Button
                    className="w-full h-10 rounded-xl bg-primary text-primary-foreground font-bold gap-2"
                    onClick={() => {
                      triggerDownload("windows");
                      setModalOpen(false);
                    }}
                  >
                    <Download className="size-4" />
                    Download Syllaboss-Setup.exe
                  </Button>
                </div>
              )}

              {activeTab === "ios" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-foreground text-sm">Apple iPhone & iPad</h4>
                      <p className="text-[11px] text-muted-foreground">Install directly via Safari without App Store approval.</p>
                    </div>
                    <span className="px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 font-mono text-[10px] font-bold">
                      iOS PWA
                    </span>
                  </div>
                  <ol className="list-decimal space-y-2 pl-4 text-[11px]">
                    <li>Open this page in the <strong className="text-foreground">Safari browser</strong>.</li>
                    <li>Tap the <Share className="inline size-3.5 text-primary" /> <strong className="text-foreground">Share button</strong> at the bottom of the screen.</li>
                    <li>Scroll down and tap <strong className="text-foreground">"Add to Home Screen"</strong>.</li>
                    <li>Tap <strong className="text-foreground">Add</strong> in the top-right corner. The app icon will appear directly on your home screen!</li>
                  </ol>
                  <Button
                    variant="outline"
                    className="w-full h-10 rounded-xl font-bold"
                    onClick={() => setModalOpen(false)}
                  >
                    Got It
                  </Button>
                </div>
              )}

              {activeTab === "mac" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-foreground text-sm">Apple MacBook & iMac</h4>
                      <p className="text-[11px] text-muted-foreground">Instant desktop app on macOS Sonoma, Ventura, or Chrome.</p>
                    </div>
                    <span className="px-2 py-0.5 rounded-md bg-stone-200 dark:bg-stone-800 text-stone-800 dark:text-stone-200 font-mono text-[10px] font-bold">
                      macOS App
                    </span>
                  </div>
                  <ol className="list-decimal space-y-2 pl-4 text-[11px]">
                    <li>In Safari on Mac: Click <strong className="text-foreground">File &rarr; Add to Dock</strong>.</li>
                    <li>In Chrome on Mac: Click the <strong className="text-foreground">Install icon</strong> in the address bar.</li>
                    <li>Syllaboss will run as a standalone desktop window in your Mac Dock!</li>
                  </ol>
                  <Button
                    className="w-full h-10 rounded-xl bg-primary text-primary-foreground font-bold gap-2"
                    onClick={() => {
                      triggerDownload("mac");
                      setModalOpen(false);
                    }}
                  >
                    Install on Mac
                  </Button>
                </div>
              )}

              {activeTab === "linux" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-foreground text-sm">Linux AppImage</h4>
                      <p className="text-[11px] text-muted-foreground">Universal standalone binary for Ubuntu, Fedora, Arch, Debian.</p>
                    </div>
                    <span className="px-2 py-0.5 rounded-md bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-mono text-[10px] font-bold">
                      .AppImage
                    </span>
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    Downloads <code className="px-1.5 py-0.5 rounded bg-muted text-foreground font-mono">Syllaboss.AppImage</code>. Run <code className="px-1.5 py-0.5 rounded bg-muted text-foreground font-mono">chmod +x Syllaboss.AppImage</code> to launch.
                  </p>
                  <Button
                    className="w-full h-10 rounded-xl bg-primary text-primary-foreground font-bold gap-2"
                    onClick={() => {
                      triggerDownload("linux");
                      setModalOpen(false);
                    }}
                  >
                    <Download className="size-4" />
                    Download Syllaboss.AppImage
                  </Button>
                </div>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-border/80 flex items-center justify-between">
              <span className="text-[11px] text-muted-foreground">Direct downloads · No App Store account needed</span>
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
