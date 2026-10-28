import { useState, useRef, useEffect, useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
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
  ChevronDown,
  ChevronUp,
  GraduationCap,
  Mic,
  Volume2,
  VolumeX,
  History,
  MoreVertical,
  Plus,
  AlertCircle,
  X,
  Upload,
  Search,
  Copy,
  MessageSquare,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import {
  MobileCustomKeyboard,
  getPredictiveSuggestions,
} from "@/components/chat/mobile-custom-keyboard";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AiMessageRenderer } from "@/components/ai-message-renderer";
import { useAuth } from "@/hooks/use-auth";
import { useProfile } from "@/lib/profile";
import {
  createStudyThreadServerFn,
  getStudyThreadsServerFn,
  deleteStudyThreadServerFn,
  getStudyMessagesServerFn,
  askBossAiServerFn,
  saveStudyMessageServerFn,
  updateStudyThreadTitleServerFn,
  generateSmartThreadTitleServerFn,
  getStudyMaterialByIdServerFn,
  transcribeVoiceAudioServerFn,
  generateStudyQuizServerFn,
  generateStudyFlashcardsServerFn,
  gradeTheoryAnswerServerFn,
} from "@/lib/ai/study-assistant.functions";
import {
  InChatFlashcardsWidget,
  InChatMcqQuizWidget,
  InChatTheoryWidget,
} from "@/components/chat/in-chat-study-widgets";
import {
  categorizeDocumentAutonomously,
  generatePracticeQuestions,
  gradeTheoryAnswer,
  generateFlashcards,
  type QuizQuestion,
  type Flashcard,
} from "@/lib/academic-ai";
import { getMaterialsForChatServerFn } from "@/lib/community.functions";
import { convertTextAndMathToSpeech, initSpeechRuleEngine, getBestNaturalVoice } from "@/lib/math-to-speech";
import { sendDeviceNotification } from "@/lib/notifications";
import { cn } from "@/lib/utils";
import { SyllabossEmblem } from "@/components/syllaboss-logo";

const searchSchema = z.object({
  materialId: z.string().optional(),
  view: z.string().optional(),
  threadId: z.string().optional(),
});

export const Route = createFileRoute("/_authenticated/dashboard/assistant")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Boss AI Study Suite — Syllaboss" },
      {
        name: "description",
        content: "Chat with documents, take practice quizzes, mark theory answers, and generate flashcards with Boss AI.",
      },
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
  flashcardsData?: {
    cards: Flashcard[];
    topic: string;
    type?: string;
    totalCount?: number;
  };
  quizData?: {
    questions: QuizQuestion[];
    mode: "objective" | "theory";
    topic: string;
    markingMode?: "as_you_go" | "at_the_end";
    totalCount?: number;
  };
}

// Colorful gradients for 3D Flashcards based on Sketch 1
const FLASHCARD_GRADIENTS = [
  "from-brand/15 via-brand/10 to-brand/5 border-brand/40 text-forest dark:text-accent",
  "from-brand/15 via-brand/10 to-brand/5 border-brand/40 text-forest dark:text-accent",
  "from-brass/15 via-brass/10 to-brass/5 border-brass/40 text-brass-ink dark:text-brass-soft",
  "from-brand/15 via-brand/10 to-brand/5 border-brand/40 text-forest dark:text-accent",
  "from-rose-500/15 via-pink-500/10 to-rose-500/5 border-rose-500/40 text-rose-950 dark:text-rose-100",
];

function AssistantPage() {
  const { materialId, view, threadId: searchThreadId } = Route.useSearch();
  const navigate = Route.useNavigate();
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const qc = useQueryClient();

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

  // Initialize Speech Rule Engine for math narration
  useEffect(() => {
    initSpeechRuleEngine();
  }, []);

  // Initialize activeThreadId from URL search param or localStorage
  const [activeThreadId, setActiveThreadId] = useState<string | null>(() => {
    if (searchThreadId) return searchThreadId;
    if (typeof window !== "undefined") {
      return localStorage.getItem("syllaboss_active_chat_thread") || null;
    }
    return null;
  });

  const handleSelectThread = (threadId: string | null) => {
    setActiveThreadId(threadId);
    if (typeof window !== "undefined") {
      if (threadId) {
        localStorage.setItem("syllaboss_active_chat_thread", threadId);
      } else {
        localStorage.removeItem("syllaboss_active_chat_thread");
      }
    }
    navigate({
      search: (prev: any) => ({
        ...prev,
        threadId: threadId || undefined,
      }),
      replace: true,
    });
  };
  const [showMenuDrawer, setShowMenuDrawer] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [showCustomKeyboard, setShowCustomKeyboard] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);

  // Floating scroll-to-bottom state
  const [showScrollBottom, setShowScrollBottom] = useState(false);

  // Drop-up menu for study tools & documents
  const [showDropUpMenu, setShowDropUpMenu] = useState(false);
  const [showDocMenu, setShowDocMenu] = useState(false);
  const [showModesMenu, setShowModesMenu] = useState(false);
  const [showRecentPopover, setShowRecentPopover] = useState(false);

  // Mention autocomplete popup when user types @
  const showAssistantMention = useMemo(() => {
    const match = input.match(/@(\w*)$/);
    return (
      match !== null &&
      ("bossai".startsWith(match[1].toLowerCase()) ||
        match[1] === "" ||
        "boss".startsWith(match[1].toLowerCase()) ||
        "ai".startsWith(match[1].toLowerCase()))
    );
  }, [input]);

  // Text-to-speech audio state
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);

  // Modals for Modes
  const [isMcqConfigOpen, setIsMcqConfigOpen] = useState(false);
  const [isTheoryConfigOpen, setIsTheoryConfigOpen] = useState(false);
  const [isFlashcardConfigOpen, setIsFlashcardConfigOpen] = useState(false);
  const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState(false);
  const [assignmentInput, setAssignmentInput] = useState("");
  const [assignmentMode, setAssignmentMode] = useState<"detailed" | "short">("detailed");

  // Campus Library Picker Modal
  const [isLibraryModalOpen, setIsLibraryModalOpen] = useState(false);
  const [librarySearch, setLibrarySearch] = useState("");
  const [libraryFilter, setLibraryFilter] = useState<string>("all");

  // MCQ Configuration & Execution State (Up to 50 questions per sketch & prompt)
  const [mcqMode, setMcqMode] = useState<"as_you_go" | "at_the_end">("as_you_go");
  const [mcqCount, setMcqCount] = useState<number>(5);
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[] | null>(null);
  const [currentQuizIndex, setCurrentQuizIndex] = useState(0);
  const [selectedObjectiveAnswers, setSelectedObjectiveAnswers] = useState<Record<number, number>>({});
  const [quizScores, setQuizScores] = useState<Record<number, number>>({});
  const [isMcqSubmittedAtEnd, setIsMcqSubmittedAtEnd] = useState(false);
  const [unansweredWarningQuestions, setUnansweredWarningQuestions] = useState<number[] | null>(null);

  // Theory Configuration & Execution State (Up to 50 questions with marks per sketch 4)
  const [theoryMode, setTheoryMode] = useState<"as_you_go" | "at_the_end">("as_you_go");
  const [theoryCount, setTheoryCount] = useState<number>(5);
  const [theoryAnswerInput, setTheoryAnswerInput] = useState("");
  const [theoryAnswersMap, setTheoryAnswersMap] = useState<Record<number, string>>({});
  const [theoryFeedbackMap, setTheoryFeedbackMap] = useState<Record<number, any>>({});
  const [gradingTheory, setGradingTheory] = useState(false);

  // Flashcards Configuration & State (Up to 50 cards)
  const [flashcardCount, setFlashcardCount] = useState<number>(10);
  const [flashcardType, setFlashcardType] = useState<"qa" | "fill_blank">("qa");
  const [flashcards, setFlashcards] = useState<Flashcard[] | null>(null);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [cardFlipped, setCardFlipped] = useState(false);

  // Active Attached Document Context
  const [activeDocContext, setActiveDocContext] = useState<{
    id?: string;
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
  const recognitionRef = useRef<any>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const menuFileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesScrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const isUp = el.scrollHeight - el.scrollTop - el.clientHeight > 140;
    setShowScrollBottom(isUp);
  };

  // Query Recent Chat Threads
  const { data: threads = [], refetch: refetchThreads } = useQuery({
    queryKey: ["chat-threads", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      if (!user) return [];
      return await getStudyThreadsServerFn({ data: { userId: user.id } });
    },
  });

  const [threadSearch, setThreadSearch] = useState("");
  const filteredThreads = useMemo(() => {
    if (!threadSearch.trim()) return threads;
    return threads.filter((t: any) =>
      t.title.toLowerCase().includes(threadSearch.toLowerCase())
    );
  }, [threads, threadSearch]);

  // Query Campus Library Materials
  const { data: libraryMaterials = [], isLoading: isLoadingLibrary } = useQuery({
    queryKey: ["campus-library-materials"],
    queryFn: async () => {
      return await getMaterialsForChatServerFn({ data: { limit: 60 } });
    },
  });

  const filteredLibraryMaterials = useMemo(() => {
    return libraryMaterials.filter((m: any) => {
      const matchesSearch =
        m.title.toLowerCase().includes(librarySearch.toLowerCase()) ||
        m.course.toLowerCase().includes(librarySearch.toLowerCase()) ||
        (m.course_code && m.course_code.toLowerCase().includes(librarySearch.toLowerCase()));
      if (!matchesSearch) return false;
      if (libraryFilter === "all") return true;
      return m.material_type === libraryFilter;
    });
  }, [libraryMaterials, librarySearch, libraryFilter]);

  // Load Material context if passed via search params
  useEffect(() => {
    if (materialId) {
      getStudyMaterialByIdServerFn({ data: { materialId } }).then((m) => {
        if (m) {
          setActiveDocContext({
            id: m.id,
            title: m.title,
            course: m.course,
            text: m.description || m.title,
          });
          const welcomeMsg: ChatMessage = {
            id: crypto.randomUUID(),
            role: "assistant",
            content: `Loaded document: **${m.title}** (${m.course} · ${m.institution}).\n\nAsk me any question about this material, or choose an option from the menu to start studying!`,
            timestamp: new Date().toISOString(),
          };
          setMessages([welcomeMsg]);
        }
      });
    }
  }, [materialId]);

  // Auto-restore active thread if null or ensure valid selection
  useEffect(() => {
    if (!threads || threads.length === 0) return;

    // 1. If activeThreadId is already set, ensure URL is synced and DO NOT overwrite activeThreadId
    if (activeThreadId) {
      if (searchThreadId !== activeThreadId) {
        navigate({
          search: (prev: any) => ({ ...prev, threadId: activeThreadId }),
          replace: true,
        });
      }
      return;
    }

    // 2. If activeThreadId is not set, check searchThreadId from URL
    if (searchThreadId && threads.some((t: any) => t.id === searchThreadId)) {
      handleSelectThread(searchThreadId);
      return;
    }

    // 3. Check localStorage
    const savedThreadId =
      typeof window !== "undefined"
        ? localStorage.getItem("syllaboss_active_chat_thread")
        : null;
    if (savedThreadId && threads.some((t: any) => t.id === savedThreadId)) {
      handleSelectThread(savedThreadId);
      return;
    }

    // 4. Default to first (most recent) thread
    if (threads.length > 0) {
      handleSelectThread(threads[0].id);
    }
  }, [threads, searchThreadId, activeThreadId]);

  // Fetch active thread messages
  const {
    data: threadMessages = [],
    isLoading: isLoadingMessages,
    isFetching: isFetchingMessages,
  } = useQuery({
    queryKey: ["chat-messages", activeThreadId],
    enabled: Boolean(activeThreadId),
    queryFn: async () => {
      if (!activeThreadId) return [];
      return await getStudyMessagesServerFn({ data: { threadId: activeThreadId } });
    },
  });

  // Sync loaded thread messages
  useEffect(() => {
    if (thinking) return;
    if (activeThreadId) {
      if (threadMessages && threadMessages.length > 0) {
        const formatted: ChatMessage[] = threadMessages.map((msg: any) => {
          let contentText = msg.content || "";
          let audioUrl: string | undefined = msg.audioUrl || undefined;
          let attachedMaterial: any = msg.attachedMaterial || undefined;
          let flashcardsData: any = msg.flashcardsData || undefined;
          let quizData: any = msg.quizData || undefined;

          if (msg.parts) {
            try {
              const parsed = typeof msg.parts === "string" ? JSON.parse(msg.parts) : msg.parts;
              if (Array.isArray(parsed)) {
                contentText = parsed.map((p) => p.text || "").join("\n");
              } else if (typeof parsed === "object") {
                contentText = parsed.text || contentText;
                audioUrl = parsed.audioUrl || audioUrl;
                attachedMaterial = parsed.attachedMaterial || attachedMaterial;
                flashcardsData = parsed.flashcardsData || flashcardsData;
                quizData = parsed.quizData || quizData;
              }
            } catch {
              contentText = String(msg.parts || "");
            }
          }

          return {
            id: msg.id,
            role: msg.role,
            content: contentText,
            audioUrl,
            timestamp: msg.timestamp || msg.created_at,
            attachedMaterial,
            flashcardsData,
            quizData,
          };
        });
        setMessages(formatted);
      } else if (!isLoadingMessages && !isFetchingMessages) {
        setMessages([]);
      }
    } else {
      setMessages([]);
    }
  }, [threadMessages, activeThreadId, isLoadingMessages, isFetchingMessages, thinking]);

  useEffect(() => {
    if (!showScrollBottom) messagesEndRef.current?.scrollIntoView({ behavior: "instant" });
  }, [messages, thinking]);

  // Voice Note Recording (SpeechRecognition + MediaRecorder fallback)
  async function startVoiceRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/mp4")
        ? "audio/mp4"
        : "audio/webm";
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.start(250);
      setIsRecording(true);
      setRecordingSeconds(0);

      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((s) => s + 1);
      }, 1000);

      // Start SpeechRecognition in parallel if available
      const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRec) {
        try {
          const rec = new SpeechRec();
          rec.continuous = true;
          rec.interimResults = true;
          rec.lang = "en-US";
          rec.onresult = (evt: any) => {
            const transcript = Array.from(evt.results)
              .map((res: any) => res[0].transcript)
              .join("");
            if (transcript) {
              setInput(transcript);
              if (textareaRef.current) {
                textareaRef.current.style.height = "auto";
                textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
              }
            }
          };
          rec.onerror = () => {};
          rec.start();
          recognitionRef.current = rec;
        } catch {}
      }
      toast.info("Listening... Speak your study question.");
    } catch {
      toast.error("Microphone access unavailable or denied. Please check permissions.");
    }
  }

  async function stopAndSendVoiceNote() {
    if (!isRecording) return;
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
      recognitionRef.current = null;
    }

    const duration = recordingSeconds;
    setIsRecording(false);
    setRecordingSeconds(0);

    let targetThreadId = activeThreadId;
    if (!targetThreadId) {
      targetThreadId = await createNewChat();
      if (!targetThreadId) return;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.onstop = async () => {
        const mimeType = mediaRecorderRef.current?.mimeType || "audio/webm";
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        const audioUrl = URL.createObjectURL(audioBlob);

        mediaRecorderRef.current?.stream.getTracks().forEach((t) => t.stop());

        const initialStudentQuery = input.trim();
        setInput("");

        const voiceUserMsgId = crypto.randomUUID();
        const voiceUserMsg: ChatMessage = {
          id: voiceUserMsgId,
          role: "user",
          content: initialStudentQuery || "Transcribing audio with Groq Whisper...",
          audioUrl,
          timestamp: new Date().toISOString(),
        };

        setMessages((prev) => [...prev, voiceUserMsg]);
        setThinking(true);

        // Convert audio Blob to base64 for Groq Whisper (whisper-large-v3-turbo)
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          let transcribedQuery = initialStudentQuery;
          try {
            const base64Data = (reader.result as string)?.split(",")[1];
            if (base64Data) {
              const whisperResult = await transcribeVoiceAudioServerFn({
                data: {
                  audioBase64: base64Data,
                  mimeType,
                },
              });
              if (whisperResult?.transcript) {
                transcribedQuery = whisperResult.transcript;
              }
            }
          } catch (err: any) {
            console.warn("Groq Whisper transcription fallback:", err?.message);
          }

          const finalQuestion =
            transcribedQuery.trim() ||
            `[Voice Note (${duration}s)]: Student Audio Inquiry. Please explain the core academic topic thoroughly.`;

          // Update user message balloon with transcribed question text
          setMessages((prev) =>
            prev.map((m) => (m.id === voiceUserMsgId ? { ...m, content: finalQuestion } : m))
          );

          try {
            // Solve problem & format math using LLaMA 3.1 8B Instant (Groq)
            const result = await askBossAiServerFn({
              data: {
                userId: user!.id,
                threadId: targetThreadId,
                query: finalQuestion,
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
            await Promise.all([
              qc.invalidateQueries({ queryKey: ["chat-messages", targetThreadId] }),
              qc.invalidateQueries({ queryKey: ["chat-threads", user?.id] }),
            ]);
            refetchThreads();

            // Auto speak response aloud
            speakAiResponse(result.response, result.assistantMessageId);
          } catch {
            toast.error("Boss AI could not process your voice inquiry.");
          } finally {
            setThinking(false);
          }
        };
      };
      mediaRecorderRef.current.stop();
    } else {
      const studentQuery = input.trim();
      if (studentQuery) {
        setInput("");
        handleSend(studentQuery);
      }
    }
  }

  function toggleVoiceNoteInput() {
    if (isRecording) {
      stopAndSendVoiceNote();
    } else {
      startVoiceRecording();
    }
  }

  function cancelRecording() {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }
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

  // Speak AI response aloud (SpeechSynthesis with Math-to-Speech)
  function speakAiResponse(text: string, msgId: string) {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    if (speakingMessageId === msgId) {
      setSpeakingMessageId(null);
      return;
    }
    const cleanText = convertTextAndMathToSpeech(text);
    const utterance = new SpeechSynthesisUtterance(cleanText);
    const naturalVoice = getBestNaturalVoice(window.speechSynthesis.getVoices());
    if (naturalVoice) utterance.voice = naturalVoice;
    utterance.rate = 0.98;
    utterance.pitch = 1.0;
    utterance.onend = () => setSpeakingMessageId(null);
    utterance.onerror = () => setSpeakingMessageId(null);
    setSpeakingMessageId(msgId);
    window.speechSynthesis.speak(utterance);
  }

  // Create New Thread
  async function createNewChat() {
    if (!user) return null;
    try {
      setShowRecentPopover(false);
      setShowMenuDrawer(false);
      const newThread = await createStudyThreadServerFn({
        data: {
          userId: user.id,
          title: "New Conversation",
        },
      });
      // Optimistically add to TanStack Query cache so thread is immediately recognized
      qc.setQueryData(["chat-threads", user?.id], (old: any) => [newThread, ...(old || [])]);
      handleSelectThread(newThread.id);
      setMessages([]);
      setQuizQuestions(null);
      setFlashcards(null);
      await qc.invalidateQueries({ queryKey: ["chat-threads", user?.id] });
      refetchThreads();
      return newThread.id;
    } catch {
      toast.error("Failed to start new conversation");
      return null;
    }
  }

  // Delete Thread
  async function deleteChat(id: string) {
    if (!user) return;
    try {
      await deleteStudyThreadServerFn({ data: { threadId: id } });
      toast.success("Conversation deleted");
      await qc.invalidateQueries({ queryKey: ["chat-threads", user?.id] });
      qc.removeQueries({ queryKey: ["chat-messages", id] });
      const updatedThreads = await refetchThreads();
      if (activeThreadId === id) {
        const remaining = (updatedThreads.data || []).filter((t: any) => t.id !== id);
        if (remaining.length > 0) {
          handleSelectThread(remaining[0].id);
        } else {
          handleSelectThread(null);
          setMessages([]);
        }
      }
    } catch {
      toast.error("Failed to delete conversation");
    }
  }

  // Select Library Material
  function selectLibraryMaterial(mat: any) {
    setActiveDocContext({
      id: mat.id,
      title: mat.title,
      course: mat.course_code ? `${mat.course_code} - ${mat.course}` : mat.course,
      text: mat.description || `Campus study material for ${mat.course} at ${mat.institution}.`,
    });
    setIsLibraryModalOpen(false);

    const welcomeMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: `Active study material set to **${mat.title}** (${mat.course_code ? `${mat.course_code} · ` : ""}${mat.course} · ${mat.institution}).\n\nWhat would you like me to do with this material?\n- Generate an **MCQ Practice Quiz**\n- Take a **Theory Practice Test**\n- Create **3D Flashcards**\n- Request **Assignment Assistance**\n- Or ask me any question directly!`,
      timestamp: new Date().toISOString(),
      attachedMaterial: mat,
    };
    setMessages((prev) => [...prev, welcomeMsg]);
    toast.success(`Attached "${mat.title}" from library!`);
  }

  // Upload Document Directly in Chat
  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploadingDoc(true);
    toast.loading("Analyzing document with autonomous AI...", { id: "doc-proc" });

    try {
      const extractedSample = `Document: ${file.name}\nSize: ${(file.size / (1024 * 1024)).toFixed(2)} MB\nUploaded for semester revision.`;
      const cat = await categorizeDocumentAutonomously(file.name, extractedSample, profile);
      const uploadForm = new FormData();
      uploadForm.append("file", file);
      uploadForm.append("userId", user.id);
      uploadForm.append("title", cat.title);
      uploadForm.append("course", cat.course);
      uploadForm.append("courseCode", cat.course_code ?? "");
      uploadForm.append("institution", cat.institution);
      uploadForm.append("level", cat.level ?? "");
      uploadForm.append("materialType", cat.material_type);
      uploadForm.append("description", cat.description ?? "");
      const uploadResponse = await fetch("/api/upload", { method: "POST", body: uploadForm });
      const uploadResult = await uploadResponse.json() as { error?: string; material?: { id: string }; auditResult?: { status?: string } };
      if (!uploadResponse.ok || !uploadResult.material?.id) {
        throw new Error(uploadResult.error || "The document could not be uploaded.");
      }
      const createdMat = uploadResult.material;

      await qc.invalidateQueries({ queryKey: ["campus-library-materials"] });

      setActiveDocContext({
        id: createdMat.id,
        title: cat.title,
        course: cat.course,
        text: extractedSample,
      });

      toast.success(
        uploadResult.auditResult?.status === "verified"
          ? `Attached "${cat.title}". It passed the material check.`
          : `Attached "${cat.title}". It is waiting for review.`,
        { id: "doc-proc" }
      );

      const aiWelcomeMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: `Ingested **${cat.title}** (${cat.course} · ${cat.institution})!\n\nReady for exam practice! Pick an action or ask any question:`,
        timestamp: new Date().toISOString(),
        attachedMaterial: {
          id: createdMat.id,
          title: cat.title,
          course: cat.course,
          courseCode: cat.course_code,
          institution: cat.institution,
          department: cat.department,
          level: cat.level,
          status: "verified",
        },
      };

      setMessages((prev) => [...prev, aiWelcomeMsg]);
    } catch {
      toast.error("Failed to upload document", { id: "doc-proc" });
    } finally {
      setUploadingDoc(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
      if (menuFileInputRef.current) menuFileInputRef.current.value = "";
    }
  }

  const [isAssignmentMode, setIsAssignmentMode] = useState(false);

  // Prefill typing bar with customizable prompt template when clicking study action buttons
  function prepareStudyPrompt(mode: "mcq" | "theory" | "flashcards" | "summary" | "assignment") {
    setShowDropUpMenu(false);
    setShowMenuDrawer(false);
    const docTitle = activeDocContext?.title;

    let template = "";
    if (mode === "mcq") {
      template = docTitle
        ? `Generate 20 MCQ questions on "${docTitle}": `
        : "Generate 20 MCQ questions on: ";
    } else if (mode === "theory") {
      template = docTitle
        ? `Generate 10 theory exam questions on "${docTitle}": `
        : "Generate 10 theory exam questions on: ";
    } else if (mode === "flashcards") {
      template = docTitle
        ? `Generate 20 study flashcards on "${docTitle}": `
        : "Generate 20 study flashcards on: ";
    } else if (mode === "summary") {
      template = docTitle
        ? `Write a detailed, high-yield exam summary for "${docTitle}": `
        : "Write a detailed, high-yield exam summary on: ";
    } else if (mode === "assignment") {
      setIsAssignmentMode(true);
      template = "[Assignment Help] ";
    }

    setInput(template);
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(template.length, template.length);
        textareaRef.current.style.height = "auto";
        textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
      }
    }, 50);
  }

  // Study Intent Detector (Automatically route "give me 20 questions", "give me 30 flashcards", etc.)
  function detectStudyIntent(text: string) {
    const lower = text.toLowerCase();

    // Check if Assignment Mode or prefixed with [Assignment Help]
    if (isAssignmentMode || lower.startsWith("[assignment help]")) {
      return { type: "assignment" as const, prompt: text.replace(/^\[assignment help\]\s*/i, "").trim() };
    }

    // Match numbers: 50, 40, 30, 25, 20, 15, 10, 5, or any digits
    const numMatch = lower.match(/\b(50|40|30|25|20|15|10|5|\d{1,2})\b/);
    const count = numMatch ? Math.min(50, Math.max(1, parseInt(numMatch[1], 10))) : undefined;

    // Extract user-typed topic
    let topic: string | undefined = undefined;

    // 1. If there is a colon (e.g. "Generate 20 MCQ questions on: Photosynthesis" or "... on [topic]: Kinematics")
    const colonIdx = text.indexOf(":");
    if (colonIdx !== -1 && colonIdx < text.length - 1) {
      const candidate = text.slice(colonIdx + 1).trim();
      if (candidate.length > 1) {
        topic = candidate.replace(/^\[.*?\]\s*/, "").replace(/[\.\?!]+$/, "").trim();
      }
    }

    // 2. If there are quotes (e.g. on "Fluid Mechanics")
    if (!topic) {
      const quoteMatch = text.match(/["']([^"']{2,80})["']/);
      if (quoteMatch && quoteMatch[1]) {
        topic = quoteMatch[1].trim();
      }
    }

    // 3. Fallback topic match using "on", "about", "for", "regarding", "in"
    if (!topic) {
      const topicMatch = text.match(/(?:on|about|for|regarding|in)\s+([a-zA-Z0-9\s,._\-\(\)]{2,60})/i);
      if (topicMatch && topicMatch[1]) {
        const candidate = topicMatch[1].trim().replace(/\s+(please|now|thanks).*$/i, "").replace(/[\.\?!]+$/, "");
        if (candidate.length > 1) topic = candidate;
      }
    }

    // If candidate topic is a demonstrative or referential pronoun, discard it so we resolve to active discussion
    if (
      topic &&
      /^(this|that|it|these|those|the above|what we discussed|our discussion|the topic|topic|untitled|here)$/i.test(
        topic.trim()
      )
    ) {
      topic = undefined;
    }

    // Flashcards intent
    if (/\b(flashcards?|flash\s*cards?|study\s*cards?)\b/i.test(lower)) {
      return { type: "flashcards" as const, count: count || 20, topic };
    }

    // Theory intent
    if (/\b(theory|essay|written\s*exam|theory\s*test|theory\s*questions?)\b/i.test(lower)) {
      return { type: "theory" as const, count: count || 10, topic };
    }

    // Summary intent (e.g. "Write a detailed summary on: ...")
    if (/\b(summarize|summary|high-yield\s*notes|revision\s*notes)\b/i.test(lower)) {
      return { type: "summary" as const, topic };
    }

    // MCQ / Quiz / Practice Questions
    if (/\b(mcqs?|quiz|practice\s*questions?|exam\s*questions?|test\s*questions?|questions?)\b/i.test(lower)) {
      if (
        count !== undefined ||
        /\b(give|generate|make|create|prepare|test|quiz|drill|ask|practice)\b/i.test(lower) ||
        /\b(mcqs?|quiz)\b/i.test(lower)
      ) {
        return { type: "mcq" as const, count: count || 20, topic };
      }
    }

    return null;
  }

  // Execute standard AI query through Groq with formatting
  async function executeStandardAiQuery(queryText: string, targetThreadId: string) {
    setThinking(true);
    try {
      const result = await askBossAiServerFn({
        data: {
          userId: user!.id,
          threadId: targetThreadId,
          query: queryText,
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
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["chat-messages", targetThreadId] }),
        qc.invalidateQueries({ queryKey: ["chat-threads", user?.id] }),
      ]);
      refetchThreads();

      // Deliver device notification for completed AI answer
      sendDeviceNotification("Boss AI Response Ready", {
        body: result.response.slice(0, 110).replace(/[#*`\n]/g, " ").trim(),
      }).catch(() => {});
    } catch (err: any) {
      console.error("Boss AI query execution error:", err);
      toast.error("Boss AI was unable to generate a response. Please retry.");
    } finally {
      setThinking(false);
    }
  }

  // Send Message
  async function handleSend(manualPrompt?: string) {
    const textToSend = manualPrompt || input.trim();
    if (!textToSend || !user || thinking) return;

    let targetThreadId = activeThreadId;
    if (!targetThreadId) {
      targetThreadId = await createNewChat();
      if (!targetThreadId) return;
    }

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: textToSend,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!manualPrompt) setInput("");

    // Auto-detect if user requested practice questions, quiz, theory test, or flashcards
    const intent = detectStudyIntent(textToSend);
    if (intent) {
      if (intent.type === "flashcards") {
        return startFlashcards(intent.count, undefined, intent.topic, textToSend);
      }
      if (intent.type === "theory") {
        return startTheoryQuiz(intent.count, undefined, intent.topic, textToSend);
      }
      if (intent.type === "mcq") {
        return startMcqQuiz(intent.count, undefined, intent.topic, textToSend);
      }
      if (intent.type === "assignment") {
        setIsAssignmentMode(false);
        const assignmentQuery = `[Assignment Helper - ACADEMIC BREAKDOWN]\nProblem: ${intent.prompt || textToSend}\nPlease provide a comprehensive, step-by-step academic solution with full derivations, formulas, methodology, and citations.`;
        return executeStandardAiQuery(assignmentQuery, targetThreadId);
      }
      if (intent.type === "summary") {
        const summaryQuery = `[High-Yield Exam Summary]\nTopic / Context: ${intent.topic || textToSend}\nPlease synthesize the core definitions, high-yield formulas, key theorems, and common examination pitfalls into structured revision notes.`;
        return executeStandardAiQuery(summaryQuery, targetThreadId);
      }
    }

    return executeStandardAiQuery(textToSend, targetThreadId);
  }

  // MCQ Practice Quiz Generation (Up to 50 questions) - rendered inside AI chat reply container!
  async function startMcqQuiz(
    countOverride?: number,
    modeOverride?: "as_you_go" | "at_the_end",
    topicOverride?: string,
    userPrompt?: string
  ) {
    setIsMcqConfigOpen(false);
    setShowDropUpMenu(false);
    setShowModesMenu(false);
    setShowDocMenu(false);
    setThinking(true);

    const countToUse = countOverride || mcqCount;
    const modeToUse = modeOverride || mcqMode;
    toast.loading(`Preparing ${countToUse} practice questions...`, { id: "mcq-gen" });

    try {
      let targetThreadId = activeThreadId;
      if (!targetThreadId) {
        targetThreadId = await createNewChat();
        if (!targetThreadId) return;
      }

      const isDemonstrative =
        !topicOverride ||
        /^(this|that|it|these|those|the above|what we discussed|our discussion|the topic|topic|untitled|here)$/i.test(
          topicOverride.trim()
        );

      const activeThreadObj = threads.find((t: any) => t.id === targetThreadId);
      const specificThreadTitle =
        activeThreadObj?.title &&
        !/^(new (study )?conversation|untitled|chat|new chat)$/i.test(activeThreadObj.title.trim())
          ? activeThreadObj.title.trim()
          : undefined;

      const title = !isDemonstrative
        ? topicOverride!.trim()
        : activeDocContext?.title || specificThreadTitle || "University Examination Material";

      // Include recent conversation transcript in context so AI has the exact topic and formulas discussed
      const recentChatContext = messages
        .slice(-6)
        .map((m) => `${m.role === "assistant" ? "Boss AI" : "Student"}: ${m.content.slice(0, 800)}`)
        .join("\n\n");

      const sample = activeDocContext?.text
        ? `${activeDocContext.text.slice(0, 3000)}\n\nRecent Discussion:\n${recentChatContext.slice(0, 1500)}`
        : recentChatContext || `Curriculum topics and past exam questions on ${title}.`;

      const res = await generateStudyQuizServerFn({
        data: {
          userId: user!.id,
          threadId: targetThreadId,
          title,
          context: sample,
          mode: "objective",
          count: countToUse,
          markingMode: modeToUse,
          userPrompt,
        },
      });

      const newMsg: ChatMessage = {
        id: res.assistantMessageId,
        role: "assistant",
        content: res.content,
        quizData: res.quizData as any,
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, newMsg]);
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["chat-messages", targetThreadId] }),
        qc.invalidateQueries({ queryKey: ["chat-threads", user?.id] }),
      ]);
      refetchThreads();
      toast.success(`${res.quizData.questions.length} Practice Questions Ready!`, { id: "mcq-gen" });
    } catch (err: any) {
      console.error("MCQ generation error:", err);
      toast.error("Failed to generate quiz questions. Please retry.", { id: "mcq-gen" });
    } finally {
      setThinking(false);
    }
  }

  // Theory Test Generation (Up to 50 questions) - rendered inside AI chat reply container!
  async function startTheoryQuiz(
    countOverride?: number,
    modeOverride?: "as_you_go" | "at_the_end",
    topicOverride?: string,
    userPrompt?: string
  ) {
    setIsTheoryConfigOpen(false);
    setShowDropUpMenu(false);
    setShowModesMenu(false);
    setShowDocMenu(false);
    setThinking(true);

    const countToUse = countOverride || theoryCount;
    const modeToUse = modeOverride || theoryMode;
    toast.loading(`Preparing ${countToUse} theory questions with exam marking...`, { id: "theory-gen" });

    try {
      let targetThreadId = activeThreadId;
      if (!targetThreadId) {
        targetThreadId = await createNewChat();
        if (!targetThreadId) return;
      }

      const isDemonstrative =
        !topicOverride ||
        /^(this|that|it|these|those|the above|what we discussed|our discussion|the topic|topic|untitled|here)$/i.test(
          topicOverride.trim()
        );

      const activeThreadObj = threads.find((t: any) => t.id === targetThreadId);
      const specificThreadTitle =
        activeThreadObj?.title &&
        !/^(new (study )?conversation|untitled|chat|new chat)$/i.test(activeThreadObj.title.trim())
          ? activeThreadObj.title.trim()
          : undefined;

      const title = !isDemonstrative
        ? topicOverride!.trim()
        : activeDocContext?.title || specificThreadTitle || "University Examination Material";

      // Include recent conversation transcript in context so AI has the exact topic and formulas discussed
      const recentChatContext = messages
        .slice(-6)
        .map((m) => `${m.role === "assistant" ? "Boss AI" : "Student"}: ${m.content.slice(0, 800)}`)
        .join("\n\n");

      const sample = activeDocContext?.text
        ? `${activeDocContext.text.slice(0, 3000)}\n\nRecent Discussion:\n${recentChatContext.slice(0, 1500)}`
        : recentChatContext || `University semester exam preparation concepts on ${title}.`;

      const res = await generateStudyQuizServerFn({
        data: {
          userId: user!.id,
          threadId: targetThreadId,
          title,
          context: sample,
          mode: "theory",
          count: countToUse,
          markingMode: modeToUse,
          userPrompt,
        },
      });

      const newMsg: ChatMessage = {
        id: res.assistantMessageId,
        role: "assistant",
        content: res.content,
        quizData: res.quizData as any,
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, newMsg]);
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["chat-messages", targetThreadId] }),
        qc.invalidateQueries({ queryKey: ["chat-threads", user?.id] }),
      ]);
      refetchThreads();
      toast.success(`${res.quizData.questions.length} Theory Questions prepared!`, { id: "theory-gen" });
    } catch (err: any) {
      console.error("Theory generation error:", err);
      toast.error("Failed to generate theory questions. Please retry.", { id: "theory-gen" });
    } finally {
      setThinking(false);
    }
  }

  // 3D Flashcards Generation (Up to 50 cards) - rendered inside AI chat reply container!
  async function startFlashcards(
    countOverride?: number,
    typeOverride?: "qa" | "fill_blank",
    topicOverride?: string,
    userPrompt?: string
  ) {
    setIsFlashcardConfigOpen(false);
    setShowDropUpMenu(false);
    setShowModesMenu(false);
    setShowDocMenu(false);
    setThinking(true);

    const countToUse = countOverride || flashcardCount;
    const typeToUse = typeOverride || flashcardType;
    toast.loading(`Generating ${countToUse} 3D flashcards...`, { id: "fc-gen" });

    try {
      let targetThreadId = activeThreadId;
      if (!targetThreadId) {
        targetThreadId = await createNewChat();
        if (!targetThreadId) return;
      }

      const isDemonstrative =
        !topicOverride ||
        /^(this|that|it|these|those|the above|what we discussed|our discussion|the topic|topic|untitled|here)$/i.test(
          topicOverride.trim()
        );

      const activeThreadObj = threads.find((t: any) => t.id === targetThreadId);
      const specificThreadTitle =
        activeThreadObj?.title &&
        !/^(new (study )?conversation|untitled|chat|new chat)$/i.test(activeThreadObj.title.trim())
          ? activeThreadObj.title.trim()
          : undefined;

      const title = !isDemonstrative
        ? topicOverride!.trim()
        : activeDocContext?.title || specificThreadTitle || "University Examination Material";

      const recentChatContext = messages
        .slice(-6)
        .map((m) => `${m.role === "assistant" ? "Boss AI" : "Student"}: ${m.content.slice(0, 800)}`)
        .join("\n\n");

      const sample = activeDocContext?.text
        ? `${activeDocContext.text.slice(0, 3000)}\n\nRecent Discussion:\n${recentChatContext.slice(0, 1500)}`
        : recentChatContext || `Key definitions, core theorems, and mnemonics for ${title}.`;

      const res = await generateStudyFlashcardsServerFn({
        data: {
          userId: user!.id,
          threadId: targetThreadId,
          title,
          context: sample,
          type: typeToUse,
          count: countToUse,
          userPrompt,
        },
      });

      const newMsg: ChatMessage = {
        id: res.assistantMessageId,
        role: "assistant",
        content: res.content,
        flashcardsData: res.flashcardsData as any,
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, newMsg]);
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["chat-messages", targetThreadId] }),
        qc.invalidateQueries({ queryKey: ["chat-threads", user?.id] }),
      ]);
      refetchThreads();
      toast.success(`${res.flashcardsData.cards.length} Flashcards ready to study!`, { id: "fc-gen" });
    } catch (err: any) {
      console.error("Flashcards generation error:", err);
      toast.error("Could not generate flashcards. Please retry.", { id: "fc-gen" });
    } finally {
      setThinking(false);
    }
  }

  // Assignment Helper
  function handleAssignmentSubmit() {
    if (!assignmentInput.trim()) return;
    setIsAssignmentModalOpen(false);
    setShowDropUpMenu(false);
    const prompt = `[Assignment Helper - ${assignmentMode.toUpperCase()}]\n${assignmentInput.trim()}\nPlease provide a ${
      assignmentMode === "detailed"
        ? "comprehensive, well-structured academic breakdown with citations and step-by-step working"
        : "concise, direct summary and key bullet points to solve this assignment"
    }.`;
    handleSend(prompt);
    setAssignmentInput("");
  }

  function triggerSummarize() {
    setShowDropUpMenu(false);
    handleSend("Please summarize the active course material into high-yield exam revision bullet points, formulas, and definitions.");
  }

  return (
    <div className="boss-workspace flex min-h-0 h-full max-h-full flex-1 w-full overflow-hidden rounded-none sm:rounded-3xl border-y sm:border border-border/80 bg-card font-sans relative">
      {/* Hidden File Inputs */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        className="hidden"
        accept=".pdf,.doc,.docx,.txt,image/*"
      />
      <input
        type="file"
        ref={menuFileInputRef}
        onChange={handleFileUpload}
        className="hidden"
        accept=".pdf,.doc,.docx,.txt,image/*"
      />

      {/* ========================================================================= */}
      {/* DESKTOP SIDEBAR: Conversations, Attached Document, & Study Tools */}
      {/* ========================================================================= */}
      <aside className="hidden md:flex w-72 lg:w-80 flex-col border-r border-border bg-surface-container-low shrink-0 transition-all min-h-0 h-full max-h-full overflow-hidden">
        {/* New Chat Button */}
        <div className="p-3 border-b border-border">
          <Button
            onClick={createNewChat}
            className="w-full justify-start gap-2 rounded-full bg-forest text-white hover:bg-forest/90 font-semibold text-xs h-9 shadow-xs press"
          >
            <MessageSquarePlus className="size-4 text-[#8fd9b6]" /> Start New Conversation
          </Button>
        </div>

        {/* Active Study Document Section */}
        <div className="p-3 border-b border-border space-y-2 bg-card/60">
          <div className="flex items-center justify-between">
            <span className="eyebrow">
              Study Document
            </span>
            {activeDocContext && (
              <button
                type="button"
                onClick={() => setActiveDocContext(null)}
                className="text-[10px] font-semibold text-destructive hover:underline"
              >
                Detach
              </button>
            )}
          </div>

          {activeDocContext ? (
            <div className="rounded-xl border border-brand/30 bg-accent/40 p-2.5 text-xs space-y-0.5">
              <p className="font-semibold text-forest truncate">{activeDocContext.title}</p>
              <p className="text-[10px] text-muted-foreground truncate">{activeDocContext.course}</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsLibraryModalOpen(true)}
                className="rounded-full text-[11px] font-semibold h-8 border-border bg-card hover:bg-surface-container text-ink press"
              >
                <BookOpen className="size-3.5 mr-1 text-forest" /> Library
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="rounded-full text-[11px] font-semibold h-8 border-border bg-card hover:bg-surface-container text-ink press"
              >
                <Upload className="size-3.5 mr-1 text-forest" /> Upload
              </Button>
            </div>
          )}
        </div>

        {/* Recent Chats list */}
        <div className="p-3 flex-1 min-h-0 flex flex-col space-y-2 overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="eyebrow">
              Recent Conversations ({threads.length})
            </span>
          </div>

          {threads.length > 4 && (
            <div className="relative">
              <input
                type="text"
                value={threadSearch}
                onChange={(e) => setThreadSearch(e.target.value)}
                placeholder="Search chats..."
                className="w-full h-8 rounded-xl border border-border bg-card px-2.5 pl-7 text-xs text-ink placeholder:text-muted-foreground focus:outline-hidden focus:border-forest"
              />
              <Search className="size-3 text-muted-foreground absolute left-2 top-2.5" />
            </div>
          )}

          <div className="flex-1 min-h-0 overflow-y-auto space-y-1 pr-1 [scrollbar-width:thin]">
            {filteredThreads.length === 0 ? (
              <p className="py-4 text-xs text-muted-foreground text-center">
                {threadSearch ? "No matching conversations." : "No chats yet."}
              </p>
            ) : (
              filteredThreads.map((t: any) => (
                <div
                  key={t.id}
                  className={cn(
                    "group flex items-center justify-between gap-2 rounded-xl px-3 py-2 text-xs transition-all cursor-pointer border press",
                    activeThreadId === t.id
                      ? "bg-forest/10 border-forest/30 font-semibold text-forest shadow-xs"
                      : "border-transparent text-muted-foreground hover:bg-card hover:text-ink"
                  )}
                  onClick={() => {
                    if (activeThreadId !== t.id) {
                      handleSelectThread(t.id);
                      setQuizQuestions(null);
                      setFlashcards(null);
                    }
                  }}
                >
                  <div className="min-w-0 flex-1 truncate text-left">
                    <p className="truncate text-xs leading-tight">{t.title}</p>
                  </div>
                  <button
                    type="button"
                    aria-label="Delete chat"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteChat(t.id);
                    }}
                    className="p-1 opacity-0 group-hover:opacity-100 hover:text-destructive text-muted-foreground transition-opacity"
                  >
                    <Trash2 className="size-3" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </aside>

      {/* ========================================================================= */}
      {/* MAIN CHAT & INTERACTIVE WORKSPACE */}
      {/* ========================================================================= */}
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden relative">
        {/* Mobile Header (Top-Right Recent Menu + New Chat) */}
        <div className="md:hidden flex items-center justify-between px-3.5 py-2 border-b border-border/50 bg-card/85 backdrop-blur-md shrink-0 z-20">
          <div className="flex items-center gap-2 min-w-0">
            <Link
              to="/dashboard"
              className="size-7 rounded-lg border border-border/70 hover:bg-secondary text-foreground grid place-items-center shrink-0 active:scale-95 transition-all"
              title="Back to Dashboard"
            >
              <ArrowLeft className="size-3.5" />
            </Link>
            <div className="size-7 rounded-lg bg-primary/10 text-primary grid place-items-center shrink-0">
              <Bot className="size-3.5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-xs font-bold text-foreground truncate">
                {threads.find((t: any) => t.id === activeThreadId)?.title || "Boss AI"}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setShowMenuDrawer(true)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-secondary text-foreground text-xs font-semibold border border-border/60 hover:bg-secondary/80 active:scale-95 transition-all"
            >
              <History className="size-3.5 text-primary" />
              <span>Recent</span>
              {threads.length > 0 && (
                <span className="size-4 rounded-full bg-primary/20 text-primary text-[10px] grid place-items-center font-bold">
                  {threads.length}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => createNewChat()}
              className="size-8 rounded-full grid place-items-center bg-forest text-white shadow-xs press"
              title="New Chat"
            >
              <Plus className="size-4" />
            </button>
          </div>
        </div>

        {/* Desktop Chat Header */}
        <div className="hidden md:flex items-center justify-between px-5 py-3 border-b border-border bg-card shrink-0 relative z-20">
          <div className="flex items-center gap-3 min-w-0">
            <div className="size-9 rounded-xl bg-forest/10 text-forest grid place-items-center shrink-0 border border-forest/20">
              <Bot className="size-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="font-display text-sm font-medium text-ink truncate tracking-tight">
                  {threads.find((t: any) => t.id === activeThreadId)?.title || "Boss AI Study Copilot"}
                </h2>
                {activeDocContext && (
                  <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-accent/40 border border-brand/30 text-forest text-[11px] font-semibold shrink-0">
                    <BookOpen className="size-3" />
                    <span className="max-w-[160px] truncate">{activeDocContext.title}</span>
                    <button
                      type="button"
                      onClick={() => setActiveDocContext(null)}
                      className="text-muted-foreground hover:text-destructive ml-0.5"
                    >
                      <X className="size-3" />
                    </button>
                  </div>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground">
                Your study partner · Explain, practise, revise
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {activeThreadId && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => deleteChat(activeThreadId)}
                className="h-8 px-2.5 text-xs text-muted-foreground hover:text-destructive gap-1.5 press rounded-full"
                title="Delete this conversation"
              >
                <Trash2 className="size-3.5" />
                <span>Delete Chat</span>
              </Button>
            )}
          </div>
        </div>



        {/* Messages Stream */}
        <div
          ref={messagesScrollRef}
          onScroll={handleScroll}
          className="boss-transcript flex-1 min-h-0 overflow-y-auto overscroll-contain pb-3 px-3 sm:p-4 space-y-6 [scrollbar-width:thin] [scrollbar-color:theme(colors.border)_transparent]"
        >
          {isLoadingMessages && messages.length === 0 ? (
            <div className="grid h-full place-items-center p-4 text-center">
              <div className="flex flex-col items-center gap-2.5 text-muted-foreground">
                <Loader2 className="size-6 animate-spin text-primary" />
                <p className="text-xs font-medium">Loading conversation...</p>
              </div>
            </div>
          ) : messages.length === 0 ? (
            <div className="grid h-full place-items-center p-4 text-center">
              <div className="max-w-md space-y-3">
                <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-forest/10 text-forest border border-forest/20 shadow-xs">
                  <SyllabossEmblem className="size-9" />
                </div>
                <h3 className="font-display text-xl sm:text-2xl font-medium tracking-tight text-ink">
                  What are we studying today?
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Bring a question, a difficult concept, or your course notes. We’ll work through it together, one clear step at a time.
                </p>

                <div className="grid gap-2 pt-3 sm:grid-cols-2 text-left">
                  <button
                    type="button"
                    onClick={() => handleSend("Explain the core exam concepts in my course step-by-step")}
                    className="rounded-2xl border border-border bg-card p-3 text-xs font-medium text-ink hover:bg-surface-container-low transition-all lift press"
                  >
                    Explain core concepts step-by-step
                  </button>
                  <button
                    type="button"
                    onClick={() => prepareStudyPrompt("mcq")}
                    className="rounded-2xl border border-border bg-card p-3 text-xs font-medium text-ink hover:bg-surface-container-low transition-all flex items-center justify-between lift press"
                  >
                    <span>20 Practice MCQ Questions</span>
                    <CheckCircle2 className="size-3.5 text-forest" />
                  </button>
                  <button
                    type="button"
                    onClick={() => prepareStudyPrompt("flashcards")}
                    className="rounded-2xl border border-border bg-card p-3 text-xs font-medium text-ink hover:bg-surface-container-low transition-all flex items-center justify-between lift press"
                  >
                    <span>20 Study Flashcards</span>
                    <Layers className="size-3.5 text-brand" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsLibraryModalOpen(true)}
                    className="rounded-2xl border border-dashed border-forest/40 bg-accent/30 p-3 text-xs font-semibold text-forest hover:bg-accent/60 transition-all flex items-center justify-between lift press"
                  >
                    <span>Choose from Campus Library</span>
                    <BookOpen className="size-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            messages.map((m) => {
              const isAssistant = m.role === "assistant";
              return (
                <div
                  key={m.id}
                  className={cn(
                    "boss-message flex flex-col space-y-2",
                    m.role === "user" ? "items-end" : "items-start"
                  )}
                >
                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground px-1">
                    <span className="font-semibold text-ink-soft">{m.role === "user" ? "You" : "Boss AI"}</span>
                    {isAssistant && (
                      <button type="button" aria-label="Copy response" title="Copy response" className="boss-message-action" onClick={() => navigator.clipboard.writeText(m.content).then(() => toast.success("Response copied")).catch(() => toast.error("Could not copy. You can select the response text instead."))}><Copy className="size-3.5" /></button>
                    )}
                    {isAssistant && (
                      <button
                        type="button"
                        onClick={() => speakAiResponse(m.content, m.id)}
                        title={speakingMessageId === m.id ? "Stop voice note" : "Play voice note response"}
                        className="ml-1 text-forest hover:text-forest/80 transition-colors"
                      >
                        {speakingMessageId === m.id ? (
                          <VolumeX className="size-3 text-destructive animate-pulse" />
                        ) : (
                          <Volume2 className="size-3" />
                        )}
                      </button>
                    )}
                  </div>

                  <div
                    data-role={m.role}
                    className={cn(
                      "boss-message-content rounded-2xl px-4 py-3 text-[15px] leading-relaxed",
                      m.role === "user"
                        ? "max-w-[88%] bg-forest text-white font-medium rounded-br-xs"
                        : "w-full max-w-[96%] md:max-w-[92%] bg-card text-ink border border-border rounded-bl-xs"
                    )}
                  >
                    {/* Attached material badge */}
                    {m.attachedMaterial && (
                      <div className="mb-2.5 rounded-xl bg-surface-container-low border border-border p-2.5 text-ink">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-xs flex items-center gap-1.5 text-forest">
                            <CheckCircle2 className="size-3.5 text-brand" />
                            Registered to Library
                          </span>
                          <span className="rounded-full bg-accent text-forest px-2 py-0.5 text-[10px] font-bold font-mono">
                            +25 SyllaPoints
                          </span>
                        </div>
                        <p className="mt-1 font-bold text-xs">{m.attachedMaterial.title}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {m.attachedMaterial.course} · {m.attachedMaterial.institution}
                        </p>
                      </div>
                    )}

                    {m.audioUrl && (
                      <div className="mb-2.5 p-2 rounded-xl bg-surface-container border border-border flex items-center gap-2">
                        <Volume2 className="size-4 text-brand" />
                        <audio src={m.audioUrl} controls className="h-7 w-48" />
                      </div>
                    )}

                    {isAssistant ? (
                      <div className="space-y-2">
                        {m.content && <AiMessageRenderer content={m.content} className="boss-response" />}
                        {m.flashcardsData && (
                          <InChatFlashcardsWidget
                            data={m.flashcardsData}
                            onSelectCount={(c) => startFlashcards(c, undefined, m.flashcardsData?.topic)}
                          />
                        )}
                        {m.quizData && m.quizData.mode === "objective" && (
                          <InChatMcqQuizWidget
                            data={m.quizData as any}
                            onSelectCount={(c) => startMcqQuiz(c, undefined, m.quizData?.topic)}
                          />
                        )}
                        {m.quizData && m.quizData.mode === "theory" && (
                          <InChatTheoryWidget
                            data={m.quizData as any}
                            onSelectCount={(c) => startTheoryQuiz(c, undefined, m.quizData?.topic)}
                          />
                        )}
                      </div>
                    ) : (
                      <div className="whitespace-pre-wrap">{m.content}</div>
                    )}
                  </div>
                </div>
              );
            })
          )}

          {thinking && (
            <div role="status" className="boss-thinking flex items-center gap-3 text-sm text-muted-foreground p-2">
              <SyllabossEmblem className="size-7" />
              <span>Working through your question<span className="boss-thinking-dots" aria-hidden="true">…</span></span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Floating Scroll to Bottom Arrow Button */}
        {showScrollBottom && (
          <button
            type="button"
            onClick={() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })}
            title="Scroll to bottom"
            className="absolute right-4 bottom-24 z-30 size-10 rounded-full bg-primary text-primary-foreground shadow-lg grid place-items-center active:scale-95 transition-transform"
          >
            <ChevronDown className="size-5" />
          </button>
        )}

        {/* Live Voice Recording Status */}
        {isRecording && (
          <div className="mx-3 my-1.5 p-2 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 flex items-center justify-between animate-pulse shrink-0">
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-red-600 animate-ping" />
              <span className="text-xs font-bold text-red-700 dark:text-red-400">
                Listening / Recording Voice Note ({recordingSeconds}s)...
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={cancelRecording}
                className="text-xs text-muted-foreground hover:text-foreground p-1"
              >
                Cancel
              </button>
              <Button
                size="sm"
                type="button"
                onClick={stopAndSendVoiceNote}
                className="h-6 px-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg"
              >
                Send
              </Button>
            </div>
          </div>
        )}

        {/* Attached Document Context Banner */}
        {activeDocContext && (
          <div className="mx-3 my-1 px-3 py-1.5 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <BookOpen className="size-3.5 text-primary shrink-0" />
              <span className="text-xs font-semibold text-primary truncate">{activeDocContext.title}</span>
            </div>
            <button
              type="button"
              onClick={() => setActiveDocContext(null)}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODERN GEMINI / CHATGPT AUTOGROWING TYPING BAR */}
        {/* ========================================================================= */}
        <div
          className="shrink-0 border-t border-border/60 bg-card p-2 sm:p-3 relative z-30 mb-0"
        >
          {/* Mention Autocomplete Suggestion Pill */}
          <AnimatePresence>
            {showAssistantMention && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 5 }}
                className="mb-1.5"
              >
                <button
                  type="button"
                  onClick={() => {
                    setInput((prev) => prev.replace(/@\w*$/, "@BossAI "));
                    textareaRef.current?.focus();
                  }}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-primary/15 hover:bg-primary/25 border border-primary/40 text-primary text-xs font-semibold shadow-xs transition-all cursor-pointer active:scale-95"
                >
                  <Bot className="size-4" />
                  <span>@BossAI</span>
                  <span className="text-[10px] text-muted-foreground font-normal">
                    Summon Boss AI study assistant
                  </span>
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Popups for + (Documents) and Boss AI (Modes) */}
          <AnimatePresence>
            {/* Pop-up 1: + Documents Menu (Library & Device Upload) */}
            {showDocMenu && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.95 }}
                className="absolute bottom-full left-3 mb-2 w-56 rounded-2xl border border-border/80 bg-card p-2 shadow-2xl z-50 space-y-1 font-sans"
              >
                <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Study Documents
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowDocMenu(false);
                    setIsLibraryModalOpen(true);
                  }}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left text-xs font-semibold text-foreground hover:bg-primary/10 hover:text-primary transition-all"
                >
                  <BookOpen className="size-4 text-primary shrink-0" />
                  <div>
                    <p className="leading-tight">Choose from Library</p>
                    <p className="text-[10px] text-muted-foreground font-normal">Campus notes &amp; textbooks</p>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowDocMenu(false);
                    fileInputRef.current?.click();
                  }}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left text-xs font-semibold text-foreground hover:bg-primary/10 hover:text-primary transition-all"
                >
                  <Upload className="size-4 text-primary shrink-0" />
                  <div>
                    <p className="leading-tight">Upload from Device</p>
                    <p className="text-[10px] text-muted-foreground font-normal">PDF, DOCX, or images</p>
                  </div>
                </button>
              </motion.div>
            )}

            {/* Pop-up 2: Boss AI Study Modes Menu (Per Prototypes) */}
            {showModesMenu && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.95 }}
                className="absolute bottom-full left-10 sm:left-14 mb-2 w-72 rounded-2xl border border-border/80 bg-card p-2 shadow-2xl z-50 space-y-1 font-sans"
              >
                <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Boss AI Study Modes
                </div>

                {/* MCQ */}
                <button
                  type="button"
                  onClick={() => {
                    setShowModesMenu(false);
                    setIsMcqConfigOpen(true);
                  }}
                  className="w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-left text-xs font-semibold text-foreground hover:bg-primary/10 hover:text-primary transition-all"
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="size-4 text-primary shrink-0" />
                    <span>MCQ Practice Quiz</span>
                  </div>
                  <ChevronRight className="size-3.5 text-muted-foreground" />
                </button>

                {/* Theory with direct Grade as you go & Grade at the end options */}
                <div className="p-2 rounded-xl bg-secondary/30 border border-border/50 space-y-1.5">
                  <div
                    onClick={() => {
                      setShowModesMenu(false);
                      setIsTheoryConfigOpen(true);
                    }}
                    className="flex items-center justify-between cursor-pointer text-xs font-semibold text-foreground hover:text-brand transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <FileText className="size-4 text-brand shrink-0" />
                      <span>Theory Test</span>
                    </div>
                    <ChevronRight className="size-3.5 text-muted-foreground" />
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setShowModesMenu(false);
                        setTheoryMode("as_you_go");
                        startTheoryQuiz(theoryCount || 5, "as_you_go");
                      }}
                      className="px-2 py-1 rounded-lg text-[10px] font-bold border border-brand/30 bg-brand/10 text-brand dark:text-brand hover:bg-brand/20 active:scale-95 transition-all text-center"
                    >
                      Grade as you go
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowModesMenu(false);
                        setTheoryMode("at_the_end");
                        startTheoryQuiz(theoryCount || 5, "at_the_end");
                      }}
                      className="px-2 py-1 rounded-lg text-[10px] font-bold border border-brand/30 bg-brand/10 text-brand dark:text-brand hover:bg-brand/20 active:scale-95 transition-all text-center"
                    >
                      Grade at the end
                    </button>
                  </div>
                </div>

                {/* 3D Flashcards */}
                <button
                  type="button"
                  onClick={() => {
                    setShowModesMenu(false);
                    setIsFlashcardConfigOpen(true);
                  }}
                  className="w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-left text-xs font-semibold text-foreground hover:bg-brand/10 hover:text-brand transition-all"
                >
                  <div className="flex items-center gap-2">
                    <Layers className="size-4 text-brand shrink-0" />
                    <span>3D Flashcards</span>
                  </div>
                  <ChevronRight className="size-3.5 text-muted-foreground" />
                </button>

                {/* Assignment Helper */}
                <button
                  type="button"
                  onClick={() => {
                    setShowModesMenu(false);
                    setIsAssignmentModalOpen(true);
                  }}
                  className="w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-left text-xs font-semibold text-foreground hover:bg-brass/10 hover:text-brass-ink transition-all"
                >
                  <div className="flex items-center gap-2">
                    <GraduationCap className="size-4 text-brass shrink-0" />
                    <span>Assignment Helper</span>
                  </div>
                  <ChevronRight className="size-3.5 text-muted-foreground" />
                </button>

                {/* Summarize Material */}
                <button
                  type="button"
                  onClick={() => {
                    setShowModesMenu(false);
                    triggerSummarize();
                  }}
                  className="w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-left text-xs font-semibold text-foreground hover:bg-rose-500/10 hover:text-rose-600 transition-all"
                >
                  <Sparkles className="size-4 text-rose-500 shrink-0" />
                  <span>Summarize Material</span>
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Assignment Mode indicator banner */}
          {isAssignmentMode && (
            <div className="flex items-center justify-between px-3 py-1.5 mb-2 rounded-xl bg-brass/10 border border-brass/30 text-brass-ink dark:text-brass text-xs font-semibold animate-in fade-in slide-in-from-bottom-1">
              <div className="flex items-center gap-2">
                <GraduationCap className="size-3.5" />
                <span>Assignment Mode: Academic breakdown with derivations &amp; steps</span>
              </div>
              <button
                type="button"
                onClick={() => setIsAssignmentMode(false)}
                className="text-muted-foreground hover:text-foreground text-[11px] underline"
              >
                Cancel
              </button>
            </div>
          )}

          {/* Autogrowing Typing Capsule */}
          <div className="boss-composer rounded-2xl sm:rounded-3xl border border-border bg-card p-3 shadow-xs focus-within:border-forest/50">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                e.target.style.height = "auto";
                e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`;
              }}
              onKeyDown={(e) => {
                if (!isMobile && e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              inputMode="text"
              aria-label="Message Boss AI"
              placeholder={
                isAssignmentMode
                  ? "Type your assignment problem or question here for a step-by-step academic solution..."
                  : activeDocContext
                  ? `Ask Boss AI about ${activeDocContext.title}...`
                  : "Ask a question, or add your course notes…"
              }
              rows={1}
              className="w-full resize-none bg-transparent text-base text-ink placeholder:text-muted-foreground focus:outline-hidden min-h-[44px] max-h-[160px] overflow-y-auto px-1 py-2 leading-relaxed"
            />

            {/* Embedded Action Bar per Prototype Sketch */}
            <div className="flex items-center justify-between pt-1 border-t border-border/50 mt-1">
              <div className="flex items-center gap-1.5">
                {/* 1. + Button: Documents Menu Popup */}
                <button
                  type="button"
                  onClick={() => {
                    setShowDocMenu((prev) => !prev);
                    setShowModesMenu(false);
                  }}
                  title="Attach or upload document"
                  className={cn(
                    "size-8 rounded-full grid place-items-center transition-all press",
                    showDocMenu
                      ? "bg-forest text-white rotate-45 shadow-xs"
                      : "text-muted-foreground hover:text-ink hover:bg-surface-container"
                  )}
                >
                  <Plus className="size-4" />
                </button>

                {/* 2. Boss AI ^ Button: Study Modes Popup */}
                <button
                  type="button"
                  onClick={() => {
                    setShowModesMenu((prev) => !prev);
                    setShowDocMenu(false);
                  }}
                  title="Boss AI Study Modes"
                  className={cn(
                    "h-8 px-3 rounded-full flex items-center gap-1.5 text-xs font-semibold transition-all border press",
                    showModesMenu
                      ? "bg-forest text-white border-forest shadow-xs"
                      : "text-ink bg-card hover:bg-surface-container border-border"
                  )}
                >
                  <Bot className="size-3.5 text-forest shrink-0" />
                  <span>Boss AI</span>
                  <ChevronUp
                    className={cn(
                      "size-3.5 transition-transform",
                      showModesMenu && "rotate-180"
                    )}
                  />
                </button>
              </div>

              <div className="flex items-center gap-1">
                {/* Voice Note Button */}
                <button
                  type="button"
                  onClick={toggleVoiceNoteInput}
                  title={isRecording ? "Stop voice note" : "Record voice note"}
                  className={cn(
                    "size-8 rounded-full grid place-items-center transition-all press",
                    isRecording
                      ? "bg-destructive text-white animate-pulse"
                      : "text-muted-foreground hover:text-ink hover:bg-surface-container"
                  )}
                >
                  <Mic className="size-4" />
                </button>

                {/* Send Button */}
                <button
                  type="button"
                  disabled={thinking || !input.trim()}
                  onClick={() => handleSend()}
                  title="Send prompt"
                  className={cn(
                    "size-8 rounded-full grid place-items-center transition-all",
                    input.trim() && !thinking
                      ? "bg-forest text-white hover:bg-forest/90 shadow-xs press"
                      : "text-muted-foreground opacity-30 cursor-not-allowed"
                  )}
                >
                  <Send className="size-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* CUSTOM KEYBOARD: Rendered in-flow below typing bar on mobile */}
        {/* ========================================================================= */}
        <AnimatePresence>
          {showCustomKeyboard && isMobile && (
            <MobileCustomKeyboard
              value={input}
              onChange={(val) => {
                setInput(val);
                if (textareaRef.current) {
                  textareaRef.current.style.height = "auto";
                  textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
                }
              }}
              onSend={() => handleSend()}
              isOpen={showCustomKeyboard}
              onClose={() => setShowCustomKeyboard(false)}
              inputRef={textareaRef}
              disabled={thinking}
              activeDocTitle={activeDocContext?.title}
            />
          )}
        </AnimatePresence>
      </div>

      {/* ========================================================================= */}
      {/* MOBILE TOP RIGHT MENU DRAWER (Previous Chats + New Chat) */}
      {/* ========================================================================= */}
      <Dialog open={showMenuDrawer} onOpenChange={setShowMenuDrawer}>
        <DialogContent className="max-w-md rounded-3xl p-5 border-border/80 bg-card text-card-foreground shadow-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <History className="size-4 text-primary" />
              Previous Conversations
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 mt-2">
            <Button
              onClick={() => {
                createNewChat();
                setShowMenuDrawer(false);
              }}
              className="w-full justify-start gap-2 rounded-xl font-bold shadow-xs text-xs h-9"
            >
              <MessageSquarePlus className="size-4" /> Start New Conversation
            </Button>

            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowMenuDrawer(false);
                  setIsLibraryModalOpen(true);
                }}
                className="rounded-xl text-xs font-semibold h-8 border-border"
              >
                <BookOpen className="size-3.5 mr-1" /> Campus Library
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowMenuDrawer(false);
                  menuFileInputRef.current?.click();
                }}
                className="rounded-xl text-xs font-semibold h-8 border-border"
              >
                <Upload className="size-3.5 mr-1" /> Upload File
              </Button>
            </div>

            {/* Threads List with AI-generated names */}
            <div className="space-y-1">
              <p className="px-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Recent Chats
              </p>
              <div className="max-h-60 overflow-y-auto space-y-1 pr-1">
                {threads.length === 0 ? (
                  <p className="px-2 py-4 text-xs text-muted-foreground text-center">
                    No previous conversations yet.
                  </p>
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
                        type="button"
                        className="min-w-0 flex-1 truncate text-left"
                        onClick={() => {
                          handleSelectThread(t.id);
                          setQuizQuestions(null);
                          setFlashcards(null);
                          setShowMenuDrawer(false);
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

      {/* ========================================================================= */}
      {/* MODAL: CHOOSE FROM CAMPUS LIBRARY */}
      {/* ========================================================================= */}
      <Dialog open={isLibraryModalOpen} onOpenChange={setIsLibraryModalOpen}>
        <DialogContent className="max-w-md rounded-3xl p-5 border-border bg-card max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <BookOpen className="size-4.5 text-primary" />
              Choose from Campus Library
            </DialogTitle>
          </DialogHeader>

          <div className="relative mt-2">
            <input
              type="text"
              value={librarySearch}
              onChange={(e) => setLibrarySearch(e.target.value)}
              placeholder="Search course code, title, or textbook..."
              className="w-full h-9 rounded-xl border border-border/80 bg-secondary/40 px-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:border-primary"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto py-1 text-[11px]">
            {["all", "lecture_note", "past_question", "textbook"].map((ft) => (
              <button
                key={ft}
                type="button"
                onClick={() => setLibraryFilter(ft)}
                className={cn(
                  "px-2.5 py-1 rounded-lg font-semibold shrink-0 transition-all",
                  libraryFilter === ft
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "bg-secondary/60 text-muted-foreground hover:text-foreground"
                )}
              >
                {ft === "all" ? "All Materials" : ft.replace("_", " ")}
              </button>
            ))}
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pr-1 mt-2">
            {isLoadingLibrary ? (
              <div className="py-8 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
                <Loader2 className="size-4 animate-spin text-primary" /> Loading campus materials...
              </div>
            ) : filteredLibraryMaterials.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground space-y-2">
                <p>No materials found matching your search.</p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setIsLibraryModalOpen(false);
                    fileInputRef.current?.click();
                  }}
                  className="rounded-xl text-xs"
                >
                  <Upload className="size-3.5 mr-1" /> Upload New File
                </Button>
              </div>
            ) : (
              filteredLibraryMaterials.map((mat: any) => (
                <div
                  key={mat.id}
                  onClick={() => selectLibraryMaterial(mat)}
                  className="p-3 rounded-2xl border border-border/70 bg-card hover:border-primary/50 hover:bg-primary/5 cursor-pointer transition-all flex items-center justify-between gap-2.5 group"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-xs text-foreground group-hover:text-primary truncate">
                      {mat.title}
                    </p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {mat.course_code ? `${mat.course_code} · ` : ""}{mat.course} · {mat.institution}
                    </p>
                    <span className="inline-block mt-1 text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded-md bg-secondary text-muted-foreground">
                      {mat.material_type?.replace("_", " ") || "Note"}
                    </span>
                  </div>
                  <Button
                    size="sm"
                    className="h-7 px-2.5 rounded-xl text-xs font-semibold shrink-0 group-hover:bg-primary"
                  >
                    Attach
                  </Button>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL: MCQ CONFIGURATION (Sketch 2: Mark as you go vs end; Up to 50) */}
      {/* ========================================================================= */}
      <Dialog open={isMcqConfigOpen} onOpenChange={setIsMcqConfigOpen}>
        <DialogContent className="max-w-sm rounded-3xl p-5 border-border bg-card">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <CheckCircle2 className="size-4 text-primary" /> MCQ Practice Quiz
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 mt-2 text-xs">
            <div>
              <label className="font-semibold text-muted-foreground block mb-1">
                Marking Mode:
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setMcqMode("as_you_go")}
                  className={cn(
                    "p-2 rounded-xl border text-center font-bold transition-all",
                    mcqMode === "as_you_go"
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-foreground hover:bg-secondary"
                  )}
                >
                  Mark as you go
                </button>
                <button
                  type="button"
                  onClick={() => setMcqMode("at_the_end")}
                  className={cn(
                    "p-2 rounded-xl border text-center font-bold transition-all",
                    mcqMode === "at_the_end"
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-foreground hover:bg-secondary"
                  )}
                >
                  Mark at the end
                </button>
              </div>
            </div>

            <div>
              <label className="font-semibold text-muted-foreground block mb-1">
                Number of Questions:
              </label>
              <div className="flex items-center gap-1.5 flex-wrap">
                {[5, 10, 15, 20, 25, 30, 40, 50].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setMcqCount(num)}
                    className={cn(
                      "size-8 rounded-lg font-bold border text-xs transition-all",
                      mcqCount === num
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border text-foreground hover:bg-secondary"
                    )}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>

            <Button
              type="button"
              onClick={() => startMcqQuiz()}
              className="w-full mt-2 rounded-xl font-bold h-9 text-xs"
            >
              Start MCQ Quiz
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL: THEORY CONFIGURATION (Sketch 2 & 4: Mark as you go vs end; Up to 50) */}
      {/* ========================================================================= */}
      <Dialog open={isTheoryConfigOpen} onOpenChange={setIsTheoryConfigOpen}>
        <DialogContent className="max-w-sm rounded-3xl p-5 border-border bg-card">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <FileText className="size-4 text-brand" /> Theory Practice Test
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 mt-2 text-xs">
            <div>
              <label className="font-semibold text-muted-foreground block mb-1">
                Marking Mode:
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setTheoryMode("as_you_go")}
                  className={cn(
                    "p-2 rounded-xl border text-center font-bold transition-all",
                    theoryMode === "as_you_go"
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-foreground hover:bg-secondary"
                  )}
                >
                  Mark as you go
                </button>
                <button
                  type="button"
                  onClick={() => setTheoryMode("at_the_end")}
                  className={cn(
                    "p-2 rounded-xl border text-center font-bold transition-all",
                    theoryMode === "at_the_end"
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-foreground hover:bg-secondary"
                  )}
                >
                  Mark at the end
                </button>
              </div>
            </div>

            <div>
              <label className="font-semibold text-muted-foreground block mb-1">
                Number of Questions:
              </label>
              <div className="flex items-center gap-1.5 flex-wrap">
                {[5, 10, 15, 20, 25, 30, 40, 50].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setTheoryCount(num)}
                    className={cn(
                      "size-8 rounded-lg font-bold border text-xs transition-all",
                      theoryCount === num
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border text-foreground hover:bg-secondary"
                    )}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>

            <Button
              type="button"
              onClick={() => startTheoryQuiz()}
              className="w-full mt-2 rounded-xl font-bold h-9 text-xs"
            >
              Start Theory Test
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL: FLASHCARDS CONFIGURATION (Sketch 1 & 2: Up to 50 cards) */}
      {/* ========================================================================= */}
      <Dialog open={isFlashcardConfigOpen} onOpenChange={setIsFlashcardConfigOpen}>
        <DialogContent className="max-w-sm rounded-3xl p-5 border-border bg-card">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Layers className="size-4 text-brand" /> 3D Flashcards
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 mt-2 text-xs">
            <div>
              <label className="font-semibold text-muted-foreground block mb-1">
                Flashcard Type:
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setFlashcardType("qa")}
                  className={cn(
                    "p-2 rounded-xl border text-center font-bold transition-all",
                    flashcardType === "qa"
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-foreground hover:bg-secondary"
                  )}
                >
                  Q &amp; A Cards
                </button>
                <button
                  type="button"
                  onClick={() => setFlashcardType("fill_blank")}
                  className={cn(
                    "p-2 rounded-xl border text-center font-bold transition-all",
                    flashcardType === "fill_blank"
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-foreground hover:bg-secondary"
                  )}
                >
                  Fill-in-the-blank
                </button>
              </div>
            </div>

            <div>
              <label className="font-semibold text-muted-foreground block mb-1">
                Number of Cards:
              </label>
              <div className="flex items-center gap-1.5 flex-wrap">
                {[5, 10, 15, 20, 25, 30, 40, 50].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setFlashcardCount(num)}
                    className={cn(
                      "size-8 rounded-lg font-bold border text-xs transition-all",
                      flashcardCount === num
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border text-foreground hover:bg-secondary"
                    )}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>

            <Button
              type="button"
              onClick={() => startFlashcards()}
              className="w-full mt-2 rounded-xl font-bold h-9 text-xs"
            >
              Generate Flashcards
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL: ASSIGNMENT HELPER (Sketch 2: Detailed vs Short Breakdown) */}
      {/* ========================================================================= */}
      <Dialog open={isAssignmentModalOpen} onOpenChange={setIsAssignmentModalOpen}>
        <DialogContent className="max-w-md rounded-3xl p-5 border-border bg-card">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <GraduationCap className="size-4.5 text-brass" /> Assignment Helper
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 mt-2 text-xs">
            <div>
              <label className="font-semibold text-muted-foreground block mb-1">
                Assistance Detail Level:
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setAssignmentMode("detailed")}
                  className={cn(
                    "p-2 rounded-xl border text-center font-bold transition-all",
                    assignmentMode === "detailed"
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-foreground hover:bg-secondary"
                  )}
                >
                  Detailed Breakdown
                </button>
                <button
                  type="button"
                  onClick={() => setAssignmentMode("short")}
                  className={cn(
                    "p-2 rounded-xl border text-center font-bold transition-all",
                    assignmentMode === "short"
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-foreground hover:bg-secondary"
                  )}
                >
                  Short &amp; Concise Pointers
                </button>
              </div>
            </div>

            <div>
              <label className="font-semibold text-muted-foreground block mb-1">
                Assignment Question / Prompt:
              </label>
              <textarea
                value={assignmentInput}
                onChange={(e) => setAssignmentInput(e.target.value)}
                placeholder="Paste your assignment problem or essay question..."
                rows={4}
                className="w-full rounded-xl border border-border/80 bg-secondary/30 p-2.5 text-xs text-foreground focus:outline-hidden focus:border-primary"
              />
            </div>

            <Button
              type="button"
              disabled={!assignmentInput.trim()}
              onClick={handleAssignmentSubmit}
              className="w-full rounded-xl font-bold h-9 text-xs"
            >
              Get Assignment Assistance
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
