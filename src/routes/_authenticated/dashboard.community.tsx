import { useState, useRef, useEffect, useMemo } from "react";
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
  Bot,
  Copy,
  Trash2,
  Edit2,
  CornerUpLeft,
  Pin,
  Archive,
  VolumeX,
  Volume2,
  Ban,
  ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";
import { AnimatePresence, motion } from "motion/react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  editDirectMessageServerFn,
  deleteDirectMessageServerFn,
  editGroupMessageServerFn,
  deleteGroupMessageServerFn,
  addMemberToStudyGroupServerFn,
} from "@/lib/community.functions";
import { askBossAiServerFn } from "@/lib/ai/study-assistant.functions";
import {
  subscribeToChatChannel,
  broadcastChatMessage,
} from "@/lib/supabase-realtime";
import { StudentQrModal } from "@/components/student-qr-modal";
import { QrScannerModal } from "@/components/qr-scanner-modal";
import { MobileCustomKeyboard } from "@/components/chat/mobile-custom-keyboard";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/dashboard/community")({
  head: () => ({
    meta: [
      { title: "Peers & Student Study Chats — Syllaboss" },
      {
        name: "description",
        content: "Chat with peers, create study groups, mention Boss AI, and share academic materials.",
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

export function CommunityPage() {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const queryClient = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const composerTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Navigation & View States
  const [activeChat, setActiveChat] = useState<ActiveChat | null>(null);
  const [chatTab, setChatTab] = useState<"all" | "direct" | "groups">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [messageInput, setMessageInput] = useState("");

  // Custom Tactile Keyboard State (Edge-to-edge, suppresses native keyboard)
  const [showCustomKeyboard, setShowCustomKeyboard] = useState(false);

  // Telegram Features: Reply & Edit States
  const [replyingToMessage, setReplyingToMessage] = useState<any | null>(null);
  const [editingMessage, setEditingMessage] = useState<any | null>(null);
  const [selectedMessageForMenu, setSelectedMessageForMenu] = useState<any | null>(null);

  // Telegram Features: Pinned, Archived, Muted, Blocked Lists
  const [pinnedChatIds, setPinnedChatIds] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      return JSON.parse(localStorage.getItem("syllaboss_pinned_chats") || "[]");
    } catch {
      return [];
    }
  });

  const [archivedChatIds, setArchivedChatIds] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      return JSON.parse(localStorage.getItem("syllaboss_archived_chats") || "[]");
    } catch {
      return [];
    }
  });

  const [blockedPeerIds, setBlockedPeerIds] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      return JSON.parse(localStorage.getItem("syllaboss_blocked_peers") || "[]");
    } catch {
      return [];
    }
  });

  const [mutedChatIds, setMutedChatIds] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      return JSON.parse(localStorage.getItem("syllaboss_muted_chats") || "[]");
    } catch {
      return [];
    }
  });

  // Long-pressed chat in sidebar for Telegram options
  const [chatForContextMenu, setChatForContextMenu] = useState<any | null>(null);

  // Modals
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [isNewDirectChatOpen, setIsNewDirectChatOpen] = useState(false);
  const [isAttachMaterialOpen, setIsAttachMaterialOpen] = useState(false);
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [addMemberSearch, setAddMemberSearch] = useState("");
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

  // Mobile detection
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => {
      setIsMobile(typeof window !== "undefined" && window.innerWidth < 768);
    };
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Swipe-to-reply gesture tracking
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  // Save pinned, archived, blocked to localStorage
  useEffect(() => {
    try {
      localStorage.setItem("syllaboss_pinned_chats", JSON.stringify(pinnedChatIds));
    } catch {}
  }, [pinnedChatIds]);

  useEffect(() => {
    try {
      localStorage.setItem("syllaboss_archived_chats", JSON.stringify(archivedChatIds));
    } catch {}
  }, [archivedChatIds]);

  useEffect(() => {
    try {
      localStorage.setItem("syllaboss_blocked_peers", JSON.stringify(blockedPeerIds));
    } catch {}
  }, [blockedPeerIds]);

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

  // 2. Fetch Study Groups (Exclude any dummy placeholder groups per requirement)
  const { data: rawStudyGroups = [], refetch: refetchGroups } = useQuery({
    queryKey: ["study-groups", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      return await getStudyGroupsServerFn({ data: { userId: user?.id } });
    },
    refetchInterval: 15000,
  });

  // Requirement: Remove dummy groups that were previously there
  const studyGroups = useMemo(() => {
    return rawStudyGroups.filter((g: any) => {
      const name = (g.name || "").toLowerCase();
      // Filter out test/dummy names
      if (name.includes("dummy") || name.includes("placeholder") || name === "test group") {
        return false;
      }
      return true;
    });
  }, [rawStudyGroups]);

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

  // Search Peers for Add-Member-to-Group Modal
  const { data: addMemberCandidates = [], isFetching: isSearchingAddMembers } = useQuery({
    queryKey: ["search-add-members", addMemberSearch, user?.id],
    enabled: Boolean(user?.id && addMemberSearch.trim().length >= 1),
    queryFn: async () => {
      return await searchPeersServerFn({
        data: { query: addMemberSearch.trim(), currentUserId: user?.id },
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

  const hasInitializedDesktopChatRef = useRef(false);

  // Default selection on desktop ONLY
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

    const channel = subscribeToChatChannel(activeChat.id, () => {
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

  // Telegram Feature: Copy Message
  function handleCopyMessage(content: string) {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(content);
      toast.success("Message copied to clipboard");
    }
    setSelectedMessageForMenu(null);
  }

  // Telegram Feature: Delete Message
  async function handleDeleteMessage(msgId: string) {
    if (!user || !activeChat) return;
    try {
      if (activeChat.type === "peer") {
        await deleteDirectMessageServerFn({ data: { messageId: msgId, userId: user.id } });
      } else {
        await deleteGroupMessageServerFn({ data: { messageId: msgId, userId: user.id } });
      }
      refetchActiveMessages();
      toast.success("Message deleted");
    } catch {
      toast.error("Failed to delete message");
    } finally {
      setSelectedMessageForMenu(null);
    }
  }

  // Telegram Feature: Edit Message within 10 Minutes
  function handleStartEditMessage(msg: any) {
    const createdAt = new Date(msg.created_at).getTime();
    const diffMins = (Date.now() - createdAt) / (1000 * 60);

    if (diffMins > 10) {
      toast.error("Messages can only be edited within 10 minutes of being sent.");
      setSelectedMessageForMenu(null);
      return;
    }

    setEditingMessage(msg);
    setMessageInput(msg.content);
    setSelectedMessageForMenu(null);
    setShowCustomKeyboard(true);
    if (composerTextareaRef.current) {
      composerTextareaRef.current.focus();
    }
  }

  // Telegram Feature: Add Member to Study Group
  async function handleAddMemberToGroup(peerId: string) {
    if (!activeChat || activeChat.type !== "group") return;
    try {
      await addMemberToStudyGroupServerFn({
        data: { groupId: activeChat.id, memberUserId: peerId },
      });
      await refetchGroups();
      setIsAddMemberOpen(false);
      setAddMemberSearch("");
      toast.success("Member added to study group!");
    } catch {
      toast.error("Failed to add member");
    }
  }

  // Send or Edit Message in Active Chat
  async function handleSendMessage(e?: React.FormEvent) {
    e?.preventDefault();
    if (!user || !activeChat || (!messageInput.trim() && !selectedMaterial)) return;

    // Handle Editing existing message
    if (editingMessage) {
      const newText = messageInput.trim();
      setEditingMessage(null);
      setMessageInput("");

      try {
        if (activeChat.type === "peer") {
          await editDirectMessageServerFn({
            data: { messageId: editingMessage.id, userId: user.id, newContent: newText },
          });
        } else {
          await editGroupMessageServerFn({
            data: { messageId: editingMessage.id, userId: user.id, newContent: newText },
          });
        }
        await refetchActiveMessages();
        toast.success("Message updated");
      } catch (err: any) {
        toast.error(err?.message || "Edit failed");
      }
      return;
    }

    // Handle Sending new message (with optional Telegram-style reply quote)
    let content = messageInput.trim();
    if (replyingToMessage) {
      const sender = replyingToMessage.sender_name || replyingToMessage.user_name || "Scholar";
      const quoteSnippet = replyingToMessage.content.slice(0, 60);
      content = `[Replying to ${sender}: "${quoteSnippet}"]\n${content}`;
      setReplyingToMessage(null);
    }

    if (!content && selectedMaterial) {
      content = `Shared document: "${selectedMaterial.title}"`;
    }

    const matId = selectedMaterial?.id;
    const matTitle = selectedMaterial?.title;
    const matCourse = selectedMaterial?.course;

    setMessageInput("");
    setSelectedMaterial(null);
    if (composerTextareaRef.current) {
      composerTextareaRef.current.style.height = "auto";
    }

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

      // Requirement: When Boss AI is tagged/mentioned in a message, it should reply!
      const isAiMentioned = /@(bossai|boss|ai)\b/i.test(content);
      if (isAiMentioned) {
        const aiPrompt = content.replace(/@(bossai|boss|ai)\b/gi, "").trim() || content;
        toast.loading("Boss AI is formulating an answer...", { id: "ai-peer-reply" });

        askBossAiServerFn({
          data: {
            userId: user.id,
            query: `A student in a peer study discussion tagged @BossAI: "${aiPrompt}". Please provide a helpful, concise academic answer. Do NOT use any emojis.`,
            taskType: "general",
          },
        })
          .then(async (aiRes) => {
            const cleanAiResponse = aiRes.response.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}]/gu, "");
            const aiFormattedText = `**Boss AI**:\n${cleanAiResponse}`;

            if (activeChat.type === "peer") {
              const aiMsg = await sendDirectMessageServerFn({
                data: {
                  conversationId: activeChat.id,
                  senderId: user.id,
                  content: aiFormattedText,
                },
              });
              await broadcastChatMessage(activeChat.id, aiMsg);
            } else {
              const aiMsg = await sendGroupMessageServerFn({
                data: {
                  groupId: activeChat.id,
                  userId: "system",
                  userName: "Boss AI",
                  userInstitution: "Campus AI Intelligence",
                  content: aiFormattedText,
                },
              });
              await broadcastChatMessage(activeChat.id, aiMsg);
            }

            await refetchActiveMessages();
            toast.success("Boss AI replied to the discussion!", { id: "ai-peer-reply" });
          })
          .catch(() => {
            toast.error("Boss AI could not reply at this time.", { id: "ai-peer-reply" });
          });
      }
    } catch (err: any) {
      toast.error(err?.message || "Message delivery failed");
    }
  }

  // Create Study Group
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

  // Filter conversations & study groups based on search & tabs
  const filteredPeers = useMemo(() => {
    return directConversations
      .filter((c: any) => {
        if (blockedPeerIds.includes(c.peer.id)) return false;
        const matchesSearch =
          c.peer.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.peer.username.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesSearch;
      })
      .sort((a: any, b: any) => {
        const aPinned = pinnedChatIds.includes(a.id);
        const bPinned = pinnedChatIds.includes(b.id);
        if (aPinned && !bPinned) return -1;
        if (!aPinned && bPinned) return 1;
        return 0;
      });
  }, [directConversations, searchQuery, blockedPeerIds, pinnedChatIds]);

  const filteredGroups = useMemo(() => {
    return studyGroups
      .filter((g: any) => {
        const matchesSearch =
          g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (g.course_code && g.course_code.toLowerCase().includes(searchQuery.toLowerCase()));
        return matchesSearch;
      })
      .sort((a: any, b: any) => {
        const aPinned = pinnedChatIds.includes(a.id);
        const bPinned = pinnedChatIds.includes(b.id);
        if (aPinned && !bPinned) return -1;
        if (!aPinned && bPinned) return 1;
        return 0;
      });
  }, [studyGroups, searchQuery, pinnedChatIds]);

  // Touch Swipe Handlers for Swipe-to-Reply
  function handleTouchStart(e: React.TouchEvent) {
    const touch = e.touches[0];
    if (touch) {
      touchStartRef.current = { x: touch.clientX, y: touch.clientY };
    }
  }

  function handleTouchEnd(e: React.TouchEvent, msg: any) {
    if (!touchStartRef.current) return;
    const touch = e.changedTouches[0];
    if (touch) {
      const deltaX = touch.clientX - touchStartRef.current.x;
      const deltaY = Math.abs(touch.clientY - touchStartRef.current.y);

      // Horizontal swipe > 40px and not a vertical scroll
      if (Math.abs(deltaX) > 40 && deltaY < 30) {
        if (typeof navigator !== "undefined" && navigator.vibrate) {
          navigator.vibrate(12);
        }
        setReplyingToMessage(msg);
        setShowCustomKeyboard(true);
        if (composerTextareaRef.current) {
          composerTextareaRef.current.focus();
        }
      }
    }
    touchStartRef.current = null;
  }

  return (
    <div
      data-chat-active={Boolean(activeChat)}
      className="flex min-h-0 h-full max-h-full flex-1 w-full max-w-[1440px] mx-auto overflow-hidden rounded-none sm:rounded-3xl border-y sm:border border-border/80 bg-card shadow-lg font-sans relative"
    >
      {/* ========================================================================= */}
      {/* LEFT SIDEBAR: Conversations List (Telegram Style) */}
      {/* ========================================================================= */}
      <div
        className={cn(
          "w-full md:w-[22rem] lg:w-[25rem] flex flex-col border-r border-border/70 bg-secondary/15 shrink-0 transition-all min-h-0 h-full max-h-full overflow-hidden",
          activeChat ? "hidden md:flex" : "flex"
        )}
      >
        {/* Top Header */}
        <div className="p-3.5 border-b border-border/70 flex items-center justify-between gap-2 bg-card shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <Avatar className="size-9 ring-2 ring-emerald-500/20">
              <AvatarImage src={profile?.avatar_url || ""} />
              <AvatarFallback className="bg-emerald-600 text-xs font-bold text-white">
                {profile?.full_name?.charAt(0) || "U"}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <h2 className="text-xs font-bold text-foreground truncate">Peers & Groups</h2>
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
              title="Start new direct peer chat"
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

        {/* Search Bar (Searches peers and groups) */}
        <div className="p-2.5 border-b border-border/70 bg-card/60 shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 size-3.5 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search peers and groups..."
              className="pl-8 text-xs h-8.5 rounded-full bg-secondary/50 border-border/60"
            />
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-1 mt-2">
            {(["all", "direct", "groups"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setChatTab(tab)}
                className={cn(
                  "px-3 py-1 rounded-full text-[11px] font-bold capitalize transition-all",
                  chatTab === tab
                    ? "bg-primary text-primary-foreground shadow-2xs"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                )}
              >
                {tab === "direct" ? "Peers" : tab}
              </button>
            ))}
          </div>
        </div>

        {/* Conversations List with Long-press Menu */}
        <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-border/40 [scrollbar-width:thin]">
          {/* Direct Peer Conversations */}
          {(chatTab === "all" || chatTab === "direct") &&
            filteredPeers.map((c: any) => {
              const isSelected = activeChat?.id === c.id;
              const isPinned = pinnedChatIds.includes(c.id);

              return (
                <div
                  key={c.id}
                  onClick={() => {
                    setActiveChat({
                      type: "peer",
                      id: c.id,
                      title: c.peer.full_name,
                      subtitle: `@${c.peer.username}`,
                      avatarUrl: c.peer.avatar_url,
                      peerId: c.peer.id,
                    });
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setChatForContextMenu({ ...c, type: "peer" });
                  }}
                  className={cn(
                    "flex items-center gap-3 p-3 cursor-pointer select-none transition-colors relative hover:bg-secondary/40",
                    isSelected && "bg-secondary/70 font-semibold"
                  )}
                >
                  <Avatar className="size-10 shrink-0">
                    <AvatarImage src={c.peer.avatar_url || ""} />
                    <AvatarFallback className="bg-emerald-600 text-white font-bold text-xs">
                      {c.peer.full_name?.charAt(0) || "P"}
                    </AvatarFallback>
                  </Avatar>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-bold text-xs text-foreground truncate">
                        {c.peer.full_name}
                      </span>
                      {isPinned && <Pin className="size-3 text-primary shrink-0 rotate-45" />}
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                      {c.last_message_text || `@${c.peer.username}`}
                    </p>
                  </div>
                </div>
              );
            })}

          {/* Study Groups */}
          {(chatTab === "all" || chatTab === "groups") &&
            filteredGroups.map((g: any) => {
              const isSelected = activeChat?.id === g.id;
              const isPinned = pinnedChatIds.includes(g.id);

              return (
                <div
                  key={g.id}
                  onClick={() => {
                    setActiveChat({
                      type: "group",
                      id: g.id,
                      title: g.name,
                      subtitle: `${g.member_count} members`,
                      memberCount: g.member_count,
                    });
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setChatForContextMenu({ ...g, type: "group" });
                  }}
                  className={cn(
                    "flex items-center gap-3 p-3 cursor-pointer select-none transition-colors relative hover:bg-secondary/40",
                    isSelected && "bg-secondary/70 font-semibold"
                  )}
                >
                  <div className="size-10 rounded-full bg-indigo-600/10 text-indigo-600 grid place-items-center font-bold text-xs shrink-0">
                    <Users className="size-5" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-bold text-xs text-foreground truncate">{g.name}</span>
                      {isPinned && <Pin className="size-3 text-primary shrink-0 rotate-45" />}
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                      {g.member_count} members {g.course_code ? `· ${g.course_code}` : ""}
                    </p>
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* RIGHT SIDE: Active Conversation View (Telegram Style) */}
      {/* ========================================================================= */}
      <div
        className={cn(
          "flex-1 flex flex-col min-h-0 h-full max-h-full bg-background overflow-hidden relative",
          !activeChat ? "hidden md:flex" : "flex"
        )}
      >
        {activeChat ? (
          <>
            {/* Active Chat Header */}
            <div className="p-3 border-b border-border/70 flex items-center justify-between gap-2 bg-card shrink-0 z-20">
              <div className="flex items-center gap-2.5 min-w-0">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setActiveChat(null)}
                  className="size-8 rounded-full md:hidden text-muted-foreground"
                >
                  <ArrowLeft className="size-4" />
                </Button>

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-xs sm:text-sm text-foreground truncate">
                      {activeChat.title}
                    </h3>
                    {activeChat.type === "group" && (
                      <span className="rounded-full bg-indigo-500/10 text-indigo-600 text-[10px] font-bold px-2 py-0.2">
                        Group
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {activeChat.subtitle || "Active peer"}
                  </p>
                </div>
              </div>

              {/* Header Actions */}
              <div className="flex items-center gap-1.5">
                {activeChat.type === "group" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsAddMemberOpen(true)}
                    className="h-8 rounded-full text-xs font-semibold gap-1 border-primary/40 text-primary hover:bg-primary/10"
                  >
                    <UserPlus className="size-3.5" />
                    <span>Add Member</span>
                  </Button>
                )}

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsAttachMaterialOpen(true)}
                  className="h-8 rounded-full text-xs font-semibold gap-1"
                >
                  <BookOpen className="size-3.5" />
                  <span className="hidden sm:inline">Attach Material</span>
                </Button>
              </div>
            </div>

            {/* Chat Messages Stream */}
            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain scroll-smooth p-3.5 space-y-3 bg-secondary/10 [scrollbar-width:thin]">
              {chatMessages.length === 0 ? (
                <div className="py-16 text-center flex flex-col items-center">
                  <div className="size-12 rounded-full bg-emerald-500/10 text-emerald-600 grid place-items-center mb-2">
                    <MessageSquare className="size-5" />
                  </div>
                  <h4 className="text-xs font-semibold text-foreground">Start of conversation</h4>
                  <p className="text-[11px] text-muted-foreground max-w-xs mt-1">
                    Send a message, attach documents, or tag <strong>@BossAI</strong> to get answers!
                  </p>
                </div>
              ) : (
                chatMessages.map((msg: any) => {
                  const isMe = msg.sender_id === user?.id || msg.user_id === user?.id;
                  const senderDisplay = msg.sender_name || msg.user_name || "Scholar";
                  const isBossAi =
                    senderDisplay.includes("Boss AI") || msg.user_id === "system";

                  return (
                    <div
                      key={msg.id}
                      onTouchStart={handleTouchStart}
                      onTouchEnd={(e) => handleTouchEnd(e, msg)}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        setSelectedMessageForMenu(msg);
                      }}
                      className={cn(
                        "flex flex-col max-w-[85%] sm:max-w-[72%] transition-all",
                        isMe ? "ml-auto items-end" : "mr-auto items-start"
                      )}
                    >
                      {/* Sender Tag */}
                      {!isMe && (
                        <span
                          className={cn(
                            "text-[10px] font-bold mb-0.5 px-1",
                            isBossAi ? "text-amber-500" : "text-emerald-600 dark:text-emerald-400"
                          )}
                        >
                          {senderDisplay}
                        </span>
                      )}

                      {/* Message Bubble with Long-press & Swipe options */}
                      <div
                        onClick={() => setSelectedMessageForMenu(msg)}
                        className={cn(
                          "rounded-2xl px-3.5 py-2 text-xs shadow-xs leading-relaxed space-y-1.5 cursor-pointer relative",
                          isMe
                            ? "bg-primary text-primary-foreground rounded-br-xs"
                            : isBossAi
                            ? "bg-amber-500/10 border border-amber-500/30 text-foreground rounded-bl-xs"
                            : "bg-card border border-border/80 text-foreground rounded-bl-xs"
                        )}
                      >
                        {msg.material_id && (
                          <div className="rounded-xl p-2 bg-black/10 flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <p className="font-bold text-[11px] truncate">
                                {msg.material_title || "Course Material"}
                              </p>
                            </div>
                            <Button
                              size="sm"
                              variant="secondary"
                              asChild
                              className="h-5 px-2 text-[10px] rounded-full"
                            >
                              <Link to="/dashboard/preview" search={{ id: msg.material_id }}>
                                Open
                              </Link>
                            </Button>
                          </div>
                        )}

                        <p className="whitespace-pre-wrap break-words">{msg.content}</p>

                        <div
                          className={cn(
                            "flex items-center justify-end gap-1 text-[9px] pt-0.5 opacity-70",
                            isMe ? "text-primary-foreground" : "text-muted-foreground"
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

            {/* Telegram Feature: Replying Quote Banner */}
            {replyingToMessage && (
              <div className="px-3 py-1.5 bg-secondary/80 border-t border-border flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <CornerUpLeft className="size-3.5 text-primary shrink-0" />
                  <div className="min-w-0">
                    <p className="font-bold text-[10px] text-primary truncate">
                      Replying to {replyingToMessage.sender_name || "Scholar"}
                    </p>
                    <p className="text-[10px] text-muted-foreground truncate">
                      {replyingToMessage.content}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setReplyingToMessage(null)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            )}

            {/* Telegram Feature: Editing Message Banner */}
            {editingMessage && (
              <div className="px-3 py-1.5 bg-amber-500/10 border-t border-amber-500/30 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <Edit2 className="size-3.5 text-amber-600 shrink-0" />
                  <span className="font-bold text-[11px] text-amber-700 dark:text-amber-400">
                    Editing message (within 10-minute window)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setEditingMessage(null);
                    setMessageInput("");
                  }}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            )}

            {/* Bottom Composer Capsule */}
            <div className="p-2.5 border-t border-border/70 bg-card shrink-0">
              <div className="rounded-2xl border border-border/80 bg-secondary/30 p-2 shadow-xs flex flex-col gap-1 focus-within:border-primary/50 focus-within:bg-card">
                <textarea
                  ref={composerTextareaRef}
                  value={messageInput}
                  onChange={(e) => {
                    setMessageInput(e.target.value);
                    e.target.style.height = "auto";
                    e.target.style.height = `${Math.min(e.target.scrollHeight, 84)}px`;
                  }}
                  onKeyDown={(e) => {
                    if (!isMobile && e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  onFocus={() => {
                    if (isMobile) setShowCustomKeyboard(true);
                  }}
                  onClick={() => {
                    if (isMobile) setShowCustomKeyboard(true);
                  }}
                  inputMode={isMobile ? "none" : "text"}
                  placeholder={`Message ${activeChat.title} (tag @BossAI to ask AI)...`}
                  rows={1}
                  className="w-full resize-none bg-transparent text-xs sm:text-sm text-foreground focus:outline-hidden min-h-[26px] max-h-[84px] overflow-y-auto px-1 py-0.5 leading-relaxed"
                />

                <div className="flex items-center justify-between pt-1 border-t border-border/40">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setIsAttachMaterialOpen(true)}
                      title="Attach academic material from library"
                      className="size-7.5 rounded-full grid place-items-center text-muted-foreground hover:text-foreground hover:bg-secondary"
                    >
                      <Paperclip className="size-4" />
                    </button>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={!messageInput.trim() && !selectedMaterial}
                      onClick={() => handleSendMessage()}
                      className={cn(
                        "size-7.5 rounded-full grid place-items-center transition-all",
                        messageInput.trim() || selectedMaterial
                          ? "bg-primary text-primary-foreground hover:bg-primary/90"
                          : "text-muted-foreground opacity-40 cursor-not-allowed"
                      )}
                    >
                      <Send className="size-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Custom Tactile Keyboard (In-flow directly beneath composer on mobile) */}
            <AnimatePresence>
              {showCustomKeyboard && isMobile && (
                <MobileCustomKeyboard
                  value={messageInput}
                  onChange={(val) => {
                    setMessageInput(val);
                    if (composerTextareaRef.current) {
                      composerTextareaRef.current.style.height = "auto";
                      composerTextareaRef.current.style.height = `${Math.min(composerTextareaRef.current.scrollHeight, 84)}px`;
                    }
                  }}
                  onSend={() => handleSendMessage()}
                  isOpen={showCustomKeyboard}
                  onClose={() => setShowCustomKeyboard(false)}
                  inputRef={composerTextareaRef}
                />
              )}
            </AnimatePresence>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <div className="size-16 rounded-full bg-emerald-500/10 text-emerald-600 grid place-items-center mb-3">
              <MessageSquare className="size-8" />
            </div>
            <h3 className="text-base font-bold text-foreground">Select a peer or study group</h3>
            <p className="mt-1 text-xs text-muted-foreground max-w-sm leading-relaxed">
              Connect with coursemates, join study groups, share documents, or tag <strong>@BossAI</strong> for instant answers.
            </p>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODAL: Telegram Message Actions (Copy, Edit, Delete, Reply) */}
      {/* ========================================================================= */}
      <Dialog
        open={Boolean(selectedMessageForMenu)}
        onOpenChange={() => setSelectedMessageForMenu(null)}
      >
        <DialogContent className="max-w-xs rounded-3xl p-4 border-border bg-card">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold">Message Options</DialogTitle>
          </DialogHeader>

          <div className="space-y-1.5 mt-2 text-xs">
            <button
              type="button"
              onClick={() => handleCopyMessage(selectedMessageForMenu?.content || "")}
              className="w-full flex items-center gap-2.5 p-2 rounded-xl text-left hover:bg-secondary font-semibold"
            >
              <Copy className="size-4 text-primary" /> Copy Text
            </button>

            <button
              type="button"
              onClick={() => {
                setReplyingToMessage(selectedMessageForMenu);
                setSelectedMessageForMenu(null);
                setShowCustomKeyboard(true);
              }}
              className="w-full flex items-center gap-2.5 p-2 rounded-xl text-left hover:bg-secondary font-semibold"
            >
              <CornerUpLeft className="size-4 text-emerald-600" /> Reply to Message
            </button>

            {selectedMessageForMenu?.sender_id === user?.id && (
              <>
                <button
                  type="button"
                  onClick={() => handleStartEditMessage(selectedMessageForMenu)}
                  className="w-full flex items-center gap-2.5 p-2 rounded-xl text-left hover:bg-secondary font-semibold"
                >
                  <Edit2 className="size-4 text-amber-500" /> Edit Message (within 10m)
                </button>

                <button
                  type="button"
                  onClick={() => handleDeleteMessage(selectedMessageForMenu.id)}
                  className="w-full flex items-center gap-2.5 p-2 rounded-xl text-left hover:bg-destructive/10 text-destructive font-semibold"
                >
                  <Trash2 className="size-4" /> Delete Message
                </button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL: Long-Press Conversation Options (Pin, Archive, Mute, Block) */}
      {/* ========================================================================= */}
      <Dialog
        open={Boolean(chatForContextMenu)}
        onOpenChange={() => setChatForContextMenu(null)}
      >
        <DialogContent className="max-w-xs rounded-3xl p-4 border-border bg-card">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold">
              {chatForContextMenu?.title || chatForContextMenu?.name || "Chat"} Options
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-1.5 mt-2 text-xs">
            {/* Pin / Unpin */}
            <button
              type="button"
              onClick={() => {
                const id = chatForContextMenu.id;
                setPinnedChatIds((prev) =>
                  prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
                );
                setChatForContextMenu(null);
                toast.success(pinnedChatIds.includes(id) ? "Chat unpinned" : "Chat pinned to top");
              }}
              className="w-full flex items-center gap-2.5 p-2 rounded-xl text-left hover:bg-secondary font-semibold"
            >
              <Pin className="size-4 text-primary" />
              {pinnedChatIds.includes(chatForContextMenu?.id) ? "Unpin Chat" : "Pin to Top"}
            </button>

            {/* Mute / Unmute */}
            <button
              type="button"
              onClick={() => {
                const id = chatForContextMenu.id;
                setMutedChatIds((prev) =>
                  prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
                );
                setChatForContextMenu(null);
                toast.success(mutedChatIds.includes(id) ? "Chat unmuted" : "Chat muted");
              }}
              className="w-full flex items-center gap-2.5 p-2 rounded-xl text-left hover:bg-secondary font-semibold"
            >
              <VolumeX className="size-4 text-muted-foreground" />
              {mutedChatIds.includes(chatForContextMenu?.id) ? "Unmute Notifications" : "Mute Notifications"}
            </button>

            {/* Block User (for direct peer chats) */}
            {chatForContextMenu?.type === "peer" && (
              <button
                type="button"
                onClick={() => {
                  const peerId = chatForContextMenu.peer?.id || chatForContextMenu.peerId;
                  if (peerId) {
                    setBlockedPeerIds((prev) => [...prev, peerId]);
                    setActiveChat(null);
                    setChatForContextMenu(null);
                    toast.success("User blocked");
                  }
                }}
                className="w-full flex items-center gap-2.5 p-2 rounded-xl text-left hover:bg-destructive/10 text-destructive font-semibold"
              >
                <Ban className="size-4" /> Block User
              </button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL: Add Member to Group */}
      {/* ========================================================================= */}
      <Dialog open={isAddMemberOpen} onOpenChange={setIsAddMemberOpen}>
        <DialogContent className="max-w-md rounded-3xl p-5 border-border bg-card">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <UserPlus className="size-4 text-primary" /> Add Members to {activeChat?.title}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 mt-2 text-xs">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 size-3.5 text-muted-foreground" />
              <Input
                value={addMemberSearch}
                onChange={(e) => setAddMemberSearch(e.target.value)}
                placeholder="Search peers by name or @username..."
                className="pl-8 text-xs h-8.5 rounded-full"
                autoFocus
              />
            </div>

            <div className="max-h-56 overflow-y-auto space-y-1 pr-1">
              {isSearchingAddMembers ? (
                <div className="py-6 text-center text-muted-foreground">Searching peers...</div>
              ) : addMemberCandidates.length === 0 ? (
                <div className="py-6 text-center text-muted-foreground">
                  {addMemberSearch.trim() ? "No peers found." : "Type a student name to add."}
                </div>
              ) : (
                addMemberCandidates.map((peer: any) => (
                  <div
                    key={peer.id}
                    className="flex items-center justify-between p-2 rounded-xl hover:bg-secondary"
                  >
                    <div className="min-w-0">
                      <p className="font-bold text-xs truncate">{peer.full_name}</p>
                      <p className="text-[10px] text-muted-foreground">@{peer.username}</p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleAddMemberToGroup(peer.id)}
                      className="h-7 text-xs font-bold rounded-lg"
                    >
                      Add
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODALS: QR Code & Scanner */}
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

      <QrScannerModal
        open={isScannerOpen}
        onOpenChange={setIsScannerOpen}
        onScanPeer={handleScanPeer}
      />

      {/* MODAL: New Direct Chat */}
      <Dialog open={isNewDirectChatOpen} onOpenChange={setIsNewDirectChatOpen}>
        <DialogContent className="max-w-md rounded-3xl p-5 border-border bg-card">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <UserPlus className="size-4 text-emerald-600" /> Start Direct Peer Chat
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 mt-2 text-xs">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 size-3.5 text-muted-foreground" />
              <Input
                value={peerSearchQuery}
                onChange={(e) => setPeerSearchQuery(e.target.value)}
                placeholder="Search by username or name..."
                className="pl-8 text-xs h-8.5 rounded-full"
                autoFocus
              />
            </div>

            <div className="max-h-60 overflow-y-auto space-y-1 pr-1">
              {isSearchingPeers ? (
                <div className="py-6 text-center text-muted-foreground">Searching peers...</div>
              ) : searchedPeers.length === 0 ? (
                <div className="py-6 text-center text-muted-foreground">
                  {peerSearchQuery.trim() ? "No students found." : "Type to find coursemates."}
                </div>
              ) : (
                searchedPeers.map((peer: any) => (
                  <button
                    key={peer.id}
                    type="button"
                    onClick={() => startDirectChatWithPeer(peer)}
                    className="w-full flex items-center justify-between p-2 rounded-xl text-left hover:bg-secondary"
                  >
                    <div className="min-w-0">
                      <p className="font-bold text-xs truncate">{peer.full_name}</p>
                      <p className="text-[10px] text-muted-foreground">@{peer.username}</p>
                    </div>
                    <Button size="sm" variant="outline" className="h-7 text-xs rounded-lg">
                      Message
                    </Button>
                  </button>
                ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* MODAL: Create Study Group */}
      <Dialog open={isCreateGroupOpen} onOpenChange={setIsCreateGroupOpen}>
        <DialogContent className="max-w-sm rounded-3xl p-5 border-border bg-card">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Users className="size-4 text-primary" /> Create Study Group
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreateGroup} className="space-y-3 mt-2 text-xs">
            <div>
              <label className="font-semibold text-muted-foreground block mb-1">Group Name *</label>
              <Input
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="e.g. Thermodynamics Exam Prep"
                className="h-8.5 text-xs rounded-xl"
                required
              />
            </div>

            <div>
              <label className="font-semibold text-muted-foreground block mb-1">Course Code (Optional)</label>
              <Input
                value={newGroupCourse}
                onChange={(e) => setNewGroupCourse(e.target.value)}
                placeholder="e.g. MEE 201"
                className="h-8.5 text-xs rounded-xl"
              />
            </div>

            <div>
              <label className="font-semibold text-muted-foreground block mb-1">Description</label>
              <Input
                value={newGroupDesc}
                onChange={(e) => setNewGroupDesc(e.target.value)}
                placeholder="What is this group studying?"
                className="h-8.5 text-xs rounded-xl"
              />
            </div>

            <Button type="submit" className="w-full rounded-xl font-bold h-9 text-xs">
              Create Study Group
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL: Attach Material */}
      <Dialog open={isAttachMaterialOpen} onOpenChange={setIsAttachMaterialOpen}>
        <DialogContent className="max-w-md rounded-3xl p-5 border-border bg-card">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <BookOpen className="size-4 text-primary" /> Share Material in Chat
            </DialogTitle>
          </DialogHeader>

          <div className="max-h-60 overflow-y-auto space-y-1.5 mt-2 pr-1 text-xs">
            {availableMaterials.length === 0 ? (
              <p className="py-6 text-center text-muted-foreground">No library documents found.</p>
            ) : (
              availableMaterials.map((mat: any) => (
                <div
                  key={mat.id}
                  onClick={() => {
                    setSelectedMaterial({ id: mat.id, title: mat.title, course: mat.course });
                    setIsAttachMaterialOpen(false);
                    toast.success(`Attached "${mat.title}"`);
                  }}
                  className="p-2.5 rounded-xl border border-border hover:border-primary cursor-pointer transition-all flex items-center justify-between"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-xs truncate">{mat.title}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{mat.course}</p>
                  </div>
                  <Button size="sm" variant="outline" className="h-6 text-[10px] rounded-full">
                    Select
                  </Button>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default CommunityPage;
