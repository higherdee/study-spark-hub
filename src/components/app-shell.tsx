import { Link, useRouterState } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import {
  Coins,
  Sparkles,
  Timer,
  Play,
  Flame,
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
import { FloatingBossAi } from "@/components/floating-boss-ai";
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
  hideOnMobile?: boolean;
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

  const isFullScreenAppPage =
    path.startsWith("/dashboard/assistant") ||
    path.startsWith("/dashboard/community") ||
    path.startsWith("/dashboard/preview");

  return (
    <div
      className={cn(
        "relative min-h-dvh bg-background text-foreground antialiased selection:bg-primary/20",
        isFullScreenAppPage
          ? "h-dvh max-h-dvh overflow-hidden flex flex-col"
          : "min-h-screen"
      )}
    >
      {/* Top Bar matching Screenshot 2: Hamburger on left, widgets on right */}
      <header
        className={cn(
          "px-3 transition-all sm:px-6 lg:px-8",
          isFullScreenAppPage ? "shrink-0 py-2" : "sticky top-0 z-40 py-2.5"
        )}
      >
        <div className="mx-auto flex min-h-14 max-w-7xl items-center justify-between gap-2 rounded-[1.35rem] border border-border/70 bg-card/90 px-3 py-2 shadow-[0_12px_32px_-18px_rgba(13,40,30,0.35)] backdrop-blur-2xl transition-all sm:px-4">
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
              <SyllabossLogo asDiv showPlusBadge={isPlus} />
            </Link>
          </div>

          {/* Right: Dynamic Island widgets cluster matching Screenshot 2 */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Study Streak Capsule (Replaces header timer) */}
            <Link
              to="/dashboard/community"
              title="Daily Study Streak — Click to visit Community & Study Hub"
              className="group flex items-center gap-1.5 rounded-full px-2.5 sm:px-3 py-1 text-xs font-semibold transition-all duration-200 active:scale-95 shadow-xs border bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/20"
            >
              <Flame className="size-3.5 text-amber-500 fill-amber-500 transition-transform group-hover:scale-125" />
              <span>{profile?.current_streak || 1} {Number(profile?.current_streak || 1) === 1 ? "Day" : "Days"}</span>
            </Link>

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
      <main
        className={cn(
          "mx-auto w-full max-w-7xl px-0 sm:px-6 lg:px-8",
          isFullScreenAppPage
            ? "flex-1 min-h-0 overflow-hidden flex flex-col py-0 pb-1 sm:pb-2"
            : "py-5 pb-28 sm:py-8 sm:pb-32"
        )}
      >
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

      {/* Bottom Floating Navigation Dock (Significantly enlarged, native mobile app feel) */}
      <aside
        id="main-navigation-dock"
        aria-label="Navigation dock"
        className={cn(
          "fixed bottom-3 sm:bottom-6 inset-x-0 z-30 mx-auto w-fit max-w-[98vw] pointer-events-none px-2 transition-all duration-200",
          showSideNav && "hidden pointer-events-none opacity-0",
          isFullScreenAppPage && "hidden md:block"
        )}
      >
        <div className="pointer-events-auto flex items-center justify-center gap-1 sm:gap-2 rounded-2xl sm:rounded-full p-1.5 sm:p-2 backdrop-blur-3xl bg-card/95 border border-border/90 shadow-[0_20px_60px_rgba(0,0,0,0.16),inset_0_1px_2px_rgba(255,255,255,0.85)] transition-all duration-300">
          {nav.map((item) => {
            const active = item.exact
              ? path === item.to
              : path === item.to || path.startsWith(`${item.to}/`);

            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "relative flex items-center gap-1.5 rounded-full px-3 sm:px-3.5 py-2 sm:py-2.5 text-xs sm:text-sm font-medium transition-colors select-none",
                  item.hideOnMobile && "hidden md:flex",
                  active
                    ? "bg-slate-100 text-slate-900 font-semibold"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                )}
              >
                <item.icon className="size-4.5 sm:size-5 shrink-0 text-slate-500" />
                <span
                  className={cn(
                    "transition-all font-medium",
                    active ? "inline" : "hidden md:inline"
                  )}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </aside>

      {/* Floating & Movable Boss AI Widget (upper side with auto-hide peek tab) */}
      <FloatingBossAi />
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
