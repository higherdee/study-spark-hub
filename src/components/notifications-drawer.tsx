import { Bell, Check, Loader2, MessageSquare, Sparkles, X } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { getUserNotifications, markNotificationRead, type UserNotification } from "@/integrations/turso/client";
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

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center sm:place-items-end bg-black/50 p-4 sm:p-6 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-3xl border border-white/20 bg-card p-6 shadow-2xl backdrop-blur-2xl animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border/60 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="grid size-8 place-items-center rounded-full bg-primary/10 text-primary">
              <Bell className="size-4" />
            </div>
            <div>
              <h3 className="font-display text-lg font-bold text-foreground">Notifications</h3>
              <p className="text-xs text-muted-foreground">
                {unreadCount > 0 ? `${unreadCount} unread message${unreadCount > 1 ? "s" : ""}` : "All messages read"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-7 px-2 text-primary"
                onClick={handleMarkAllRead}
              >
                Mark all read
              </Button>
            )}
            <button
              onClick={onClose}
              className="grid size-7 place-items-center rounded-full text-muted-foreground hover:bg-secondary"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>

        <div className="mt-4 max-h-[60vh] overflow-y-auto space-y-3 pr-1">
          {isLoading ? (
            <div className="grid place-items-center py-10">
              <Loader2 className="animate-spin text-primary size-6" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="py-12 text-center text-xs text-muted-foreground">
              <Bell className="mx-auto size-8 text-muted-foreground/40 mb-2" />
              <p className="font-medium text-foreground">No notifications yet</p>
              <p className="mt-0.5">Admin broadcasts and appeal replies will appear here.</p>
            </div>
          ) : (
            notifications.map((n) => {
              const isComplaint = n.type === "complaint_reply";
              const isBroadcast = n.type === "broadcast";
              const isPoints = n.type === "points";

              return (
                <div
                  key={n.id}
                  onClick={() => !n.read && handleMarkRead(n.id)}
                  className={cn(
                    "relative flex items-start gap-3 rounded-2xl border p-3.5 transition-all cursor-pointer",
                    n.read
                      ? "border-border/40 bg-card/60 opacity-80"
                      : "border-primary/30 bg-primary/5 shadow-xs"
                  )}
                >
                  <div
                    className={cn(
                      "grid size-8 shrink-0 place-items-center rounded-xl",
                      isComplaint
                        ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                        : isPoints
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        : "bg-primary/10 text-primary"
                    )}
                  >
                    {isComplaint ? (
                      <MessageSquare className="size-4" />
                    ) : isPoints ? (
                      <Sparkles className="size-4" />
                    ) : (
                      <Bell className="size-4" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-xs text-foreground truncate">{n.title}</p>
                      <span className="text-[10px] text-muted-foreground shrink-0">
                        {new Date(n.created_at).toLocaleDateString([], {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">
                      {n.message}
                    </p>
                  </div>
                  {!n.read && (
                    <div className="size-2 rounded-full bg-primary shrink-0 self-center" />
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
