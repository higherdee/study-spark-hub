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
  AlertCircle,
  Check,
  X,
  FileText,
  Clock,
  Coins,
  ChevronRight,
  Loader2,
  Users,
  ShieldCheck,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  peerUser?: {
    id: string;
    fullName: string;
    username: string;
    avatarUrl?: string | null | undefined;
    points?: number | undefined;
  } | undefined;
  currentUser: {
    id: string;
    fullName?: string | null | undefined;
    avatarUrl?: string | null | undefined;
    points?: number | undefined;
  };
  onBattleCreated?: ((battleId: string) => void) | undefined;
}

type SourceType = "topic" | "file" | "library" | "voice";

const CURATED_TOPICS = [
  "Thermodynamics & Heat Cycles",
  "Organic Reaction Mechanisms",
  "Macroeconomics & Fiscal Policy",
  "Data Structures & Tree Traversal",
  "Cellular Respiration & Krebs Cycle",
  "Linear Algebra & Eigenvalues",
];

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
  const [stakeAmount, setStakeAmount] = useState<number>(10);
  const [customStake, setCustomStake] = useState<string>("");

  // Omni-Source State
  const [sourceType, setSourceType] = useState<SourceType>("topic");
  const [topicPrompt, setTopicPrompt] = useState("");
  const [uploadedFile, setUploadedFile] = useState<{ name: string; content: string } | null>(null);
  const [selectedLibraryMat, setSelectedLibraryMat] = useState<{ id: string; title: string; course: string } | null>(null);
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
    (m) => m.id !== currentUser.id && !sponsoredFighterIds.includes(m.id) && m.points < stakeAmount
  );
  const minBalance = selectedMembers.length > 0
    ? Math.min(...selectedMembers.map((m) => m.points))
    : 0;

  // Real-time Pot calculation
  const totalPot = stakeAmount * (selectedFighterIds.length || 1);

  // Toggle Fighter
  const toggleFighter = (id: string) => {
    if (id === currentUser.id) return; // host is always included
    setSelectedFighterIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  // Toggle Sponsor for a fighter
  const toggleSponsor = (id: string) => {
    setSponsoredFighterIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  // Auto-Cap Stake resolution
  const handleAutoCapStake = () => {
    const capped = Math.max(0, minBalance);
    setStakeAmount(capped);
    setCustomStake("");
    toast.info(`Stake calibrated to ${capped} pts to match lowest member balance.`);
  };

  // Bench Underfunded Fighters
  const handleBenchUnderfunded = () => {
    const underfundedIds = underfundedMembers.map((m) => m.id);
    setSelectedFighterIds((prev) => prev.filter((id) => !underfundedIds.includes(id)));
    toast.info(`Benched ${underfundedIds.length} underfunded scholars.`);
  };

  // Sponsor All Underfunded
  const handleSponsorAll = () => {
    const underfundedIds = underfundedMembers.map((m) => m.id);
    setSponsoredFighterIds((prev) => Array.from(new Set([...prev, ...underfundedIds])));
    toast.success(`You are sponsoring buy-ins for ${underfundedIds.length} scholar(s)!`);
  };

  // File Upload Handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === "string" ? reader.result : "";
      setUploadedFile({
        name: file.name,
        content: text.slice(0, 4000) || `Extracted syllabus context for ${file.name}`,
      });
      if (!battleTitle) setBattleTitle(file.name.replace(/\.[^/.]+$/, ""));
      toast.success(`Loaded: ${file.name}`);
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
          toast.loading("Transcribing prompt with Whisper...", { id: "whisper-tx" });
          const res = await transcribeVoiceAudioServerFn({
            data: { audioBase64: base64Audio },
          });
          toast.dismiss("whisper-tx");
          if (res?.transcript) {
            setVoiceTranscript(res.transcript);
            if (!battleTitle) setBattleTitle(res.transcript.slice(0, 42) + "...");
            toast.success("Voice prompt transcribed!");
          } else {
            toast.error("Could not transcribe audio. Please try again.");
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
    const finalTitle = battleTitle.trim() || (isDirectPeer ? `1v1 Challenge: ${groupTitle}` : `Study Battle: ${groupTitle}`);

    if (selectedFighterIds.length === 0) {
      toast.error("Select at least one opponent or contestant.");
      return;
    }

    let sourceContext = topicPrompt;
    let sourceSummary = "Topic Prompt: " + (topicPrompt || finalTitle);
    if (sourceType === "file" && uploadedFile) {
      sourceContext = uploadedFile.content;
      sourceSummary = "Document: " + uploadedFile.name;
    } else if (sourceType === "library" && selectedLibraryMat) {
      sourceContext = selectedLibraryMat.title + " " + selectedLibraryMat.course;
      sourceSummary = "Library: " + selectedLibraryMat.title;
    } else if (sourceType === "voice" && voiceTranscript) {
      sourceContext = voiceTranscript;
      sourceSummary = "Voice Prompt: " + voiceTranscript;
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
      toast.success(isDirectPeer ? "⚡ 1v1 Challenge dispatched!" : "⚡ Battle Lobby opened in chat!");
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
      <DialogContent className="max-h-[92vh] max-w-2xl overflow-hidden rounded-[2rem] p-1.5 sm:p-2 border border-border/80 bg-surface-container-low shadow-[var(--elev-3)]">
        {/* Double-Bezel Inner Core */}
        <div className="flex flex-col max-h-[calc(92vh-1rem)] bg-card rounded-[calc(2rem-0.375rem)] border border-border/60 overflow-hidden">
          
          {/* Header Docket */}
          <div className="px-6 py-5 border-b border-border/70 bg-surface-container-low/60 flex items-start justify-between gap-4">
            <div className="flex items-start gap-3.5 min-w-0">
              <div className="size-10 rounded-2xl bg-forest text-brass-soft flex items-center justify-center shrink-0 shadow-xs border border-forest/80">
                <Swords className="size-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="eyebrow text-forest font-bold tracking-[0.14em]">
                    {isDirectPeer ? "1v1 Academic Duel" : "Tournament Arena"}
                  </span>
                  <span className="text-border">•</span>
                  <Badge variant="outline" className="h-5 px-2 text-[10px] rounded-full border-border bg-card text-ink-soft max-w-[180px] truncate">
                    {groupTitle}
                  </Badge>
                </div>
                <DialogTitle className="font-display text-2xl font-normal text-ink tracking-tight leading-tight">
                  {isDirectPeer ? `Challenge @${peerUser?.username || "Scholar"}` : "Host Study Showdown"}
                </DialogTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {isDirectPeer
                    ? "Live head-to-head match with synchronized exam questions."
                    : "Calibrate exam syllabus, escrow stakes, and invite scholars."}
                </p>
              </div>
            </div>

            {/* Quick Escrow Pot Pill in Header */}
            <div className="shrink-0 text-right hidden sm:block">
              <span className="eyebrow block">Estimated Pot</span>
              <div className="flex items-center gap-1.5 font-display text-xl text-brass font-medium tnum">
                <Coins className="size-4 text-brass" />
                <span>{totalPot} pts</span>
              </div>
            </div>
          </div>

          {/* Scrollable Form Body */}
          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6 text-ink">
            
            {/* Card 1: Subject / Topic & Knowledge Source */}
            <div className="rounded-2xl border border-border/80 bg-surface-container-low/40 p-4 sm:p-5 space-y-3.5">
              <div>
                <label className="eyebrow block mb-1.5 text-ink-soft">
                  Examination Subject / Concept
                </label>
                <Input
                  value={battleTitle}
                  onChange={(e) => setBattleTitle(e.target.value)}
                  placeholder="e.g. Thermodynamics & Heat Cycles Blitz"
                  className="h-10 rounded-xl border-border bg-card px-3 text-xs sm:text-sm font-semibold text-ink placeholder:text-muted-foreground focus-visible:ring-forest shadow-xs"
                />
              </div>

              {/* Omni-Source Segmented Dock */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between">
                  <span className="eyebrow text-ink-soft">
                    Knowledge Source for AI Question Synthesis
                  </span>
                  <span className="text-[11px] text-muted-foreground font-mono">5 Questions</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1 rounded-xl bg-surface-container border border-border/70">
                  <button
                    type="button"
                    onClick={() => setSourceType("topic")}
                    className={cn(
                      "py-2 px-2.5 rounded-lg flex items-center justify-center gap-1.5 text-xs font-semibold transition-all cursor-pointer active:scale-[0.98]",
                      sourceType === "topic"
                        ? "bg-card text-forest shadow-xs border border-border/60"
                        : "text-ink-soft hover:text-ink"
                    )}
                  >
                    <Sparkles className="size-3.5 text-brand" />
                    <span>Topic</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSourceType("file")}
                    className={cn(
                      "py-2 px-2.5 rounded-lg flex items-center justify-center gap-1.5 text-xs font-semibold transition-all cursor-pointer active:scale-[0.98]",
                      sourceType === "file"
                        ? "bg-card text-forest shadow-xs border border-border/60"
                        : "text-ink-soft hover:text-ink"
                    )}
                  >
                    <Upload className="size-3.5 text-forest" />
                    <span>Document</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSourceType("library")}
                    className={cn(
                      "py-2 px-2.5 rounded-lg flex items-center justify-center gap-1.5 text-xs font-semibold transition-all cursor-pointer active:scale-[0.98]",
                      sourceType === "library"
                        ? "bg-card text-forest shadow-xs border border-border/60"
                        : "text-ink-soft hover:text-ink"
                    )}
                  >
                    <BookOpen className="size-3.5 text-brand" />
                    <span>Library</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSourceType("voice")}
                    className={cn(
                      "py-2 px-2.5 rounded-lg flex items-center justify-center gap-1.5 text-xs font-semibold transition-all cursor-pointer active:scale-[0.98]",
                      sourceType === "voice"
                        ? "bg-card text-forest shadow-xs border border-border/60"
                        : "text-ink-soft hover:text-ink"
                    )}
                  >
                    <Mic className="size-3.5 text-brass" />
                    <span>Voice Note</span>
                  </button>
                </div>

                {/* Sub-panels for selected source */}
                <div className="pt-1">
                  {sourceType === "topic" && (
                    <div className="space-y-2.5">
                      <Input
                        value={topicPrompt}
                        onChange={(e) => setTopicPrompt(e.target.value)}
                        placeholder="Specific sub-topics or exam keywords..."
                        className="h-9 rounded-xl border-border bg-card text-xs text-ink"
                      />
                      <div className="flex flex-wrap gap-1.5">
                        {CURATED_TOPICS.map((tag) => (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => {
                              setTopicPrompt(tag);
                              if (!battleTitle) setBattleTitle(tag);
                            }}
                            className="text-[11px] px-3 py-1 rounded-full bg-card border border-border/80 hover:border-forest/50 hover:text-forest transition-all text-ink-soft font-medium active:scale-[0.97]"
                          >
                            +{tag}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {sourceType === "file" && (
                    <div>
                      {uploadedFile ? (
                        <div className="flex items-center justify-between p-3 rounded-xl bg-card border border-brand/40 shadow-xs">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <FileText className="size-4 text-brand shrink-0" />
                            <span className="font-semibold text-xs truncate text-ink">{uploadedFile.name}</span>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setUploadedFile(null)}
                            className="size-7 p-0 rounded-full text-muted-foreground hover:text-ink"
                          >
                            <X className="size-3.5" />
                          </Button>
                        </div>
                      ) : (
                        <label className="flex flex-col items-center justify-center p-5 border border-dashed border-border rounded-xl cursor-pointer hover:border-forest/50 bg-card hover:bg-surface-container-low/50 transition-colors">
                          <Upload className="size-5 text-forest/70 mb-1.5" />
                          <span className="text-xs font-semibold text-ink">Upload Lecture Note or Past Exam PDF</span>
                          <span className="text-[11px] text-muted-foreground mt-0.5">Boss AI scans questions directly from syllabus text</span>
                          <input type="file" accept=".pdf,.docx,.txt" onChange={handleFileUpload} className="hidden" />
                        </label>
                      )}
                    </div>
                  )}

                  {sourceType === "library" && (
                    <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                      {libraryMaterials.length === 0 ? (
                        <p className="text-center text-muted-foreground py-4 text-xs">No course materials found in library.</p>
                      ) : (
                        libraryMaterials.map((mat: any) => (
                          <div
                            key={mat.id}
                            onClick={() => {
                              setSelectedLibraryMat({ id: mat.id, title: mat.title, course: mat.course });
                              if (!battleTitle) setBattleTitle(mat.title);
                            }}
                            className={cn(
                              "flex items-center justify-between p-2.5 rounded-xl border cursor-pointer text-xs transition-all active:scale-[0.99]",
                              selectedLibraryMat?.id === mat.id
                                ? "border-forest bg-forest/5 text-forest font-semibold shadow-xs"
                                : "border-border bg-card hover:bg-surface-container-low"
                            )}
                          >
                            <div className="truncate pr-2">
                              <p className="truncate text-ink font-medium">{mat.title}</p>
                              <p className="text-[10px] text-muted-foreground font-mono">{mat.course}</p>
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
                    <div className="flex flex-col items-center justify-center py-3 space-y-2.5 bg-card rounded-xl border border-border p-4">
                      {isRecording ? (
                        <div className="flex items-center gap-3">
                          <span className="size-3 rounded-full bg-destructive animate-ping" />
                          <span className="font-mono text-xs font-bold text-destructive">
                            Recording audio ({recordingDuration}s)
                          </span>
                          <Button
                            type="button"
                            size="sm"
                            onClick={stopVoiceRecording}
                            className="h-8 rounded-full bg-destructive text-white gap-1.5 font-semibold text-xs px-3"
                          >
                            <Square className="size-3 fill-current" />
                            <span>Stop & Transcribe</span>
                          </Button>
                        </div>
                      ) : (
                        <Button
                          type="button"
                          onClick={startVoiceRecording}
                          className="h-9 rounded-full bg-forest text-white hover:bg-forest/90 font-semibold text-xs gap-2 px-5 shadow-xs active:scale-[0.98]"
                        >
                          <Mic className="size-3.5 text-brass-soft" />
                          <span>Record Voice Exam Prompt (Whisper)</span>
                        </Button>
                      )}

                      {voiceTranscript && (
                        <div className="w-full p-3 rounded-xl bg-surface-container-low border border-border text-xs text-ink">
                          <span className="eyebrow text-brass-ink block mb-0.5">Transcribed Prompt</span>
                          <p className="italic text-ink-soft leading-relaxed">"{voiceTranscript}"</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Card 2: Format & Stakes (Bento Grid) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Examination Format */}
              <div className="rounded-2xl border border-border/80 bg-surface-container-low/40 p-4 space-y-3">
                <label className="eyebrow block text-ink-soft">
                  Examination Format
                </label>
                
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setMode("mcq")}
                    className={cn(
                      "p-3 rounded-xl border flex flex-col items-start gap-1 text-left transition-all cursor-pointer active:scale-[0.98]",
                      mode === "mcq"
                        ? "border-forest bg-card shadow-xs ring-1 ring-forest/30"
                        : "border-border bg-card/60 hover:bg-card text-muted-foreground"
                    )}
                  >
                    <div className="flex items-center justify-between w-full">
                      <Zap className={cn("size-4", mode === "mcq" ? "text-forest" : "text-muted-foreground")} />
                      {mode === "mcq" && <Check className="size-3.5 text-forest" />}
                    </div>
                    <span className="text-xs font-semibold text-ink mt-1">MCQ Blitz</span>
                    <span className="text-[10px] text-muted-foreground leading-tight">Timed Speed Arena</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setMode("theory")}
                    className={cn(
                      "p-3 rounded-xl border flex flex-col items-start gap-1 text-left transition-all cursor-pointer active:scale-[0.98]",
                      mode === "theory"
                        ? "border-forest bg-card shadow-xs ring-1 ring-forest/30"
                        : "border-border bg-card/60 hover:bg-card text-muted-foreground"
                    )}
                  >
                    <div className="flex items-center justify-between w-full">
                      <BookOpen className={cn("size-4", mode === "theory" ? "text-forest" : "text-muted-foreground")} />
                      {mode === "theory" && <Check className="size-3.5 text-forest" />}
                    </div>
                    <span className="text-xs font-semibold text-ink mt-1">Theory Duel</span>
                    <span className="text-[10px] text-muted-foreground leading-tight">Deep Derivations</span>
                  </button>
                </div>

                {/* Pace */}
                <div>
                  <span className="text-[11px] font-medium text-muted-foreground block mb-1.5">
                    {mode === "mcq" ? "Pace per Question" : "Evaluation"}
                  </span>
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
                            "flex-1 h-8 rounded-lg border text-xs font-mono font-semibold transition-all cursor-pointer active:scale-[0.97]",
                            timePerQuestion === sec && !customTime
                              ? "border-forest bg-forest text-white"
                              : "border-border bg-card hover:bg-surface-container text-ink"
                          )}
                        >
                          {sec}s
                        </button>
                      ))}
                      <Input
                        value={customTime}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setCustomTime(e.target.value);
                          if (val > 0) setTimePerQuestion(val);
                        }}
                        placeholder="Sec"
                        className="w-14 h-8 text-xs rounded-lg text-center border-border font-mono bg-card"
                      />
                    </div>
                  ) : (
                    <div className="h-8 rounded-lg border border-border bg-card px-3 flex items-center justify-between text-xs text-muted-foreground">
                      <span className="font-medium text-ink">Untimed session</span>
                      <span className="text-[10px]">Photo / Audio / Text</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Buy-in Stakes & Pot Dynamics */}
              <div className="rounded-2xl border border-border/80 bg-surface-container-low/40 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="eyebrow text-ink-soft">
                    Buy-In Stake
                  </label>
                  <span className="text-[10px] font-mono text-brass-ink font-semibold">
                    Escrow Locked
                  </span>
                </div>

                {/* Stake Presets */}
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
                        "flex-1 h-8 rounded-lg border text-xs font-mono font-semibold transition-all cursor-pointer active:scale-[0.97]",
                        stakeAmount === pts && !customStake
                          ? "border-brass bg-brass text-white shadow-xs"
                          : "border-border bg-card hover:bg-surface-container text-ink"
                      )}
                    >
                      {pts === 0 ? "Free" : `${pts}`}
                    </button>
                  ))}
                  <Input
                    value={customStake}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setCustomStake(e.target.value);
                      if (val >= 0) setStakeAmount(val);
                    }}
                    placeholder="Custom"
                    className="w-16 h-8 text-xs rounded-lg text-center border-border font-mono bg-card"
                  />
                </div>

                {/* Pot Math Breakdown */}
                <div className="p-3 rounded-xl bg-card border border-border flex items-center justify-between">
                  <div className="text-xs">
                    <span className="eyebrow block text-muted-foreground">Total Pot</span>
                    <span className="text-[11px] text-muted-foreground font-mono">
                      {stakeAmount} pts × {selectedFighterIds.length} scholars
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 font-display text-xl font-medium text-brass tnum">
                    <Coins className="size-4.5" />
                    <span>{totalPot} pts</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Card 3: Fighter Roster & Wallet Scan */}
            <div className="rounded-2xl border border-border/80 bg-surface-container-low/40 p-4 sm:p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="size-4 text-forest" />
                  <span className="eyebrow text-ink-soft">
                    Invited Scholars ({selectedFighterIds.length} of {members.length})
                  </span>
                </div>

                {!isDirectPeer && members.length > 1 && (
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
                    className="text-xs font-semibold text-forest hover:underline cursor-pointer"
                  >
                    {selectAll ? "Select None" : "Select All Group"}
                  </button>
                )}
              </div>

              {/* Wallet Advisory Banner (Refined, Non-Jarring) */}
              {underfundedMembers.length > 0 && stakeAmount > 0 && (
                <div className="p-3.5 rounded-xl bg-brass/10 border border-brass/30 text-xs space-y-2">
                  <div className="flex items-start gap-2.5">
                    <AlertCircle className="size-4 text-brass shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <p className="font-semibold text-ink">
                        Wallet Notice: {underfundedMembers.length} scholar(s) hold less than {stakeAmount} pts
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Choose a resolution so the lobby starts seamlessly:
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleAutoCapStake}
                      className="h-7 text-[11px] rounded-full border-brass/50 text-brass-ink hover:bg-brass/20 font-semibold px-3"
                    >
                      📉 Auto-Cap to {Math.max(0, minBalance)} pts
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleBenchUnderfunded}
                      className="h-7 text-[11px] rounded-full border-border text-ink hover:bg-card font-semibold px-3"
                    >
                      👤 Bench Underfunded
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleSponsorAll}
                      className="h-7 text-[11px] rounded-full bg-brand/10 border-brand/40 text-brand hover:bg-brand/20 font-semibold px-3"
                    >
                      🤝 Sponsor All ({underfundedMembers.length})
                    </Button>
                  </div>
                </div>
              )}

              {/* Roster List */}
              <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                {isLoadingMembers ? (
                  <div className="py-6 text-center text-muted-foreground flex items-center justify-center gap-2">
                    <Loader2 className="size-4 animate-spin text-forest" />
                    <span className="text-xs">Scanning student ledger...</span>
                  </div>
                ) : members.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4 text-xs">No active contestants detected.</p>
                ) : (
                  members.map((member) => {
                    const isHost = member.id === currentUser.id;
                    const isSelected = selectedFighterIds.includes(member.id);
                    const isSponsored = sponsoredFighterIds.includes(member.id);
                    const isBroke = isSelected && !isHost && !isSponsored && member.points < stakeAmount;

                    return (
                      <div
                        key={member.id}
                        onClick={() => toggleFighter(member.id)}
                        className={cn(
                          "flex items-center justify-between p-2.5 rounded-xl border text-xs cursor-pointer transition-all active:scale-[0.99]",
                          isBroke
                            ? "border-brass/50 bg-brass/5"
                            : isSelected
                            ? "border-forest/40 bg-card shadow-xs"
                            : "border-border/60 bg-surface-container-low/40 opacity-60 hover:opacity-100"
                        )}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Avatar className="size-7 border border-border">
                            <AvatarImage src={member.avatar_url || undefined} />
                            <AvatarFallback className="text-[10px] font-bold bg-forest text-white">
                              {member.full_name?.[0] || "S"}
                            </AvatarFallback>
                          </Avatar>

                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold truncate text-ink">
                                {member.full_name} {isHost && "(Host)"}
                              </span>
                              {isSponsored && (
                                <Badge variant="outline" className="text-[9px] h-4 px-1.5 bg-brand/10 border-brand/30 text-brand font-bold">
                                  Sponsored
                                </Badge>
                              )}
                            </div>
                            <span className="text-[10px] text-muted-foreground font-mono block">
                              @{member.username || "student"}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {/* Wallet Balance */}
                          <div
                            className={cn(
                              "px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono flex items-center gap-1 tnum",
                              member.points < stakeAmount && !isSponsored
                                ? "bg-brass/15 text-brass-ink"
                                : "bg-surface-container text-ink-soft"
                            )}
                          >
                            <Coins className="size-3 text-brass" />
                            <span>{member.points} pts</span>
                          </div>

                          {/* Sponsor Toggle */}
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
                                isSponsored ? "text-brand font-bold" : "text-muted-foreground hover:text-ink"
                              )}
                            >
                              {isSponsored ? "Sponsoring" : "Sponsor"}
                            </Button>
                          )}

                          {/* Custom Checkbox */}
                          <div
                            className={cn(
                              "size-5 rounded-md grid place-items-center border transition-colors",
                              isSelected
                                ? "bg-forest border-forest text-white"
                                : "border-border text-transparent"
                            )}
                          >
                            <Check className="size-3 stroke-[2.5]" />
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

          </div>

          {/* Anchored Footer CTA (Button-in-Button Architecture) */}
          <div className="px-6 py-4 border-t border-border/70 bg-surface-container-low/40 flex items-center justify-between gap-4">
            <div className="hidden sm:block text-xs">
              <span className="eyebrow block">Match Stakes</span>
              <span className="font-semibold text-ink">
                {selectedFighterIds.length} scholar(s) • <span className="font-mono text-brass font-bold tnum">{totalPot} pts</span> pot
              </span>
            </div>

            <button
              type="button"
              disabled={isCreating || selectedFighterIds.length === 0}
              onClick={handleLaunchBattle}
              className={cn(
                "w-full sm:w-auto flex-1 sm:flex-initial h-12 rounded-full bg-forest hover:bg-forest/90 text-white flex items-center justify-between sm:justify-start gap-4 pl-6 pr-2 font-semibold text-xs sm:text-sm shadow-lift hover:shadow-pop transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
              )}
            >
              {isCreating ? (
                <div className="flex items-center gap-2.5 py-1">
                  <Loader2 className="size-4 animate-spin text-brass-soft" />
                  <span>Synthesizing Exam Questions...</span>
                </div>
              ) : (
                <>
                  <span>
                    {isDirectPeer
                      ? `Send 1v1 Challenge`
                      : `Launch Arena Challenge`}
                  </span>
                  
                  {/* Nested Trailing Action Chip */}
                  <span className="h-8 px-3 rounded-full bg-white/15 text-brass-soft font-mono font-bold text-xs flex items-center gap-1.5 shrink-0">
                    <Coins className="size-3 text-brass-soft" />
                    <span>{totalPot} pts</span>
                    <ArrowRight className="size-3.5 ml-0.5" />
                  </span>
                </>
              )}
            </button>
          </div>

        </div>
      </DialogContent>
    </Dialog>
  );
}
