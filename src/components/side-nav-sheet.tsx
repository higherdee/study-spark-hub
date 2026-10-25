import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import {
  AnimatePresence,
  motion,
  useDragControls,
  useReducedMotion,
  type PanInfo,
} from "motion/react";
import {
  ChevronRight,
  Coins,
  Compass,
  Flame,
  HelpCircle,
  LogOut,
  Shield,
  Sparkles,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { useAuth } from "@/hooks/use-auth";
import { useProfile, useIsAdmin } from "@/lib/profile";
import { PLAN_NAME, POINTS_NAME } from "@/lib/constants";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export type MoreItem = { to: string; label: string; icon: LucideIcon; hint?: string };

interface SideNavSheetProps {
  open: boolean;
  onClose: () => void;
  /** Destinations that don't fit on the tab bar. */
  items?: MoreItem[];
  onOpenGuide?: () => void;
}

const SHEET_EASE = [0.32, 0.72, 0, 1] as const;

/**
 * Mobile "More" sheet. Slides up from the tab bar, can be dragged down to
 * dismiss (velocity-aware), and closes on backdrop tap or Escape.
 */
export function SideNavSheet({ open, onClose, items = [] }: SideNavSheetProps) {
  const { user, signOut } = useAuth();
  const { data: profile } = useProfile();
  const { data: isAdmin } = useIsAdmin();
  const [showFaq, setShowFaq] = useState(false);
  const reduce = useReducedMotion();
  const dragControls = useDragControls();
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const focusable = () => Array.from(panelRef.current?.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ) ?? []).filter((element) => !element.hasAttribute("inert") && element.offsetParent !== null);
    requestAnimationFrame(() => (focusable()[0] ?? panelRef.current)?.focus());
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closeRef.current();
      }
      if (e.key !== "Tab") return;
      const elements = focusable();
      if (!elements.length) {
        e.preventDefault();
        panelRef.current?.focus();
        return;
      }
      const first = elements[0];
      const last = elements[elements.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
      previousFocus?.focus();
    };
  }, [open]);

  const name = profile?.full_name || user?.email?.split("@")[0] || "Student";
  const initial = name.charAt(0).toUpperCase();

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.y > 110 || info.velocity.y > 520) onClose();
  };

  return (
    <>
      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-[100] flex items-end justify-center lg:items-center lg:p-6">
            <motion.div
              key="scrim"
              className="absolute inset-0 bg-ink/45 backdrop-blur-[2px]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reduce ? 0 : 0.22 }}
              onClick={onClose}
            />

            <motion.div
              key="panel"
              ref={panelRef}
              role="dialog"
              aria-modal="true"
              aria-label="More"
              tabIndex={-1}
              className="relative flex max-h-[88dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-[1.75rem] border border-border bg-background shadow-pop lg:rounded-[1.75rem]"
              initial={{ y: reduce ? 0 : "100%", opacity: reduce ? 0 : 1 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: reduce ? 0 : "100%", opacity: reduce ? 0 : 1 }}
              transition={{ duration: reduce ? 0.01 : 0.42, ease: SHEET_EASE }}
              drag="y"
              dragControls={dragControls}
              dragListener={false}
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0.04, bottom: 0.6 }}
              onDragEnd={onDragEnd}
            >
              {/* Grab handle */}
              <div
                className="flex shrink-0 cursor-grab touch-none justify-center pt-2.5 pb-1 active:cursor-grabbing"
                onPointerDown={(e) => dragControls.start(e)}
              >
                <span className="h-1 w-10 rounded-full bg-border" />
              </div>

              <div className="flex-1 overflow-y-auto overscroll-contain px-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
                {/* Identity */}
                <div className="flex items-center gap-3 py-3">
                  <div className="grid size-12 shrink-0 place-items-center rounded-full bg-forest font-display text-lg font-semibold text-accent">
                    {initial}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-display text-lg font-semibold leading-tight text-ink">
                      {name}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {profile?.institution || "Nigerian University"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={onClose}
                    aria-label="Close"
                    className="grid size-9 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted active:scale-90"
                  >
                    <X className="size-5" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <Stat
                    icon={<Coins className="size-4 text-brass" />}
                    label={POINTS_NAME}
                    value={(profile?.points ?? 0).toLocaleString()}
                  />
                  <Stat
                    icon={<Flame className="size-4 text-brass" />}
                    label="Day streak"
                    value={String(profile?.current_streak || 0)}
                  />
                </div>

                {profile?.sylla_plus && (
                  <div className="mt-2.5 flex w-fit items-center gap-1.5 rounded-full border border-brass/30 bg-brass-soft px-3 py-1 text-[11px] font-semibold text-brass-ink">
                    <Sparkles className="size-3" /> {PLAN_NAME} active
                  </div>
                )}

                {/* Destinations */}
                <ul className="mt-4 overflow-hidden rounded-2xl border border-border bg-card">
                  {items.map((item, i) => (
                    <li
                      key={item.to}
                      className={cn(i > 0 && "border-t border-border")}
                      style={{
                        animation: reduce ? undefined : `rise 0.4s var(--ease-out) ${60 + i * 35}ms both`,
                      }}
                    >
                      <Link
                        to={item.to}
                        onClick={onClose}
                        className="group flex items-center gap-3.5 px-4 py-3.5 transition-colors active:bg-muted hover:bg-muted/60"
                      >
                        <span className="grid size-9 place-items-center rounded-xl bg-muted text-moss transition-colors group-hover:bg-accent">
                          <item.icon className="size-[18px]" />
                        </span>
                        <span className="flex-1 text-sm font-semibold text-foreground">
                          {item.label}
                        </span>
                        <ChevronRight className="size-4 text-muted-foreground/70 transition-transform group-hover:translate-x-0.5" />
                      </Link>
                    </li>
                  ))}
                </ul>

                <ul className="mt-3 overflow-hidden rounded-2xl border border-border bg-card">
                  <li>
                    <button
                      type="button"
                      onClick={() => setShowFaq(true)}
                      className="group flex w-full items-center gap-3.5 px-4 py-3.5 text-left transition-colors hover:bg-muted/60 active:bg-muted"
                    >
                      <span className="grid size-9 place-items-center rounded-xl bg-muted text-moss">
                        <HelpCircle className="size-[18px]" />
                      </span>
                      <span className="flex-1 text-sm font-semibold text-foreground">
                        Help &amp; FAQs
                      </span>
                      <ChevronRight className="size-4 text-muted-foreground/70" />
                    </button>
                  </li>
                  {isAdmin && (
                    <li className="border-t border-border">
                      <Link
                        to="/admin"
                        onClick={onClose}
                        className="group flex items-center gap-3.5 px-4 py-3.5 transition-colors hover:bg-muted/60 active:bg-muted"
                      >
                        <span className="grid size-9 place-items-center rounded-xl bg-muted text-moss">
                          <Shield className="size-[18px]" />
                        </span>
                        <span className="flex-1 text-sm font-semibold text-foreground">
                          Admin console
                        </span>
                        <ChevronRight className="size-4 text-muted-foreground/70" />
                      </Link>
                    </li>
                  )}
                </ul>

                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    signOut();
                  }}
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-destructive/20 bg-destructive/5 py-3 text-sm font-semibold text-destructive transition-colors hover:bg-destructive/10 active:scale-[0.98]"
                >
                  <LogOut className="size-4" /> Sign out
                </button>

                <p className="mt-4 text-center text-[11px] text-muted-foreground">
                  Syllaboss · Study with direction
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <FaqModal open={showFaq} onClose={() => setShowFaq(false)} />
    </>
  );
}

function Stat({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card px-4 py-3">
      <div className="flex items-center gap-1.5">
        {icon}
        <span className="eyebrow">{label}</span>
      </div>
      <p className="tnum mt-1 font-display text-2xl font-semibold leading-none text-ink">{value}</p>
    </div>
  );
}

const FAQS: Array<[string, string]> = [
  [
    "How do I earn SyllaPoints?",
    "Eligible study activity and approved contributions may earn SyllaPoints. Your wallet shows the current rates, activity, and balance.",
  ],
  [
    "Can I download files directly?",
    "Available materials have a Download action. You need an internet connection to open the library and start a download.",
  ],
  [
    "What is the minimum withdrawal?",
    "Current minimums, payout options, and availability are shown in your wallet. Requests may be reviewed before processing.",
  ],
  [
    "How does Boss AI work?",
    "Boss AI can help explain course topics and support revision. Check important answers against your course materials and lecturer guidance.",
  ],
];

function FaqModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent className="max-w-lg p-5 sm:p-6">
        <DialogHeader className="border-b border-border pb-3">
          <DialogTitle className="font-display text-xl font-medium text-ink">
            Frequently asked questions
          </DialogTitle>
          <DialogDescription className="sr-only">Answers about studying, downloads, points, and Boss AI.</DialogDescription>
        </DialogHeader>
        <div className="max-h-[min(60dvh,32rem)] space-y-5 overflow-y-auto pr-1">
          {FAQS.map(([q, a]) => (
            <div key={q}>
              <p className="text-sm font-semibold text-ink">{q}</p>
              <p className="mt-1 text-sm leading-relaxed text-ink-soft">{a}</p>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
