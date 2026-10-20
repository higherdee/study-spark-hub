import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { BookOpen, FileStack, Home, Trophy, Upload, Wallet, Shield, Bot, Users, Settings, AlertCircle, AlertTriangle } from "lucide-react";
import { useState, useEffect } from "react";

import { AppShell, type NavItem } from "@/components/app-shell";
import { isProfileComplete, useIsAdmin, useProfile } from "@/lib/profile";
import { Button } from "@/components/ui/button";
import { DashboardOnboardingModal } from "@/components/onboarding/dashboard-onboarding-modal";
import { AppWalkthroughGuide } from "@/components/onboarding/app-walkthrough-guide";
import { GuideContext } from "@/components/onboarding/guide-context";
import { AntiVpnShield } from "@/components/security/anti-vpn-shield";
import { SyllaPlusModal } from "@/components/syllaplus-modal";
import { useGeo } from "@/lib/geo";

import { PageBreathingLoader } from "@/components/syllaboss-logo";

import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { updateStreakServerFn } from "@/lib/community.functions";
import { upgradeToSyllaPlusServerFn, syncSubscriptionStatusServerFn } from "@/lib/upload.functions";
import { autoPromptNotificationConsent, schedulePeriodicStudyReminder } from "@/lib/notifications";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Syllaboss" },
      { name: "description", content: "Upload materials, earn points and study with your AI assistant." },
      { property: "og:title", content: "Dashboard — Syllaboss" },
      { property: "og:description", content: "Your Syllaboss student dashboard." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DashboardLayout,
});

const nav: NavItem[] = [
  { to: "/dashboard", label: "Home", icon: Home, exact: true },
  { to: "/dashboard/library", label: "Library", icon: BookOpen },
  { to: "/dashboard/assistant", label: "Boss AI", icon: Bot },
  { to: "/dashboard/community", label: "Peers", icon: Users },
  { to: "/dashboard/upload", label: "Upload", icon: Upload },
  { to: "/dashboard/leaderboard", label: "Rankings", icon: Trophy },
  { to: "/dashboard/wallet", label: "Wallet", icon: Wallet },
];

const secondary: NavItem[] = [
  { to: "/dashboard/materials", label: "My uploads", icon: FileStack },
  { to: "/dashboard/settings", label: "Settings", icon: Settings },
];

function DashboardLayout() {
  const { user } = useAuth();
  const { data: profile, isLoading, isFetched } = useProfile();
  const { data: isAdmin } = useIsAdmin();
  const { geo, isVpnOrProxy, vpnReason } = useGeo();
  const queryClient = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const search = useRouterState({ select: (s) => s.location.search }) as { upgraded?: string; tour?: string; plan?: string };

  // Onboarding Modal & Walkthrough Guide States
  const [manualSetupOpen, setManualSetupOpen] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [plusModalOpen, setPlusModalOpen] = useState(false);

  const profileComplete = isProfileComplete(profile);
  const needsOnboarding = isFetched && Boolean(profile) && !profileComplete;
  const isModalOpen = needsOnboarding || manualSetupOpen;

  // Handle successful Bachs payment redirect (?upgraded=true) or tour (?tour=true)
  useEffect(() => {
    if (search?.upgraded === "true" && user?.id) {
      const plan = (search?.plan as "weekly" | "monthly" | "yearly") || "monthly";
      upgradeToSyllaPlusServerFn({ data: { userId: user.id, plan } })
        .then(() => {
          queryClient.invalidateQueries({ queryKey: ["profile"] });
          queryClient.invalidateQueries({ queryKey: ["ledger"] });
          toast.success("Welcome to SyllaPlus! +300 points added & 1.3x multiplier unlocked!", {
            id: "bachs-upgrade-success",
            duration: 6000,
          });
          // Clean URL param
          if (typeof window !== "undefined") {
            const url = new URL(window.location.href);
            url.searchParams.delete("upgraded");
            url.searchParams.delete("plan");
            window.history.replaceState({}, "", url.pathname + url.search);
          }
        })
        .catch((err) => {
          console.error("Auto upgrade check failed:", err);
        });
    }

    if (search?.tour === "true") {
      setShowGuide(true);
    }
  }, [search?.upgraded, search?.tour, search?.plan, user?.id, queryClient]);

  // Synchronize subscription status (auto-renewal check, grace period evaluation, notices)
  useEffect(() => {
    if (user?.id) {
      syncSubscriptionStatusServerFn({ data: { userId: user.id } })
        .then((res) => {
          if (res.status === "grace_period" && res.notice) {
            toast.warning(res.notice, { id: "sub-grace-notice", duration: 8000 });
          }
        })
        .catch(() => {});
    }
  }, [user?.id]);

  // Auto-activate streak ONLY after scholar has completed their profile
  useEffect(() => {
    if (user?.id && profileComplete) {
      updateStreakServerFn({ data: { userId: user.id } })
        .then(() => {
          queryClient.invalidateQueries({ queryKey: ["profile", user.id] });
        })
        .catch(() => {});
    }
  }, [user?.id, profileComplete, queryClient]);

  // Prompt device notification consent immediately on entry & schedule periodic reminders
  useEffect(() => {
    if (typeof window !== "undefined") {
      autoPromptNotificationConsent().catch(() => {});
      schedulePeriodicStudyReminder();
    }
  }, []);

  // Instant dashboard entry - only show loader if auth user is not yet known
  if (!user) {
    return <PageBreathingLoader message="Entering workspace..." />;
  }

  return (
    <GuideContext.Provider
      value={{
        isOpen: showGuide,
        openGuide: () => setShowGuide(true),
        closeGuide: () => setShowGuide(false),
      }}
    >
      <AppShell
        nav={nav}
        secondary={secondary}
        title="Student"
        footer={
          isAdmin ? (
            <Link
              to="/admin"
              className="press flex items-center gap-2.5 rounded-lg border border-border bg-card px-3 py-2.5 text-[13px] font-semibold text-ink transition-colors hover:bg-muted"
            >
              <Shield className="size-4 text-brand" /> Admin console
            </Link>
          ) : null
        }
      >
        {/* Incomplete Onboarding Announcement Banner */}
        {needsOnboarding && (
          <div className="mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-brass/40 bg-gradient-to-r from-brass/15 via-brass/10 to-surface-container-low p-4 text-ink shadow-xs">
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-xl bg-brass/20 text-brass-ink flex items-center justify-center shrink-0 border border-brass/40">
                <AlertCircle className="size-5 text-brass" />
              </div>
              <div className="text-xs">
                <p className="font-semibold text-ink">Action Required: Complete Your Academic Profile</p>
                <p className="text-muted-foreground mt-0.5">
                  Set your university, course, and username to enable study battles, library customization, and weekend withdrawals.
                </p>
              </div>
            </div>
            <Button
              size="sm"
              onClick={() => setManualSetupOpen(true)}
              className="h-8.5 rounded-xl bg-forest text-white hover:bg-forest/90 font-semibold text-xs px-4 shrink-0 shadow-xs active:scale-[0.98] cursor-pointer"
            >
              Complete Setup
            </Button>
          </div>
        )}

        {/* Grace Period Notification Banner (6 days weekly / 12 days monthly) */}
        {(() => {
          const subData = (profile?.study_plan as any)?.subscription;
          if (subData?.status !== "grace_period") return null;
          const gracePeriodDays = subData?.plan === "weekly" ? 6 : 12;
          const daysRemainingInGrace = subData?.grace_period_end
            ? Math.max(1, Math.ceil((new Date(subData.grace_period_end).getTime() - Date.now()) / (24 * 60 * 60 * 1000)))
            : gracePeriodDays;

          return (
            <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-amber-900 dark:text-amber-200 text-xs sm:text-sm shadow-md animate-fade-in backdrop-blur-md">
              <div className="flex items-start sm:items-center gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 font-bold">
                  <AlertTriangle className="size-5" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">
                    Payment Notice: SyllaPlus {subData?.plan === "weekly" ? "Weekly" : "Monthly"} Auto-Renewal Failed
                  </p>
                  <p className="text-muted-foreground text-xs mt-0.5">
                    You are currently in a {gracePeriodDays}-day grace period ({daysRemainingInGrace} day{daysRemainingInGrace === 1 ? "" : "s"} remaining). Renew your payment method before your 1.3x points multiplier and VIP perks are suspended.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  size="sm"
                  onClick={() => setPlusModalOpen(true)}
                  className="rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs h-8.5 px-4 shadow-xs cursor-pointer"
                >
                  Renew Subscription
                </Button>
              </div>
            </div>
          );
        })()}

        {profile?.suspended ? (
          <div className="mb-6 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm font-medium text-destructive">
            Your account is suspended. You can't upload or cash out until an admin restores it.
          </div>
        ) : null}
        <div
          key={pathname}
          className={
            pathname.startsWith("/dashboard/assistant") ||
            pathname.startsWith("/dashboard/community") ||
            pathname.startsWith("/dashboard/preview")
              ? "route-enter overflow-hidden"
              : "route-enter"
          }
        >
          <Outlet />
        </div>
      </AppShell>

      {/* Pop-up Modal for Onboarding Details */}
      {profile && (
        <DashboardOnboardingModal
          isOpen={isModalOpen}
          isMandatory={needsOnboarding}
          profile={profile}
          onClose={() => {
            setManualSetupOpen(false);
          }}
          onComplete={() => {
            setManualSetupOpen(false);
          }}
          onOpenGuide={() => {
            setManualSetupOpen(false);
            setShowGuide(true);
          }}
        />
      )}

      {/* 3-Slide Interactive App Tour */}
      <AppWalkthroughGuide
        isOpen={showGuide}
        onClose={() => setShowGuide(false)}
      />

      {/* SyllaPlus Membership & Renewal Modal */}
      <SyllaPlusModal
        open={plusModalOpen}
        onClose={() => setPlusModalOpen(false)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["profile"] });
          queryClient.invalidateQueries({ queryKey: ["ledger"] });
        }}
      />

      {/* Anti-VPN & Anti-Proxy Security Shield */}
      <AntiVpnShield
        isOpen={isVpnOrProxy}
        ip={geo.ip}
        reason={vpnReason}
        onRecheck={() => {
          window.location.reload();
        }}
      />
    </GuideContext.Provider>
  );
}
