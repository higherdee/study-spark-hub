import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Swords,
  Zap,
  BookOpen,
  Upload,
  Mic,
  Square,
  Sparkles,
  AlertTriangle,
  UserCheck,
  ShieldCheck,
  Check,
  X,
  FileText,
  Clock,
  Coins,
  ChevronRight,
  Loader2,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import {
  getGroupMembersWithBalancesServerFn,
  createStudyBattleServerFn,
} from "@/lib/battle.functions";
import { getMaterialsForChatServerFn } from "@/lib/community.functions";
import { transcribeVoiceAudioServerFn } from "@/lib/ai/study-assistant.functions";
import { battleAudio } from "@/lib/battle-audio";

interface HostBattleModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupId: string;
  groupTitle: string;
  isDirectPeer?: boolean | undefined;
  peerUser?:
    | {
        id: string;
        fullName: string;
        username: string;
        avatarUrl?: string | null | undefined;
        points?: number | undefined;
      }
    | undefined;
  currentUser: {
    id: string;
    fullName?: string | null | undefined;
    avatarUrl?: string | null | undefined;
    points?: number | undefined;
  };
  onBattleCreated?: ((battleId: string) => void) | undefined;
}

type SourceType = "topic" | "file" | "library" | "voice";

export function HostBattleModal({
  isOpen,
  onClose,
  groupId,
  groupTitle,
  isDirectPeer = false,
  peerUser,
  currentUser,
  onBattleCreated,
}: HostBattleModalProps) {
  // Battle Config State
  const [battleTitle, setBattleTitle] = useState("");
  const [mode, setMode] = useState<"mcq" | "theory">("mcq");
  const [timePerQuestion, setTimePerQuestion] = useState<number>(20);
  const [customTime, setCustomTime] = useState<string>("");
  const [stakeAmount, setStakeAmount] = useState<number>(0);
  const [customStake, setCustomStake] = useState<string>("");

  // Omni-Source State
  const [sourceType, setSourceType] = useState<SourceType>("topic");
  const [topicPrompt, setTopicPrompt] = useState("");
  const [uploadedFile, setUploadedFile] = useState<{ name: string; content: string } | null>(null);
  const [selectedLibraryMat, setSelectedLibraryMat] = useState<{
    id: string;
    title: string;
    course: string;
  } | null>(null);
  const [voiceTranscript, setVoiceTranscript] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);

  // Fighter Selection & Sponsoring State
  const [selectAll, setSelectAll] = useState(true);
  const [selectedFighterIds, setSelectedFighterIds] = useState<string[]>([]);
  const [sponsoredFighterIds, setSponsoredFighterIds] = useState<string[]>([]);

  // Loading state
  const [isCreating, setIsCreating] = useState(false);

  // MediaRecorder Ref for Voice Input
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Fetch Group Members with Live Point Balances
  const { data: members = [], isLoading: isLoadingMembers } = useQuery({
    queryKey: ["group-members-balances", groupId],
    enabled: isOpen && Boolean(groupId),
    queryFn: async () => {
      return await getGroupMembersWithBalancesServerFn({ data: { groupId } });
    },
  });

  // 2. Fetch Library Materials
  const { data: libraryMaterials = [] } = useQuery({
    queryKey: ["chat-materials", groupId],
    enabled: isOpen && sourceType === "library",
    queryFn: async () => {
      return await getMaterialsForChatServerFn({ data: { limit: 12 } });
    },
  });

  // Initialize selected fighters when members load
  useEffect(() => {
    if (members.length > 0) {
      if (selectAll) {
        setSelectedFighterIds(members.map((m) => m.id));
      }
    }
  }, [members, selectAll]);

  // Compute lowest balance among selected fighters
  const selectedMembers = members.filter((m) => selectedFighterIds.includes(m.id));
  const underfundedMembers = selectedMembers.filter(
    (m) => m.id !== currentUser.id && !sponsoredFighterIds.includes(m.id) && m.points < stakeAmount,
  );
  const minBalance =
    selectedMembers.length > 0 ? Math.min(...selectedMembers.map((m) => m.points)) : 0;

  // Real-time Pot calculation
  const totalPot = stakeAmount * (selectedFighterIds.length || 1);

  // Toggle Fighter
  const toggleFighter = (id: string) => {
    if (id === currentUser.id) return; // host is always included
    setSelectedFighterIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  // Toggle Sponsor for a fighter
  const toggleSponsor = (id: string) => {
    setSponsoredFighterIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  // Auto-Cap Stake resolution
  const handleAutoCapStake = () => {
    const capped = Math.max(0, minBalance);
    setStakeAmount(capped);
    setCustomStake("");
    toast.info(`Stake auto-capped to ${capped} pts to match lowest member balance.`);
  };

  // Bench Underfunded Fighters
  const handleBenchUnderfunded = () => {
    const underfundedIds = underfundedMembers.map((m) => m.id);
    setSelectedFighterIds((prev) => prev.filter((id) => !underfundedIds.includes(id)));
    toast.info(`Benched ${underfundedIds.length} underfunded fighters.`);
  };

  // Sponsor All Underfunded
  const handleSponsorAll = () => {
    const underfundedIds = underfundedMembers.map((m) => m.id);
    setSponsoredFighterIds((prev) => Array.from(new Set([...prev, ...underfundedIds])));
    toast.success(`You are sponsoring buy-ins for ${underfundedIds.length} fighter(s)!`);
  };

  // File Upload Handler (Simulated OCR / Text Extractor)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === "string" ? reader.result : "";
      setUploadedFile({
        name: file.name,
        content: text.slice(0, 4000) || `Extracted course syllabus for ${file.name}`,
      });
      if (!battleTitle) setBattleTitle(file.name.replace(/\.[^/.]+$/, ""));
      toast.success(`Loaded file: ${file.name}`);
    };
    reader.readAsText(file);
  };

  // Voice Prompt Recording via MediaRecorder + Groq Whisper
  const startVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingDuration(0);

      timerIntervalRef.current = setInterval(() => {
        setRecordingDuration((d) => d + 1);
      }, 1000);
    } catch {
      toast.error("Microphone access was denied or is unavailable.");
    }
  };

  const stopVoiceRecording = async () => {
    if (!mediaRecorderRef.current) return;

    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    setIsRecording(false);

    mediaRecorderRef.current.onstop = async () => {
      const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Audio = reader.result as string;
        try {
          toast.loading("Transcribing prompt with Groq Whisper...", { id: "whisper-tx" });
          const res = await transcribeVoiceAudioServerFn({
            data: { audioBase64: base64Audio },
          });
          toast.dismiss("whisper-tx");
          if (res?.transcript) {
            setVoiceTranscript(res.transcript);
            if (!battleTitle) setBattleTitle(res.transcript.slice(0, 40) + "...");
            toast.success("Voice prompt transcribed!");
          } else {
            toast.error("Could not decipher audio. Please try again.");
          }
        } catch {
          toast.dismiss("whisper-tx");
          toast.error("Transcription failed.");
        }
      };
      reader.readAsDataURL(audioBlob);
    };

    mediaRecorderRef.current.stop();
  };

  // Launch Battle
  const handleLaunchBattle = async () => {
    if (isCreating) return;
    if (
      mode === "mcq" &&
      (!Number.isInteger(timePerQuestion) || timePerQuestion < 5 || timePerQuestion > 300)
    ) {
      toast.error("Choose a whole-number time between 5 and 300 seconds.");
      return;
    }
    if (!Number.isInteger(stakeAmount) || stakeAmount < 0 || stakeAmount > 10000) {
      toast.error("Choose a whole-number stake from 0 to 10,000 points.");
      return;
    }
    if (
      (sourceType === "topic" && !topicPrompt.trim() && battleTitle.trim().length < 3) ||
      (sourceType === "file" && !uploadedFile) ||
      (sourceType === "library" && !selectedLibraryMat) ||
      (sourceType === "voice" && !voiceTranscript.trim())
    ) {
      toast.error("Add a topic or select study material before starting.");
      return;
    }
    const finalTitle =
      battleTitle.trim() ||
      (isDirectPeer ? `1v1 Challenge: ${groupTitle}` : `Study Battle: ${groupTitle}`);

    if (selectedFighterIds.length === 0) {
      toast.error("Select at least one opponent/fighter.");
      return;
    }

    let sourceContext = topicPrompt;
    let sourceSummary = "Topic Prompt: " + topicPrompt;
    if (sourceType === "file" && uploadedFile) {
      sourceContext = uploadedFile.content;
      sourceSummary = "Uploaded Document: " + uploadedFile.name;
    } else if (sourceType === "library" && selectedLibraryMat) {
      sourceContext = selectedLibraryMat.title + " " + selectedLibraryMat.course;
      sourceSummary = "Campus Library: " + selectedLibraryMat.title;
    } else if (sourceType === "voice" && voiceTranscript) {
      sourceContext = voiceTranscript;
      sourceSummary = "Whisper Voice Prompt: " + voiceTranscript;
    }

    setIsCreating(true);
    try {
      const battle = await createStudyBattleServerFn({
        data: {
          groupId,
          hostId: currentUser.id,
          hostName: currentUser.fullName || "Scholar",
          hostAvatar: currentUser.avatarUrl,
          title: finalTitle,
          mode,
          sourceSummary,
          sourceContext,
          timePerQuestion: mode === "mcq" ? timePerQuestion : null,
          questionCount: 5,
          stakeAmount,
          fighterIds: selectedFighterIds,
          sponsoredIds: sponsoredFighterIds,
        },
      });

      battleAudio.playBattleHorn();
      toast.success(
        isDirectPeer
          ? "⚡ 1v1 Challenge sent to your peer!"
          : "⚡ Battle Challenge dropped into chat!",
      );
      if (onBattleCreated) onBattleCreated(battle.id);
      onClose();
    } catch (err: any) {
      toast.error(err?.message || "Failed to launch battle challenge.");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-h-[92vh] max-w-xl overflow-y-auto rounded-3xl border-border bg-card p-0 shadow-[var(--elev-3)]">
        {/* Academic Docket Header */}
        <DialogHeader className="battle-setup-header border-b border-border bg-forest px-6 py-5 pr-12 text-white">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="grid size-10 place-items-center rounded-2xl bg-white/10 text-brass-soft border border-white/10">
                <Swords className="size-5" />
              </div>
              <div>
                <DialogTitle className="font-display text-xl font-normal tracking-tight text-white">
                  {isDirectPeer ? "Challenge your study partner" : "A little friendly competition"}
                </DialogTitle>
                <p className="mt-0.5 text-xs text-white/70">
                  {isDirectPeer
                    ? `Challenge @${peerUser?.username || groupTitle} to a live academic duel`
                    : "Choose a topic, invite your people, and see what sticks."}
                </p>
              </div>
            </div>

            <Badge
              variant="outline"
              className="max-w-[36%] truncate border-white/20 bg-white/5 text-xs font-medium text-white/90"
            >
              {groupTitle}
            </Badge>
          </div>
        </DialogHeader>

        <div className="p-6 space-y-5 text-xs text-ink">
          {/* 1. Battle Title */}
          <div>
            <label className="eyebrow block mb-1.5 text-ink-soft">1. Give it a topic</label>
            <Input
              value={battleTitle}
              onChange={(e) => setBattleTitle(e.target.value)}
              placeholder="e.g. Thermodynamics Carnot Cycle Blitz"
              className="h-10 rounded-xl border-border bg-background px-3 text-xs font-semibold text-ink placeholder:text-muted-foreground focus-visible:ring-forest"
            />
          </div>

          {/* 2. Knowledge Source Selector */}
          <div>
            <label className="eyebrow block mb-1.5 text-ink-soft">
              2. Choose your question source
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => setSourceType("topic")}
                className={cn(
                  "p-3 rounded-2xl border flex flex-col items-center gap-1.5 transition-all text-center lift press",
                  sourceType === "topic"
                    ? "border-forest bg-forest text-white shadow-xs font-semibold"
                    : "border-border bg-surface-container-low hover:bg-card text-ink-soft",
                )}
              >
                <Sparkles
                  className={cn(
                    "size-4.5",
                    sourceType === "topic" ? "text-brass-soft" : "text-brand",
                  )}
                />
                <span className="text-xs font-medium">Topic Prompt</span>
              </button>

              <button
                type="button"
                onClick={() => setSourceType("file")}
                className={cn(
                  "p-3 rounded-2xl border flex flex-col items-center gap-1.5 transition-all text-center lift press",
                  sourceType === "file"
                    ? "border-forest bg-forest text-white shadow-xs font-semibold"
                    : "border-border bg-surface-container-low hover:bg-card text-ink-soft",
                )}
              >
                <Upload
                  className={cn(
                    "size-4.5",
                    sourceType === "file" ? "text-brass-soft" : "text-forest",
                  )}
                />
                <span className="text-xs font-medium">Upload PDF/Doc</span>
              </button>

              <button
                type="button"
                onClick={() => setSourceType("library")}
                className={cn(
                  "p-3 rounded-2xl border flex flex-col items-center gap-1.5 transition-all text-center lift press",
                  sourceType === "library"
                    ? "border-forest bg-forest text-white shadow-xs font-semibold"
                    : "border-border bg-surface-container-low hover:bg-card text-ink-soft",
                )}
              >
                <BookOpen
                  className={cn(
                    "size-4.5",
                    sourceType === "library" ? "text-brass-soft" : "text-brand",
                  )}
                />
                <span className="text-xs font-medium">Campus Library</span>
              </button>

              <button
                type="button"
                onClick={() => setSourceType("voice")}
                className={cn(
                  "p-3 rounded-2xl border flex flex-col items-center gap-1.5 transition-all text-center lift press",
                  sourceType === "voice"
                    ? "border-forest bg-forest text-white shadow-xs font-semibold"
                    : "border-border bg-surface-container-low hover:bg-card text-ink-soft",
                )}
              >
                <Mic
                  className={cn(
                    "size-4.5",
                    sourceType === "voice" ? "text-brass-soft" : "text-brass",
                  )}
                />
                <span className="text-xs font-medium">Whisper Voice</span>
              </button>
            </div>

            {/* Omni-Source Expanded Area */}
            <div className="mt-2.5 p-3.5 rounded-2xl bg-surface-container-low border border-border">
              {sourceType === "topic" && (
                <div className="space-y-2">
                  <Input
                    value={topicPrompt}
                    onChange={(e) => setTopicPrompt(e.target.value)}
                    placeholder="Enter exam syllabus or course concepts..."
                    className="h-9 rounded-xl border-border bg-background text-xs text-ink"
                  />
                  <div className="flex flex-wrap gap-1.5 pt-0.5">
                    {[
                      "Differential Equations",
                      "Organic Reaction Mechanisms",
                      "Macroeconomics Inflation",
                      "Data Structures Trees",
                    ].map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => {
                          setTopicPrompt(tag);
                          if (!battleTitle) setBattleTitle(tag);
                        }}
                        className="text-[11px] px-2.5 py-0.5 rounded-full bg-card border border-border hover:border-forest hover:text-forest transition-colors text-ink-soft font-medium"
                      >
                        +{tag}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {sourceType === "file" && (
                <div className="text-center py-2">
                  {uploadedFile ? (
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-card border border-brand/40">
                      <div className="flex items-center gap-2">
                        <FileText className="size-4 text-brand" />
                        <span className="font-semibold text-ink text-xs">{uploadedFile.name}</span>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setUploadedFile(null)}
                        className="h-6 w-6 p-0 text-muted-foreground hover:text-ink"
                      >
                        <X className="size-3.5" />
                      </Button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center p-5 border border-dashed border-border rounded-xl cursor-pointer hover:border-forest/60 bg-card transition-colors">
                      <Upload className="size-5 text-muted-foreground mb-1.5" />
                      <span className="text-xs font-semibold text-ink">
                        Select Course PDF or Past Question
                      </span>
                      <span className="text-[10px] text-muted-foreground mt-0.5">
                        Extracts core concepts automatically
                      </span>
                      <input
                        type="file"
                        accept=".pdf,.docx,.txt"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              )}

              {sourceType === "library" && (
                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                  {libraryMaterials.length === 0 ? (
                    <p className="text-center text-muted-foreground py-3 text-xs">
                      No library materials found.
                    </p>
                  ) : (
                    libraryMaterials.map((mat: any) => (
                      <div
                        key={mat.id}
                        onClick={() => {
                          setSelectedLibraryMat({
                            id: mat.id,
                            title: mat.title,
                            course: mat.course,
                          });
                          if (!battleTitle) setBattleTitle(mat.title);
                        }}
                        className={cn(
                          "flex items-center justify-between p-2.5 rounded-xl border cursor-pointer text-xs transition-all lift",
                          selectedLibraryMat?.id === mat.id
                            ? "border-forest bg-forest/10 text-forest font-bold"
                            : "border-border bg-card hover:bg-surface-container-low",
                        )}
                      >
                        <div className="truncate">
                          <p className="font-semibold truncate text-ink">{mat.title}</p>
                          <p className="text-[10px] text-muted-foreground">{mat.course}</p>
                        </div>
                        {selectedLibraryMat?.id === mat.id && (
                          <Check className="size-4 text-forest shrink-0" />
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}

              {sourceType === "voice" && (
                <div className="flex flex-col items-center justify-center py-2 space-y-2">
                  <div className="flex items-center gap-2">
                    {isRecording ? (
                      <Button
                        type="button"
                        onClick={stopVoiceRecording}
                        className="h-9 rounded-full bg-destructive text-white gap-2 font-bold px-4 animate-pulse"
                      >
                        <Square className="size-3.5 fill-current" />
                        <span>Stop Recording ({recordingDuration}s)</span>
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        onClick={startVoiceRecording}
                        className="h-9 rounded-full bg-forest hover:bg-ink text-white font-bold gap-2 px-5 shadow-xs lift press"
                      >
                        <Mic className="size-3.5 text-brass-soft" />
                        <span>Record Voice Prompt (Whisper)</span>
                      </Button>
                    )}
                  </div>
                  {voiceTranscript && (
                    <div className="w-full p-2.5 rounded-xl bg-card border border-border text-xs text-ink">
                      <span className="eyebrow text-brass block mb-0.5">Transcribed Prompt</span>"
                      {voiceTranscript}"
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* 3. Game Mode & Timers */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="eyebrow block mb-1.5 text-ink-soft">Examination Format</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setMode("mcq")}
                  className={cn(
                    "p-3 rounded-2xl border flex flex-col items-center gap-1 transition-all lift press",
                    mode === "mcq"
                      ? "border-forest bg-forest text-white shadow-xs font-bold"
                      : "border-border bg-surface-container-low hover:bg-card text-ink-soft",
                  )}
                >
                  <Zap
                    className={cn("size-4", mode === "mcq" ? "text-brass-soft" : "text-brass")}
                  />
                  <span className="text-xs font-semibold">MCQ Blitz</span>
                  <span
                    className={cn(
                      "text-[10px]",
                      mode === "mcq" ? "text-white/70" : "text-muted-foreground",
                    )}
                  >
                    Speed Arena
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setMode("theory")}
                  className={cn(
                    "p-3 rounded-2xl border flex flex-col items-center gap-1 transition-all lift press",
                    mode === "theory"
                      ? "border-forest bg-forest text-white shadow-xs font-bold"
                      : "border-border bg-surface-container-low hover:bg-card text-ink-soft",
                  )}
                >
                  <BookOpen
                    className={cn("size-4", mode === "theory" ? "text-brass-soft" : "text-brand")}
                  />
                  <span className="text-xs font-semibold">Theory Showdown</span>
                  <span
                    className={cn(
                      "text-[10px]",
                      mode === "theory" ? "text-white/70" : "text-muted-foreground",
                    )}
                  >
                    Deep Derivations
                  </span>
                </button>
              </div>
            </div>

            <div>
              <label className="eyebrow block mb-1.5 text-ink-soft">
                {mode === "mcq" ? "Time per Question" : "Pacing & Evaluation"}
              </label>
              {mode === "mcq" ? (
                <div className="flex items-center gap-1.5">
                  {[10, 20, 30, 60].map((sec) => (
                    <button
                      key={sec}
                      type="button"
                      onClick={() => {
                        setTimePerQuestion(sec);
                        setCustomTime("");
                      }}
                      className={cn(
                        "flex-1 h-9 rounded-xl border text-xs font-bold transition-all tnum font-mono lift press",
                        timePerQuestion === sec && !customTime
                          ? "border-forest bg-forest text-white"
                          : "border-border bg-card hover:bg-surface-container-low text-ink",
                      )}
                    >
                      {sec}s
                    </button>
                  ))}
                  <Input
                    type="number"
                    min={5}
                    max={300}
                    step={1}
                    aria-label="Custom seconds per question"
                    value={customTime}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setCustomTime(e.target.value);
                      if (val > 0) setTimePerQuestion(val);
                    }}
                    placeholder="Custom"
                    className="w-16 h-9 text-xs rounded-xl text-center border-border font-mono"
                  />
                </div>
              ) : (
                <div className="h-9 rounded-xl border border-brand/40 bg-brand/10 px-3 flex items-center justify-between text-brand font-bold text-xs">
                  <span>Untimed ⏱️</span>
                  <span className="text-[10px] font-normal text-muted-foreground">
                    Handwritten OCR or Voice
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* 4. Stakes & Prize Pot */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="eyebrow text-ink-soft">Points per player (optional)</label>
              <div className="flex items-center gap-1.5 text-xs font-bold text-brass tnum font-mono">
                <Coins className="size-4" />
                <span>Potential pool: {totalPot} pts</span>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {[0, 5, 10, 20, 50].map((pts) => (
                <button
                  key={pts}
                  type="button"
                  onClick={() => {
                    setStakeAmount(pts);
                    setCustomStake("");
                  }}
                  className={cn(
                    "flex-1 h-9 rounded-xl border text-xs font-bold transition-all tnum font-mono lift press",
                    stakeAmount === pts && !customStake
                      ? "border-brass bg-brass text-white shadow-xs"
                      : "border-border bg-card hover:bg-surface-container-low text-ink",
                  )}
                >
                  {pts === 0 ? "Friendly" : `${pts} pts`}
                </button>
              ))}
              <Input
                type="number"
                min={0}
                max={10000}
                step={1}
                aria-label="Custom points per player"
                value={customStake}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setCustomStake(e.target.value);
                  if (val >= 0) setStakeAmount(val);
                }}
                placeholder="Custom"
                className="w-18 h-9 text-xs rounded-xl text-center border-border font-mono"
              />
            </div>
          </div>

          {/* 5. Fighter Roster & Wallet Scan */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="size-4 text-forest" />
                <span className="eyebrow text-ink-soft">
                  Fighters ({selectedFighterIds.length}/{members.length})
                </span>
              </div>

              {!isDirectPeer && (
                <button
                  type="button"
                  onClick={() => {
                    if (selectAll) {
                      setSelectAll(false);
                      setSelectedFighterIds([currentUser.id]);
                    } else {
                      setSelectAll(true);
                      setSelectedFighterIds(members.map((m) => m.id));
                    }
                  }}
                  className="text-xs font-semibold text-forest hover:underline"
                >
                  {selectAll ? "Deselect Others" : "Select Entire Group"}
                </button>
              )}
            </div>

            {/* Wallet Scan Warning Banner */}
            {underfundedMembers.length > 0 && stakeAmount > 0 && (
              <div className="p-3 rounded-2xl bg-brass/10 border border-brass/40 text-xs space-y-2">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="size-4 text-brass shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-ink">
                      Wallet Notice: {underfundedMembers.length} fighter(s) hold fewer than{" "}
                      {stakeAmount} pts
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Select a resolution so everyone enters the arena without friction:
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleAutoCapStake}
                    className="h-7 text-[10px] rounded-full border-brass/50 text-brass hover:bg-brass/15 font-bold"
                  >
                    📉 Auto-Cap to {Math.max(0, minBalance)} pts
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleBenchUnderfunded}
                    className="h-7 text-[10px] rounded-full border-border text-ink hover:bg-surface-container-low font-bold"
                  >
                    👤 Bench Underfunded
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleSponsorAll}
                    className="h-7 text-[10px] rounded-full bg-brand/10 border-brand/40 text-brand hover:bg-brand/20 font-bold"
                  >
                    🤝 Sponsor All Underfunded
                  </Button>
                </div>
              </div>
            )}

            {/* Member List */}
            <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 border border-border rounded-2xl p-2.5 bg-surface-container-low">
              {isLoadingMembers ? (
                <div className="py-6 text-center text-muted-foreground flex items-center justify-center gap-2">
                  <Loader2 className="size-4 animate-spin text-forest" />
                  <span>Finding your study group…</span>
                </div>
              ) : members.length === 0 ? (
                <p className="text-center text-muted-foreground py-4 text-xs">
                  No players yet. Invite someone to your study group first.
                </p>
              ) : (
                members.map((member) => {
                  const isHost = member.id === currentUser.id;
                  const isSelected = selectedFighterIds.includes(member.id);
                  const isSponsored = sponsoredFighterIds.includes(member.id);
                  const isBroke =
                    isSelected && !isHost && !isSponsored && member.points < stakeAmount;

                  return (
                    <div
                      key={member.id}
                      role="checkbox"
                      aria-checked={isSelected}
                      tabIndex={isHost ? -1 : 0}
                      aria-label={`${member.full_name || "Player"}${isHost ? " (host, always included)" : ""}`}
                      onKeyDown={(e) => {
                        if (e.key === " " || e.key === "Enter") {
                          e.preventDefault();
                          toggleFighter(member.id);
                        }
                      }}
                      onClick={() => toggleFighter(member.id)}
                      className={cn(
                        "flex items-center justify-between p-2.5 rounded-xl border text-xs cursor-pointer transition-all lift press",
                        isBroke
                          ? "border-brass/70 bg-brass/10"
                          : isSelected
                            ? "border-forest/50 bg-card shadow-xs"
                            : "border-border/60 opacity-60 hover:opacity-100 bg-background",
                      )}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Avatar className="size-8 border border-border">
                          <AvatarImage src={member.avatar_url || undefined} />
                          <AvatarFallback className="text-[10px] font-bold bg-forest text-white">
                            {member.full_name?.[0] || "S"}
                          </AvatarFallback>
                        </Avatar>

                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold truncate text-ink">
                              {member.full_name} {isHost && "(Host)"}
                            </span>
                            {isSponsored && (
                              <Badge
                                variant="outline"
                                className="text-[9px] h-4 px-1.5 bg-brand/15 border-brand/40 text-brand font-bold"
                              >
                                Sponsored
                              </Badge>
                            )}
                          </div>
                          <span className="text-[10px] text-muted-foreground block">
                            @{member.username || "student"}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Live Balance */}
                        <div
                          className={cn(
                            "px-2.5 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 tnum font-mono",
                            member.points < stakeAmount && !isSponsored
                              ? "bg-brass/20 text-brass"
                              : "bg-brand/15 text-brand",
                          )}
                        >
                          <Coins className="size-3" />
                          <span>{member.points} pts</span>
                        </div>

                        {/* Sponsor action */}
                        {!isHost && isSelected && member.points < stakeAmount && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleSponsor(member.id);
                            }}
                            className={cn(
                              "h-6 px-2 text-[10px] rounded-full",
                              isSponsored
                                ? "text-brand font-bold"
                                : "text-muted-foreground hover:text-ink",
                            )}
                          >
                            {isSponsored ? "Sponsoring" : "Sponsor"}
                          </Button>
                        )}

                        <div
                          className={cn(
                            "size-5 rounded-md grid place-items-center border",
                            isSelected
                              ? "bg-forest border-forest text-white"
                              : "border-border text-transparent",
                          )}
                        >
                          <Check className="size-3 stroke-[3]" />
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="battle-review">
            <strong>
              {stakeAmount === 0
                ? "Just for the learning. No points at risk."
                : "Before you send the challenge"}
            </strong>
            <p>
              5 AI-generated practice questions ·{" "}
              {mode === "mcq"
                ? `${timePerQuestion} seconds per question`
                : "Untimed written answers"}{" "}
              · {selectedFighterIds.length} invited players
            </p>
            {stakeAmount > 0 && (
              <p>
                Each joining player contributes {stakeAmount} points. Your host contribution is{" "}
                {stakeAmount * (1 + sponsoredFighterIds.length)} points including sponsorships. The
                final pool depends on who joins. Review before continuing.
              </p>
            )}
            <small>
              AI-generated questions and grading can be imperfect. Use this for practice, not formal
              assessment.
            </small>
          </div>
          {/* Launch Button */}
          <div className="pt-2">
            <Button
              type="button"
              disabled={isCreating || selectedFighterIds.length === 0}
              onClick={handleLaunchBattle}
              className="w-full h-11 rounded-2xl bg-forest hover:bg-ink text-white font-bold text-xs sm:text-sm shadow-md gap-2 transition-all lift press"
            >
              {isCreating ? (
                <>
                  <Loader2 className="size-4 animate-spin text-brass-soft" />
                  <span>Preparing your practice questions…</span>
                </>
              ) : (
                <>
                  <Swords className="size-4 text-brass-soft" />
                  <span>
                    {isDirectPeer
                      ? stakeAmount === 0
                        ? "Send friendly challenge"
                        : `Send challenge · ${stakeAmount} pts / player`
                      : stakeAmount === 0
                        ? "Start a friendly battle"
                        : `Create battle · ${stakeAmount} pts / player`}
                  </span>
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
