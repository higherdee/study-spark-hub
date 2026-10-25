import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { AlertCircle, FileStack, LayoutDashboard, Loader2, Megaphone, Users, Wallet } from "lucide-react";
import { AppShell, type NavItem } from "@/components/app-shell";
import { useIsAdmin } from "@/lib/profile";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Admin dashboard — Syllaboss" },
      { name: "description", content: "Manage students, materials and payouts on Syllaboss." },
      { name: "robots", content: "noindex" },
    ],
    links: [{ rel: "manifest", href: "/manifest.admin.webmanifest" }],
  }),
  component: AdminLayout,
});

const nav: NavItem[] = [
  { to: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
  { to: "/admin/materials", label: "Review", icon: FileStack },
  { to: "/admin/complaints", label: "Appeals", icon: AlertCircle },
  { to: "/admin/broadcast", label: "Broadcast", icon: Megaphone },
  { to: "/admin/users", label: "Students", icon: Users },
  { to: "/admin/withdrawals", label: "Payouts", icon: Wallet },
];

function AdminLayout() {
  const { data: isAdmin, isLoading, isError } = useIsAdmin();

  if (isLoading) {
    return <div className="grid min-h-screen place-items-center bg-background"><Loader2 className="size-8 animate-spin text-primary" /></div>;
  }

  if (isError || !isAdmin) {
    return (
      <main className="grid min-h-dvh place-items-center bg-background p-6 text-center">
        <div className="max-w-md">
          <p className="text-sm font-semibold text-muted-foreground">Restricted area</p>
          <h1 className="mt-2 font-display text-3xl font-semibold">Admin access required</h1>
          <p className="mt-3 text-sm text-muted-foreground">Your account does not have permission to open the admin console.</p>
          <Link to="/dashboard" className="mt-6 inline-flex h-10 items-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground">Return to student app</Link>
        </div>
      </main>
    );
  }

  return <AppShell nav={nav} title="Admin"><Outlet /></AppShell>;
}
