import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { BookOpen, FileStack, Home, Trophy, Upload, Wallet, Shield, Bot, Users, Settings, AlertCircle } from "lucide-react";
import { useState, useEffect } from "react";

import { AppShell, type NavItem } from "@/components/app-shell";
import { useIsAdmin, useProfile } from "@/lib/profile";
import { Button } from "@/components/ui/button";
import { DashboardOnboardingModal } from "@/components/onboarding/dashboard-onboarding-modal";
import { AppWalkthroughGuide } from "@/components/onboarding/app-walkthrough-guide";
import { AntiVpnShield } from "@/components/security/anti-vpn-shield";
import { useGeo } from "@/lib/geo";

import { PageBreathingLoader } from "@/components/syllaboss-logo";

import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { updateStreakServerFn } from "@/lib/community.functions";
import { autoPromptNotificationConsent, schedulePeriodicStudyReminder } from "@/lib/notifications";

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
  const { data: profile, isLoading } = useProfile();
  const { data: isAdmin } = useIsAdmin();
  const { geo, isVpnOrProxy, vpnReason } = useGeo();
  const queryClient = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  // Onboarding Modal & Walkthrough Guide States
  const [showOnboardingModal, setShowOnboardingModal] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  // Auto-prompt onboarding modal on dashboard if profile is incomplete
  useEffect(() => {
    if (profile && profile.onboarding_step < 3) {
      setShowOnboardingModal(true);
    }
  }, [profile?.id, profile?.onboarding_step]);

  // Auto-activate streak as soon as student enters the app (no manual check-in needed)
  useEffect(() => {
    if (user?.id) {
      updateStreakServerFn({ data: { userId: user.id } })
        .then(() => {
          queryClient.invalidateQueries({ queryKey: ["profile"] });
        })
        .catch(() => {});
    }
  }, [user?.id, queryClient]);

  // Prompt device notification consent immediately on entry & schedule periodic reminders
  useEffect(() => {
    if (typeof window !== "undefined") {
      autoPromptNotificationConsent().catch(() => {});
      schedulePeriodicStudyReminder();
    }
  }, []);

  // Instant dashboard entry - only show loader if auth user is not yet known
  if (!user && isLoading) {
    return <PageBreathingLoader message="Entering workspace..." />;
  }

  const needsOnboarding = (profile?.onboarding_step ?? 0) < 3;

  return (
    <>
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
              onClick={() => setShowOnboardingModal(true)}
              className="h-8.5 rounded-xl bg-forest text-white hover:bg-forest/90 font-semibold text-xs px-4 shrink-0 shadow-xs active:scale-[0.98]"
            >
              Complete Setup
            </Button>
          </div>
        )}

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
          isOpen={showOnboardingModal}
          profile={profile}
          onClose={() => {
            setShowOnboardingModal(false);
          }}
          onComplete={() => {
            setShowOnboardingModal(false);
          }}
        />
      )}

      {/* 10-Step Interactive App Tour */}
      <AppWalkthroughGuide
        isOpen={showGuide}
        onClose={() => setShowGuide(false)}
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
    </>
  );
}
