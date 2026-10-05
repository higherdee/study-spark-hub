import { Link, useRouterState } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import {
  Coins,
  Sparkles,
  Timer,
  Play,
  Shield,
  Bell,
  Menu,
  HelpCircle,
  Bot,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";

import { SyllabossLogo } from "@/components/syllaboss-logo";
import { Button } from "@/components/ui/button";
import { NotificationsDrawer } from "@/components/notifications-drawer";
import { SideNavSheet } from "@/components/side-nav-sheet";
import { useAuth } from "@/hooks/use-auth";
import { useProfile, useIsAdmin } from "@/lib/profile";
import { useStudyTimer } from "@/hooks/use-study-timer";
import { POINTS_NAME } from "@/lib/constants";
import { getUserNotifications } from "@/integrations/turso/client";
import { cn } from "@/lib/utils";

export type NavItem = {
  to: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
  isFeatured?: boolean;
};

export function AppShell({
  nav,
  title,
  footer,
  children,
}: {
  nav: NavItem[];
  title: string;
  footer?: ReactNode;
  children: ReactNode;
}) {
  const { user, signOut } = useAuth();
  const { data: profile } = useProfile();
  const { data: isAdmin } = useIsAdmin();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { seconds, isPaused, isInactive, togglePause } = useStudyTimer();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSideNav, setShowSideNav] = useState(false);

  const { data: notifications = [] } = useQuery({
    queryKey: ["user-notifications", user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      if (!user) return [];
      return await getUserNotifications(user.id);
    },
    refetchInterval: 30000,
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  const name =
    (user?.user_metadata?.["full_name"] as string | undefined) ??
    profile?.full_name ??
    user?.email ??
    "Student";

  const points = profile?.points ?? 0;
  const isPlus = Boolean(profile?.sylla_plus);

  // Format timer into MM:SS towards next 30m milestone
  const remainingSecs = Math.max(0, 1800 - (seconds % 1800));
  const timerMins = Math.floor(remainingSecs / 60);
  const timerSecs = remainingSecs % 60;
  const timerDisplay = `${String(timerMins).padStart(2, "0")}:${String(timerSecs).padStart(2, "0")}`;

  return (
    <div className="relative min-h-screen bg-background text-foreground antialiased selection:bg-primary/20">
      {/* Top Bar matching Screenshot 2: Hamburger on left, widgets on right */}
      <header className="sticky top-0 z-40 px-3 py-2.5 transition-all sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 rounded-3xl border border-border/70 bg-card/90 px-3.5 py-2 shadow-xs backdrop-blur-2xl transition-all">
          {/* Left: Hamburger menu icon opening side drop menu */}
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setShowSideNav(true)}
              aria-label="Open navigation menu"
              className="grid size-9 place-items-center rounded-full hover:bg-secondary text-foreground transition-all active:scale-90"
            >
              <Menu className="size-5" />
            </button>

            <Link to="/dashboard" className="hidden sm:inline-flex items-center">
              <SyllabossLogo asDiv />
            </Link>
          </div>

          {/* Right: Dynamic Island widgets cluster matching Screenshot 2 */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Study Timer Widget */}
            <button
              onClick={togglePause}
              title={isPaused ? (isInactive ? "Paused (1h idle). Click to resume" : "Paused. Click to resume") : "Study timer running (+5 pts every 30m). Click to pause"}
              className={cn(
                "group flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-mono transition-all duration-200 active:scale-95 shadow-xs border",
                isInactive
                  ? "bg-amber-500/10 text-amber-700 border-amber-500/30"
                  : isPaused
                  ? "bg-secondary text-muted-foreground border-border"
                  : "bg-emerald-500/10 text-emerald-700 border-emerald-500/30 animate-pulse-subtle"
              )}
            >
              {isPaused ? (
                <Play className="size-3 text-current transition-transform group-hover:scale-110" />
              ) : (
                <Timer className="size-3 text-current transition-transform group-hover:scale-110" />
              )}
              <span className="hidden xs:inline font-medium text-[11px]">
                {isInactive ? "Idle" : isPaused ? "Paused" : "Study"}
              </span>
              <span>{timerDisplay}</span>
            </button>

            {/* SyllaPoints Capsule - pure points, no Naira! */}
            <Link
              to="/dashboard/wallet"
              className="flex items-center gap-1.5 rounded-full border border-border/70 bg-secondary/50 px-2.5 sm:px-3 py-1 text-xs font-semibold text-foreground transition-all hover:bg-secondary active:scale-95 shadow-2xs"
            >
              <Coins className="size-3.5 text-primary" />
              <span>{points.toLocaleString()}</span>
              <span className="hidden sm:inline text-muted-foreground font-normal text-[11px]">
                pts
              </span>
            </Link>

            {/* Notifications Bell */}
            <button
              type="button"
              onClick={() => setShowNotifications(true)}
              title="Notifications"
              aria-label="View notifications"
              className="relative grid size-8 place-items-center rounded-full border border-border/70 bg-card text-foreground transition-all active:scale-90 hover:bg-secondary"
            >
              <Bell className="size-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 grid size-4 place-items-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground animate-scale-in">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>

            {/* Help / FAQ Icon (?) */}
            <button
              type="button"
              onClick={() => setShowSideNav(true)}
              title="Help & Info"
              aria-label="Help and information"
              className="grid size-8 place-items-center rounded-full border border-border/70 bg-card text-foreground transition-all active:scale-90 hover:bg-secondary"
            >
              <HelpCircle className="size-4" />
            </button>

            {/* User Avatar Circle */}
            <button
              type="button"
              onClick={() => setShowSideNav(true)}
              className="grid size-8 shrink-0 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground shadow-xs transition-transform active:scale-90"
              title={name}
            >
              {name.charAt(0).toUpperCase()}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="mx-auto max-w-7xl px-4 py-6 pb-28 sm:px-6 sm:pb-32 lg:px-8">
        {children}
      </main>

      {/* Notifications Drawer */}
      <NotificationsDrawer
        open={showNotifications}
        onClose={() => setShowNotifications(false)}
      />

      {/* Slide-over Side Drawer Menu */}
      <SideNavSheet
        open={showSideNav}
        onClose={() => setShowSideNav(false)}
      />

      {/* Bottom Floating Navigation Dock (Cleaned: No logout, Home at center) */}
      <aside
        aria-label="Navigation dock"
        className="fixed bottom-5 inset-x-0 z-50 mx-auto w-fit max-w-[96vw] pointer-events-none"
      >
        <div className="pointer-events-auto flex items-center gap-1 sm:gap-1.5 rounded-full p-1.5 backdrop-blur-3xl bg-card/90 border border-border/80 shadow-[0_20px_50px_rgba(0,0,0,0.12),inset_0_1px_1px_rgba(255,255,255,0.8),inset_0_-1px_1px_rgba(0,0,0,0.05)] transition-all duration-300">
          {nav.map((item) => {
            const active = item.exact
              ? path === item.to
              : path === item.to || path.startsWith(`${item.to}/`);

            if (item.isFeatured) {
              // Bolder prominent central button (Home)
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "relative flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold transition-all duration-300 active:scale-95 select-none shadow-md",
                    active
                      ? "bg-primary text-primary-foreground ring-2 ring-primary/40 shadow-primary/25 scale-[1.06]"
                      : "bg-gradient-to-r from-primary/95 to-primary text-primary-foreground hover:scale-105 hover:shadow-primary/30"
                  )}
                >
                  <item.icon className="size-4 shrink-0" />
                  <span>{item.label}</span>
                </Link>
              );
            }

            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "relative flex items-center gap-1.5 rounded-full px-2.5 sm:px-3.5 py-2 text-xs font-medium transition-all duration-200 active:scale-90 select-none",
                  active
                    ? "bg-secondary text-foreground shadow-xs font-semibold scale-[1.02]"
                    : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                )}
              >
                <item.icon className="size-4 shrink-0 transition-transform duration-200" />
                <span
                  className={cn(
                    "transition-all duration-200",
                    active ? "inline" : "hidden sm:inline"
                  )}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </aside>

      {/* Floating & Breathing Boss AI Bubble at Bottom Right */}
      <Link
        to="/dashboard/assistant"
        aria-label="Open Boss AI study assistant"
        title="Chat with Boss AI"
        className="fixed bottom-6 right-5 z-40 flex items-center gap-2 rounded-full bg-[#0d281e] text-white px-3.5 py-2.5 shadow-2xl border border-[#446557]/50 animate-bot-float-breathe hover:scale-110 active:scale-95 transition-all group backdrop-blur-md"
      >
        <div className="relative flex items-center justify-center">
          <Bot className="size-5 text-[#c6ebd9] group-hover:scale-110 transition-transform" />
          <span className="absolute -top-1 -right-1 size-2 rounded-full bg-[#1b7a4e] animate-ping" />
          <span className="absolute -top-1 -right-1 size-2 rounded-full bg-[#1b7a4e]" />
        </div>
        <span className="text-xs font-semibold tracking-wide text-white pr-0.5 font-sans">
          Boss AI
        </span>
      </Link>
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="font-mono text-xs uppercase tracking-wider text-primary font-semibold">{eyebrow}</p>
        <h1 className="mt-1.5 font-display text-2xl font-bold tracking-tight sm:text-3xl text-foreground">
          {title}
        </h1>
      </div>
      {children}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  icon: LucideIcon;
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card/80 p-5 shadow-xs backdrop-blur-sm transition-all hover:shadow-soft">
      <div className="flex items-center justify-between text-muted-foreground">
        <span className="text-xs font-semibold uppercase tracking-wider">{label}</span>
        <div className="rounded-lg bg-primary/10 p-2 text-primary">
          <Icon className="size-4" />
        </div>
      </div>
      <p className="mt-3 font-display text-2xl font-bold tracking-tight sm:text-3xl text-foreground">
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const tone =
    status === "verified" || status === "paid"
      ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20"
      : status === "rejected"
      ? "bg-destructive/10 text-destructive border-destructive/20"
      : "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20";
  return (
    <span
      className={cn(
        "rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize",
        tone
      )}
    >
      {status}
    </span>
  );
}
