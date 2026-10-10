import { useState, useRef, useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Users,
  MessageSquare,
  Send,
  Plus,
  BookOpen,
  Flame,
  Search,
  Sparkles,
  Paperclip,
  GraduationCap,
  CheckCircle2,
  Clock,
  FileText,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Award,
  Bell,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useProfile } from "@/lib/profile";
import {
  getStudyGroupsServerFn,
  createStudyGroupServerFn,
  joinStudyGroupServerFn,
  getGroupMessagesServerFn,
  sendGroupMessageServerFn,
  updateStreakServerFn,
  getMaterialsForChatServerFn,
} from "@/lib/community.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/dashboard/community")({
  head: () => ({
    meta: [
      { title: "Student Study Hub & Groups — Syllaboss" },
      {
        name: "description",
        content: "Collaborate in student study groups, share academic materials, and maintain your daily reading streak.",
      },
    ],
  }),
  component: CommunityPage,
});

function CommunityPage() {
  const { data: profile } = useProfile();
  const queryClient = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGroupId, setSelectedGroupId] = useState<string>("group-get206-achievers");
  const [messageInput, setMessageInput] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isShareMaterialOpen, setIsShareMaterialOpen] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<{
    id: string;
    title: string;
    course_code: string;
  } | null>(null);

  // New Group Form State
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupCourse, setNewGroupCourse] = useState("");
  const [newGroupInstitution, setNewGroupInstitution] = useState(profile?.institution || "Achievers University, Owo");
  const [newGroupDescription, setNewGroupDescription] = useState("");
  const [newGroupCategory, setNewGroupCategory] = useState("Engineering");

  // Query: Study Groups
  const { data: groups = [], isLoading: isLoadingGroups } = useQuery({
    queryKey: ["study-groups", profile?.id, searchQuery],
    queryFn: () => getStudyGroupsServerFn({ data: { userId: profile?.id, query: searchQuery } }),
    refetchInterval: 10000,
  });

  // Active Group
  const activeGroup = groups.find((g) => g.id === selectedGroupId) || groups[0];

  // Query: Group Messages
  const { data: messages = [], isLoading: isLoadingMessages } = useQuery({
    queryKey: ["group-messages", activeGroup?.id],
    queryFn: () => (activeGroup ? getGroupMessagesServerFn({ data: { groupId: activeGroup.id } }) : []),
    enabled: Boolean(activeGroup?.id),
    refetchInterval: 3000, // Reactive polling for live chat feel
  });

  // Query: Available Materials for Sharing
  const { data: materialsData } = useQuery({
    queryKey: ["library-materials-for-chat"],
    queryFn: () => getMaterialsForChatServerFn({ data: { limit: 40 } }),
    enabled: isShareMaterialOpen,
  });

  // Mutation: Send Message
  const sendMessageMutation = useMutation({
    mutationFn: sendGroupMessageServerFn,
    onSuccess: () => {
      setMessageInput("");
      setSelectedMaterial(null);
      queryClient.invalidateQueries({ queryKey: ["group-messages", activeGroup?.id] });
    },
    onError: (err: any) => {
      toast.error("Failed to send message: " + (err.message || "Network error"));
    },
  });

  // Mutation: Create Group
  const createGroupMutation = useMutation({
    mutationFn: createStudyGroupServerFn,
    onSuccess: (newGroup) => {
      toast.success(`Group "${newGroup.name}" created!`);
      setIsCreateOpen(false);
      setNewGroupName("");
      setNewGroupDescription("");
      setNewGroupCourse("");
      queryClient.invalidateQueries({ queryKey: ["study-groups"] });
      setSelectedGroupId(newGroup.id);
    },
    onError: (err: any) => {
      toast.error("Could not create study group: " + err.message);
    },
  });

  // Mutation: Join Group
  const joinGroupMutation = useMutation({
    mutationFn: joinStudyGroupServerFn,
    onSuccess: () => {
      toast.success("Joined group successfully!");
      queryClient.invalidateQueries({ queryKey: ["study-groups"] });
    },
  });

  // Mutation: Record Daily Reading Streak
  const streakMutation = useMutation({
    mutationFn: updateStreakServerFn,
    onSuccess: (status) => {
      toast.success(`🔥 Streak Active! Day ${status.currentStreak} secured!`);
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
  });

  // Scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() && !selectedMaterial) return;
    if (!activeGroup || !profile) return;

    sendMessageMutation.mutate({
      data: {
        groupId: activeGroup.id,
        userId: profile.id,
        userName: profile.full_name || "Scholar",
        userInstitution: profile.institution || undefined,
        content: messageInput.trim() || `Shared material: ${selectedMaterial?.title}`,
        materialId: selectedMaterial?.id,
        materialTitle: selectedMaterial?.title,
        materialCourseCode: selectedMaterial?.course_code,
      },
    });
  };

  const currentStreak = (profile as any)?.current_streak || 1;
  const longestStreak = (profile as any)?.longest_streak || 1;
  const lastStreakDate = (profile as any)?.last_streak_date || "";
  const today = new Date().toISOString().slice(0, 10);
  const streakCompletedToday = lastStreakDate === today;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* 1. TOP HEADER: STREAK & DAILY READING REMINDER */}
      <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/10 via-background to-amber-500/10 p-5 md:p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-500 shadow-inner">
              <Flame className="size-8 animate-pulse text-amber-500" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">
                  Student Study Hub & Groups
                </h1>
                <Badge variant="outline" className="border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold">
                  🔥 {currentStreak} Day Streak
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">
                Chat with coursemates, share university materials, and keep your daily reading streak blazing.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant={streakCompletedToday ? "outline" : "default"}
              size="sm"
              onClick={() => {
                if (profile?.id) streakMutation.mutate({ data: { userId: profile.id } });
              }}
              disabled={streakMutation.isPending || streakCompletedToday}
              className={cn(
                "rounded-xl font-medium gap-2 shadow-sm",
                !streakCompletedToday && "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white"
              )}
            >
              <Flame className="size-4" />
              {streakCompletedToday ? "Streak Kept Today!" : "Check In & Keep Streak"}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsCreateOpen(true)}
              className="rounded-xl gap-2 border-primary/30 hover:bg-primary/5"
            >
              <Plus className="size-4 text-primary" />
              Create Group
            </Button>
          </div>
        </div>

        {/* Daily Reading Reminder Alert */}
        <div className="mt-4 flex items-center justify-between rounded-xl bg-background/80 border border-border/80 px-4 py-2.5 text-xs md:text-sm backdrop-blur-sm">
          <div className="flex items-center gap-2.5 text-muted-foreground">
            <Bell className="size-4 text-primary animate-bounce" />
            <span>
              <strong className="text-foreground">Daily Reading Goal:</strong> Read 20 minutes from any course material today to advance your academic streak (Best: {longestStreak} days).
            </span>
          </div>
          <Link
            to="/dashboard/library"
            className="text-primary font-medium hover:underline flex items-center gap-1 shrink-0 ml-2"
          >
            Open Library <ChevronRight className="size-3.5" />
          </Link>
        </div>
      </div>

      {/* 2. MAIN HUB INTERFACE: SIDEBAR (GROUPS) + CHAT AREA */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: STUDY GROUPS LIST (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="rounded-2xl border border-border bg-card p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-sm flex items-center gap-2">
                <Users className="size-4 text-primary" /> Study Groups ({groups.length})
              </h2>
              <span className="text-xs text-muted-foreground">Active Now</span>
            </div>

            {/* Search Filter */}
            <div className="relative">
              <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
              <Input
                placeholder="Search by course code, university..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 text-xs rounded-xl h-9"
              />
            </div>

            {/* Groups Scroll List */}
            <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
              {isLoadingGroups ? (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  Loading university study groups...
                </div>
              ) : groups.length === 0 ? (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  No study groups found. Be the first to create one!
                </div>
              ) : (
                groups.map((group) => {
                  const isSelected = activeGroup?.id === group.id;
                  return (
                    <button
                      key={group.id}
                      type="button"
                      onClick={() => setSelectedGroupId(group.id)}
                      className={cn(
                        "w-full text-left p-3 rounded-xl transition-all border flex flex-col gap-1.5",
                        isSelected
                          ? "bg-primary/10 border-primary/40 shadow-sm"
                          : "bg-secondary/20 hover:bg-secondary/50 border-transparent"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 truncate">
                          <span
                            className="size-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: group.avatar_color }}
                          />
                          <span className="font-semibold text-xs md:text-sm text-foreground truncate">
                            {group.name}
                          </span>
                        </div>
                        {group.course_code && (
                          <Badge variant="secondary" className="text-[10px] h-5 px-1.5 font-mono shrink-0">
                            {group.course_code}
                          </Badge>
                        )}
                      </div>

                      {group.description && (
                        <p className="text-[11px] text-muted-foreground line-clamp-1">
                          {group.description}
                        </p>
                      )}

                      <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1 border-t border-border/40">
                        <span className="truncate max-w-[170px]">{group.institution || "All Universities"}</span>
                        <span className="flex items-center gap-1 font-medium">
                          <Users className="size-3" /> {group.member_count} members
                        </span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: ACTIVE GROUP CHAT STREAM (8 cols) */}
        <div className="lg:col-span-8">
          <div className="rounded-2xl border border-border bg-card shadow-sm flex flex-col h-[650px] overflow-hidden">
            {/* Group Header */}
            {activeGroup ? (
              <div className="p-4 border-b border-border bg-secondary/30 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="size-10 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-sm"
                    style={{ backgroundColor: activeGroup.avatar_color }}
                  >
                    {activeGroup.course_code ? activeGroup.course_code.slice(0, 3) : "HUB"}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-sm md:text-base text-foreground">
                        {activeGroup.name}
                      </h3>
                      {activeGroup.course_code && (
                        <Badge variant="outline" className="text-xs font-mono">
                          {activeGroup.course_code}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {activeGroup.institution || "National Curriculum"} · {activeGroup.member_count} coursemates enrolled
                    </p>
                  </div>
                </div>

                {!activeGroup.is_member && profile && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => joinGroupMutation.mutate({ data: { groupId: activeGroup.id, userId: profile.id } })}
                    disabled={joinGroupMutation.isPending}
                    className="text-xs h-8 rounded-xl"
                  >
                    Join Discussion
                  </Button>
                )}
              </div>
            ) : (
              <div className="p-4 border-b text-xs text-muted-foreground">Select a group to start chatting</div>
            )}

            {/* Chat Messages Stream */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-background/50">
              {isLoadingMessages ? (
                <div className="flex items-center justify-center h-full text-xs text-muted-foreground">
                  Loading discussion messages...
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground p-6">
                  <MessageSquare className="size-10 text-muted-foreground/40 mb-2" />
                  <p className="font-semibold text-sm">No messages yet in this study group.</p>
                  <p className="text-xs mt-1 max-w-sm">
                    Start the conversation! Ask a question about your syllabus or share a textbook from the library.
                  </p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isMe = msg.user_id === profile?.id;
                  const isSystem = msg.user_id === "system";

                  if (isSystem) {
                    return (
                      <div key={msg.id} className="flex justify-center my-2">
                        <div className="rounded-full bg-secondary/80 border border-border px-4 py-1 text-[11px] text-muted-foreground flex items-center gap-1.5 shadow-sm">
                          <Sparkles className="size-3 text-primary" />
                          <span>{msg.content}</span>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={msg.id}
                      className={cn("flex flex-col gap-1 max-w-[80%]", isMe ? "ml-auto items-end" : "mr-auto items-start")}
                    >
                      {/* Author Header */}
                      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground px-1">
                        <span className="font-medium text-foreground">{isMe ? "You" : msg.user_name}</span>
                        {msg.user_institution && (
                          <span>· {msg.user_institution.split(",")[0]}</span>
                        )}
                        <span>· {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                      </div>

                      {/* Message Bubble */}
                      <div
                        className={cn(
                          "rounded-2xl px-4 py-2.5 text-xs md:text-sm shadow-sm space-y-2",
                          isMe
                            ? "bg-primary text-primary-foreground rounded-tr-none"
                            : "bg-secondary text-secondary-foreground rounded-tl-none border border-border/40"
                        )}
                      >
                        <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>

                        {/* Attached Library Material Card */}
                        {msg.material_id && (
                          <div
                            className={cn(
                              "rounded-xl p-2.5 border mt-2 flex items-center justify-between gap-3 text-xs transition-colors",
                              isMe
                                ? "bg-primary-foreground/10 border-primary-foreground/20 text-primary-foreground"
                                : "bg-card border-border text-foreground hover:bg-card/80"
                            )}
                          >
                            <div className="flex items-center gap-2.5 truncate">
                              <div className="p-2 rounded-lg bg-primary/20 text-primary">
                                <BookOpen className="size-4" />
                              </div>
                              <div className="truncate">
                                <div className="font-bold truncate text-xs">{msg.material_title}</div>
                                <div className="text-[10px] opacity-80">{msg.material_course_code} · Verified Material</div>
                              </div>
                            </div>

                            <Link
                              to="/dashboard/preview"
                              search={{ id: msg.material_id }}
                              className={cn(
                                "shrink-0 p-1.5 rounded-lg border font-medium flex items-center gap-1 text-[11px]",
                                isMe
                                  ? "bg-white/20 hover:bg-white/30 text-white border-white/30"
                                  : "bg-primary text-primary-foreground hover:bg-primary/90"
                              )}
                            >
                              Open <ExternalLink className="size-3" />
                            </Link>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Selected Attachment Preview */}
            {selectedMaterial && (
              <div className="px-4 py-2 bg-primary/5 border-t border-primary/20 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-primary font-medium truncate">
                  <BookOpen className="size-4 shrink-0" />
                  <span className="truncate">Attaching: {selectedMaterial.title} ({selectedMaterial.course_code})</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedMaterial(null)}
                  className="size-6 p-0 hover:bg-primary/20 rounded-full"
                >
                  <X className="size-3.5" />
                </Button>
              </div>
            )}

            {/* Input Composer Form */}
            <form onSubmit={handleSendMessage} className="p-3 border-t border-border bg-card flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setIsShareMaterialOpen(true)}
                title="Share study material from library"
                className="size-10 rounded-xl shrink-0 border-border/80 hover:bg-primary/10 hover:text-primary"
              >
                <Paperclip className="size-4" />
              </Button>

              <Input
                placeholder={
                  activeGroup
                    ? `Message ${activeGroup.name}...`
                    : "Select a group to post..."
                }
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                disabled={!activeGroup}
                className="h-10 text-xs md:text-sm rounded-xl flex-1 bg-background"
              />

              <Button
                type="submit"
                disabled={(!messageInput.trim() && !selectedMaterial) || sendMessageMutation.isPending || !activeGroup}
                size="icon"
                className="size-10 rounded-xl shrink-0 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
              >
                <Send className="size-4" />
              </Button>
            </form>
          </div>
        </div>
      </div>

      {/* 3. DIALOG: CREATE STUDY GROUP */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="size-5 text-primary" /> Create New Study Group
            </DialogTitle>
            <DialogDescription>
              Create a dedicated study circle for your course, level, or department.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">Group Name *</label>
              <Input
                placeholder="e.g. GET 206 Workshop Practice Circle"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                className="rounded-xl text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-foreground mb-1 block">Course Code</label>
                <Input
                  placeholder="e.g. GET 206"
                  value={newGroupCourse}
                  onChange={(e) => setNewGroupCourse(e.target.value)}
                  className="rounded-xl text-xs font-mono uppercase"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground mb-1 block">Category</label>
                <select
                  value={newGroupCategory}
                  onChange={(e) => setNewGroupCategory(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-input bg-background text-xs"
                >
                  <option value="Engineering">Engineering</option>
                  <option value="Mathematics">Mathematics</option>
                  <option value="Sciences">Sciences</option>
                  <option value="Health & Medical">Health & Medical</option>
                  <option value="Social Sciences">Social Sciences</option>
                  <option value="General">General</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">Target Institution</label>
              <Input
                placeholder="e.g. Achievers University, Owo or All Universities"
                value={newGroupInstitution}
                onChange={(e) => setNewGroupInstitution(e.target.value)}
                className="rounded-xl text-xs"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">Description</label>
              <Textarea
                placeholder="What will students discuss and learn in this study circle?"
                value={newGroupDescription}
                onChange={(e) => setNewGroupDescription(e.target.value)}
                className="rounded-xl text-xs h-20"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setIsCreateOpen(false)} className="rounded-xl">
                Cancel
              </Button>
              <Button
                disabled={!newGroupName.trim() || createGroupMutation.isPending || !profile?.id}
                onClick={() => {
                  if (profile?.id) {
                    createGroupMutation.mutate({
                      data: {
                        name: newGroupName,
                        course_code: newGroupCourse || undefined,
                        institution: newGroupInstitution || undefined,
                        category: newGroupCategory,
                        description: newGroupDescription || undefined,
                        userId: profile.id,
                      },
                    });
                  }
                }}
                className="rounded-xl bg-primary text-primary-foreground"
              >
                Create Study Circle
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 4. DIALOG: SHARE LIBRARY MATERIAL IN CHAT */}
      <Dialog open={isShareMaterialOpen} onOpenChange={setIsShareMaterialOpen}>
        <DialogContent className="max-w-lg rounded-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="size-5 text-primary" /> Share Material From Library
            </DialogTitle>
            <DialogDescription>
              Select any verified textbook, past question, or lecture note to share directly with your coursemates.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-2.5 pt-2 pr-1">
            {!materialsData ? (
              <div className="py-8 text-center text-xs text-muted-foreground">Loading verified library materials...</div>
            ) : materialsData.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground">No materials found in library.</div>
            ) : (
              materialsData.map((m: any) => (
                <div
                  key={m.id}
                  className="p-3 rounded-xl border border-border bg-card hover:border-primary/50 transition-all flex items-center justify-between gap-3"
                >
                  <div className="truncate space-y-0.5">
                    <div className="font-semibold text-xs text-foreground truncate">{m.title}</div>
                    <div className="text-[11px] text-muted-foreground flex items-center gap-2">
                      <span className="font-mono text-primary font-bold">{m.course_code || m.course}</span>
                      <span>· {m.institution}</span>
                      <span>· {m.page_count} pgs</span>
                    </div>
                  </div>

                  <Button
                    size="sm"
                    onClick={() => {
                      setSelectedMaterial({
                        id: m.id,
                        title: m.title,
                        course_code: m.course_code || m.course,
                      });
                      setIsShareMaterialOpen(false);
                      toast.success(`Attached "${m.title.slice(0, 35)}..." to your message!`);
                    }}
                    className="shrink-0 rounded-xl text-xs h-8"
                  >
                    Attach
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
