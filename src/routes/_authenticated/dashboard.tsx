import { createFileRoute, Link, Outlet, useNavigate } from "@tanstack/react-router";
import { BookOpen, Bot, FileStack, LayoutDashboard, Loader2, Settings, Shield, Upload, Wallet } from "lucide-react";
import { useEffect } from "react";

import { AppShell, type NavItem } from "@/components/app-shell";
import { useIsAdmin, useProfile } from "@/lib/profile";

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
  { to: "/dashboard", label: "Overview", icon: LayoutDashboard, exact: true },
  { to: "/dashboard/upload", label: "Upload", icon: Upload },
  { to: "/dashboard/library", label: "Library", icon: BookOpen, isFeatured: true },
  { to: "/dashboard/materials", label: "My Notes", icon: FileStack },
  { to: "/dashboard/wallet", label: "Wallet", icon: Wallet },
  { to: "/dashboard/assistant", label: "AI Boss", icon: Bot },
];

function DashboardLayout() {
  const { data: profile, isLoading } = useProfile();
  const { data: isAdmin } = useIsAdmin();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && (!profile || profile.onboarding_step < 3)) {
      navigate({ to: "/onboarding" });
    }
  }, [profile, isLoading, navigate]);

  if (isLoading || !profile || profile.onboarding_step < 3) {
    return <div className="grid min-h-screen place-items-center"><Loader2 className="animate-spin text-primary" /></div>;
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
      <Outlet />
    </AppShell>
  );
}
