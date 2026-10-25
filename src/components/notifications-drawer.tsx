import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, MessageSquare, Sparkles, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/hooks/use-auth";
import { getUserNotifications, markNotificationRead } from "@/integrations/turso/client";
import { cn } from "@/lib/utils";

interface NotificationsDrawerProps {
  open: boolean;
  onClose: () => void;
}

export function NotificationsDrawer({ open, onClose }: NotificationsDrawerProps) {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ["user-notifications", user?.id],
    enabled: Boolean(user) && open,
    queryFn: async () => {
      if (!user) return [];
      return await getUserNotifications(user.id);
    },
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  async function handleMarkRead(id: string) {
    try {
      await markNotificationRead(id);
      qc.invalidateQueries({ queryKey: ["user-notifications"] });
    } catch {
      // non-blocking
    }
  }

  async function handleMarkAllRead() {
    try {
      for (const n of notifications) {
        if (!n.read) {
          await markNotificationRead(n.id);
        }
      }
      qc.invalidateQueries({ queryKey: ["user-notifications"] });
      toast.success("All caught up!");
    } catch {
      toast.error("Failed to mark notifications read.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="bottom-0 left-0 top-auto flex max-h-[85dvh] w-full max-w-none translate-x-0 translate-y-0 flex-col overflow-y-hidden rounded-t-3xl rounded-b-none p-0 sm:bottom-auto sm:left-auto sm:right-0 sm:top-0 sm:h-dvh sm:max-h-dvh sm:w-[26rem] sm:translate-x-0 sm:translate-y-0 sm:rounded-l-3xl sm:rounded-r-none"
      >
        <header className="flex items-center justify-between border-b border-border px-5 py-4">
          <DialogHeader className="min-w-0 text-left">
            <DialogTitle className="font-display text-xl font-medium text-ink">Notifications</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground tnum">
              {unreadCount > 0 ? `${unreadCount} unread` : "You're all caught up"}
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-9 px-2.5 text-xs font-semibold text-forest"
                onClick={handleMarkAllRead}
              >
                Mark all read
              </Button>
            )}
            <button
              type="button"
              aria-label="Close notifications"
              onClick={onClose}
              className="press grid size-9 place-items-center rounded-full text-muted-foreground hover:bg-secondary"
            >
              <X className="size-4" />
            </button>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-4 pb-safe">
              {isLoading ? (
                <div className="space-y-3">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="flex gap-3 rounded-2xl border border-border p-3.5">
                      <div className="skeleton size-9 rounded-xl" />
                      <div className="flex-1 space-y-2">
                        <div className="skeleton h-3.5 w-1/2 rounded" />
                        <div className="skeleton h-3 w-full rounded" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : notifications.length === 0 ? (
                <div className="grid place-items-center px-6 py-16 text-center">
                  <span className="grid size-12 place-items-center rounded-2xl bg-muted text-moss">
                    <Bell className="size-6" />
                  </span>
                  <p className="mt-4 font-display text-lg text-ink">Nothing yet</p>
                  <p className="mt-1 text-sm text-ink-soft">
                    Announcements, point rewards and replies to your appeals will show up here.
                  </p>
                </div>
              ) : (
                <ul className="stagger space-y-2.5">
                  {notifications.map((n) => {
                    const isComplaint = n.type === "complaint_reply";
                    const isPoints = n.type === "points";
                    return (
                      <li key={n.id}>
                        <button
                          type="button"
                          onClick={() => !n.read && handleMarkRead(n.id)}
                          className={cn(
                            "press flex w-full items-start gap-3 rounded-2xl border p-3.5 text-left transition-colors duration-150",
                            n.read
                              ? "border-border bg-surface-container-low"
                              : "border-brand/30 bg-card shadow-[var(--elev-1)]",
                          )}
                        >
                          <span
                            className={cn(
                              "grid size-9 shrink-0 place-items-center rounded-xl",
                              isComplaint
                                ? "bg-brass-soft text-brass-ink"
                                : isPoints
                                  ? "bg-accent text-forest"
                                  : "bg-muted text-moss",
                            )}
                          >
                            {isComplaint ? (
                              <MessageSquare className="size-4" />
                            ) : isPoints ? (
                              <Sparkles className="size-4" />
                            ) : (
                              <Bell className="size-4" />
                            )}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center justify-between gap-2">
                              <span className="truncate text-sm font-semibold text-ink">
                                {n.title}
                              </span>
                              <span className="shrink-0 text-[11px] text-muted-foreground">
                                {new Date(n.created_at).toLocaleDateString([], {
                                  month: "short",
                                  day: "numeric",
                                })}
                              </span>
                            </span>
                            <span className="mt-0.5 block whitespace-pre-wrap text-xs leading-relaxed text-ink-soft">
                              {n.message}
                            </span>
                          </span>
                          {!n.read && (
                            <span className="mt-1.5 size-2 shrink-0 rounded-full bg-brand" />
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
