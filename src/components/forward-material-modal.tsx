import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Send, FileText, Search, Users, User, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/use-auth";
import {
  getStudentConversationsServerFn,
  getStudyGroupsServerFn,
  forwardMaterialToChatServerFn,
} from "@/lib/community.functions";
import { broadcastChatMessage } from "@/lib/supabase-realtime";

interface ForwardMaterialModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  materialId: string;
  materialTitle: string;
  materialCourse?: string | null;
}

export function ForwardMaterialModal({
  open,
  onOpenChange,
  materialId,
  materialTitle,
  materialCourse,
}: ForwardMaterialModalProps) {
  const { user } = useAuth();
  const qc = useQueryClient();

  const [search, setSearch] = useState("");
  const [note, setNote] = useState("");
  const [selectedTarget, setSelectedTarget] = useState<{
    type: "peer" | "group";
    id: string;
    name: string;
  } | null>(null);
  const [forwarding, setForwarding] = useState(false);

  // 1. Fetch user's direct peer conversations
  const { data: conversations = [] } = useQuery({
    queryKey: ["peer-conversations", user?.id],
    enabled: Boolean(user && open),
    queryFn: async () => {
      if (!user) return [];
      return await getStudentConversationsServerFn({ data: { userId: user.id } });
    },
  });

  // 2. Fetch study groups
  const { data: groups = [] } = useQuery({
    queryKey: ["study-groups-forward", user?.id],
    enabled: Boolean(user && open),
    queryFn: async () => {
      return await getStudyGroupsServerFn({ data: { userId: user?.id } });
    },
  });

  // Filter lists
  const filteredPeers = conversations.filter((c: any) =>
    c.peer.full_name.toLowerCase().includes(search.toLowerCase()) ||
    c.peer.username.toLowerCase().includes(search.toLowerCase())
  );

  const filteredGroups = groups.filter((g: any) =>
    g.name.toLowerCase().includes(search.toLowerCase()) ||
    (g.course_code && g.course_code.toLowerCase().includes(search.toLowerCase()))
  );

  async function handleForward() {
    if (!user || !selectedTarget) return;

    setForwarding(true);
    try {
      const res = await forwardMaterialToChatServerFn({
        data: {
          targetType: selectedTarget.type,
          targetId: selectedTarget.id,
          senderId: user.id,
          senderName: user.user_metadata?.full_name || "Scholar",
          materialId,
          note: note.trim() || `Check out this document: "${materialTitle}"`,
        },
      });

      // Broadcast on Supabase Realtime channel
      await broadcastChatMessage(selectedTarget.id, res);

      toast.success(`Material forwarded to ${selectedTarget.name}!`);
      qc.invalidateQueries({ queryKey: ["direct-messages", selectedTarget.id] });
      qc.invalidateQueries({ queryKey: ["group-messages", selectedTarget.id] });
      onOpenChange(false);
      setSelectedTarget(null);
      setNote("");
    } catch (err: any) {
      toast.error(err?.message || "Failed to forward material");
    } finally {
      setForwarding(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-3xl p-6 border-border/80 bg-card text-card-foreground shadow-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold tracking-tight">
            <Send className="size-5 text-emerald-600" />
            Forward to Peers
          </DialogTitle>
          <p className="text-xs text-muted-foreground">
            Share this academic material directly into a study chat or peer thread.
          </p>
        </DialogHeader>

        {/* Selected Document Pill */}
        <div className="mt-3 flex items-center gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-3">
          <div className="grid size-10 place-items-center rounded-xl bg-emerald-600/10 text-emerald-600 shrink-0">
            <FileText className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="text-xs font-semibold text-foreground truncate">{materialTitle}</h4>
            <p className="text-[11px] text-muted-foreground font-mono truncate">
              {materialCourse || "Academic Material"}
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="mt-4 relative">
          <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search peer or group..."
            className="pl-9 rounded-full text-xs h-9"
          />
        </div>

        {/* Chat List */}
        <div className="mt-3 max-h-56 overflow-y-auto space-y-1.5 pr-1">
          {filteredPeers.length === 0 && filteredGroups.length === 0 ? (
            <div className="py-6 text-center text-xs text-muted-foreground">
              No recent chats found. Start a conversation in the Study Hub first!
            </div>
          ) : (
            <>
              {filteredPeers.length > 0 && (
                <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-2 pt-1">
                  Direct Chats
                </div>
              )}
              {filteredPeers.map((c: any) => {
                const isSelected = selectedTarget?.id === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() =>
                      setSelectedTarget({
                        type: "peer",
                        id: c.id,
                        name: `@${c.peer.username}`,
                      })
                    }
                    className={`flex w-full items-center justify-between rounded-xl p-2 text-left transition-all ${
                      isSelected
                        ? "bg-emerald-500/15 border border-emerald-500/40 text-foreground"
                        : "hover:bg-secondary/60 text-muted-foreground"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Avatar className="size-8">
                        <AvatarImage src={c.peer.avatar_url || ""} />
                        <AvatarFallback className="bg-emerald-600 text-xs font-bold text-white">
                          {c.peer.full_name?.charAt(0) || "P"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-foreground truncate">
                          {c.peer.full_name}
                        </p>
                        <p className="text-[10px] font-mono text-emerald-600 truncate">
                          @{c.peer.username}
                        </p>
                      </div>
                    </div>
                    {isSelected && <Check className="size-4 text-emerald-600 shrink-0" />}
                  </button>
                );
              })}

              {filteredGroups.length > 0 && (
                <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-2 pt-2">
                  Study Groups
                </div>
              )}
              {filteredGroups.map((g: any) => {
                const isSelected = selectedTarget?.id === g.id;
                return (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() =>
                      setSelectedTarget({
                        type: "group",
                        id: g.id,
                        name: g.name,
                      })
                    }
                    className={`flex w-full items-center justify-between rounded-xl p-2 text-left transition-all ${
                      isSelected
                        ? "bg-emerald-500/15 border border-emerald-500/40 text-foreground"
                        : "hover:bg-secondary/60 text-muted-foreground"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="grid size-8 place-items-center rounded-full bg-emerald-600/10 text-emerald-600 shrink-0">
                        <Users className="size-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-foreground truncate">{g.name}</p>
                        <p className="text-[10px] text-muted-foreground truncate">
                          {g.course_code || "Group Hub"} • {g.member_count} members
                        </p>
                      </div>
                    </div>
                    {isSelected && <Check className="size-4 text-emerald-600 shrink-0" />}
                  </button>
                );
              })}
            </>
          )}
        </div>

        {/* Optional Note */}
        <div className="mt-3">
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Add a study note for your peer (optional)..."
            className="text-xs h-16 resize-none rounded-xl"
          />
        </div>

        {/* Actions */}
        <div className="mt-4 flex items-center justify-end gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="rounded-full text-xs"
          >
            Cancel
          </Button>
          <Button
            size="sm"
            disabled={!selectedTarget || forwarding}
            onClick={handleForward}
            className="rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold gap-1.5"
          >
            {forwarding ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
            {forwarding ? "Forwarding..." : `Send to ${selectedTarget?.name || "Peer"}`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
