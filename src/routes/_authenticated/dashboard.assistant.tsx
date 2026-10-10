import { useState, useRef, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Bot,
  Send,
  Loader2,
  MessageSquarePlus,
  Trash2,
  Paperclip,
  Sparkles,
  BookOpen,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Layers,
  FileText,
  RotateCcw,
  Check,
  ChevronRight,
  GraduationCap,
  Mic,
  Volume2,
  Square,
  History,
} from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/hooks/use-auth";
import { useProfile } from "@/lib/profile";
import { askGeminiAI } from "@/lib/gemini";
import {
  createStudyThreadServerFn,
  getStudyThreadsServerFn,
  deleteStudyThreadServerFn,
  getStudyMessagesServerFn,
  askBossAiServerFn,
  saveStudyMessageServerFn,
  updateStudyThreadTitleServerFn,
  getStudyMaterialByIdServerFn,
} from "@/lib/ai/study-assistant.functions";
import {
  categorizeDocumentAutonomously,
  auditUploadAutonomous,
  generatePracticeQuestions,
  gradeTheoryAnswer,
  generateFlashcards,
  type QuizQuestion,
  type Flashcard,
} from "@/lib/academic-ai";
import {
  createMaterialServerFn,
  autoVerifyMaterialServerFn,
  getPresignedUploadUrlServerFn,
} from "@/lib/upload.functions";
import { cn } from "@/lib/utils";

const searchSchema = z.object({
  materialId: z.string().optional(),
});

export const Route = createFileRoute("/_authenticated/dashboard/assistant")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Boss AI Study Suite — Syllaboss" },
      { name: "description", content: "Chat with documents, take practice quizzes, mark theory answers, and generate flashcards with Boss AI." },
    ],
  }),
  component: AssistantPage,
});

interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  audioUrl?: string;
  timestamp: string;
  attachedMaterial?: {
    id: string;
    title: string;
    course: string;
    courseCode: string | null;
    institution: string;
    department: string;
    level: string;
    status: string;
  };
}

function AssistantPage() {
  const { materialId } = Route.useSearch();
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const qc = useQueryClient();

  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [showMobileHistory, setShowMobileHistory] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mobileFileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Active Interactive Tools State
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[] | null>(null);
  const [currentQuizIndex, setCurrentQuizIndex] = useState(0);
  const [quizScores, setQuizScores] = useState<Record<number, number>>({});
  const [selectedObjectiveOption, setSelectedObjectiveOption] = useState<number | null>(null);
  const [theoryAnswerInput, setTheoryAnswerInput] = useState("");
  const [theoryFeedback, setTheoryFeedback] = useState<any | null>(null);
  const [gradingTheory, setGradingTheory] = useState(false);

  // Flashcards State
  const [flashcards, setFlashcards] = useState<Flashcard[] | null>(null);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [cardFlipped, setCardFlipped] = useState(false);

  // Active Attached Document Context
  const [activeDocContext, setActiveDocContext] = useState<{
    title: string;
    course: string;
    text: string;
  } | null>(null);

  // Voice Note Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);

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
    } catch {
      toast.error("Microphone access unavailable or denied on this device.");
    }
  }

  async function stopAndSendVoiceNote() {
    if (!mediaRecorderRef.current || !isRecording || !user) return;
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);

    mediaRecorderRef.current.onstop = async () => {
      const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
      const audioUrl = URL.createObjectURL(audioBlob);
      const duration = recordingSeconds;
      setIsRecording(false);
      setRecordingSeconds(0);

      let targetThreadId = activeThreadId;
      if (!targetThreadId) {
        targetThreadId = await createNewChat();
        if (!targetThreadId) return;
      }

      const voiceUserMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content: `[Voice Note (${duration}s)] Student Audio Inquiry`,
        audioUrl,
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, voiceUserMsg]);
      setThinking(true);

      try {
        const result = await askBossAiServerFn({
          data: {
            userId: user.id,
            threadId: targetThreadId,
            query: `[Voice Note (${duration}s)] Student Audio Inquiry: Please provide a high-yield academic breakdown and study pointers.`,
            taskType: "general",
            docContext: activeDocContext ?? undefined,
          },
        });

        const aiMsg: ChatMessage = {
          id: result.assistantMessageId,
          role: "assistant",
          content: result.response,
          timestamp: new Date().toISOString(),
        };

        setMessages((prev) => [...prev, aiMsg]);
        refetchThreads();
      } catch {
        toast.error("Failed to process voice note with Boss AI.");
      } finally {
        setThinking(false);
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

  // Query Recent Chat Threads
  const { data: threads = [], refetch: refetchThreads } = useQuery({
    queryKey: ["chat-threads", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      if (!user) return [];
      return await getStudyThreadsServerFn({ data: { userId: user.id } });
    },
  });

  // Load Material context if passed via search params
  useEffect(() => {
    if (materialId) {
      getStudyMaterialByIdServerFn({ data: { materialId } }).then((m) => {
        if (m) {
          setActiveDocContext({
            title: m.title,
            course: m.course,
            text: m.description || `Study material for ${m.course} (${m.institution})`,
          });
          toast.success(`Loaded context for "${m.title}". You can ask questions, summarize, or quiz yourself.`);
        }
      });
    }
  }, [materialId]);

  // Set default active thread or create one
  useEffect(() => {
    if (!activeThreadId && threads.length > 0) {
      setActiveThreadId(threads[0]?.id ?? null);
    }
  }, [threads, activeThreadId]);

  // Load Messages for active thread
  useEffect(() => {
    if (!activeThreadId) {
      setMessages([]);
      return;
    }

    async function loadThread() {
      try {
        const loaded = await getStudyMessagesServerFn({ data: { threadId: activeThreadId } });
        setMessages(loaded as ChatMessage[]);
      } catch (err) {
        console.error("Failed to load thread messages:", err);
      }
    }

    loadThread();
  }, [activeThreadId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, thinking, quizQuestions, flashcards]);

  // Create New Chat Thread
  async function createNewChat() {
    if (!user) return null;
    try {
      const created = await createStudyThreadServerFn({
        data: { userId: user.id, title: "New Study Session" },
      });
      await refetchThreads();
      setActiveThreadId(created.id);
      setMessages([]);
      setQuizQuestions(null);
      setFlashcards(null);
      setActiveDocContext(null);
      toast.success("New study conversation started.");
      return created.id;
    } catch (err) {
      console.error("Create chat error:", err);
      toast.error("Could not create chat");
      return null;
    }
  }

  // Delete Chat Thread
  async function deleteChat(id: string) {
    try {
      await deleteStudyThreadServerFn({ data: { threadId: id } });
      if (activeThreadId === id) {
        setActiveThreadId(null);
        setMessages([]);
      }
      refetchThreads();
      toast.success("Chat deleted.");
    } catch {
      toast.error("Failed to delete chat.");
    }
  }

  // Save Message to Turso via Server Function
  async function saveMessage(role: "user" | "assistant" | "system", text: string, attachedMaterial?: any) {
    if (!activeThreadId || !user) return;
    try {
      await saveStudyMessageServerFn({
        data: {
          threadId: activeThreadId,
          userId: user.id,
          role,
          content: text,
          attachedMaterial,
        },
      });
    } catch (err) {
      console.warn("Failed to persist chat message to database:", err);
    }
  }

  // Handle Document Upload in Chat (Autonomous Library Registration)
  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 25 * 1024 * 1024) {
      toast.error("File exceeds 25 MB limit.");
      return;
    }

    setUploadingDoc(true);
    toast.loading("Reading & auto-categorizing document with Boss AI...", { id: "doc-proc" });

    try {
      let extractedSample = "";
      if (file.type.includes("text") || file.name.endsWith(".txt")) {
        extractedSample = await file.text();
      } else {
        extractedSample = `${file.name} - Academic Course Material for ${profile?.institution || "University"}`;
      }

      // Step 1: Autonomous Categorization using Google Gemini AI + Student profile
      const cat = await categorizeDocumentAutonomously(file.name, extractedSample, profile);

      // Step 2: Upload to Cloudflare R2
      const { uploadUrl, key } = await getPresignedUploadUrlServerFn({
        data: {
          userId: user.id,
          fileName: file.name,
          contentType: file.type || "application/pdf",
        },
      });

      await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type || "application/pdf" },
        body: file,
      });

      // Step 3: Automatically add to campus library in Turso
      const createdMat = await createMaterialServerFn({
        data: {
          userId: user.id,
          title: cat.title,
          course: cat.course,
          courseCode: cat.course_code,
          institution: cat.institution,
          level: cat.level,
          materialType: cat.material_type,
          description: cat.description,
          filePath: key,
          fileName: file.name,
          mimeType: file.type || "application/pdf",
          fileSize: file.size,
        },
      });

      // Step 4: Autonomous audit & point verification
      const audit = await auditUploadAutonomous(
        cat.title,
        cat.course,
        file.size,
        file.type,
        extractedSample
      );

      await autoVerifyMaterialServerFn({
        data: {
          materialId: createdMat.id,
          score: audit.score,
          notes: audit.notes,
        },
      });

      await qc.invalidateQueries({ queryKey: ["my-materials"] });
      await qc.invalidateQueries({ queryKey: ["library-materials"] });
      await qc.invalidateQueries({ queryKey: ["profile"] });

      // Set active document context for AI chat
      setActiveDocContext({
        title: cat.title,
        course: cat.course,
        text: extractedSample,
      });

      toast.success(
        `Added to Library! Categorized under ${cat.course} (${cat.level}). +25 SyllaPoints earned on verification!`,
        { id: "doc-proc" }
      );

      // Post confirmation message in chat thread
      const userDocMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content: `Uploaded study document: "${cat.title}"`,
        timestamp: new Date().toISOString(),
        attachedMaterial: {
          id: createdMat.id,
          title: cat.title,
          course: cat.course,
          courseCode: cat.course_code,
          institution: cat.institution,
          department: cat.department,
          level: cat.level,
          status: audit.verified ? "verified" : "pending",
        },
      };

      const aiWelcomeMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: `I've ingested **${cat.title}** and automatically published it to the **${cat.institution}** campus library for **${cat.department}** (${cat.level})!

**What would you like me to do with this material?**
Choose an action below or ask me any question directly:`,
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, userDocMsg, aiWelcomeMsg]);
      await saveMessage("user", userDocMsg.content, userDocMsg.attachedMaterial);
      await saveMessage("assistant", aiWelcomeMsg.content);

      // If active thread title was generic, update it
      if (activeThreadId) {
        await updateStudyThreadTitleServerFn({
          data: { threadId: activeThreadId, title: `Study: ${cat.course}` },
        });
        refetchThreads();
      }
    } catch (err) {
      console.error("Document ingestion error:", err);
      toast.error(err instanceof Error ? err.message : "Failed to process document", { id: "doc-proc" });
    } finally {
      setUploadingDoc(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  // Send Chat Prompt to Boss AI (Groq Cloud LPU with Smart Model Selection)
  async function handleSend(textToSend?: string) {
    const query = (textToSend || input).trim();
    if (!query || thinking || !user) return;

    let targetThreadId = activeThreadId;
    if (!targetThreadId) {
      targetThreadId = await createNewChat();
      if (!targetThreadId) return;
    }

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: query,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setThinking(true);

    try {
      const result = await askBossAiServerFn({
        data: {
          userId: user.id,
          threadId: targetThreadId,
          query,
          taskType: "general",
          docContext: activeDocContext ?? undefined,
        },
      });

      const aiMsg: ChatMessage = {
        id: result.assistantMessageId,
        role: "assistant",
        content: result.response,
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, aiMsg]);
      refetchThreads();
    } catch (err) {
      console.error("AI inference error:", err);
      toast.error("Failed to generate response. Please try again.");
    } finally {
      setThinking(false);
    }
  }

  // Quick Action: Summarize Document
  async function triggerSummarize() {
    const title = activeDocContext?.title || "your uploaded document";
    handleSend(`Please provide a high-yield executive summary of ${title}, highlighting the core definitions, formulas, and most likely exam questions.`);
  }

  // Quick Action: Practice Questions (Objective / Theory)
  async function triggerPracticeQuiz(mode: "objective" | "theory") {
    setThinking(true);
    toast.loading(`Generating ${mode === "objective" ? "objective multiple-choice" : "theory essay"} practice questions...`, { id: "quiz-gen" });

    try {
      const title = activeDocContext?.title || profile?.course || "General Coursework";
      const sample = activeDocContext?.text || "University semester exam preparation concepts.";
      const questions = await generatePracticeQuestions(title, sample, mode, 4);

      setQuizQuestions(questions);
      setCurrentQuizIndex(0);
      setSelectedObjectiveOption(null);
      setTheoryFeedback(null);
      setTheoryAnswerInput("");
      setQuizScores({});

      toast.success(`${mode === "objective" ? "Multiple-choice" : "Theory"} practice session ready!`, { id: "quiz-gen" });
    } catch (err) {
      toast.error("Failed to generate questions", { id: "quiz-gen" });
    } finally {
      setThinking(false);
    }
  }

  // Grade Theory Answer
  async function handleGradeTheory() {
    if (!quizQuestions || !theoryAnswerInput.trim()) return;
    const q = quizQuestions[currentQuizIndex];
    if (!q) return;

    setGradingTheory(true);
    try {
      const result = await gradeTheoryAnswer(q.question, q.modelAnswer, theoryAnswerInput);
      setTheoryFeedback(result);
      setQuizScores((prev) => ({ ...prev, [currentQuizIndex]: result.score }));
      toast.success(`Marked: Scored ${result.score}/10!`);
    } catch {
      toast.error("Grading failed. Please try again.");
    } finally {
      setGradingTheory(false);
    }
  }

  // Quick Action: Flashcards
  async function triggerFlashcards() {
    setThinking(true);
    toast.loading("Generating revision flashcards...", { id: "fc-gen" });

    try {
      const title = activeDocContext?.title || profile?.course || "Academic Revision";
      const sample = activeDocContext?.text || "Course definitions and formulas.";
      const cards = await generateFlashcards(title, sample, 5);

      setFlashcards(cards);
      setCurrentCardIndex(0);
      setCardFlipped(false);
      toast.success("5 Study Flashcards prepared!", { id: "fc-gen" });
    } catch {
      toast.error("Could not generate flashcards", { id: "fc-gen" });
    } finally {
      setThinking(false);
    }
  }

  return (
    <div className="flex h-full w-full max-h-[calc(100dvh-70px)] sm:max-h-[calc(100dvh-82px)] overflow-hidden flex-col gap-3 lg:grid lg:grid-cols-[260px_1fr]">
      {/* Left Sidebar: Recent Chats & Actions */}
      <aside className="hidden flex-col justify-between rounded-3xl border border-border/80 bg-card p-4 shadow-sm lg:flex">
        <div className="space-y-4">
          <Button
            onClick={createNewChat}
            className="w-full justify-start gap-2 rounded-2xl font-semibold shadow-xs"
          >
            <MessageSquarePlus className="size-4" /> New Study Chat
          </Button>

          {/* Document Attachment Button */}
          <div className="rounded-2xl border border-dashed border-primary/40 bg-primary/5 p-3 text-center">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              className="hidden"
              accept=".pdf,.doc,.docx,.txt,image/*"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={uploadingDoc}
              onClick={() => fileInputRef.current?.click()}
              className="w-full gap-2 rounded-xl text-xs font-semibold border-primary/30 text-primary hover:bg-primary/10"
            >
              {uploadingDoc ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Paperclip className="size-3.5" />
              )}
              {uploadingDoc ? "Processing..." : "Add Document to Chat"}
            </Button>
            <p className="mt-1.5 text-[10px] text-muted-foreground">
              Auto-registers into library & categorizes for your school
            </p>
          </div>

          {/* Recent Chats List */}
          <div className="space-y-1">
            <p className="px-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Recent Chats
            </p>
            <div className="max-h-[calc(100svh-380px)] overflow-y-auto space-y-1 pr-1">
              {threads.length === 0 ? (
                <p className="px-2 py-4 text-xs text-muted-foreground">No recent conversations.</p>
              ) : (
                threads.map((t) => (
                  <div
                    key={t.id}
                    className={cn(
                      "group flex items-center justify-between gap-1 rounded-xl px-2.5 py-2 text-xs transition-colors",
                      activeThreadId === t.id
                        ? "bg-secondary font-semibold text-foreground"
                        : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                    )}
                  >
                    <button
                      className="min-w-0 flex-1 truncate text-left"
                      onClick={() => {
                        setActiveThreadId(t.id);
                        setQuizQuestions(null);
                        setFlashcards(null);
                      }}
                    >
                      {t.title}
                    </button>
                    <button
                      type="button"
                      aria-label="Delete chat"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteChat(t.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:text-destructive transition-opacity"
                    >
                      <Trash2 className="size-3" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Student Context Card */}
        <div className="rounded-2xl border border-border/60 bg-secondary/30 p-3 text-xs">
          <div className="flex items-center gap-2 font-medium text-foreground">
            <GraduationCap className="size-4 text-primary" />
            <span className="truncate">{profile?.institution || "Campus AI"}</span>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground truncate">
            {profile?.course || "Student Account"} · {profile?.level || "100L"}
          </p>
        </div>
      </aside>

      {/* Main Chat & Interactive Study Center */}
      <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-3xl border border-border/80 bg-card shadow-sm">
        {/* Chat Header with Active Context and Quick Tool Launchers */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 px-4 py-3 bg-secondary/20">
          <div className="flex items-center gap-2.5">
            <div className="grid size-8 place-items-center rounded-xl bg-primary/10 text-primary">
              <Bot className="size-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display text-base font-bold text-foreground">Boss AI</h2>
                <span className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                  Google Gemini Ready
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground truncate max-w-xs">
                {activeDocContext ? `Attached: ${activeDocContext.title}` : "Interactive academic tutor"}
              </p>
            </div>
          </div>

          {/* Quick Action Badges */}
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {/* Mobile Past Chats Drawer Launcher */}
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowMobileHistory(true)}
              className="h-8 rounded-full text-xs gap-1 font-semibold border-primary/40 text-primary hover:bg-primary/10 lg:hidden"
            >
              <History className="size-3 text-primary" />
              <span>Chats</span>
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={triggerSummarize}
              className="h-8 rounded-full text-xs gap-1 font-medium border-border/80"
            >
              <Sparkles className="size-3 text-amber-500" />
              Summarize
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => triggerPracticeQuiz("objective")}
              className="h-8 rounded-full text-xs gap-1 font-medium border-border/80"
            >
              <CheckCircle2 className="size-3 text-primary" />
              MCQ Quiz
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => triggerPracticeQuiz("theory")}
              className="h-8 rounded-full text-xs gap-1 font-medium border-border/80"
            >
              <FileText className="size-3 text-primary" />
              Theory Test
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={triggerFlashcards}
              className="h-8 rounded-full text-xs gap-1 font-medium border-border/80"
            >
              <Layers className="size-3 text-primary" />
              Flashcards
            </Button>
          </div>
        </div>

        {/* Interactive Mode Banners (Quiz / Flashcards) */}
        {quizQuestions && quizQuestions.length > 0 && (
          <div className="border-b border-border/60 bg-primary/5 p-4 transition-all">
            <div className="flex items-center justify-between pb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                <HelpCircle className="size-4" />
                Practice Question {currentQuizIndex + 1} of {quizQuestions.length} ({quizQuestions[currentQuizIndex]?.type.toUpperCase()})
              </span>
              <button
                onClick={() => setQuizQuestions(null)}
                className="text-xs text-muted-foreground hover:text-foreground font-medium"
              >
                Close Practice Mode
              </button>
            </div>

            {/* Question Text */}
            <p className="font-semibold text-sm text-foreground mt-1">
              {quizQuestions[currentQuizIndex]?.question}
            </p>

            {/* Objective Mode: 4 Choices */}
            {quizQuestions[currentQuizIndex]?.type === "objective" && (
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {quizQuestions[currentQuizIndex]?.options?.map((opt, i) => {
                  const isCorrect = i === quizQuestions[currentQuizIndex]?.correctOptionIndex;
                  const isSelected = selectedObjectiveOption === i;
                  return (
                    <button
                      key={i}
                      disabled={selectedObjectiveOption !== null}
                      onClick={() => {
                        setSelectedObjectiveOption(i);
                        if (isCorrect) {
                          setQuizScores((prev) => ({ ...prev, [currentQuizIndex]: 1 }));
                          toast.success("Correct answer!");
                        } else {
                          toast.error("Incorrect. See explanation below.");
                        }
                      }}
                      className={cn(
                        "rounded-xl border p-3 text-left text-xs font-medium transition-all",
                        selectedObjectiveOption === null
                          ? "border-border bg-card hover:border-primary/50"
                          : isCorrect
                          ? "border-emerald-500 bg-emerald-500/10 text-emerald-800 font-bold"
                          : isSelected
                          ? "border-destructive bg-destructive/10 text-destructive font-bold"
                          : "border-border/60 opacity-60"
                      )}
                    >
                      <span className="font-mono mr-2">{String.fromCharCode(65 + i)}.</span>
                      {opt}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Objective Feedback Explanation */}
            {quizQuestions[currentQuizIndex]?.type === "objective" && selectedObjectiveOption !== null && (
              <div className="mt-3 rounded-xl bg-card p-3 text-xs border border-border/70 space-y-1">
                <p className="font-semibold text-foreground">Explanation:</p>
                <p className="text-muted-foreground">{quizQuestions[currentQuizIndex]?.explanation}</p>
              </div>
            )}

            {/* Theory Mode: Written Response + Auto-Marking System */}
            {quizQuestions[currentQuizIndex]?.type === "theory" && (
              <div className="mt-3 space-y-3">
                <Textarea
                  value={theoryAnswerInput}
                  onChange={(e) => setTheoryAnswerInput(e.target.value)}
                  placeholder="Type your structured examination answer here for Boss AI to mark and score..."
                  className="min-h-24 text-xs rounded-xl bg-card"
                />

                <div className="flex items-center justify-between">
                  <Button
                    size="sm"
                    disabled={gradingTheory || !theoryAnswerInput.trim()}
                    onClick={handleGradeTheory}
                    className="rounded-xl text-xs gap-1.5 font-semibold"
                  >
                    {gradingTheory ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
                    Submit for Marking & Scoring (10 Marks)
                  </Button>
                </div>

                {/* Theory Marking Feedback Card */}
                {theoryFeedback && (
                  <div className="rounded-2xl border border-primary/30 bg-card p-4 text-xs space-y-2.5 animate-fade-in shadow-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-foreground">Official Examination Score:</span>
                      <span className="rounded-full bg-primary text-primary-foreground font-display font-bold px-3 py-0.5 text-xs">
                        {theoryFeedback.score} / {theoryFeedback.maxScore} Marks
                      </span>
                    </div>

                    <p className="text-muted-foreground leading-relaxed">{theoryFeedback.feedback}</p>

                    {theoryFeedback.strengths?.length > 0 && (
                      <div>
                        <span className="font-semibold text-emerald-700">Demonstrated Strengths:</span>
                        <ul className="mt-1 list-disc pl-4 text-muted-foreground space-y-0.5">
                          {theoryFeedback.strengths.map((s: string, idx: number) => (
                            <li key={idx}>{s}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {theoryFeedback.areasToImprove?.length > 0 && (
                      <div>
                        <span className="font-semibold text-amber-700">Areas for Improvement:</span>
                        <ul className="mt-1 list-disc pl-4 text-muted-foreground space-y-0.5">
                          {theoryFeedback.areasToImprove.map((a: string, idx: number) => (
                            <li key={idx}>{a}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="border-t border-border/60 pt-2 text-[11px] text-muted-foreground">
                      <strong>Model Answer Reference:</strong> {quizQuestions[currentQuizIndex]?.modelAnswer}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Quiz Navigation Buttons */}
            <div className="mt-3 flex items-center justify-between border-t border-border/40 pt-2.5">
              <Button
                size="sm"
                variant="ghost"
                disabled={currentQuizIndex === 0}
                onClick={() => {
                  setCurrentQuizIndex((i) => i - 1);
                  setSelectedObjectiveOption(null);
                  setTheoryFeedback(null);
                  setTheoryAnswerInput("");
                }}
                className="h-8 rounded-xl text-xs"
              >
                Previous Question
              </Button>

              <span className="text-xs text-muted-foreground font-mono">
                {currentQuizIndex + 1} / {quizQuestions.length}
              </span>

              <Button
                size="sm"
                variant="outline"
                disabled={currentQuizIndex >= quizQuestions.length - 1}
                onClick={() => {
                  setCurrentQuizIndex((i) => i + 1);
                  setSelectedObjectiveOption(null);
                  setTheoryFeedback(null);
                  setTheoryAnswerInput("");
                }}
                className="h-8 rounded-xl text-xs gap-1 font-semibold"
              >
                Next Question <ChevronRight className="size-3" />
              </Button>
            </div>
          </div>
        )}

        {/* Interactive Flashcards Mode */}
        {flashcards && flashcards.length > 0 && (
          <div className="border-b border-border/60 bg-secondary/30 p-4 transition-all">
            <div className="flex items-center justify-between pb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                <Layers className="size-4" /> Study Flashcard {currentCardIndex + 1} of {flashcards.length}
              </span>
              <button
                onClick={() => setFlashcards(null)}
                className="text-xs text-muted-foreground hover:text-foreground font-medium"
              >
                Close Flashcards
              </button>
            </div>

            {/* Card Body with Flip Effect */}
            <div
              onClick={() => setCardFlipped((f) => !f)}
              className="mt-2 min-h-36 cursor-pointer select-none rounded-2xl border border-border bg-card p-6 shadow-sm flex flex-col justify-center items-center text-center transition-all hover:shadow-md"
            >
              <span className="text-[10px] font-bold uppercase tracking-widest text-primary mb-2">
                {cardFlipped ? "Answer / Definition" : "Prompt / Concept"}
              </span>
              <p className="font-display text-base font-semibold text-foreground">
                {cardFlipped ? flashcards[currentCardIndex]?.back : flashcards[currentCardIndex]?.front}
              </p>
              <span className="mt-3 text-[10px] text-muted-foreground">Click to flip card</span>
            </div>

            {/* Flashcard Controls */}
            <div className="mt-3 flex items-center justify-between">
              <Button
                size="sm"
                variant="ghost"
                disabled={currentCardIndex === 0}
                onClick={() => {
                  setCurrentCardIndex((i) => i - 1);
                  setCardFlipped(false);
                }}
                className="h-8 rounded-xl text-xs"
              >
                Previous Card
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={() => setCardFlipped((f) => !f)}
                className="h-8 rounded-xl text-xs gap-1"
              >
                <RotateCcw className="size-3" /> Flip
              </Button>

              <Button
                size="sm"
                variant="outline"
                disabled={currentCardIndex >= flashcards.length - 1}
                onClick={() => {
                  setCurrentCardIndex((i) => i + 1);
                  setCardFlipped(false);
                }}
                className="h-8 rounded-xl text-xs gap-1 font-semibold"
              >
                Next Card <ChevronRight className="size-3" />
              </Button>
            </div>
          </div>
        )}

        {/* Message Thread History */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="grid h-full place-items-center p-6 text-center">
              <div className="max-w-md space-y-3">
                <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary">
                  <Bot className="size-6" />
                </div>
                <h3 className="font-display text-xl font-bold text-foreground">
                  What are you studying today?
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Attach your lecture notes, past questions, or type any course topic. Boss AI summarizes, creates practice quizzes, marks theory answers, and answers assignments.
                </p>

                <div className="grid gap-2 pt-2 sm:grid-cols-2 text-left">
                  <button
                    onClick={() => handleSend("Explain the core theorems and exam questions in my department")}
                    className="rounded-xl border border-border/80 bg-card p-3 text-xs font-medium hover:border-primary transition-all"
                  >
                    Explain course theorems simply
                  </button>
                  <button
                    onClick={() => handleSend("Give me 5 likely examination practice questions for my current semester level")}
                    className="rounded-xl border border-border/80 bg-card p-3 text-xs font-medium hover:border-primary transition-all"
                  >
                    Generate practice exam questions
                  </button>
                  <button
                    onClick={() => handleSend("How can I structure a 10-mark theory answer for maximum marks?")}
                    className="rounded-xl border border-border/80 bg-card p-3 text-xs font-medium hover:border-primary transition-all"
                  >
                    Theory marking guide & strategy
                  </button>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="rounded-xl border border-dashed border-primary/50 bg-primary/5 p-3 text-xs font-medium text-primary hover:bg-primary/10 transition-all"
                  >
                    Upload document to study with Boss
                  </button>
                </div>
              </div>
            </div>
          ) : (
            messages.map((m) => (
              <div
                key={m.id}
                className={cn(
                  "flex flex-col space-y-1.5",
                  m.role === "user" ? "items-end" : "items-start"
                )}
              >
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground px-1">
                  <span>{m.role === "user" ? "You" : "Boss AI"}</span>
                </div>

                <div
                  className={cn(
                    "max-w-[88%] rounded-2xl px-4 py-3 text-xs leading-relaxed transition-all shadow-xs",
                    m.role === "user"
                      ? "bg-primary text-primary-foreground font-medium rounded-br-xs"
                      : "bg-secondary/60 text-foreground border border-border/60 rounded-bl-xs"
                  )}
                >
                  {/* If an uploaded document was attached to message, render auto-registration banner */}
                  {m.attachedMaterial && (
                    <div className="mb-2 rounded-xl bg-card border border-border/80 p-3 text-foreground shadow-xs">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-xs flex items-center gap-1.5 text-primary">
                          <CheckCircle2 className="size-3.5 text-emerald-600" />
                          Published to Campus Library
                        </span>
                        <span className="rounded-full bg-emerald-500/10 text-emerald-700 px-2 py-0.5 text-[10px] font-bold">
                          +25 SyllaPoints
                        </span>
                      </div>
                      <p className="mt-1 font-bold text-xs">{m.attachedMaterial.title}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {m.attachedMaterial.course} · {m.attachedMaterial.institution} ({m.attachedMaterial.department})
                      </p>
                    </div>
                  )}

                  {m.audioUrl && (
                    <div className="mb-2 p-2 rounded-xl bg-black/15 flex items-center gap-2">
                      <Volume2 className="size-4 text-emerald-400" />
                      <audio src={m.audioUrl} controls className="h-7 w-48" />
                    </div>
                  )}

                  <div className="whitespace-pre-wrap">{m.content}</div>
                </div>
              </div>
            ))
          )}

          {thinking && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground animate-pulse p-2">
              <Bot className="size-4 text-primary animate-bounce" />
              <span>Boss AI is analyzing and composing your response...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Voice Recording Live Banner */}
        {isRecording && (
          <div className="mx-3 my-2 p-2.5 rounded-xl bg-red-50 border border-red-200 flex items-center justify-between animate-pulse">
            <div className="flex items-center gap-2">
              <span className="size-2.5 rounded-full bg-red-600 animate-ping" />
              <span className="text-xs font-bold text-red-700">Recording Voicenote... ({recordingSeconds}s)</span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="ghost"
                type="button"
                onClick={cancelRecording}
                className="h-7 px-2 text-xs text-muted-foreground hover:text-red-700"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                type="button"
                onClick={stopAndSendVoiceNote}
                className="h-7 px-3 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg"
              >
                Send Note
              </Button>
            </div>
          </div>
        )}

        {/* Input Bar */}
        <div className="border-t border-border/60 p-3 bg-card">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-end gap-2"
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              className="hidden"
              accept=".pdf,.doc,.docx,.txt,image/*"
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              disabled={uploadingDoc}
              onClick={() => fileInputRef.current?.click()}
              title="Attach document to auto-register into library and study"
              className="h-11 w-11 rounded-2xl shrink-0"
            >
              {uploadingDoc ? (
                <Loader2 className="size-4 animate-spin text-primary" />
              ) : (
                <Paperclip className="size-4" />
              )}
            </Button>

            <Button
              type="button"
              variant={isRecording ? "destructive" : "outline"}
              size="icon"
              onClick={isRecording ? stopAndSendVoiceNote : startRecording}
              title={isRecording ? "Stop and send voice note" : "Record voice note for Boss AI"}
              className={cn("h-11 w-11 rounded-2xl shrink-0 transition-all", isRecording && "animate-pulse")}
            >
              <Mic className="size-4" />
            </Button>

            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder={activeDocContext ? `Ask about "${activeDocContext.title}" or ask to quiz/summarize…` : "Ask Boss AI about any topic, course, assignment, or past question…"}
              className="min-h-11 max-h-32 resize-none rounded-2xl text-xs py-3 bg-secondary/30"
              rows={1}
            />

            <Button
              type="submit"
              size="icon"
              disabled={thinking || !input.trim()}
              className="h-11 w-11 rounded-2xl shrink-0 shadow-xs"
            >
              <Send className="size-4" />
            </Button>
          </form>
        </div>
      </section>

      {/* Mobile Previous Chats Modal */}
      <Dialog open={showMobileHistory} onOpenChange={setShowMobileHistory}>
        <DialogContent className="max-w-md rounded-3xl p-6 border-border/80 bg-card text-card-foreground shadow-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold">
              <History className="size-5 text-primary" />
              Previous Study Chats
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            <Button
              onClick={() => {
                createNewChat();
                setShowMobileHistory(false);
              }}
              className="w-full justify-start gap-2 rounded-2xl font-semibold shadow-xs"
            >
              <MessageSquarePlus className="size-4" /> New Study Chat
            </Button>

            {/* Document Attachment Button for Mobile */}
            <div className="rounded-2xl border border-dashed border-primary/40 bg-primary/5 p-3 text-center">
              <input
                type="file"
                ref={mobileFileInputRef}
                onChange={(e) => {
                  handleFileUpload(e);
                  setShowMobileHistory(false);
                }}
                className="hidden"
                accept=".pdf,.doc,.docx,.txt,image/*"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={uploadingDoc}
                onClick={() => mobileFileInputRef.current?.click()}
                className="w-full gap-2 rounded-xl text-xs font-semibold border-primary/30 text-primary hover:bg-primary/10"
              >
                {uploadingDoc ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Paperclip className="size-3.5" />
                )}
                {uploadingDoc ? "Processing..." : "Add Document to Chat"}
              </Button>
            </div>

            {/* Threads List */}
            <div className="space-y-1">
              <p className="px-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Recent Chats
              </p>
              <div className="max-h-60 overflow-y-auto space-y-1 pr-1">
                {threads.length === 0 ? (
                  <p className="px-2 py-4 text-xs text-muted-foreground">No recent conversations.</p>
                ) : (
                  threads.map((t) => (
                    <div
                      key={t.id}
                      className={cn(
                        "group flex items-center justify-between gap-1 rounded-xl px-2.5 py-2 text-xs transition-colors",
                        activeThreadId === t.id
                          ? "bg-secondary font-semibold text-foreground"
                          : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                      )}
                    >
                      <button
                        className="min-w-0 flex-1 truncate text-left"
                        onClick={() => {
                          setActiveThreadId(t.id);
                          setQuizQuestions(null);
                          setFlashcards(null);
                          setShowMobileHistory(false);
                        }}
                      >
                        {t.title}
                      </button>
                      <button
                        type="button"
                        aria-label="Delete chat"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteChat(t.id);
                        }}
                        className="p-1 hover:text-destructive text-muted-foreground"
                      >
                        <Trash2 className="size-3" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
