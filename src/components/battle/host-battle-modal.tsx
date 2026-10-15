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
  currentUser: {
    id: string;
    fullName?: string | null;
    avatarUrl?: string | null;
    points?: number;
  };
  onBattleCreated?: (battleId: string) => void;
}

type SourceType = "topic" | "file" | "library" | "voice";

export function HostBattleModal({
  isOpen,
  onClose,
  groupId,
  groupTitle,
  currentUser,
  onBattleCreated,
}: HostBattleModalProps) {
  // Battle Config State
  const [battleTitle, setBattleTitle] = useState("");
  const [mode, setMode] = useState<"mcq" | "theory">("mcq");
  const [timePerQuestion, setTimePerQuestion] = useState<number>(20); // 10, 20, 30, 60 or custom
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

  // Toggle Sponsoring a fighter
  const toggleSponsor = (id: string) => {
    setSponsoredFighterIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  // One-tap Auto-Cap Stake
  const handleAutoCapStake = () => {
    const capped = Math.max(0, minBalance);
    setStakeAmount(capped);
    setCustomStake(String(capped));
    toast.success(`Stake auto-capped to ${capped} pts to include all fighters!`);
  };

  // One-tap Bench broke fighters
  const handleBenchUnderfunded = () => {
    const brokeIds = underfundedMembers.map((m) => m.id);
    setSelectedFighterIds((prev) => prev.filter((id) => !brokeIds.includes(id)));
    toast.info(`Benched ${brokeIds.length} members with insufficient balance.`);
  };

  // One-tap Sponsor all broke fighters
  const handleSponsorAll = () => {
    const brokeIds = underfundedMembers.map((m) => m.id);
    setSponsoredFighterIds((prev) => Array.from(new Set([...prev, ...brokeIds])));
    toast.success(`You are now sponsoring ${brokeIds.length} fighters!`);
  };

  // Handle File Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type === "application/pdf" || file.name.endsWith(".pdf") || file.name.endsWith(".docx") || file.name.endsWith(".txt")) {
      const reader = new FileReader();
      reader.onload = () => {
        const text = String(reader.result || "").slice(0, 4000);
        setUploadedFile({ name: file.name, content: text || `Document: ${file.name}` });
        if (!battleTitle) setBattleTitle(file.name.replace(/\.[^/.]+$/, ""));
        toast.success(`Loaded "${file.name}" for question generation`);
      };
      reader.readAsText(file);
    } else {
      toast.error("Please upload a PDF, DOCX, or TXT file.");
    }
  };

  // Voice Recording with Groq Whisper
  const startVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        setIsRecording(false);
        if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);

        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          try {
            const base64 = (reader.result as string)?.split(",")[1];
            if (base64) {
              toast.info("Transcribing voice note with Groq Whisper...");
              const result = await transcribeVoiceAudioServerFn({
                data: { audioBase64: base64, mimeType: "audio/webm" },
              });
              if (result?.transcript) {
                setVoiceTranscript(result.transcript);
                if (!battleTitle) {
                  setBattleTitle(result.transcript.slice(0, 40));
                }
                toast.success("Voice transcribed into battle prompt!");
              }
            }
          } catch (err: any) {
            toast.error("Whisper transcription failed, please type topic.");
          }
        };
      };

      recorder.start();
      setIsRecording(true);
      setRecordingDuration(0);
      timerIntervalRef.current = setInterval(() => {
        setRecordingDuration((d) => d + 1);
      }, 1000);
    } catch (err) {
      toast.error("Microphone access denied.");
    }
  };

  const stopVoiceRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((t) => t.stop());
    }
  };

  // Launch Battle Action
  const handleLaunchBattle = async () => {
    const finalTitle =
      battleTitle.trim() ||
      topicPrompt.trim() ||
      uploadedFile?.name ||
      selectedLibraryMat?.title ||
      voiceTranscript.slice(0, 40) ||
      "Flash Exam Battle";

    let sourceSummary = "";
    let sourceContext = "";

    if (sourceType === "file" && uploadedFile) {
      sourceSummary = `Doc: ${uploadedFile.name}`;
      sourceContext = uploadedFile.content;
    } else if (sourceType === "library" && selectedLibraryMat) {
      sourceSummary = `Library: ${selectedLibraryMat.title} (${selectedLibraryMat.course})`;
      sourceContext = `University Course Material: ${selectedLibraryMat.title} for ${selectedLibraryMat.course}`;
    } else if (sourceType === "voice" && voiceTranscript) {
      sourceSummary = `Voice Prompt: "${voiceTranscript.slice(0, 30)}..."`;
      sourceContext = voiceTranscript;
    } else {
      sourceSummary = `Topic: ${topicPrompt || finalTitle}`;
      sourceContext = topicPrompt || finalTitle;
    }

    const hostBalance = currentUser.points || 0;
    const totalHostCommitment = stakeAmount + sponsoredFighterIds.length * stakeAmount;
    if (totalHostCommitment > hostBalance) {
      toast.error(
        `Insufficient points! You need ${totalHostCommitment} pts (buy-in + sponsorships), but have ${hostBalance} pts.`
      );
      return;
    }

    setIsCreating(true);
    try {
      const battle = await createStudyBattleServerFn({
        data: {
          groupId,
          hostId: currentUser.id,
          hostName: currentUser.fullName || "Battle Host",
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
      toast.success("⚡ Match Challenge dropped into group chat!");
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
      <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto rounded-3xl border-border bg-card p-0 shadow-[var(--elev-3)]">
        <DialogHeader className="border-b border-border bg-forest px-5 py-4 text-white">
          <DialogTitle className="flex items-center justify-between gap-3 font-display text-xl font-normal text-white">
            <div className="flex items-center gap-2.5">
              <div className="grid size-9 place-items-center rounded-xl bg-white/10 text-brass-soft">
                <Swords className="size-4.5" />
              </div>
              <span>Start a battle</span>
            </div>
            <Badge variant="outline" className="max-w-[40%] truncate border-white/20 text-xs font-medium text-white/80">
              {groupTitle}
            </Badge>
          </DialogTitle>
          <p className="mt-1 text-xs text-white/60">
            Pick a source, set the stakes, and challenge your group.
          </p>
        </DialogHeader>
        <div className="p-5 pt-0">


        <div className="space-y-4 mt-2 text-xs">
          {/* 1. Battle Title */}
          <div>
            <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
              Battle Title / Subject
            </label>
            <Input
              value={battleTitle}
              onChange={(e) => setBattleTitle(e.target.value)}
              placeholder="e.g. Thermodynamics Carnot Cycle Blitz"
              className="h-9 rounded-xl text-xs font-semibold"
            />
          </div>

          {/* 2. Omni-Source Chips */}
          <div>
            <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block mb-1.5">
              Knowledge Source (AI generates 5 questions)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              <button
                type="button"
                onClick={() => setSourceType("topic")}
                className={cn(
                  "p-2.5 rounded-xl border flex flex-col items-center gap-1 transition-all text-center",
                  sourceType === "topic"
                    ? "border-primary bg-primary/10 text-primary font-bold shadow-xs"
                    : "border-border hover:bg-secondary text-muted-foreground"
                )}
              >
                <Sparkles className="size-4 text-primary" />
                <span className="text-[11px]">Topic Prompt</span>
              </button>

              <button
                type="button"
                onClick={() => setSourceType("file")}
                className={cn(
                  "p-2.5 rounded-xl border flex flex-col items-center gap-1 transition-all text-center",
                  sourceType === "file"
                    ? "border-primary bg-primary/10 text-primary font-bold shadow-xs"
                    : "border-border hover:bg-secondary text-muted-foreground"
                )}
              >
                <Upload className="size-4 text-brand" />
                <span className="text-[11px]">Upload PDF/Doc</span>
              </button>

              <button
                type="button"
                onClick={() => setSourceType("library")}
                className={cn(
                  "p-2.5 rounded-xl border flex flex-col items-center gap-1 transition-all text-center",
                  sourceType === "library"
                    ? "border-primary bg-primary/10 text-primary font-bold shadow-xs"
                    : "border-border hover:bg-secondary text-muted-foreground"
                )}
              >
                <BookOpen className="size-4 text-brand" />
                <span className="text-[11px]">Campus Library</span>
              </button>

              <button
                type="button"
                onClick={() => setSourceType("voice")}
                className={cn(
                  "p-2.5 rounded-xl border flex flex-col items-center gap-1 transition-all text-center",
                  sourceType === "voice"
                    ? "border-primary bg-primary/10 text-primary font-bold shadow-xs"
                    : "border-border hover:bg-secondary text-muted-foreground"
                )}
              >
                <Mic className="size-4 text-brass" />
                <span className="text-[11px]">Groq Voice</span>
              </button>
            </div>

            {/* Omni-Source Expanded Area */}
            <div className="mt-2 p-3 rounded-2xl bg-secondary/30 border border-border/80">
              {sourceType === "topic" && (
                <div className="space-y-2">
                  <Input
                    value={topicPrompt}
                    onChange={(e) => setTopicPrompt(e.target.value)}
                    placeholder="Enter course topic or paste exam concepts..."
                    className="h-8.5 rounded-xl text-xs bg-background"
                  />
                  <div className="flex flex-wrap gap-1">
                    {["Differential Equations", "Organic Reaction Mechanisms", "Macroeconomics Inflation", "Data Structures Trees"].map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => {
                          setTopicPrompt(tag);
                          if (!battleTitle) setBattleTitle(tag);
                        }}
                        className="text-[10px] px-2 py-0.5 rounded-full bg-secondary hover:bg-primary/20 hover:text-primary transition-colors text-muted-foreground font-medium"
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
                    <div className="flex items-center justify-between p-2 rounded-xl bg-card border border-brand/40">
                      <div className="flex items-center gap-2">
                        <FileText className="size-4 text-brand" />
                        <span className="font-semibold text-foreground text-xs">{uploadedFile.name}</span>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setUploadedFile(null)}
                        className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                      >
                        <X className="size-3.5" />
                      </Button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center p-4 border border-dashed border-border rounded-xl cursor-pointer hover:border-primary/60 bg-card">
                      <Upload className="size-5 text-muted-foreground mb-1" />
                      <span className="text-xs font-semibold text-foreground">Select PDF or Course Syllabus</span>
                      <span className="text-[10px] text-muted-foreground">Extracts key sections automatically</span>
                      <input type="file" accept=".pdf,.docx,.txt" onChange={handleFileUpload} className="hidden" />
                    </label>
                  )}
                </div>
              )}

              {sourceType === "library" && (
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {libraryMaterials.length === 0 ? (
                    <p className="text-center text-muted-foreground py-3 text-[11px]">No library materials found.</p>
                  ) : (
                    libraryMaterials.map((mat: any) => (
                      <div
                        key={mat.id}
                        onClick={() => {
                          setSelectedLibraryMat({ id: mat.id, title: mat.title, course: mat.course });
                          if (!battleTitle) setBattleTitle(mat.title);
                        }}
                        className={cn(
                          "flex items-center justify-between p-2 rounded-xl border cursor-pointer text-xs transition-all",
                          selectedLibraryMat?.id === mat.id
                            ? "border-primary bg-primary/10 text-primary font-bold"
                            : "border-border hover:bg-secondary"
                        )}
                      >
                        <div className="truncate">
                          <p className="font-semibold truncate">{mat.title}</p>
                          <p className="text-[10px] text-muted-foreground">{mat.course}</p>
                        </div>
                        {selectedLibraryMat?.id === mat.id && <Check className="size-3.5 text-primary shrink-0" />}
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
                        className="h-9 rounded-full bg-red-600 hover:bg-red-700 text-white gap-2 font-bold px-4 animate-pulse"
                      >
                        <Square className="size-3.5 fill-current" />
                        <span>Stop Recording ({recordingDuration}s)</span>
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        onClick={startVoiceRecording}
                        className="h-9 rounded-full bg-brass hover:bg-brass-ink text-black font-bold gap-2 px-4 shadow-sm"
                      >
                        <Mic className="size-3.5" />
                        <span>Record Topic Prompt (Whisper)</span>
                      </Button>
                    )}
                  </div>
                  {voiceTranscript && (
                    <div className="w-full p-2 rounded-xl bg-card border border-border text-[11px] text-foreground">
                      <span className="text-[9px] uppercase font-bold text-brass block">Transcribed:</span>
                      "{voiceTranscript}"
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* 3. Game Mode & Timers */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {/* Mode selection */}
            <div>
              <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block mb-1.5">
                Game Mode
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => setMode("mcq")}
                  className={cn(
                    "p-2.5 rounded-xl border flex flex-col items-center gap-1 transition-all",
                    mode === "mcq"
                      ? "border-primary bg-primary/10 text-primary font-bold shadow-xs"
                      : "border-border hover:bg-secondary text-muted-foreground"
                  )}
                >
                  <Zap className="size-4 text-brass" />
                  <span className="text-[11px]">MCQ Blitz</span>
                  <span className="text-[9px] text-muted-foreground">Timed Speed Battle</span>
                </button>

                <button
                  type="button"
                  onClick={() => setMode("theory")}
                  className={cn(
                    "p-2.5 rounded-xl border flex flex-col items-center gap-1 transition-all",
                    mode === "theory"
                      ? "border-brand bg-brand/10 text-brand dark:text-brand font-bold shadow-xs"
                      : "border-border hover:bg-secondary text-muted-foreground"
                  )}
                >
                  <BookOpen className="size-4 text-brand" />
                  <span className="text-[11px]">Theory Showdown</span>
                  <span className="text-[9px] text-muted-foreground">Untimed · Deep Derivations</span>
                </button>
              </div>
            </div>

            {/* Timers (Only for MCQ) */}
            <div>
              <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block mb-1.5">
                {mode === "mcq" ? "Time per Question" : "Pacing"}
              </label>
              {mode === "mcq" ? (
                <div className="flex items-center gap-1">
                  {[10, 20, 30, 60].map((sec) => (
                    <button
                      key={sec}
                      type="button"
                      onClick={() => {
                        setTimePerQuestion(sec);
                        setCustomTime("");
                      }}
                      className={cn(
                        "flex-1 h-8 rounded-lg border text-xs font-bold transition-all",
                        timePerQuestion === sec && !customTime
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border hover:bg-secondary text-foreground"
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
                    placeholder="Custom"
                    className="w-16 h-8 text-[11px] rounded-lg text-center"
                  />
                </div>
              ) : (
                <div className="h-8 rounded-xl border border-brand/30 bg-brand/10 px-3 flex items-center justify-between text-brand-deep dark:text-brand font-bold text-xs">
                  <span>Untimed ⏱️</span>
                  <span className="text-[10px] font-normal text-muted-foreground">Submit handwritten or voice</span>
                </div>
              )}
            </div>
          </div>

          {/* 4. Stake & Pot */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                Buy-in Stake per Fighter
              </label>
              <div className="flex items-center gap-1.5 text-xs font-black text-brass">
                <Coins className="size-3.5" />
                <span>Total Pot: {totalPot} pts</span>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {[0, 5, 10, 20, 50].map((pts) => (
                <button
                  key={pts}
                  type="button"
                  onClick={() => {
                    setStakeAmount(pts);
                    setCustomStake("");
                  }}
                  className={cn(
                    "flex-1 h-8 rounded-lg border text-xs font-bold transition-all",
                    stakeAmount === pts && !customStake
                      ? "border-brass bg-brass text-black shadow-xs"
                      : "border-border hover:bg-secondary text-foreground"
                  )}
                >
                  {pts === 0 ? "Friendly" : `${pts} pts`}
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
                className="w-16 h-8 text-[11px] rounded-lg text-center"
              />
            </div>
          </div>

          {/* 5. Fighter Selection & Real-Time Wallet Scan */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Users className="size-3.5 text-primary" />
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  Fighters ({selectedFighterIds.length}/{members.length})
                </span>
              </div>

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
                className="text-[11px] font-bold text-primary hover:underline"
              >
                {selectAll ? "Deselect Others" : "Select Whole Group"}
              </button>
            </div>

            {/* Wallet Scan Alert Banner if anyone has insufficient points */}
            {underfundedMembers.length > 0 && stakeAmount > 0 && (
              <div className="p-3 rounded-2xl bg-brass/10 border border-brass/40 text-xs space-y-2">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="size-4 text-brass-ink dark:text-brass shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-brass-ink dark:text-brass">
                      Wallet Scan: {underfundedMembers.length} fighter(s) have fewer than {stakeAmount} pts
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      Pick a quick resolution below so everyone can participate smoothly:
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5 pt-1">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleAutoCapStake}
                    className="h-7 text-[10px] rounded-full border-brass/50 text-brass-ink dark:text-brass hover:bg-brass/15 font-bold"
                  >
                    📉 Auto-Cap Stake to {Math.max(0, minBalance)} pts
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleBenchUnderfunded}
                    className="h-7 text-[10px] rounded-full border-border text-foreground hover:bg-secondary font-bold"
                  >
                    👤 Bench Underfunded Fighters
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleSponsorAll}
                    className="h-7 text-[10px] rounded-full bg-brand/10 border-brand/40 text-brand-deep dark:text-brand hover:bg-brand/20 font-bold"
                  >
                    🤝 Sponsor All Underfunded
                  </Button>
                </div>
              </div>
            )}

            {/* Member List with Live Points Badges */}
            <div className="max-h-44 overflow-y-auto space-y-1.5 pr-1 border border-border/60 rounded-2xl p-2 bg-secondary/15">
              {isLoadingMembers ? (
                <div className="py-6 text-center text-muted-foreground flex items-center justify-center gap-2">
                  <Loader2 className="size-4 animate-spin" />
                  <span>Scanning member balances...</span>
                </div>
              ) : members.length === 0 ? (
                <p className="text-center text-muted-foreground py-4 text-xs">No members found in this study group.</p>
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
                        "flex items-center justify-between p-2 rounded-xl border text-xs cursor-pointer transition-all",
                        isBroke
                          ? "border-brass/70 bg-brass/10"
                          : isSelected
                          ? "border-primary/50 bg-card shadow-xs"
                          : "border-border/60 opacity-60 hover:opacity-100 bg-secondary/20"
                      )}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Avatar className="size-7 border border-border">
                          <AvatarImage src={member.avatar_url || undefined} />
                          <AvatarFallback className="text-[10px] font-bold">
                            {member.full_name?.[0] || "S"}
                          </AvatarFallback>
                        </Avatar>

                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold truncate text-foreground">
                              {member.full_name} {isHost && "(You / Host)"}
                            </span>
                            {isSponsored && (
                              <Badge variant="outline" className="text-[9px] h-4 px-1.5 bg-brand/15 border-brand/40 text-brand dark:text-brand font-bold">
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
                        {/* Live Balance Badge */}
                        <div
                          className={cn(
                            "px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1",
                            member.points < stakeAmount && !isSponsored
                              ? "bg-brass/20 text-brass-ink dark:text-brass"
                              : "bg-brand/15 text-brand dark:text-brand"
                          )}
                        >
                          <Coins className="size-2.5" />
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
                              isSponsored ? "text-brand font-bold" : "text-muted-foreground hover:text-foreground"
                            )}
                          >
                            {isSponsored ? "Sponsoring" : "Sponsor"}
                          </Button>
                        )}

                        <div
                          className={cn(
                            "size-5 rounded-md grid place-items-center border",
                            isSelected
                              ? "bg-primary border-primary text-primary-foreground"
                              : "border-border text-transparent"
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

          {/* Launch Button */}
          <div className="pt-2">
            <Button
              type="button"
              disabled={isCreating || selectedFighterIds.length === 0}
              onClick={handleLaunchBattle}
              className="w-full h-11 rounded-2xl bg-brass hover:bg-brass-ink text-black font-black text-xs sm:text-sm shadow-xl shadow-brass/20 gap-2 transition-all active:scale-[0.98]"
            >
              {isCreating ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  <span>Boss AI Generating 5 Exam Questions...</span>
                </>
              ) : (
                <>
                  <Swords className="size-4" />
                  <span>⚡ Drop Challenge in Group Chat ({totalPot} pts Pot)</span>
                </>
              )}
            </Button>
          </div>
        </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
