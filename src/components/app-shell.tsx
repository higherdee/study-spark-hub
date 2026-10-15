import { Link, useRouterState } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import { Bell, Coins, Flame, LogOut, MoreHorizontal, Pause, Play, Timer } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { LayoutGroup, motion, useReducedMotion } from "motion/react";

import { SyllabossEmblem, SyllabossLogo } from "@/components/syllaboss-logo";
import { NotificationsDrawer } from "@/components/notifications-drawer";
import { SideNavSheet, type MoreItem } from "@/components/side-nav-sheet";
import {
  StudyTimerProvider,
  milestoneRemaining,
  useSharedStudyTimer,
} from "@/components/study-timer-context";
import { useAuth } from "@/hooks/use-auth";
import { useProfile } from "@/lib/profile";
import { getUserNotifications } from "@/integrations/turso/client";
import { CampusWrappedModal } from "@/components/scholar/campus-wrapped-modal";
import { cn } from "@/lib/utils";

export type NavItem = {
  to: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
  isFeatured?: boolean;
  hideOnMobile?: boolean;
};

type ShellProps = {
  nav: NavItem[];
  /** Extra destinations shown beneath the main nav (desktop) and in "More" (mobile). */
  secondary?: NavItem[];
  title: string;
  footer?: ReactNode;
  children: ReactNode;
};

const spring = { type: "spring", duration: 0.42, bounce: 0.14 } as const;

function isActivePath(path: string, item: Pick<NavItem, "to" | "exact">) {
  return item.exact ? path === item.to : path === item.to || path.startsWith(`${item.to}/`);
}

export function AppShell(props: ShellProps) {
  // The timer is mounted once here; everything else reads from context.
  return (
    <StudyTimerProvider>
      <ShellFrame {...props} />
    </StudyTimerProvider>
  );
}

function ShellFrame({ nav, secondary = [], title, footer, children }: ShellProps) {
  const { user, signOut } = useAuth();
  const { data: profile } = useProfile();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const reduce = useReducedMotion();

  const [showNotifications, setShowNotifications] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [showWrapped, setShowWrapped] = useState(false);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);

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
  const streak = Number(profile?.current_streak || 1);
  const isPlus = Boolean(profile?.sylla_plus);

  const isAssistantPage = path.startsWith("/dashboard/assistant");
  const isFullScreenAppPage =
    isAssistantPage ||
    path.startsWith("/dashboard/community") ||
    path.startsWith("/dashboard/preview");

  useEffect(() => {
    const keyHandler = (e: Event) => {
      setIsKeyboardOpen(Boolean((e as CustomEvent).detail?.isOpen));
    };
    window.addEventListener("syllaboss-keyboard-state", keyHandler);
    return () => window.removeEventListener("syllaboss-keyboard-state", keyHandler);
  }, []);

  // Close transient surfaces whenever the route changes.
  useEffect(() => {
    setShowMore(false);
  }, [path]);

  const tabs = useMemo(() => nav.filter((n) => !n.hideOnMobile).slice(0, 4), [nav]);
  const moreItems: MoreItem[] = useMemo(
    () =>
      [...nav.filter((n) => !tabs.includes(n)), ...secondary].map((n) => ({
        to: n.to,
        label: n.label,
        icon: n.icon,
      })),
    [nav, secondary, tabs],
  );
  const moreActive = moreItems.some((m) => isActivePath(path, { to: m.to }));

  const currentSection =
    [...nav, ...secondary].find((n) => isActivePath(path, n))?.label ?? title;

  return (
    <div
      className={cn(
        "relative bg-background text-foreground antialiased",
        isFullScreenAppPage ? "h-dvh max-h-dvh overflow-hidden" : "min-h-dvh",
      )}
    >
      {/* ───────── Desktop sidebar ───────── */}
      <aside
        data-app-chrome
        className="fixed inset-y-0 left-0 z-40 hidden w-[var(--sidebar-w)] flex-col border-r border-border bg-background lg:flex"
      >
        <div className="flex h-16 shrink-0 items-center px-6">
          <Link to="/dashboard" aria-label="Syllaboss home" className="press">
            <SyllabossLogo asDiv showPlusBadge={isPlus} />
          </Link>
        </div>

        <nav aria-label="Primary" className="flex-1 overflow-y-auto px-3 pb-3 pt-2">
          <LayoutGroup id="sidebar">
            <p className="eyebrow px-3 pb-2">Menu</p>
            <ul className="space-y-0.5">
              {nav.map((item) => (
                <SidebarLink key={item.to} item={item} active={isActivePath(path, item)} reduce={!!reduce} />
              ))}
            </ul>

            {secondary.length > 0 && (
              <>
                <p className="eyebrow px-3 pb-2 pt-6">Your space</p>
                <ul className="space-y-0.5">
                  {secondary.map((item) => (
                    <SidebarLink key={item.to} item={item} active={isActivePath(path, item)} reduce={!!reduce} />
                  ))}
                </ul>
              </>
            )}
          </LayoutGroup>
        </nav>

        <div className="shrink-0 space-y-3 border-t border-border p-3">
          <FocusCard />
          {footer}
          <div className="flex items-center gap-2.5 rounded-xl p-1.5">
            <Link
              to="/dashboard/settings"
              className="group flex min-w-0 flex-1 items-center gap-3 rounded-lg p-1.5 transition-colors hover:bg-muted"
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-forest font-display text-sm font-semibold text-accent">
                {name.charAt(0).toUpperCase()}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-semibold leading-tight text-ink">{name}</span>
                <span className="block truncate text-[11px] text-muted-foreground">
                  {profile?.course || profile?.institution || "Student"}
                </span>
              </span>
            </Link>
            <button
              type="button"
              onClick={() => signOut()}
              aria-label="Sign out"
              title="Sign out"
              className="grid size-9 shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive active:scale-90"
            >
              <LogOut className="size-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* ───────── Content column ───────── */}
      <div
        className={cn(
          "flex flex-col lg:pl-[var(--sidebar-w)]",
          isFullScreenAppPage ? "h-dvh max-h-dvh overflow-hidden" : "min-h-dvh",
        )}
      >
        <header
          data-app-chrome
          className={cn(
            "z-30 shrink-0 border-b border-border/70 bg-background/85 backdrop-blur-md pt-safe",
            isFullScreenAppPage ? "relative" : "sticky top-0",
            isAssistantPage && "hidden lg:block",
          )}
        >
          <div className="mx-auto flex h-14 max-w-[1400px] items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-2.5">
              <Link to="/dashboard" aria-label="Home" className="press lg:hidden">
                <SyllabossEmblem className="size-8" />
              </Link>
              <h2 className="truncate font-display text-xl font-semibold tracking-tight text-ink lg:text-[1.35rem]">
                {currentSection}
              </h2>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                type="button"
                onClick={() => setShowWrapped(true)}
                title="Your streak — tap to open Campus Wrapped"
                className="press group flex h-9 items-center gap-1.5 rounded-full border border-brass/25 bg-brass-soft px-3 text-[13px] font-semibold text-brass-ink transition-colors hover:border-brass/45"
              >
                <Flame className="streak-flame size-4 fill-brass/70 text-brass" />
                <span className="tnum">{streak}</span>
                <span className="hidden sm:inline font-medium text-brass-ink/80">
                  {streak === 1 ? "day" : "days"}
                </span>
              </button>

              <Link
                to="/dashboard/wallet"
                className="press flex h-9 items-center gap-1.5 rounded-full border border-border bg-card px-3 text-[13px] font-semibold text-ink shadow-[0_1px_2px_rgba(11,46,34,0.05)] transition-colors hover:border-ink/20"
              >
                <Coins className="size-4 text-brass" />
                <span className="tnum">{points.toLocaleString()}</span>
                <span className="hidden sm:inline text-[11px] font-medium text-muted-foreground">pts</span>
              </Link>

              <button
                type="button"
                onClick={() => setShowNotifications(true)}
                aria-label={unreadCount ? `${unreadCount} unread notifications` : "Notifications"}
                className="press relative grid size-9 place-items-center rounded-full border border-border bg-card text-ink transition-colors hover:border-ink/20"
              >
                <Bell className="size-4" />
                {unreadCount > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 animate-scale-in place-items-center rounded-full bg-brand px-1 text-[10px] font-bold text-white ring-2 ring-background">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>
            </div>
          </div>
        </header>

        <main
          className={cn(
            "mx-auto w-full max-w-[1400px] px-4 sm:px-6 lg:px-8",
            isFullScreenAppPage
              ? "flex min-h-0 flex-1 flex-col overflow-hidden pb-[calc(4.5rem+env(safe-area-inset-bottom))] lg:pb-4"
              : "flex-1 py-5 pb-[calc(5.5rem+env(safe-area-inset-bottom))] sm:py-8 lg:pb-14",
          )}
        >
          {children}
        </main>
      </div>

      {/* ───────── Mobile tab bar ───────── */}
      <nav
        data-app-chrome
        aria-label="Primary"
        className={cn(
          "fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/92 pb-safe backdrop-blur-xl lg:hidden",
          isKeyboardOpen && "hidden",
        )}
      >
        <LayoutGroup id="tabs">
          <ul className="mx-auto grid max-w-md grid-cols-5 px-1.5">
            {tabs.map((item) => (
              <TabLink key={item.to} item={item} active={isActivePath(path, item)} />
            ))}
            <li>
              <button
                type="button"
                onClick={() => setShowMore(true)}
                aria-label="More"
                aria-haspopup="dialog"
                className="press relative flex w-full flex-col items-center gap-0.5 pb-1.5 pt-2 text-[10.5px] font-semibold"
              >
                <span className="relative grid h-7 w-14 place-items-center">
                  {moreActive && (
                    <motion.span
                      layoutId="tab-pill"
                      className="absolute inset-0 rounded-full bg-accent"
                      transition={reduce ? { duration: 0 } : spring}
                    />
                  )}
                  <MoreHorizontal
                    className={cn("relative size-[22px] transition-colors", moreActive ? "text-forest" : "text-muted-foreground")}
                  />
                </span>
                <span className={moreActive ? "text-forest" : "text-muted-foreground"}>More</span>
              </button>
            </li>
          </ul>
        </LayoutGroup>
      </nav>

      <NotificationsDrawer open={showNotifications} onClose={() => setShowNotifications(false)} />
      <SideNavSheet open={showMore} onClose={() => setShowMore(false)} items={moreItems} />
      <CampusWrappedModal
        isOpen={showWrapped}
        onClose={() => setShowWrapped(false)}
        userId={user?.id}
        username={profile?.username || undefined}
      />
    </div>
  );
}

/* ───────────────────────── Sidebar pieces ───────────────────────── */

function SidebarLink({ item, active, reduce }: { item: NavItem; active: boolean; reduce: boolean }) {
  const Icon = item.icon;
  return (
    <li>
      <Link
        to={item.to}
        aria-current={active ? "page" : undefined}
        className={cn(
          "press group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13.5px] font-semibold transition-colors",
          active ? "text-ink" : "text-ink-soft hover:text-ink",
        )}
      >
        {active ? (
          <motion.span
            layoutId="sidebar-active"
            className="absolute inset-0 rounded-lg border border-border bg-card shadow-soft"
            transition={reduce ? { duration: 0 } : spring}
          />
        ) : (
          <span className="absolute inset-0 rounded-lg bg-muted opacity-0 transition-opacity duration-150 group-hover:opacity-100" />
        )}
        {active && (
          <motion.span
            layoutId="sidebar-bar"
            className="absolute -left-3 top-2 bottom-2 w-[3px] rounded-r-full bg-brand"
            transition={reduce ? { duration: 0 } : spring}
          />
        )}
        <Icon className={cn("relative size-[18px] transition-colors", active ? "text-brand" : "text-moss/80 group-hover:text-moss")} />
        <span className="relative">{item.label}</span>
      </Link>
    </li>
  );
}

function FocusCard() {
  const timer = useSharedStudyTimer();
  if (!timer) return null;
  const { label, progress } = milestoneRemaining(timer.seconds);
  const paused = timer.isPaused;
  const C = 2 * Math.PI * 15;

  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 shadow-[0_1px_2px_rgba(11,46,34,0.04)]">
      <div className="relative grid size-11 shrink-0 place-items-center">
        <svg viewBox="0 0 36 36" className="absolute inset-0 -rotate-90">
          <circle cx="18" cy="18" r="15" fill="none" stroke="currentColor" strokeWidth="3" className="text-muted" />
          <circle
            cx="18"
            cy="18"
            r="15"
            fill="none"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={C}
            strokeDashoffset={C * (1 - progress)}
            className={cn("transition-[stroke-dashoffset] duration-1000 ease-linear", paused ? "text-muted-foreground/50" : "text-brand")}
            stroke="currentColor"
          />
        </svg>
        <Timer className={cn("size-4", paused ? "text-muted-foreground" : "text-forest")} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="eyebrow leading-none">{paused ? "Focus paused" : "Focus session"}</p>
        <p className="tnum mt-1 font-display text-lg font-semibold leading-none text-ink">{label}</p>
        <p className="mt-1 text-[11px] leading-none text-muted-foreground">to +5 pts</p>
      </div>
      <button
        type="button"
        onClick={timer.togglePause}
        aria-label={paused ? "Resume focus timer" : "Pause focus timer"}
        className="press grid size-8 shrink-0 place-items-center rounded-full bg-muted text-ink transition-colors hover:bg-surface-container-high"
      >
        {timer.manualPause ? <Play className="size-3.5 fill-current" /> : <Pause className="size-3.5 fill-current" />}
      </button>
    </div>
  );
}

/* ───────────────────────── Mobile tab ───────────────────────── */

function TabLink({ item, active }: { item: NavItem; active: boolean }) {
  const reduce = useReducedMotion();
  const Icon = item.icon;
  return (
    <li>
      <Link
        to={item.to}
        aria-current={active ? "page" : undefined}
        className="press relative flex flex-col items-center gap-0.5 pb-1.5 pt-2 text-[10.5px] font-semibold"
      >
        <span className="relative grid h-7 w-14 place-items-center">
          {active && (
            <motion.span
              layoutId="tab-pill"
              className="absolute inset-0 rounded-full bg-accent"
              transition={reduce ? { duration: 0 } : spring}
            />
          )}
          <Icon className={cn("relative size-[22px] transition-colors", active ? "text-forest" : "text-muted-foreground")} />
        </span>
        <span className={cn("transition-colors", active ? "text-forest" : "text-muted-foreground")}>{item.label}</span>
      </Link>
    </li>
  );
}

/* ───────────────────────── Shared page primitives ───────────────────────── */

export function PageHeader({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4 sm:mb-8">
      <div className="min-w-0">
        <p className="eyebrow text-brand">{eyebrow}</p>
        <h1 className="mt-1.5 font-display text-[1.75rem] font-semibold leading-[1.1] tracking-tight text-ink sm:text-4xl">
          {title}
        </h1>
        {description && (
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">{description}</p>
        )}
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
    <div className="lift rounded-2xl border border-border bg-card p-5 shadow-soft">
      <div className="flex items-center justify-between">
        <span className="eyebrow">{label}</span>
        <span className="grid size-8 place-items-center rounded-lg bg-muted text-moss">
          <Icon className="size-4" />
        </span>
      </div>
      <p className="tnum mt-3 font-display text-[1.75rem] font-semibold leading-none tracking-tight text-ink sm:text-3xl">
        {value}
      </p>
      {hint && <p className="mt-2 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const ok = status === "verified" || status === "paid";
  const bad = status === "rejected";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize",
        ok && "border-brand/20 bg-brand/10 text-forest",
        bad && "border-destructive/20 bg-destructive/10 text-destructive",
        !ok && !bad && "border-brass/25 bg-brass-soft text-brass-ink",
      )}
    >
      <span className={cn("size-1.5 rounded-full", ok ? "bg-brand" : bad ? "bg-destructive" : "bg-brass")} />
      {status}
    </span>
  );
}
