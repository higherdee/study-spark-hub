import { createFileRoute, Link, Outlet, useNavigate } from "@tanstack/react-router";
import { BookOpen, Home, Trophy, Upload, Wallet, Loader2, Shield, Bot, Users } from "lucide-react";
import { useEffect } from "react";

import { AppShell, type NavItem } from "@/components/app-shell";
import { useIsAdmin, useProfile } from "@/lib/profile";

import { PageBreathingLoader } from "@/components/syllaboss-logo";

import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { updateStreakServerFn } from "@/lib/community.functions";

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
  { to: "/dashboard/assistant", label: "Boss AI", icon: Bot, hideOnMobile: true },
  { to: "/dashboard/community", label: "Study Hub", icon: Users },
  { to: "/dashboard/upload", label: "Upload", icon: Upload },
  { to: "/dashboard/leaderboard", label: "Rankings", icon: Trophy, hideOnMobile: true },
  { to: "/dashboard/wallet", label: "Wallet", icon: Wallet },
];

function DashboardLayout() {
  const { user } = useAuth();
  const { data: profile, isLoading } = useProfile();
  const { data: isAdmin } = useIsAdmin();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

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
      title="Student"
      footer={
        isAdmin ? (
          <Link to="/admin" className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm font-medium hover:bg-secondary">
            <Shield className="size-4 text-primary" /> Admin dashboard
          </Link>
        ) : null
      }
    >
      {profile.suspended && <div className="mb-6 rounded-lg border border-destructive bg-destructive/5 p-4 text-sm text-destructive">Your account is suspended. You can't upload or cash out until an admin restores it.</div>}
      <div className="animate-page-zoom-in">
        <Outlet />
      </div>
    </AppShell>
  );
}
