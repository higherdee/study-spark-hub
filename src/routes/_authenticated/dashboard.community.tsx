import { useState, useRef, useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Users,
  MessageSquare,
  Send,
  Plus,
  Search,
  Paperclip,
  GraduationCap,
  FileText,
  ExternalLink,
  ChevronRight,
  Flame,
  ArrowLeft,
  QrCode,
  ScanLine,
  Check,
  CheckCheck,
  UserPlus,
  Sparkles,
  BookOpen,
  X,
  Share2,
  Clock,
  MoreVertical,
  Upload,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/hooks/use-auth";
import { useProfile } from "@/lib/profile";
import {
  getStudentConversationsServerFn,
  getDirectMessagesServerFn,
  sendDirectMessageServerFn,
  getStudyGroupsServerFn,
  createStudyGroupServerFn,
  getGroupMessagesServerFn,
  sendGroupMessageServerFn,
  searchPeersServerFn,
  getOrCreatePeerConversationServerFn,
  getMaterialsForChatServerFn,
  updateStreakServerFn,
} from "@/lib/community.functions";
import {
  subscribeToChatChannel,
  broadcastChatMessage,
} from "@/lib/supabase-realtime";
import { StudentQrModal } from "@/components/student-qr-modal";
import { QrScannerModal } from "@/components/qr-scanner-modal";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/dashboard/community")({
  head: () => ({
    meta: [
      { title: "Student Study Chats & Groups — Syllaboss" },
      {
        name: "description",
        content: "Chat with peers, create study groups, and share verified academic materials in real-time.",
      },
    ],
  }),
  component: CommunityPage,
});

type ChatType = "peer" | "group";

interface ActiveChat {
  type: ChatType;
  id: string; // conversationId for peer, groupId for group
  title: string;
  subtitle?: string | null;
  avatarUrl?: string | null;
  peerId?: string;
  memberCount?: number;
}

function CommunityPage() {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const queryClient = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Navigation & View States
  const [activeChat, setActiveChat] = useState<ActiveChat | null>(null);
  const [chatTab, setChatTab] = useState<"all" | "direct" | "groups">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [messageInput, setMessageInput] = useState("");

  // Modals
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [isNewDirectChatOpen, setIsNewDirectChatOpen] = useState(false);
  const [isAttachMaterialOpen, setIsAttachMaterialOpen] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<{
    id: string;
    title: string;
    course: string;
  } | null>(null);

  // New Group Form
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupDesc, setNewGroupDesc] = useState("");
  const [newGroupCourse, setNewGroupCourse] = useState("");

  // Direct Peer Search
  const [peerSearchQuery, setPeerSearchQuery] = useState("");

  // 1. Fetch 1-on-1 Direct Conversations
  const { data: directConversations = [], refetch: refetchConversations } = useQuery({
    queryKey: ["direct-conversations", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      if (!user) return [];
      return await getStudentConversationsServerFn({ data: { userId: user.id } });
    },
    refetchInterval: 12000,
  });

  // 2. Fetch Study Groups
  const { data: studyGroups = [], refetch: refetchGroups } = useQuery({
    queryKey: ["study-groups", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      return await getStudyGroupsServerFn({ data: { userId: user?.id } });
    },
    refetchInterval: 15000,
  });

  // 3. Search Peers for New Direct Chat
  const { data: searchedPeers = [], isFetching: isSearchingPeers } = useQuery({
    queryKey: ["search-peers", peerSearchQuery, user?.id],
    enabled: Boolean(user?.id && peerSearchQuery.trim().length >= 1),
    queryFn: async () => {
      return await searchPeersServerFn({
        data: { query: peerSearchQuery.trim(), currentUserId: user?.id },
      });
    },
  });

  // 4. Fetch Available Materials for Attachment Picker
  const { data: availableMaterials = [] } = useQuery({
    queryKey: ["materials-for-chat"],
    enabled: isAttachMaterialOpen,
    queryFn: async () => {
      return await getMaterialsForChatServerFn();
    },
  });

  // 5. Active Chat Messages Query
  const isDirect = activeChat?.type === "peer";
  const { data: chatMessages = [], refetch: refetchActiveMessages } = useQuery({
    queryKey: [isDirect ? "direct-messages" : "group-messages", activeChat?.id],
    enabled: Boolean(activeChat?.id),
    queryFn: async () => {
      if (!activeChat) return [];
      if (activeChat.type === "peer") {
        return await getDirectMessagesServerFn({ data: { conversationId: activeChat.id } });
      } else {
        return await getGroupMessagesServerFn({ data: { groupId: activeChat.id } });
      }
    },
  });

  // Attach Material Search & Device Upload
  const [materialSearchQuery, setMaterialSearchQuery] = useState("");
  const fileUploadInputRef = useRef<HTMLInputElement>(null);
  const hasInitializedDesktopChatRef = useRef(false);

  // Auto-hide bottom navigation dock on mobile when active chat is open
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (activeChat && window.innerWidth < 768) {
      document.body.classList.add("hide-bottom-dock");
    } else {
      document.body.classList.remove("hide-bottom-dock");
    }
    return () => {
      document.body.classList.remove("hide-bottom-dock");
    };
  }, [activeChat]);

  // Default selection on desktop ONLY (never auto-reopen on mobile when user presses back)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const isDesktop = window.innerWidth >= 768;
    if (!isDesktop) return;

    if (!hasInitializedDesktopChatRef.current && !activeChat) {
      if (directConversations.length > 0) {
        const first = directConversations[0];
        setActiveChat({
          type: "peer",
          id: first.id,
          title: first.peer.full_name,
          subtitle: `@${first.peer.username}`,
          avatarUrl: first.peer.avatar_url,
          peerId: first.peer.id,
        });
        hasInitializedDesktopChatRef.current = true;
      } else if (studyGroups.length > 0) {
        const first = studyGroups[0];
        setActiveChat({
          type: "group",
          id: first.id,
          title: first.name,
          subtitle: `${first.member_count} members`,
          memberCount: first.member_count,
        });
        hasInitializedDesktopChatRef.current = true;
      }
    }
  }, [directConversations, studyGroups]);

  // Supabase Realtime Subscription for active chat
  useEffect(() => {
    if (!activeChat?.id) return;

    const channel = subscribeToChatChannel(activeChat.id, (payload) => {
      refetchActiveMessages();
      refetchConversations();
    });

    return () => {
      channel.unsubscribe();
    };
  }, [activeChat?.id]);

  // Auto-scroll messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  // Start 1-on-1 Chat with peer
  async function startDirectChatWithPeer(peer: any) {
    if (!user) return;
    try {
      const res = await getOrCreatePeerConversationServerFn({
        data: { user1Id: user.id, user2Id: peer.id },
      });
      await refetchConversations();
      setActiveChat({
        type: "peer",
        id: res.id,
        title: peer.full_name || `@${peer.username}`,
        subtitle: `@${peer.username}`,
        avatarUrl: peer.avatar_url,
        peerId: peer.id,
      });
      setIsNewDirectChatOpen(false);
      setPeerSearchQuery("");
      toast.success(`Chat started with @${peer.username}`);
    } catch (err: any) {
      toast.error(err?.message || "Failed to start direct chat");
    }
  }

  // Send Message in Active Chat
  async function handleSendMessage(e?: React.FormEvent) {
    e?.preventDefault();
    if (!user || !activeChat || (!messageInput.trim() && !selectedMaterial)) return;

    const content = messageInput.trim() || `Shared document: "${selectedMaterial?.title}"`;
    const matId = selectedMaterial?.id;
    const matTitle = selectedMaterial?.title;
    const matCourse = selectedMaterial?.course;

    setMessageInput("");
    setSelectedMaterial(null);

    try {
      if (activeChat.type === "peer") {
        const newMsg = await sendDirectMessageServerFn({
          data: {
            conversationId: activeChat.id,
            senderId: user.id,
            content,
            materialId: matId,
          },
        });
        await broadcastChatMessage(activeChat.id, newMsg);
      } else {
        const newMsg = await sendGroupMessageServerFn({
          data: {
            groupId: activeChat.id,
            userId: user.id,
            userName: profile?.username ? `@${profile.username}` : user.user_metadata?.full_name || "Scholar",
            userInstitution: profile?.institution || undefined,
            content,
            materialId: matId,
            materialTitle: matTitle,
            materialCourseCode: matCourse,
          },
        });
        await broadcastChatMessage(activeChat.id, newMsg);
      }

      await refetchActiveMessages();
      await refetchConversations();
    } catch (err: any) {
      toast.error(err?.message || "Message delivery failed");
    }
  }

  // Create Study Group (only name is required!)
  async function handleCreateGroup(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !newGroupName.trim()) {
      toast.error("Please enter a group name");
      return;
    }

    try {
      const created = await createStudyGroupServerFn({
        data: {
          name: newGroupName.trim(),
          description: newGroupDesc.trim() || undefined,
          course_code: newGroupCourse.trim() || undefined,
          userId: user.id,
        },
      });

      await refetchGroups();
      setIsCreateGroupOpen(false);
      setNewGroupName("");
      setNewGroupDesc("");
      setNewGroupCourse("");

      setActiveChat({
        type: "group",
        id: created.id,
        title: created.name,
        subtitle: "1 member",
        memberCount: 1,
      });

      toast.success(`Group "${created.name}" created!`);
    } catch (err: any) {
      toast.error(err?.message || "Failed to create group");
    }
  }

  // Streak check-in
  const streakMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Sign in required");
      return await updateStreakServerFn({ data: { userId: user.id } });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast.success(`🔥 Streak updated to ${data.currentStreak} days!`, {
        description: "Keep reading daily to build academic momentum.",
      });
    },
  });

  // Handle scanned student QR Code
  async function handleScanPeer(scannedUsername: string) {
    setIsScannerOpen(false);
    if (!user) {
      toast.error("Please sign in to connect with peers.");
      return;
    }
    if (scannedUsername.toLowerCase() === profile?.username?.toLowerCase()) {
      toast.info("That's your own SyllaID QR code!");
      return;
    }

    try {
      const peers = await searchPeersServerFn({
        data: { query: scannedUsername, currentUserId: user.id },
      });
      const peer =
        peers.find(
          (p: any) => p.username?.toLowerCase() === scannedUsername.toLowerCase()
        ) || peers[0];

      if (!peer) {
        toast.error(`Student @${scannedUsername} could not be found.`);
        return;
      }

      const conv = await getOrCreatePeerConversationServerFn({
        data: { user1Id: user.id, user2Id: peer.id },
      });

      await queryClient.invalidateQueries({ queryKey: ["student-conversations"] });

      setActiveChat({
        type: "peer",
        id: conv.id,
        title: peer.full_name,
        subtitle: `@${peer.username}`,
        avatarUrl: peer.avatar_url,
        peerId: peer.id,
      });
      toast.success(`Connected with @${peer.username}!`);
    } catch {
      toast.error("Could not start conversation with scanned student.");
    }
  }

  // Filter conversations
  const filteredPeers = directConversations.filter((c: any) =>
    c.peer.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.peer.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredGroups = studyGroups.filter((g: any) =>
    g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (g.course_code && g.course_code.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div
      data-chat-active={Boolean(activeChat)}
      className="flex min-h-0 h-full w-full max-w-[1440px] mx-auto overflow-hidden rounded-none sm:rounded-3xl border-y sm:border border-border/80 bg-card shadow-xl font-sans sm:min-h-[min(760px,calc(100dvh-7rem))]"
    >
      {/* ========================================================================= */}
      {/* LEFT SIDEBAR: Conversations List (WhatsApp / Telegram / iMessage Style) */}
      {/* ========================================================================= */}
      <div
        className={cn(
          "w-full md:w-[22rem] lg:w-[25rem] flex flex-col border-r border-border/70 bg-secondary/15 shrink-0 transition-all",
          activeChat ? "hidden md:flex" : "flex"
        )}
      >
        {/* Top Header with User Info & Actions */}
        <div className="p-3.5 border-b border-border/70 flex items-center justify-between gap-2 bg-card">
          <div className="flex items-center gap-2.5 min-w-0">
            <Avatar className="size-9 ring-2 ring-emerald-500/20">
              <AvatarImage src={profile?.avatar_url || ""} />
              <AvatarFallback className="bg-emerald-600 text-xs font-bold text-white">
                {profile?.full_name?.charAt(0) || "U"}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <h2 className="text-xs font-bold text-foreground truncate">
                {profile?.full_name || "Scholar"}
              </h2>
              <p className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 truncate">
                @{profile?.username || "student"}
              </p>
            </div>
          </div>

          {/* Action Icons */}
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsQrModalOpen(true)}
              title="Show my SyllaID QR"
              className="size-8 rounded-full text-muted-foreground hover:text-emerald-600 hover:bg-emerald-500/10"
            >
              <QrCode className="size-4" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsScannerOpen(true)}
              title="Scan peer QR code"
              className="size-8 rounded-full text-muted-foreground hover:text-emerald-600 hover:bg-emerald-500/10"
            >
              <ScanLine className="size-4" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsNewDirectChatOpen(true)}
              title="Start new direct chat"
              className="size-8 rounded-full text-muted-foreground hover:text-foreground"
            >
              <MessageSquare className="size-4" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsCreateGroupOpen(true)}
              title="Create new group"
              className="size-8 rounded-full text-muted-foreground hover:text-foreground"
            >
              <Users className="size-4" />
            </Button>
          </div>
        </div>


        {/* Search Bar */}
        <div className="p-3 border-b border-border/70 bg-card/60">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 size-3.5 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search chats, peers, or groups..."
              className="pl-8 text-xs h-8 rounded-full bg-secondary/50 border-border/60"
            />
          </div>

          {/* Segmented Filter Pills */}
          <div className="mt-2.5 flex items-center gap-1.5">
            <button
              onClick={() => setChatTab("all")}
              className={cn(
                "px-2.5 py-0.5 rounded-full text-[11px] font-semibold transition-all",
                chatTab === "all"
                  ? "bg-emerald-600 text-white shadow-2xs"
                  : "bg-secondary/60 text-muted-foreground hover:text-foreground"
              )}
            >
              All
            </button>
            <button
              onClick={() => setChatTab("direct")}
              className={cn(
                "px-2.5 py-0.5 rounded-full text-[11px] font-semibold transition-all",
                chatTab === "direct"
                  ? "bg-emerald-600 text-white shadow-2xs"
                  : "bg-secondary/60 text-muted-foreground hover:text-foreground"
              )}
            >
              Direct ({directConversations.length})
            </button>
            <button
              onClick={() => setChatTab("groups")}
              className={cn(
                "px-2.5 py-0.5 rounded-full text-[11px] font-semibold transition-all",
                chatTab === "groups"
                  ? "bg-emerald-600 text-white shadow-2xs"
                  : "bg-secondary/60 text-muted-foreground hover:text-foreground"
              )}
            >
              Groups ({studyGroups.length})
            </button>
          </div>
        </div>

        {/* Conversation List Stream */}
        <div className="flex-1 overflow-y-auto divide-y divide-border/40">
          {/* Empty State for New User */}
          {filteredPeers.length === 0 && filteredGroups.length === 0 && (
            <div className="p-6 text-center flex flex-col items-center">
              <div className="size-12 rounded-full bg-emerald-500/10 text-emerald-600 grid place-items-center mb-3">
                <Users className="size-6" />
              </div>
              <h3 className="text-xs font-bold text-foreground">No chats yet</h3>
              <p className="mt-1 text-[11px] text-muted-foreground leading-relaxed">
                Connect with peers by username or join study groups to start sharing materials.
              </p>
              <div className="mt-4 flex flex-col gap-2 w-full">
                <Button
                  size="sm"
                  onClick={() => setIsNewDirectChatOpen(true)}
                  className="rounded-full text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold gap-1.5"
                >
                  <Search className="size-3.5" /> Find Peers
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsCreateGroupOpen(true)}
                  className="rounded-full text-xs font-semibold gap-1.5"
                >
                  <Plus className="size-3.5" /> Create Group
                </Button>
              </div>
            </div>
          )}

          {/* Direct Peer Conversations */}
          {(chatTab === "all" || chatTab === "direct") &&
            filteredPeers.map((conv: any) => {
              const isSelected = activeChat?.id === conv.id && activeChat.type === "peer";
              return (
                <button
                  key={conv.id}
                  onClick={() =>
                    setActiveChat({
                      type: "peer",
                      id: conv.id,
                      title: conv.peer.full_name,
                      subtitle: `@${conv.peer.username}`,
                      avatarUrl: conv.peer.avatar_url,
                      peerId: conv.peer.id,
                    })
                  }
                  className={cn(
                    "flex w-full items-center gap-3 p-3 text-left transition-all hover:bg-secondary/50",
                    isSelected ? "bg-emerald-500/10 border-l-4 border-emerald-600" : ""
                  )}
                >
                  <Avatar className="size-10 shrink-0">
                    <AvatarImage src={conv.peer.avatar_url || ""} />
                    <AvatarFallback className="bg-emerald-600 text-xs font-bold text-white">
                      {conv.peer.full_name?.charAt(0) || "P"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-semibold text-foreground truncate">
                        {conv.peer.full_name}
                      </h4>
                      <span className="text-[10px] text-muted-foreground shrink-0 font-medium">
                        {conv.last_message_at ? new Date(conv.last_message_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-0.5">
                      <p className="text-[11px] text-muted-foreground truncate">
                        {conv.last_message_text || "Started conversation"}
                      </p>
                      <span className="text-[10px] text-emerald-600 font-medium">
                        @{conv.peer.username}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}

          {/* Study Group Channels */}
          {(chatTab === "all" || chatTab === "groups") &&
            filteredGroups.map((group: any) => {
              const isSelected = activeChat?.id === group.id && activeChat.type === "group";
              return (
                <button
                  key={group.id}
                  onClick={() =>
                    setActiveChat({
                      type: "group",
                      id: group.id,
                      title: group.name,
                      subtitle: `${group.member_count} members`,
                      memberCount: group.member_count,
                    })
                  }
                  className={cn(
                    "flex w-full items-center gap-3 p-3 text-left transition-all hover:bg-secondary/50",
                    isSelected ? "bg-emerald-500/10 border-l-4 border-emerald-600" : ""
                  )}
                >
                  <div className="grid size-10 place-items-center rounded-full bg-emerald-600/10 text-emerald-600 shrink-0 font-bold text-xs">
                    <Users className="size-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-semibold text-foreground truncate">
                        {group.name}
                      </h4>
                      {group.course_code && (
                        <Badge variant="outline" className="text-[9px] px-1.5 py-0 font-medium">
                          {group.course_code}
                        </Badge>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                      {group.description || `${group.member_count} active course peers`}
                    </p>
                  </div>
                </button>
              );
            })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* RIGHT SIDE: Active Chat Room Stream (WhatsApp / Telegram / iMessage)   */}
      {/* ========================================================================= */}
      <div
        className={cn(
          "flex-1 min-h-0 flex flex-col bg-background h-full overflow-hidden",
          activeChat ? "flex" : "hidden md:flex"
        )}
      >
        {activeChat ? (
          <>
            {/* Active Chat Header */}
            <div className="p-3.5 border-b border-border/70 flex items-center justify-between bg-card shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                {/* Mobile Back Button */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setActiveChat(null);
                    hasInitializedDesktopChatRef.current = true;
                    if (typeof window !== "undefined") {
                      document.body.classList.remove("hide-bottom-dock");
                    }
                  }}
                  className="size-8 rounded-full md:hidden text-muted-foreground hover:text-foreground"
                >
                  <ArrowLeft className="size-4" />
                </Button>

                <Avatar className="size-9 ring-1 ring-border shrink-0">
                  <AvatarImage src={activeChat.avatarUrl || ""} />
                  <AvatarFallback className="bg-emerald-600 text-xs font-bold text-white">
                    {activeChat.title?.charAt(0) || "C"}
                  </AvatarFallback>
                </Avatar>

                <div className="min-w-0">
                  <h3 className="text-xs sm:text-sm font-bold text-foreground truncate leading-tight">
                    {activeChat.title}
                  </h3>
                  <p className="text-[11px] text-muted-foreground font-medium truncate">
                    {activeChat.subtitle || (activeChat.type === "peer" ? "Active now" : "Course Hub")}
                  </p>
                </div>
              </div>

              {/* Chat Header Actions */}
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAttachMaterialOpen(true)}
                  className="rounded-full text-xs font-semibold gap-1.5 h-8 border-emerald-500/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10"
                >
                  <BookOpen className="size-3.5" />
                  <span className="hidden sm:inline">Attach Material</span>
                </Button>
              </div>
            </div>

            {/* Chat Messages Stream */}
            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain scroll-smooth p-3.5 pb-6 sm:p-5 sm:pb-8 space-y-3.5 bg-slate-50/60 dark:bg-zinc-950/40 [scrollbar-width:thin] [scrollbar-color:theme(colors.border)_transparent]">
              {chatMessages.length === 0 ? (
                <div className="py-16 text-center flex flex-col items-center">
                  <div className="size-12 rounded-full bg-emerald-500/10 text-emerald-600 grid place-items-center mb-2">
                    <MessageSquare className="size-5" />
                  </div>
                  <h4 className="text-xs font-semibold text-foreground">
                    Start of conversation
                  </h4>
                  <p className="text-[11px] text-muted-foreground max-w-xs mt-1">
                    Send a message or attach a textbook, lecture note, or past question to discuss.
                  </p>
                </div>
              ) : (
                chatMessages.map((msg: any) => {
                  const isMe = msg.sender_id === user?.id || msg.user_id === user?.id;
                  const senderDisplay = msg.sender_name || msg.user_name || "Scholar";
                  const matId = msg.material_id;
                  const matTitle = msg.material_title;
                  const matCourse = msg.material_course || msg.material_course_code;

                  return (
                    <div
                      key={msg.id}
                      className={cn(
                        "flex flex-col max-w-[85%] sm:max-w-[70%]",
                        isMe ? "ml-auto items-end" : "mr-auto items-start"
                      )}
                    >
                      {/* Sender Tag in Group Chat */}
                      {!isMe && activeChat.type === "group" && (
                        <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 mb-0.5 px-1 font-sans">
                          {senderDisplay}
                        </span>
                      )}

                      {/* Bubble */}
                      <div
                        className={cn(
                          "rounded-2xl px-3.5 py-2 text-xs shadow-xs leading-relaxed space-y-2",
                          isMe
                            ? "bg-emerald-600 text-white rounded-br-xs"
                            : "bg-card border border-border/80 text-foreground rounded-bl-xs"
                        )}
                      >
                        {/* Material Card Attachment if Present */}
                        {matId && (
                          <div
                            className={cn(
                              "rounded-xl p-2.5 flex items-center justify-between gap-2.5 transition-all",
                              isMe
                                ? "bg-emerald-700/60 border border-emerald-400/30 text-white"
                                : "bg-secondary/70 border border-border text-foreground"
                            )}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <FileText className="size-4 shrink-0 text-emerald-300" />
                              <div className="min-w-0">
                                <p className="font-semibold truncate text-[11px] leading-tight">
                                  {matTitle || "Course Document"}
                                </p>
                                <p className="text-[10px] font-sans opacity-80 truncate">
                                  {matCourse || "Academic Library"}
                                </p>
                              </div>
                            </div>
                            <Button
                              size="sm"
                              variant="secondary"
                              asChild
                              className="h-6 px-2 text-[10px] font-semibold rounded-full shrink-0"
                            >
                              <Link to="/dashboard/preview" search={{ id: matId }}>
                                Open <ExternalLink className="size-2.5 ml-1" />
                              </Link>
                            </Button>
                          </div>
                        )}

                        <p className="whitespace-pre-wrap break-words">{msg.content}</p>

                        <div
                          className={cn(
                            "flex items-center justify-end gap-1 text-[9px] pt-0.5 opacity-75 font-sans font-medium",
                            isMe ? "text-emerald-100" : "text-muted-foreground"
                          )}
                        >
                          <span>
                            {new Date(msg.created_at).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                          {isMe && <CheckCheck className="size-3" />}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Selected Attachment Banner in Composer */}
            {selectedMaterial && (
              <div className="px-3.5 py-2 bg-emerald-500/10 border-t border-emerald-500/20 flex items-center justify-between text-xs text-foreground">
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="size-4 text-emerald-600 shrink-0" />
                  <span className="font-semibold truncate text-xs">
                    Attaching: {selectedMaterial.title}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedMaterial(null)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            )}

            {/* Bottom Chat Composer (iMessage / Telegram style) */}
            <form
              onSubmit={handleSendMessage}
              className="p-2.5 pb-[calc(0.625rem+env(safe-area-inset-bottom))] sm:p-3 border-t border-border/70 bg-card flex items-center gap-2 shrink-0"
            >
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setIsAttachMaterialOpen(true)}
                title="Attach library document"
                className="size-9 rounded-full text-muted-foreground hover:text-foreground shrink-0"
              >
                <Paperclip className="size-4" />
              </Button>

              <Input
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                placeholder={`Message ${activeChat.title}...`}
                className="flex-1 rounded-full text-xs h-10 px-4 bg-secondary/50 border-border/60"
              />

              <Button
                type="submit"
                size="icon"
                disabled={!messageInput.trim() && !selectedMaterial}
                className="size-9 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white shrink-0 shadow-2xs"
              >
                <Send className="size-4" />
              </Button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <div className="size-16 rounded-full bg-emerald-500/10 text-emerald-600 grid place-items-center mb-4">
              <MessageSquare className="size-8" />
            </div>
            <h3 className="text-base font-bold text-foreground">Select a conversation</h3>
            <p className="mt-1 text-xs text-muted-foreground max-w-sm leading-relaxed">
              Choose a coursemate or study group from the left to start chatting, sharing documents, and collaborating.
            </p>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: SyllaID QR Code Card */}
      {/* ========================================================================= */}
      <StudentQrModal
        open={isQrModalOpen}
        onOpenChange={setIsQrModalOpen}
        username={profile?.username || "scholar"}
        fullName={profile?.full_name || "Scholar"}
        avatarUrl={profile?.avatar_url}
        institution={profile?.institution}
        onOpenScanner={() => setIsScannerOpen(true)}
      />

      {/* ========================================================================= */}
      {/* MODAL 2: Camera QR Scanner */}
      {/* ========================================================================= */}
      <QrScannerModal
        open={isScannerOpen}
        onOpenChange={setIsScannerOpen}
        onScanPeer={handleScanPeer}
      />

      {/* ========================================================================= */}
      {/* MODAL 3: New Direct Chat / Search Peers */}
      {/* ========================================================================= */}
      <Dialog open={isNewDirectChatOpen} onOpenChange={setIsNewDirectChatOpen}>
        <DialogContent className="max-w-md rounded-3xl p-6 border-border/80 bg-card text-card-foreground shadow-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold tracking-tight">
              <UserPlus className="size-5 text-emerald-600" />
              Find Peers & Message
            </DialogTitle>
          </DialogHeader>
          <div className="relative mt-2">
            <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
            <Input
              value={peerSearchQuery}
              onChange={(e) => setPeerSearchQuery(e.target.value)}
              placeholder="Search by username (@handle), name, course..."
              className="pl-9 rounded-full text-xs h-9"
              autoFocus
            />
          </div>

          <div className="mt-3 max-h-64 overflow-y-auto space-y-1 pr-1">
            {isSearchingPeers ? (
              <div className="py-8 text-center text-xs text-muted-foreground animate-pulse">
                Searching students...
              </div>
            ) : searchedPeers.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground">
                {peerSearchQuery.trim()
                  ? "No students found matching query."
                  : "Type a username or course to discover peers."}
              </div>
            ) : (
              searchedPeers.map((peer: any) => (
                <button
                  key={peer.id}
                  onClick={() => startDirectChatWithPeer(peer)}
                  className="flex w-full items-center justify-between p-2.5 rounded-xl hover:bg-secondary/60 text-left transition-all"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Avatar className="size-9">
                      <AvatarImage src={peer.avatar_url || ""} />
                      <AvatarFallback className="bg-emerald-600 text-xs font-bold text-white">
                        {peer.full_name?.charAt(0) || "P"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-foreground truncate">
                        {peer.full_name}
                      </p>
                      <p className="text-[11px] font-mono text-emerald-600 truncate">
                        @{peer.username} • {peer.institution || "Student"}
                      </p>
                    </div>
                  </div>
                  <Button size="sm" variant="outline" className="h-7 text-xs rounded-full">
                    Chat
                  </Button>
                </button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL 4: Create Group Modal (ONLY name is compulsory!)                    */}
      {/* ========================================================================= */}
      <Dialog open={isCreateGroupOpen} onOpenChange={setIsCreateGroupOpen}>
        <DialogContent className="max-w-md rounded-3xl p-6 border-border/80 bg-card text-card-foreground shadow-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold tracking-tight">
              <Users className="size-5 text-emerald-600" />
              Create Study Group
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreateGroup} className="space-y-3.5 mt-2">
            <div>
              <label className="text-xs font-semibold text-foreground">Group Name *</label>
              <Input
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="e.g. MTH 101 Study Circle, BioMed Wizards..."
                className="mt-1 text-xs rounded-xl"
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground">
                Course Code <span className="font-normal text-muted-foreground">(Optional)</span>
              </label>
              <Input
                value={newGroupCourse}
                onChange={(e) => setNewGroupCourse(e.target.value)}
                placeholder="e.g. GET 206, MTH 101"
                className="mt-1 text-xs rounded-xl"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground">
                Description <span className="font-normal text-muted-foreground">(Optional)</span>
              </label>
              <Textarea
                value={newGroupDesc}
                onChange={(e) => setNewGroupDesc(e.target.value)}
                placeholder="Brief group goal or topics discussed..."
                className="mt-1 text-xs rounded-xl h-20 resize-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsCreateGroupOpen(false)}
                className="rounded-full text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                className="rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
              >
                Create Group
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL 5: Attach Library Material Picker                                   */}
      {/* ========================================================================= */}
      <Dialog open={isAttachMaterialOpen} onOpenChange={setIsAttachMaterialOpen}>
        <DialogContent className="max-w-md rounded-3xl p-6 border-border/80 bg-card text-card-foreground shadow-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold tracking-tight">
              <BookOpen className="size-5 text-emerald-600" />
              Attach Academic Material
            </DialogTitle>
          </DialogHeader>

          {/* Search bar for materials */}
          <div className="relative mt-2">
            <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
            <Input
              value={materialSearchQuery}
              onChange={(e) => setMaterialSearchQuery(e.target.value)}
              placeholder="Search library materials, courses..."
              className="pl-9 rounded-full text-xs h-9 bg-secondary/50"
            />
          </div>

          {/* Upload from device option */}
          <div className="pt-2">
            <input
              type="file"
              ref={fileUploadInputRef}
              className="hidden"
              accept=".pdf,.doc,.docx,.txt"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const fileName = file.name.replace(/\.[^/.]+$/, "");
                setSelectedMaterial({
                  id: `device-${Date.now()}`,
                  title: fileName,
                  course: "Device Upload",
                });
                setIsAttachMaterialOpen(false);
                toast.success(`Attached "${file.name}" from your device`);
                if (fileUploadInputRef.current) fileUploadInputRef.current.value = "";
              }}
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => fileUploadInputRef.current?.click()}
              className="w-full rounded-2xl gap-2 text-xs font-semibold border-emerald-500/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10"
            >
              <Upload className="size-3.5" />
              Upload from your device
            </Button>
          </div>

          {/* Materials List */}
          <div className="mt-2 max-h-64 overflow-y-auto space-y-1.5 pr-1">
            {availableMaterials.filter((mat: any) => {
              if (!materialSearchQuery.trim()) return true;
              const q = materialSearchQuery.toLowerCase();
              return (
                mat.title?.toLowerCase().includes(q) ||
                mat.course?.toLowerCase().includes(q) ||
                mat.course_code?.toLowerCase().includes(q) ||
                mat.institution?.toLowerCase().includes(q)
              );
            }).length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground">
                {materialSearchQuery.trim()
                  ? "No matching materials found."
                  : "No verified materials found in library."}
              </div>
            ) : (
              availableMaterials
                .filter((mat: any) => {
                  if (!materialSearchQuery.trim()) return true;
                  const q = materialSearchQuery.toLowerCase();
                  return (
                    mat.title?.toLowerCase().includes(q) ||
                    mat.course?.toLowerCase().includes(q) ||
                    mat.course_code?.toLowerCase().includes(q) ||
                    mat.institution?.toLowerCase().includes(q)
                  );
                })
                .map((mat: any) => (
                  <button
                    key={mat.id}
                    onClick={() => {
                      setSelectedMaterial({
                        id: mat.id,
                        title: mat.title,
                        course: mat.course_code || mat.course,
                      });
                      setIsAttachMaterialOpen(false);
                      toast.success(`Attached "${mat.title}"`);
                    }}
                    className="flex w-full items-center justify-between p-2.5 rounded-xl hover:bg-secondary/60 text-left transition-all border border-border/40"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="grid size-8 place-items-center rounded-lg bg-emerald-600/10 text-emerald-600 shrink-0">
                        <FileText className="size-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-foreground truncate">{mat.title}</p>
                        <p className="text-[10px] font-sans text-muted-foreground truncate">
                          {mat.course_code || "ACADEMIC"} • {mat.institution}
                        </p>
                      </div>
                    </div>
                    <Button size="sm" variant="ghost" className="h-7 text-xs rounded-full">
                      Select
                    </Button>
                  </button>
                ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
