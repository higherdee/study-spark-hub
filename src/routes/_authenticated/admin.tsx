import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import {
  FileStack,
  LayoutDashboard,
  Loader2,
  Users,
  Wallet,
  GraduationCap,
  ShieldAlert,
  Lock,
  ArrowRight,
  ShieldCheck,
  Eye,
  EyeOff,
  AlertCircle,
  Megaphone,
  Smartphone,
  Download,
  LogOut,
} from "lucide-react";
import { useState, type FormEvent, useEffect } from "react";
import { toast } from "sonner";

import { AppShell, type NavItem } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
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
    links: [
      { rel: "manifest", href: "/manifest.admin.webmanifest" },
    ],
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

const AUTHORIZED_ADMIN_EMAIL = "ayadiolakunle125@gmail.com";
const ADMIN_SECRET_PASS = "AdMiN081#";

function AdminLayout() {
  const { user, signOut } = useAuth();
  const { data: isAdmin, isLoading } = useIsAdmin();

  // Admin session authentication state (persists in sessionStorage)
  const [sessionUnlocked, setSessionUnlocked] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return sessionStorage.getItem("syllaboss_admin_auth") === "true";
  });

  const [inputEmail, setInputEmail] = useState(user?.email || AUTHORIZED_ADMIN_EMAIL);
  const [inputPassword, setInputPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user?.email) {
      setInputEmail(user.email);
    }
  }, [user?.email]);

  if (isLoading) {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <Loader2 className="animate-spin text-primary size-8" />
      </div>
    );
  }

  // Handle Admin Login submission
  function handleAdminLogin(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);

    const emailTrimmed = inputEmail.trim().toLowerCase();

    // Verify authorized email strictly
    if (emailTrimmed !== AUTHORIZED_ADMIN_EMAIL.toLowerCase()) {
      toast.error("Unauthorized: Only ayadiolakunle125@gmail.com is authorized to access the Admin console.");
      setSubmitting(false);
      return;
    }

    // Verify password strictly
    if (inputPassword !== ADMIN_SECRET_PASS) {
      toast.error("Invalid administrator password. Access denied.");
      setSubmitting(false);
      return;
    }

    // If current logged in user is different from the admin email
    if (user?.email && user.email.toLowerCase() !== AUTHORIZED_ADMIN_EMAIL.toLowerCase()) {
      toast.error(
        `You are currently logged into Clerk as ${user.email}. Please switch account to ${AUTHORIZED_ADMIN_EMAIL}.`
      );
      setSubmitting(false);
      return;
    }

    // Unlock admin session
    sessionStorage.setItem("syllaboss_admin_auth", "true");
    setSessionUnlocked(true);
    toast.success("Welcome to Syllaboss Admin Console, Olakunle!");
    setSubmitting(false);
  }

  function handleLockSession() {
    sessionStorage.removeItem("syllaboss_admin_auth");
    setSessionUnlocked(false);
    setInputPassword("");
    toast.info("Admin session locked.");
  }

  // Render Admin Login Gate if not unlocked or not authorized
  const isAuthorizedEmail = user?.email?.toLowerCase() === AUTHORIZED_ADMIN_EMAIL.toLowerCase();

  if (!sessionUnlocked || !isAuthorizedEmail) {
    return (
      <div className="relative min-h-screen grid place-items-center bg-background p-4 sm:p-6 overflow-hidden">
        {/* Soft background ambient glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative w-full max-w-md rounded-3xl border border-border/60 bg-card/85 p-6 sm:p-8 shadow-2xl backdrop-blur-2xl ring-1 ring-black/5 dark:ring-white/10 transition-all">
          <div className="flex flex-col items-center text-center">
            <div className="grid size-14 place-items-center rounded-2xl bg-primary/10 border border-primary/20 text-primary shadow-xs">
              <Lock className="size-6 text-primary" />
            </div>
            <h1 className="mt-4 font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Admin Portal
            </h1>
            <p className="mt-1.5 text-xs sm:text-sm text-muted-foreground">
              Restricted management zone. Only <strong className="text-foreground">{AUTHORIZED_ADMIN_EMAIL}</strong> is authorized.
            </p>
          </div>

          <form onSubmit={handleAdminLogin} className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="admin-email" className="text-xs font-semibold">
                Admin Email
              </Label>
              <Input
                id="admin-email"
                type="email"
                required
                value={inputEmail}
                onChange={(e) => setInputEmail(e.target.value)}
                placeholder={AUTHORIZED_ADMIN_EMAIL}
                className="h-11 rounded-xl bg-background/60"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="admin-pwd" className="text-xs font-semibold">
                Admin Password
              </Label>
              <div className="relative">
                <Input
                  id="admin-pwd"
                  type={showPassword ? "text" : "password"}
                  required
                  value={inputPassword}
                  onChange={(e) => setInputPassword(e.target.value)}
                  placeholder="Enter administrator password"
                  className="h-11 rounded-xl bg-background/60 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={submitting}
              className="w-full h-11 rounded-xl font-medium shadow-md transition-all active:scale-[0.98] mt-2"
            >
              {submitting ? (
                <Loader2 className="animate-spin size-4" />
              ) : (
                <>
                  Authenticate & Enter <ArrowRight className="size-4 ml-1.5" />
                </>
              )}
            </Button>
          </form>

          {/* Student back button */}
          <div className="mt-6 pt-4 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground">
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
            >
              <GraduationCap className="size-3.5" /> Return to Student App
            </Link>
            {user && (
              <button
                onClick={signOut}
                className="inline-flex items-center gap-1 hover:text-destructive transition-colors"
              >
                <LogOut className="size-3.5" /> Switch Account
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  const handleInstallAdminApp = async () => {
    // @ts-expect-error - injected by __root.tsx
    const bip = window.__bip;
    if (bip) {
      bip.prompt();
      const choice = await bip.userChoice;
      if (choice.outcome === "accepted") {
        toast.success("Syllaboss Admin Console installed!");
      }
    } else {
      toast("To install Admin App, open your browser menu (⋮ or Share) and select 'Install App' or 'Add to Home Screen'.");
    }
  };

  return (
    <AppShell
      nav={nav}
      title="Admin"
      footer={
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleInstallAdminApp}
            className="flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20 transition-all shadow-xs"
            title="Download & Install Standalone Admin PWA"
          >
            <Download className="size-3.5" /> Install Admin PWA
          </button>
          <Link
            to="/dashboard"
            className="flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-xs font-medium hover:bg-secondary transition-all"
          >
            <GraduationCap className="size-3.5 text-primary" /> Student view
          </Link>
          <button
            onClick={handleLockSession}
            className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
            title="Lock Admin Session"
          >
            <Lock className="size-3.5" /> Lock Console
          </button>
        </div>
      }
    >
      <Outlet />
    </AppShell>
  );
}
