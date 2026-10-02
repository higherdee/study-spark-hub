import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { FileStack, LayoutDashboard, Loader2, Users, Wallet, GraduationCap } from "lucide-react";

import { AppShell, type NavItem } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { useIsAdmin } from "@/lib/profile";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Admin dashboard — Syllaboss" },
      { name: "description", content: "Manage students, materials and payouts on Syllaboss." },
      { property: "og:title", content: "Admin dashboard — Syllaboss" },
      { property: "og:description", content: "Syllaboss admin console." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminLayout,
});

const nav: NavItem[] = [
  { to: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
  { to: "/admin/materials", label: "Materials review", icon: FileStack },
  { to: "/admin/users", label: "Students", icon: Users },
  { to: "/admin/withdrawals", label: "Withdrawals", icon: Wallet },
];

function AdminLayout() {
  const { data: isAdmin, isLoading } = useIsAdmin();
  if (isLoading) return <div className="grid min-h-screen place-items-center"><Loader2 className="animate-spin text-primary" /></div>;
  if (!isAdmin) {
    return (
      <div className="grid min-h-screen place-items-center p-6 text-center">
        <div>
          <h1 className="font-display text-3xl font-semibold">Admins only</h1>
          <p className="mt-2 text-muted-foreground">Your account doesn't have access to this area.</p>
          <Button asChild className="mt-6 rounded-full"><Link to="/dashboard">Go to my dashboard</Link></Button>
        </div>
      </div>
    );
  }
  return (
    <AppShell
      nav={nav}
      title="Admin"
      footer={<Link to="/dashboard" className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm font-medium hover:bg-secondary"><GraduationCap className="size-4 text-primary" /> Student view</Link>}
    >
      <Outlet />
    </AppShell>
  );
}
