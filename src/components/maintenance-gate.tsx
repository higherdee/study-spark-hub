import React, { useState, useEffect } from "react";
import {
  ShieldCheck,
  Clock,
  Activity,
  CheckCircle2,
  Lock,
  X,
} from "lucide-react";
import { SyllabossEmblem } from "@/components/syllaboss-logo";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface MaintenanceGateProps {
  children: React.ReactNode;
}

const AUTHORIZED_PASSCODES = ["sylla2026", "syllaboss", "kunle", "boss2026"];

export function MaintenanceGate({ children }: MaintenanceGateProps) {
  const [mounted, setMounted] = useState(false);
  const [isBypassed, setIsBypassed] = useState(false);
  const [showPasscodeModal, setShowPasscodeModal] = useState(false);
  const [passcode, setPasscode] = useState("");
  const [passcodeError, setPasscodeError] = useState("");
  const [notifyEmail, setNotifyEmail] = useState("");
  const [emailNotified, setEmailNotified] = useState(false);
  const [clickCount, setClickCount] = useState(0);

  useEffect(() => {
    setMounted(true);

    if (typeof window === "undefined") return;

    // Check URL parameters
    const params = new URLSearchParams(window.location.search);
    const bypassParam = params.get("bypass")?.toLowerCase();
    const testParam = params.get("test")?.toLowerCase();

    if (bypassParam === "clear" || testParam === "clear") {
      localStorage.removeItem("syllaboss_maintenance_bypass");
      setIsBypassed(false);
      return;
    }

    if (
      (bypassParam && AUTHORIZED_PASSCODES.includes(bypassParam)) ||
      bypassParam === "dev" ||
      testParam === "true"
    ) {
      localStorage.setItem("syllaboss_maintenance_bypass", "granted");
      setIsBypassed(true);
      return;
    }

    // Check localStorage bypass
    if (localStorage.getItem("syllaboss_maintenance_bypass") === "granted") {
      setIsBypassed(true);
    }

    // Keyboard shortcut (Ctrl + Shift + S or Cmd + Shift + S) for secret admin unlock
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "s") {
        e.preventDefault();
        setShowPasscodeModal(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Server-side rendering safe fallback: render children
  if (!mounted) {
    return <>{children}</>;
  }

  const hostname = typeof window !== "undefined" ? window.location.hostname.toLowerCase() : "";
  const params = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const forceMaintenancePreview =
    params?.get("maintenance") === "preview" || params?.get("preview_maintenance") === "true";

  // Identify development and testing subdomains:
  // e.g. test.syllaboss.org, dev.syllaboss.org, staging.syllaboss.org, localhost, *.lovable.app, etc.
  const isTestSubdomain =
    hostname.startsWith("test.") ||
    hostname.startsWith("staging.") ||
    hostname.startsWith("dev.") ||
    hostname.startsWith("preview.") ||
    hostname.includes("localhost") ||
    hostname.includes("127.0.0.1") ||
    hostname.includes(".lovable.app") ||
    hostname.includes(".workers.dev") ||
    hostname.includes(".pages.dev");

  // Main production domains: syllaboss.org, www.syllaboss.org
  const isMainDomain = hostname === "syllaboss.org" || hostname === "www.syllaboss.org";

  // Maintenance is active when on main domain (or when forced for preview), unless bypassed or on test subdomain
  const shouldShowMaintenance = (forceMaintenancePreview || isMainDomain) && !isTestSubdomain && !isBypassed;

  if (!shouldShowMaintenance) {
    return <>{children}</>;
  }

  const handleVerifyPasscode = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = passcode.trim().toLowerCase();
    if (AUTHORIZED_PASSCODES.includes(clean)) {
      localStorage.setItem("syllaboss_maintenance_bypass", "granted");
      setIsBypassed(true);
      setShowPasscodeModal(false);
      toast.success("Bypass authenticated! Welcome to Syllaboss.");
    } else {
      setPasscodeError("Invalid passcode.");
    }
  };

  const handleSubscribeNotify = (e: React.FormEvent) => {
    e.preventDefault();
    if (!notifyEmail || !notifyEmail.includes("@")) {
      toast.error("Please enter a valid email address.");
      return;
    }
    setEmailNotified(true);
    toast.success("Thank you! You will be notified the moment maintenance concludes.");
    try {
      const stored = JSON.parse(localStorage.getItem("syllaboss_notify_waitlist") || "[]");
      stored.push({ email: notifyEmail, date: new Date().toISOString() });
      localStorage.setItem("syllaboss_notify_waitlist", JSON.stringify(stored));
    } catch {}
  };

  const handleLogoClick = () => {
    setClickCount((prev) => {
      const next = prev + 1;
      if (next >= 3) {
        setShowPasscodeModal(true);
        return 0;
      }
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-[#FBFDFB] text-[#14261C] flex flex-col justify-between selection:bg-[#155E38]/20 selection:text-[#0C3820]">
      {/* Top Navigation: Clean, no green container, no academic registry badge, no maintenance/staff pills */}
      <header className="border-b border-[#E3ECE6] bg-white/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div
            onClick={handleLogoClick}
            className="flex items-center gap-2.5 cursor-pointer select-none"
            title="Syllaboss"
          >
            <SyllabossEmblem className="size-8 shrink-0" />
            <span className="font-display font-bold text-lg tracking-tight text-[#0F2E1E]">
              SYLLABOSS
            </span>
          </div>
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 py-14 sm:py-20 flex flex-col items-center text-center">
        {/* Status Badge */}
        <div className="inline-flex items-center gap-2 rounded-full bg-[#EBF5EF] border border-[#CDE5D6] px-3.5 py-1 text-xs font-semibold text-[#14532D] shadow-xs mb-6">
          <Activity className="size-3.5 text-[#155E38]" />
          <span>Scheduled Infrastructure Upgrade • Engine v2.4</span>
        </div>

        {/* Hero Title */}
        <h1 className="font-display text-3xl sm:text-5xl font-bold tracking-tight text-[#0F2E1E] max-w-2xl leading-tight">
          Syllaboss is currently undergoing scheduled maintenance.
        </h1>

        {/* Progress Bar (Without estimated window text) */}
        <div className="mt-8 w-full max-w-md rounded-2xl border border-[#DDECE2] bg-white p-5 shadow-xs text-left">
          <div className="flex items-center justify-between text-xs font-semibold text-[#14532D] mb-2">
            <span className="flex items-center gap-1.5">
              <Clock className="size-3.5" /> Maintenance Progress
            </span>
            <span className="font-mono">94% Complete</span>
          </div>

          <div className="w-full bg-[#EBF3ED] rounded-full h-2 overflow-hidden">
            <div className="bg-[#14532D] h-2 rounded-full w-[94%] transition-all duration-1000" />
          </div>
        </div>

        {/* Notify Me Box */}
        <div className="mt-10 w-full max-w-lg rounded-3xl border border-[#D1E7D9] bg-gradient-to-br from-[#F0F8F3] via-white to-white p-6 shadow-sm">
          <div className="flex items-center gap-2 justify-center text-xs font-bold text-[#14532D] uppercase tracking-wider mb-1">
            <ShieldCheck className="size-4 text-[#155E38]" />
            <span>Launch Notification Dispatch</span>
          </div>
          <p className="text-xs text-[#3E5C4B]">
            Be the first to know when the maintenance window concludes and study vaults reopen.
          </p>

          {emailNotified ? (
            <div className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-[#EBF5EF] border border-[#CDE5D6] p-3 text-xs font-semibold text-[#14532D]">
              <CheckCircle2 className="size-4 text-emerald-600" />
              <span>We will email you as soon as the platform goes live.</span>
            </div>
          ) : (
            <form onSubmit={handleSubscribeNotify} className="mt-4 flex flex-col sm:flex-row gap-2">
              <input
                type="email"
                placeholder="Enter university or personal email..."
                value={notifyEmail}
                onChange={(e) => setNotifyEmail(e.target.value)}
                className="flex-1 rounded-xl border border-[#CDE5D6] bg-white px-3.5 py-2 text-xs text-[#0F2E1E] placeholder:text-[#7A9886] focus:outline-hidden focus:ring-2 focus:ring-[#14532D]"
              />
              <Button
                type="submit"
                className="rounded-xl bg-[#14532D] hover:bg-[#0F3E22] text-white text-xs font-semibold px-4 h-9 shadow-xs"
              >
                Notify Me
              </Button>
            </form>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#E3ECE6] bg-white/60 py-6 text-center text-xs text-[#6B8A78]">
        <div className="max-w-6xl mx-auto px-4 flex items-center justify-center">
          <p
            onClick={handleLogoClick}
            className="cursor-default select-none"
          >
            © {new Date().getFullYear()} Syllaboss. All rights reserved.
          </p>
        </div>
      </footer>

      {/* Secret Passcode Modal (accessible via Ctrl+Shift+S or triple-clicking logo/footer) */}
      {showPasscodeModal && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur-xs animate-fade-in"
          onClick={() => setShowPasscodeModal(false)}
        >
          <div
            className="w-full max-w-sm rounded-3xl border border-[#D1E7D9] bg-white p-6 shadow-2xl text-left"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#E3ECE6]">
              <div className="flex items-center gap-2">
                <div className="flex size-7 items-center justify-center rounded-lg bg-[#EBF5EF] text-[#14532D]">
                  <Lock className="size-3.5" />
                </div>
                <h3 className="font-display font-bold text-sm text-[#0F2E1E]">Bypass Access</h3>
              </div>
              <button
                onClick={() => setShowPasscodeModal(false)}
                className="text-[#6B8A78] hover:text-[#0F2E1E]"
              >
                <X className="size-4" />
              </button>
            </div>

            <p className="mt-3 text-xs text-[#4A6B58]">
              Enter the access passcode to unlock the live platform on this device.
            </p>

            <form onSubmit={handleVerifyPasscode} className="mt-4 space-y-3">
              <div>
                <input
                  type="password"
                  autoFocus
                  placeholder="Enter passcode..."
                  value={passcode}
                  onChange={(e) => {
                    setPasscode(e.target.value);
                    setPasscodeError("");
                  }}
                  className="w-full rounded-xl border border-[#CDE5D6] bg-white px-3.5 py-2.5 text-xs text-[#0F2E1E] placeholder:text-[#7A9886] focus:outline-hidden focus:ring-2 focus:ring-[#14532D]"
                />
                {passcodeError && (
                  <p className="mt-1 text-[11px] text-red-600 font-medium">{passcodeError}</p>
                )}
              </div>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowPasscodeModal(false)}
                  className="flex-1 rounded-xl text-xs h-9"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1 rounded-xl bg-[#14532D] hover:bg-[#0F3E22] text-white text-xs font-semibold h-9"
                >
                  Unlock Access
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
