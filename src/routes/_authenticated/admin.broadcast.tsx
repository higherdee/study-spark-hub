import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Bell, CheckCircle2, Globe, Loader2, Megaphone, Send, Smartphone, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import { getAnnouncements, type Announcement } from "@/integrations/turso/client";
import { createAnnouncementServerFn } from "@/lib/upload.functions";

export const Route = createFileRoute("/_authenticated/admin/broadcast")({
  head: () => ({
    meta: [
      { title: "Broadcast & Announcements — Syllaboss Admin" },
      { name: "description", content: "Send bulk alerts and announcements to students on mobile app and web." },
    ],
  }),
  component: AdminBroadcastPage,
});

function AdminBroadcastPage() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [target, setTarget] = useState<"all" | "app_only" | "web_only">("all");
  const [broadcasting, setBroadcasting] = useState(false);

  const { data: announcements = [], isLoading } = useQuery({
    queryKey: ["admin-announcements"],
    queryFn: async () => {
      return await getAnnouncements();
    },
  });

  async function handleSendBroadcast(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (title.trim().length < 3 || message.trim().length < 5) {
      toast.error("Please enter a descriptive announcement title and message.");
      return;
    }

    setBroadcasting(true);
    try {
      await createAnnouncementServerFn({
        data: {
          title: title.trim(),
          message: message.trim(),
          target,
          adminId: user.id,
        },
      });
      toast.success(`Broadcast sent! In-app notification delivered to targeted students.`);
      setTitle("");
      setMessage("");
      qc.invalidateQueries({ queryKey: ["admin-announcements"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to dispatch broadcast.");
    } finally {
      setBroadcasting(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Communications Console"
        title="Bulk Announcements & Push"
      />

      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        {/* Compose Broadcast Form */}
        <form onSubmit={handleSendBroadcast} className="space-y-4 rounded-3xl border border-border/60 bg-card p-6 shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="grid size-9 place-items-center rounded-2xl bg-primary/10 text-primary">
              <Megaphone className="size-4" />
            </div>
            <div>
              <h2 className="font-display text-lg font-bold text-foreground">Compose Broadcast</h2>
              <p className="text-xs text-muted-foreground">Deliver notifications to student phones & browsers</p>
            </div>
          </div>

          <div className="space-y-1.5 pt-2">
            <Label htmlFor="btitle">Announcement Headline</Label>
            <Input
              id="btitle"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. New MTH 101 Past Questions Uploaded & Verified!"
              className="h-11 rounded-2xl"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Target Audience</Label>
            <div className="grid grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => setTarget("all")}
                className={`flex flex-col items-center rounded-2xl border p-3 text-center transition-all ${
                  target === "all"
                    ? "border-primary bg-primary/10 font-bold text-primary shadow-xs"
                    : "border-border/60 bg-secondary/30 text-muted-foreground hover:bg-secondary"
                }`}
              >
                <Users className="size-4 mb-1" />
                <span className="text-xs">All Students</span>
                <span className="text-[10px] opacity-70">App & Web</span>
              </button>

              <button
                type="button"
                onClick={() => setTarget("app_only")}
                className={`flex flex-col items-center rounded-2xl border p-3 text-center transition-all ${
                  target === "app_only"
                    ? "border-primary bg-primary/10 font-bold text-primary shadow-xs"
                    : "border-border/60 bg-secondary/30 text-muted-foreground hover:bg-secondary"
                }`}
              >
                <Smartphone className="size-4 mb-1" />
                <span className="text-xs">App Users</span>
                <span className="text-[10px] opacity-70">Installed PWA</span>
              </button>

              <button
                type="button"
                onClick={() => setTarget("web_only")}
                className={`flex flex-col items-center rounded-2xl border p-3 text-center transition-all ${
                  target === "web_only"
                    ? "border-primary bg-primary/10 font-bold text-primary shadow-xs"
                    : "border-border/60 bg-secondary/30 text-muted-foreground hover:bg-secondary"
                }`}
              >
                <Globe className="size-4 mb-1" />
                <span className="text-xs">Web Only</span>
                <span className="text-[10px] opacity-70">Browser site</span>
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="bmsg">Message Content</Label>
            <Textarea
              id="bmsg"
              required
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your message to students. Keep it concise, engaging and actionable..."
              className="rounded-2xl text-xs"
            />
          </div>

          <Button
            type="submit"
            disabled={broadcasting}
            className="w-full h-11 rounded-xl text-xs font-semibold gap-1.5 shadow-sm mt-2"
          >
            {broadcasting ? <Loader2 className="animate-spin size-4" /> : <Send className="size-4" />}
            Dispatch Broadcast to Students
          </Button>
        </form>

        {/* Broadcast History */}
        <div className="rounded-3xl border border-border/60 bg-card p-6 shadow-xs flex flex-col">
          <div className="flex items-center gap-2 mb-4">
            <Bell className="size-4 text-primary" />
            <h3 className="font-display text-lg font-bold text-foreground">Recent Broadcasts</h3>
          </div>

          <div className="flex-1 overflow-y-auto max-h-[440px] space-y-3">
            {isLoading ? (
              <div className="py-12 text-center">
                <Loader2 className="animate-spin size-6 text-primary mx-auto" />
              </div>
            ) : announcements.length === 0 ? (
              <p className="py-12 text-center text-xs text-muted-foreground">
                No past announcements found. Create your first broadcast.
              </p>
            ) : (
              announcements.map((a) => (
                <div key={a.id} className="rounded-2xl border border-border/60 bg-secondary/20 p-3.5 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-bold text-foreground truncate">{a.title}</p>
                    <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium capitalize text-muted-foreground">
                      {a.target.replace("_", " ")}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                    {a.message}
                  </p>
                  <p className="text-[10px] text-muted-foreground/70 pt-1">
                    {new Date(a.created_at).toLocaleDateString([], {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
