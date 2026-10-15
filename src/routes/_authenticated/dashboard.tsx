import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { BookOpen, FileStack, Home, Trophy, Upload, Wallet, Shield, Bot, Users, Settings } from "lucide-react";
import { useEffect } from "react";

import { AppShell, type NavItem } from "@/components/app-shell";
import { useIsAdmin, useProfile } from "@/lib/profile";

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
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

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

  useEffect(() => {
    if (!isLoading && (!profile || profile.onboarding_step < 3)) {
      navigate({ to: "/onboarding" });
    }
  }, [profile, isLoading, navigate]);

  if (isLoading || !profile || profile.onboarding_step < 3) {
    return <PageBreathingLoader message="Synchronizing academic records..." />;
  }

  return (
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
      {profile.suspended && (
        <div className="mb-6 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm font-medium text-destructive">
          Your account is suspended. You can't upload or cash out until an admin restores it.
        </div>
      )}
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
  );
}
