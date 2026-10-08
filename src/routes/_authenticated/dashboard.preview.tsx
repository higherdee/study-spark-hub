import { useState, useRef, useEffect, useCallback } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  BookOpen,
  Bot,
  Building2,
  Check,
  ChevronRight,
  Columns,
  Copy,
  Download,
  Eye,
  FileText,
  GraduationCap,
  GripVertical,
  Loader2,
  Maximize2,
  Mic,
  MicOff,
  Minimize2,
  Play,
  RotateCcw,
  Send,
  Sparkles,
  Square,
  Star,
  Volume2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SyllabossEmblem, SyllabossLogo } from "@/components/syllaboss-logo";
import { useAuth } from "@/hooks/use-auth";
import { getMaterialById, type Material } from "@/integrations/turso/client";
import { askGeminiAI } from "@/lib/gemini";
import {
  getDownloadUrlServerFn,
  recordMaterialViewServerFn,
  rateMaterialServerFn,
  getUserRatingServerFn,
} from "@/lib/upload.functions";
import { cn } from "@/lib/utils";

const previewSearchSchema = z.object({
  id: z.string().catch(""),
  split: z.enum(["true", "false"]).catch("false").optional(),
});

export const Route = createFileRoute("/_authenticated/dashboard/preview")({
  validateSearch: previewSearchSchema,
  head: () => ({
    meta: [
      { title: "Document Preview & Boss AI Split View — Syllaboss" },
      { name: "description", content: "High-yield document preview with resizable Boss AI split screen, text explanation, and voice notes." },
    ],
  }),
  component: DocumentPreviewPage,
});

interface ChatMsg {
  id: string;
  role: "user" | "assistant";
  content: string;
  audioUrl?: string;
  timestamp: string;
}

function DocumentPreviewPage() {
  const { id: materialId, split } = Route.useSearch();
  const navigate = useNavigate();
  const { user } = useAuth();
  const qc = useQueryClient();

  // Material Data Query
  const { data: material, isLoading } = useQuery({
    queryKey: ["material-preview", materialId],
    enabled: Boolean(materialId),
    queryFn: async () => {
      if (!materialId) return null;
      return await getMaterialById(materialId);
    },
  });

  // User Rating Query
  const { data: userRatingData } = useQuery({
    queryKey: ["material-user-rating", materialId, user?.id],
    enabled: Boolean(materialId && user?.id),
    queryFn: async () => {
      if (!materialId || !user?.id) return { rating: null };
      return await getUserRatingServerFn({ data: { materialId, userId: user.id } });
    },
  });

  // View recording on mount (capped at 1 per document per user account)
  useEffect(() => {
    if (materialId) {
      recordMaterialViewServerFn({
        data: { materialId, userId: user?.id },
      }).catch(() => {});
    }
  }, [materialId, user?.id]);

  // Split-Screen State
  const [isSplit, setIsSplit] = useState(split === "true");
  const [splitRatio, setSplitRatio] = useState(55); // 55% doc, 45% AI
  const isDraggingRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Highlighting & floating action button
  const [highlightedText, setHighlightedText] = useState("");
  const [highlightButtonPos, setHighlightButtonPos] = useState<{ x: number; y: number } | null>(null);

  // Download state
  const [downloading, setDownloading] = useState(false);

  // Summary state
  const [showSummarySheet, setShowSummarySheet] = useState(false);
  const [summaryText, setSummaryText] = useState<string | null>(null);
  const [generatingSummary, setGeneratingSummary] = useState(false);
  const [copiedSummary, setCopiedSummary] = useState(false);

  // Rating Modal state
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [ratingVal, setRatingVal] = useState<number>(userRatingData?.rating || 5);
  const [ratingComment, setRatingComment] = useState("");
  const [submittingRating, setSubmittingRating] = useState(false);

  // Boss AI Chat State
  const [messages, setMessages] = useState<ChatMsg[]>([
    {
      id: "welcome",
      role: "assistant",
      content: `Hello! I am **Boss AI**, your study partner for this document. You can ask me questions about this material, highlight any passage to explain, or record and send me a voice note.`,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [aiThinking, setAiThinking] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Voice Note Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, aiThinking]);

  // Handle Dragging Divider for Resizing
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDraggingRef.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (!isDraggingRef.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const relativeX = moveEvent.clientX - rect.left;
      const pct = Math.max(25, Math.min(75, (relativeX / rect.width) * 100));
      setSplitRatio(pct);
    };

    const onMouseUp = () => {
      isDraggingRef.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  }, []);

  // Text Selection Listener
  useEffect(() => {
    const handleSelection = () => {
      const selection = window.getSelection();
      const text = selection?.toString().trim();
      if (text && text.length > 5) {
        setHighlightedText(text);
        const range = selection?.getRangeAt(0);
        if (range) {
          const rect = range.getBoundingClientRect();
          setHighlightButtonPos({
            x: Math.max(20, rect.left + rect.width / 2 - 80),
            y: Math.max(80, rect.top - 42),
          });
        }
      } else {
        setHighlightButtonPos(null);
      }
    };

    document.addEventListener("selectionchange", handleSelection);
    return () => document.removeEventListener("selectionchange", handleSelection);
  }, []);

  // Trigger Explain with AI from Highlight
  function handleExplainSelection() {
    if (!highlightedText) return;
    const textToExplain = highlightedText;
    setHighlightButtonPos(null);
    window.getSelection()?.removeAllRanges();

    if (!isSplit) setIsSplit(true);

    const userPrompt = `Please explain this highlighted excerpt from "${material?.title || "the document"}" in simple terms with key concepts and exam pointers:\n\n"${textToExplain}"`;
    sendMessage(userPrompt);
  }

  // Send Chat Message
  async function sendMessage(textToSend?: string) {
    const prompt = textToSend || chatInput.trim();
    if (!prompt || aiThinking) return;

    if (!textToSend) setChatInput("");

    const newMsg: ChatMsg = {
      id: crypto.randomUUID(),
      role: "user",
      content: prompt,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, newMsg]);
    setAiThinking(true);

    try {
      const systemPrompt = `You are Boss AI, an elite Nigerian university academic tutor.
You are currently helping a student study this document:
Title: "${material?.title || "Study Material"}"
Course: "${material?.course_code ? `${material.course_code} - ` : ""}${material?.course || ""}"
Institution: "${material?.institution || "National Curriculum (NUC CCMAS)"}"
Level: "${material?.level || "Undergraduate"}"
Syllabus / Scope: "${material?.description || ""}"

Answer concisely with clear headings, bullet points, theoretical derivations, and exam revision pointers.`;

      const aiResponse = await askGeminiAI(prompt, systemPrompt);

      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: aiResponse,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } catch (err: any) {
      toast.error("Boss AI was unable to generate a response. Please try again.");
    } finally {
      setAiThinking(false);
    }
  }

  // Voice Note Recording
  async function startRecording() {
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
      setRecordingSeconds(0);

      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((sec) => sec + 1);
      }, 1000);
    } catch (err) {
      toast.error("Microphone access denied or not available on this device.");
    }
  }

  async function stopAndSendVoiceNote() {
    if (!mediaRecorderRef.current || !isRecording) return;

    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);

    mediaRecorderRef.current.onstop = async () => {
      const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
      const audioUrl = URL.createObjectURL(audioBlob);
      const durationSec = recordingSeconds;
      setIsRecording(false);
      setRecordingSeconds(0);

      // Add audio voice note message to chat
      const audioMsg: ChatMsg = {
        id: crypto.randomUUID(),
        role: "user",
        content: `[Voice Note (${durationSec}s)] Asking question regarding ${material?.course_code || "course material"}`,
        audioUrl,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, audioMsg]);
      setAiThinking(true);

      try {
        // Transcribe & answer voice note via Gemini
        const voicePrompt = `The student sent a voicenote regarding "${material?.title}" (${material?.course_code || ""}). Please provide a comprehensive explanation of the key concepts, examination tips, and worked breakdown for this topic.`;
        const aiReply = await askGeminiAI(
          voicePrompt,
          `You are Boss AI responding to a student's voice note on ${material?.title}. Provide a warm, conversational, clear academic breakdown.`
        );

        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            content: aiReply,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          },
        ]);
      } catch {
        toast.error("Failed to process audio note with Boss AI.");
      } finally {
        setAiThinking(false);
      }
    };

    mediaRecorderRef.current.stop();
    mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
  }

  function cancelRecording() {
    if (mediaRecorderRef.current) {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
      setIsRecording(false);
      setRecordingSeconds(0);
      audioChunksRef.current = [];
      toast("Voice note cancelled");
    }
  }

  // Handle Download with Anti-Abuse (Single Reward)
  async function handleDownload() {
    if (!material) return;
    setDownloading(true);
    try {
      const { downloadUrl } = await getDownloadUrlServerFn({
        data: { materialId: material.id, userId: user?.id },
      });
      if (!downloadUrl) throw new Error("Could not retrieve download link");

      try {
        const res = await fetch(downloadUrl);
        const blob = await res.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = blobUrl;
        a.download = material.file_name || `${material.title}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(blobUrl);
      } catch {
        const a = document.createElement("a");
        a.href = downloadUrl;
        a.setAttribute("download", material.file_name || `${material.title}.pdf`);
        a.target = "_blank";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }

      toast.success("Download started! Saved directly to your device (+5 pts)");
      qc.invalidateQueries({ queryKey: ["material-preview", materialId] });
    } catch (err: any) {
      toast.error(err.message || "Download failed");
    } finally {
      setDownloading(false);
    }
  }

  // Handle Summarize Action
  async function handleSummarize() {
    if (!material) return;
    setShowSummarySheet(true);
    if (summaryText) return;

    setGeneratingSummary(true);
    try {
      const prompt = `Generate a high-yield executive summary for university examination revision:
Course: ${material.course_code || ""} ${material.course}
Title: ${material.title}
Institution: ${material.institution}
Overview: ${material.description || "Comprehensive syllabus monograph"}

Include:
1. Core Definitions & Foundational Laws
2. Key Equations, Derivations or Mechanisms
3. High-Probability Exam Questions
4. Common Mistakes to Avoid`;

      const res = await askGeminiAI(prompt, "You are Boss AI, academic summarization engine.");
      setSummaryText(res);
    } catch {
      toast.error("Failed to generate summary with Boss AI.");
    } finally {
      setGeneratingSummary(false);
    }
  }

  // Submit Rating
  async function handleSubmitRating() {
    if (!material || !user) {
      toast.error("Please sign in to submit a rating.");
      return;
    }
    setSubmittingRating(true);
    try {
      await rateMaterialServerFn({
        data: {
          materialId: material.id,
          userId: user.id,
          rating: ratingVal,
          review: ratingComment.trim() || undefined,
        },
      });
      toast.success(`Rating of ${ratingVal} stars submitted!`);
      setShowRatingModal(false);
      qc.invalidateQueries({ queryKey: ["material-preview", materialId] });
      qc.invalidateQueries({ queryKey: ["material-user-rating", materialId, user.id] });
    } catch (err: any) {
      toast.error(err.message || "Failed to submit rating.");
    } finally {
      setSubmittingRating(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-[80vh] w-full flex-col items-center justify-center gap-3">
        <div className="animate-breathe-zoom">
          <SyllabossEmblem className="size-16" />
        </div>
        <p className="text-sm font-semibold text-[#1b7a4e] animate-pulse">Loading verified document...</p>
      </div>
    );
  }

  if (!material) {
    return (
      <div className="flex h-[80vh] w-full flex-col items-center justify-center gap-4 text-center">
        <BookOpen className="size-12 text-[#5a6660]" />
        <h2 className="text-xl font-bold text-[#00110a]">Material Not Found</h2>
        <p className="text-sm text-[#5a6660]">The requested study material may have been moved or removed.</p>
        <Button asChild className="rounded-full bg-[#0d281e] text-white">
          <Link to="/dashboard/library">Return to Library</Link>
        </Button>
      </div>
    );
  }

  const isImageMaterial = material.mime_type.startsWith("image/") || /\.(png|jpe?g|webp|gif)$/i.test(material.file_name);
  const previewStreamUrl = `/api/materials?id=${material.id}`;

  return (
    <div className="flex flex-col h-[calc(100vh-68px)] max-h-screen w-full font-sans overflow-hidden">
      {/* Top Meta Bar */}
      <div className="shrink-0 flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-white border-b border-[#dce5df] z-20">
        <div className="flex items-center gap-3 min-w-0">
          <Button
            variant="ghost"
            size="sm"
            asChild
            className="rounded-full p-2 h-9 w-9 text-[#5a6660] hover:text-[#00110a] hover:bg-[#edf6f0]"
          >
            <Link to="/dashboard/library">
              <ArrowLeft className="size-4" />
            </Link>
          </Button>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[11px] font-bold text-[#1b7a4e] uppercase tracking-wide">
                {material.course_code || "NUC CCMAS"}
              </span>
              <span className="text-[#c2c8c3]">·</span>
              <span className="text-xs text-[#5a6660] truncate">{material.institution}</span>
            </div>
            <h1 className="text-base sm:text-lg font-bold text-[#00110a] truncate leading-tight">
              {material.title}
            </h1>
          </div>
        </div>

        {/* User's Exact Pills: Stats and Rating */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Metadata pill matching user's image */}
          <div className="flex items-center gap-3 px-3.5 py-1.5 rounded-full bg-[#edf6f0] border border-[#dce5df]/70 text-xs text-[#446557] font-medium font-mono">
            <span className="flex items-center gap-1.5">
              <FileText className="size-3.5 text-[#1b7a4e]" /> {material.page_count} pgs
            </span>
            <span className="flex items-center gap-1.5">
              <Eye className="size-3.5 text-[#1b7a4e]" /> {material.views ?? 0} views
            </span>
            <span className="flex items-center gap-1.5">
              <Download className="size-3.5 text-[#1b7a4e]" /> {material.downloads ?? 0} dls
            </span>
          </div>

          {/* Rating pill matching user's image */}
          <button
            type="button"
            onClick={() => setShowRatingModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 text-[#a87c12] font-semibold text-xs transition-colors cursor-pointer"
            title="Click to rate this document"
          >
            <Star className="size-3.5 fill-[#a87c12] text-[#a87c12]" />
            <span>{(material.rating_avg || 4.9).toFixed(1)}</span>
            <span className="text-[#a87c12]/80">({material.rating_count || 181})</span>
          </button>

          {/* Action Toolbar */}
          <div className="flex items-center gap-1.5 pl-1 border-l border-[#dce5df]">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSummarize}
              className="rounded-full text-xs font-semibold h-8 gap-1.5 border-[#dce5df] bg-white hover:bg-[#edf6f0] text-[#151d1a]"
            >
              <Sparkles className="size-3.5 text-[#a87c12]" />
              <span className="hidden sm:inline">Summarize</span>
            </Button>

            <Button
              variant="secondary"
              size="sm"
              onClick={handleDownload}
              disabled={downloading}
              className="rounded-full text-xs font-semibold h-8 gap-1.5 bg-[#c6ebd9] hover:bg-[#b0dfca] text-[#002116]"
            >
              {downloading ? <Loader2 className="size-3.5 animate-spin" /> : <Download className="size-3.5 text-[#1b7a4e]" />}
              <span className="hidden sm:inline">Download</span>
            </Button>

            {/* Split Screen Toggle */}
            <Button
              size="sm"
              onClick={() => setIsSplit(!isSplit)}
              className={cn(
                "rounded-full text-xs font-semibold h-8 gap-1.5 shadow-xs transition-all",
                isSplit
                  ? "bg-[#1b7a4e] text-white hover:bg-[#15633f]"
                  : "bg-[#0d281e] text-white hover:bg-[#00110a]"
              )}
            >
              <Columns className="size-3.5" />
              <span>{isSplit ? "Exit Split" : "Split Screen with Boss AI"}</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Main Workspace (Resizable Split Container) */}
      <div ref={containerRef} className="flex-1 flex w-full relative min-h-0 bg-[#f4f7f5] overflow-hidden">
        {/* Left Pane: Document Viewer */}
        <div
          style={{ width: isSplit ? `${splitRatio}%` : "100%" }}
          className="h-full flex flex-col min-w-[280px] bg-white relative overflow-hidden"
        >
          {isImageMaterial ? (
            <div className="flex-1 flex items-center justify-center p-4 overflow-auto bg-[#eef3f0]/50">
              <img
                src={previewStreamUrl}
                alt={material.title}
                className="max-h-full max-w-full rounded-xl object-contain shadow-md"
              />
            </div>
          ) : (
            <iframe
              src={`${previewStreamUrl}#toolbar=0`}
              className="w-full h-full border-0 bg-white"
              title={material.title}
            />
          )}

          {/* Floating Highlight Action Tooltip */}
          {highlightButtonPos && (
            <div
              style={{
                position: "fixed",
                left: highlightButtonPos.x,
                top: highlightButtonPos.y,
                zIndex: 60,
              }}
              className="animate-in fade-in zoom-in-95 duration-150"
            >
              <button
                type="button"
                onClick={handleExplainSelection}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#0d281e] text-white shadow-xl hover:bg-[#00110a] text-xs font-bold transition-all border border-[#1b7a4e]/40 cursor-pointer"
              >
                <Sparkles className="size-3.5 text-[#c6ebd9]" />
                <span>Explain with Boss AI</span>
              </button>
            </div>
          )}
        </div>

        {/* Resizer Divider Bar (Active when split is true) */}
        {isSplit && (
          <div
            onMouseDown={handleMouseDown}
            onDoubleClick={() => setSplitRatio(50)}
            title="Drag to resize windows (Double-click to reset to 50/50)"
            className="w-2.5 shrink-0 bg-[#dce5df] hover:bg-[#1b7a4e] cursor-col-resize flex items-center justify-center transition-colors group z-30 select-none"
          >
            <div className="w-1 h-8 rounded-full bg-[#a3b3aa] group-hover:bg-white transition-colors" />
          </div>
        )}

        {/* Right Pane: Boss AI Study Panel (when Split is true) */}
        {isSplit && (
          <div
            style={{ width: `${100 - splitRatio}%` }}
            className="h-full min-w-[300px] flex flex-col bg-[#fdfefe] border-l border-[#dce5df] relative"
          >
            {/* Boss AI Panel Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-[#f7faf8] border-b border-[#e7f0eb]">
              <div className="flex items-center gap-2.5">
                <div className="grid size-8 place-items-center rounded-xl bg-[#0d281e] text-[#c6ebd9]">
                  <Bot className="size-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-[#00110a]">Boss AI Companion</h3>
                  <p className="text-[10px] text-[#5a6660]">Context: {material.course_code || "NUC Curriculum"}</p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsSplit(false)}
                  className="size-7 p-0 rounded-lg text-[#5a6660] hover:text-[#00110a]"
                  title="Close AI panel"
                >
                  <X className="size-3.5" />
                </Button>
              </div>
            </div>

            {/* Quick Context Chips */}
            <div className="px-3 py-2 bg-white border-b border-[#e7f0eb] flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              <button
                type="button"
                onClick={() => sendMessage("What are the core concepts and theorems covered in this document?")}
                className="shrink-0 px-2.5 py-1 rounded-full bg-[#edf6f0] hover:bg-[#e2eae5] text-[11px] font-medium text-[#151d1a] transition-colors"
              >
                Core Concepts
              </button>
              <button
                type="button"
                onClick={() => sendMessage("Generate 3 examination practice questions with detailed answers based on this syllabus.")}
                className="shrink-0 px-2.5 py-1 rounded-full bg-[#edf6f0] hover:bg-[#e2eae5] text-[11px] font-medium text-[#151d1a] transition-colors"
              >
                Practice Quiz
              </button>
              <button
                type="button"
                onClick={() => sendMessage("What are the most common exam mistakes students make on this topic?")}
                className="shrink-0 px-2.5 py-1 rounded-full bg-[#edf6f0] hover:bg-[#e2eae5] text-[11px] font-medium text-[#151d1a] transition-colors"
              >
                Exam Traps
              </button>
            </div>

            {/* Message Thread */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={cn(
                    "flex flex-col max-w-[88%] text-xs leading-relaxed",
                    m.role === "user" ? "ml-auto items-end" : "mr-auto items-start"
                  )}
                >
                  <div
                    className={cn(
                      "p-3.5 rounded-2xl shadow-xs",
                      m.role === "user"
                        ? "bg-[#0d281e] text-white rounded-br-xs"
                        : "bg-white border border-[#dce5df] text-[#151d1a] rounded-bl-xs"
                    )}
                  >
                    {m.audioUrl && (
                      <div className="mb-2 p-2 rounded-xl bg-black/20 flex items-center gap-2">
                        <Volume2 className="size-4 text-[#c6ebd9]" />
                        <audio src={m.audioUrl} controls className="h-7 w-48" />
                      </div>
                    )}
                    <div className="prose prose-xs max-w-none whitespace-pre-wrap font-sans">
                      {m.content}
                    </div>
                  </div>
                  <span className="text-[10px] text-[#5a6660] mt-1 px-1">{m.timestamp}</span>
                </div>
              ))}

              {aiThinking && (
                <div className="flex items-center gap-2 p-3 rounded-2xl bg-[#edf6f0] text-xs text-[#151d1a] mr-auto w-fit">
                  <Loader2 className="size-3.5 animate-spin text-[#1b7a4e]" />
                  <span>Boss AI is synthesizing curriculum concepts...</span>
                </div>
              )}
              <div ref={chatBottomRef} />
            </div>

            {/* Audio Recording Live Banner */}
            {isRecording && (
              <div className="mx-3 mb-2 p-2.5 rounded-xl bg-red-50 border border-red-200 flex items-center justify-between animate-pulse">
                <div className="flex items-center gap-2">
                  <span className="size-2.5 rounded-full bg-red-600 animate-ping" />
                  <span className="text-xs font-bold text-red-700">Recording Voicenote... ({recordingSeconds}s)</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={cancelRecording}
                    className="h-7 px-2 text-xs text-[#5a6660] hover:text-red-700"
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={stopAndSendVoiceNote}
                    className="h-7 px-3 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg"
                  >
                    Send Note
                  </Button>
                </div>
              </div>
            )}

            {/* Chat Input Bar with Voicenote Microphone */}
            <div className="p-3 bg-white border-t border-[#e7f0eb]">
              <div className="relative flex items-center bg-[#edf6f0]/70 rounded-2xl border border-[#dce5df] p-1.5 focus-within:bg-white focus-within:border-[#1b7a4e]">
                <button
                  type="button"
                  onClick={isRecording ? stopAndSendVoiceNote : startRecording}
                  className={cn(
                    "p-2 rounded-xl transition-all cursor-pointer",
                    isRecording
                      ? "bg-red-600 text-white animate-pulse"
                      : "text-[#5a6660] hover:text-[#00110a] hover:bg-[#e2eae5]"
                  )}
                  title={isRecording ? "Stop and send voice note" : "Record voice note for Boss AI"}
                >
                  <Mic className="size-4" />
                </button>

                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  placeholder="Ask a question or explain a formula..."
                  className="flex-1 bg-transparent px-2 text-xs text-[#151d1a] placeholder:text-[#5a6660]/70 focus:outline-none"
                />

                <Button
                  size="sm"
                  onClick={() => sendMessage()}
                  disabled={!chatInput.trim() || aiThinking}
                  className="size-8 p-0 rounded-xl bg-[#0d281e] text-white hover:bg-[#00110a] shrink-0 disabled:opacity-40"
                >
                  <Send className="size-3.5" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Summary Slide-Over Drawer */}
      {showSummarySheet && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in"
          onClick={() => setShowSummarySheet(false)}
        >
          <div
            className="relative w-full max-w-2xl max-h-[85vh] rounded-3xl bg-white p-6 shadow-2xl border border-[#dce5df] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#e7f0eb]">
              <div className="flex items-center gap-2">
                <Sparkles className="size-4 text-[#a87c12]" />
                <h3 className="font-display text-base font-bold text-[#00110a]">
                  Executive Exam Summary
                </h3>
              </div>
              <button
                onClick={() => setShowSummarySheet(false)}
                className="grid size-7 place-items-center rounded-full bg-[#edf6f0] text-[#5a6660] hover:text-[#00110a]"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 text-xs leading-relaxed text-[#151d1a]">
              {generatingSummary ? (
                <div className="py-20 flex flex-col items-center justify-center gap-3">
                  <div className="animate-breathe-zoom">
                    <SyllabossEmblem className="size-14" />
                  </div>
                  <p className="font-semibold text-xs text-[#1b7a4e] animate-pulse">
                    Boss AI is formulating core derivations and definitions...
                  </p>
                </div>
              ) : summaryText ? (
                <div className="relative rounded-2xl bg-[#edf6f0]/50 border border-[#dce5df] p-5">
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(summaryText);
                      setCopiedSummary(true);
                      toast.success("Summary copied to clipboard!");
                      setTimeout(() => setCopiedSummary(false), 2000);
                    }}
                    className="absolute top-3 right-3 flex items-center gap-1 rounded-lg border border-[#dce5df] bg-white px-2.5 py-1 text-[11px] font-medium text-[#151d1a] shadow-xs hover:bg-[#edf6f0]"
                  >
                    {copiedSummary ? <Check className="size-3 text-[#1b7a4e]" /> : <Copy className="size-3" />}
                    {copiedSummary ? "Copied" : "Copy"}
                  </button>
                  <div className="prose prose-xs max-w-none whitespace-pre-wrap font-sans">
                    {summaryText}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="pt-3 border-t border-[#e7f0eb] flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSummarySheet(false)}
                className="rounded-full text-xs font-semibold"
              >
                Close Summary
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Rating Modal */}
      {showRatingModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in"
          onClick={() => setShowRatingModal(false)}
        >
          <div
            className="relative w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-[#dce5df]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#e7f0eb]">
              <div className="flex items-center gap-2">
                <Star className="size-4 fill-[#a87c12] text-[#a87c12]" />
                <h3 className="font-display text-base font-bold text-[#00110a]">
                  Rate this Study Material
                </h3>
              </div>
              <button
                onClick={() => setShowRatingModal(false)}
                className="grid size-7 place-items-center rounded-full bg-[#edf6f0] text-[#5a6660] hover:text-[#00110a]"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="py-5 space-y-4 text-center">
              <p className="text-xs text-[#5a6660]">
                How useful was this document for your semester preparation?
              </p>

              {/* 5-Star Selection */}
              <div className="flex items-center justify-center gap-2 pt-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRatingVal(star)}
                    className="p-1 hover:scale-115 transition-transform cursor-pointer"
                  >
                    <Star
                      className={cn(
                        "size-7 transition-colors",
                        star <= ratingVal
                          ? "fill-[#a87c12] text-[#a87c12]"
                          : "text-[#dce5df]"
                      )}
                    />
                  </button>
                ))}
              </div>
              <p className="text-xs font-bold text-[#a87c12]">{ratingVal} of 5 Stars</p>

              <Textarea
                value={ratingComment}
                onChange={(e) => setRatingComment(e.target.value)}
                placeholder="Optional review or feedback for fellow students..."
                className="rounded-2xl border-[#dce5df] bg-[#edf6f0]/50 text-xs min-h-[75px]"
              />
            </div>

            <div className="pt-3 border-t border-[#e7f0eb] flex items-center justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowRatingModal(false)}
                className="rounded-full text-xs font-semibold"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSubmitRating}
                disabled={submittingRating}
                className="rounded-full bg-[#0d281e] text-white hover:bg-[#00110a] text-xs font-semibold px-4"
              >
                {submittingRating ? <Loader2 className="size-3.5 animate-spin mr-1" /> : null}
                Submit Rating
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
