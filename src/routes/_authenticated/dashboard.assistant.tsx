import { useState, useRef, useEffect, useMemo } from "react";
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
  ChevronDown,
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
import { getMaterialsForChatServerFn } from "@/lib/community.functions";
import { convertTextAndMathToSpeech, initSpeechRuleEngine } from "@/lib/math-to-speech";
import { sendDeviceNotification } from "@/lib/notifications";
import { cn } from "@/lib/utils";

const searchSchema = z.object({
  materialId: z.string().optional(),
  view: z.string().optional(),
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
  "from-emerald-500/15 via-teal-500/10 to-emerald-500/5 border-emerald-500/40 text-emerald-950 dark:text-emerald-100",
  "from-indigo-500/15 via-purple-500/10 to-indigo-500/5 border-indigo-500/40 text-indigo-950 dark:text-indigo-100",
  "from-amber-500/15 via-orange-500/10 to-amber-500/5 border-amber-500/40 text-amber-950 dark:text-amber-100",
  "from-sky-500/15 via-blue-500/10 to-sky-500/5 border-sky-500/40 text-sky-950 dark:text-sky-100",
  "from-rose-500/15 via-pink-500/10 to-rose-500/5 border-rose-500/40 text-rose-950 dark:text-rose-100",
];

function AssistantPage() {
  const { materialId, view } = Route.useSearch();
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

  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [showMenuDrawer, setShowMenuDrawer] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [showCustomKeyboard, setShowCustomKeyboard] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);

  // Floating scroll-to-bottom state
  const [showScrollBottom, setShowScrollBottom] = useState(false);

  // Drop-up menu for study tools
  const [showDropUpMenu, setShowDropUpMenu] = useState(false);

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

  // Scroll direction detection for drawer collapse / prompt bar docking
  const [isChatScrolledDown, setIsChatScrolledDown] = useState(false);
  const lastScrollTopRef = useRef(0);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const st = el.scrollTop;
    const delta = st - lastScrollTopRef.current;

    if (st < 40) {
      setIsChatScrolledDown(false);
    } else if (delta > 15) {
      setIsChatScrolledDown(true);
    } else if (delta < -15) {
      setIsChatScrolledDown(false);
    }
    lastScrollTopRef.current = st;

    const isUp = el.scrollHeight - st - el.clientHeight > 140;
    setShowScrollBottom(isUp);
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("syllaboss-scroll-direction", { detail: { isScrolledDown: isChatScrolledDown } })
      );
    }
  }, [isChatScrolledDown]);

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

  // Fetch active thread messages
  const { data: threadMessages = [] } = useQuery({
    queryKey: ["chat-messages", activeThreadId],
    enabled: Boolean(activeThreadId),
    queryFn: async () => {
      if (!activeThreadId) return [];
      return await getStudyMessagesServerFn({ data: { threadId: activeThreadId } });
    },
  });

  // Sync loaded thread messages
  useEffect(() => {
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
      } else {
        setMessages([]);
      }
    }
  }, [threadMessages, activeThreadId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
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
                textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 84)}px`;
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
    utterance.rate = 1.0;
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
      const newThread = await createStudyThreadServerFn({
        data: {
          userId: user.id,
          title: "New Study Conversation",
        },
      });
      setActiveThreadId(newThread.id);
      setMessages([]);
      setQuizQuestions(null);
      setFlashcards(null);
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
      if (activeThreadId === id) {
        setActiveThreadId(null);
        setMessages([]);
      }
      refetchThreads();
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
      const presigned = await getPresignedUploadUrlServerFn({
        data: {
          filename: file.name,
          contentType: file.type || "application/pdf",
          userId: user.id,
        },
      });

      await fetch(presigned.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type || "application/pdf" },
        body: file,
      });

      const extractedSample = `Document: ${file.name}\nSize: ${(file.size / (1024 * 1024)).toFixed(2)} MB\nUploaded for semester revision.`;
      const cat = await categorizeDocumentAutonomously(file.name, extractedSample, profile);
      const audit = await auditUploadAutonomous(file.name, file.size, file.type, extractedSample);

      const createdMat = await createMaterialServerFn({
        data: {
          userId: user.id,
          title: cat.title,
          course: cat.course,
          courseCode: cat.course_code ?? undefined,
          institution: cat.institution,
          department: cat.department,
          level: cat.level,
          materialType: cat.material_type,
          description: cat.description,
          r2Key: presigned.key,
          pageCount: 1,
        },
      });

      await autoVerifyMaterialServerFn({
        data: {
          materialId: createdMat.id,
          score: audit.score,
        },
      });

      await qc.invalidateQueries({ queryKey: ["campus-library-materials"] });

      setActiveDocContext({
        id: createdMat.id,
        title: cat.title,
        course: cat.course,
        text: extractedSample,
      });

      toast.success(`Attached "${cat.title}"! Added to campus library.`, { id: "doc-proc" });

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
        textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 84)}px`;
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
      const topicMatch = text.match(/(?:on|about|for|regarding|in)\s+([a-zA-Z0-9\s,._\-\(\)]{3,60})/i);
      if (topicMatch && topicMatch[1]) {
        const candidate = topicMatch[1].trim().replace(/\s+(please|now|thanks).*$/i, "").replace(/[\.\?!]+$/, "");
        if (candidate.length > 1) topic = candidate;
      }
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
      refetchThreads();

      if (messages.length === 0) {
        generateSmartThreadTitleServerFn({
          data: {
            threadId: targetThreadId,
            query: queryText,
          },
        }).then(() => refetchThreads()).catch(() => {});
      }

      // Deliver device notification for completed AI answer
      sendDeviceNotification("Boss AI Response Ready", {
        body: result.response.slice(0, 110).replace(/[#*`\n]/g, " ").trim(),
      }).catch(() => {});
    } catch {
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

      const title = topicOverride || activeDocContext?.title || "University Examination Material";
      const sample = activeDocContext?.text || `Curriculum topics and past exam questions on ${title}.`;

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

      const title = topicOverride || activeDocContext?.title || "University Examination Material";
      const sample = activeDocContext?.text || `University semester exam preparation concepts on ${title}.`;

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

      const title = topicOverride || activeDocContext?.title || "University Examination Material";
      const sample = activeDocContext?.text || `Key definitions, core theorems, and mnemonics for ${title}.`;

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
    <div className="flex flex-1 min-h-0 h-full max-h-full w-full overflow-hidden bg-background relative font-sans">
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
      <aside className="hidden md:flex w-72 lg:w-80 flex-col border-r border-border/70 bg-card/40 shrink-0 overflow-hidden">
        {/* New Chat Button */}
        <div className="p-3 border-b border-border/70">
          <Button
            onClick={createNewChat}
            className="w-full justify-start gap-2 rounded-xl font-bold text-xs h-9 shadow-xs"
          >
            <MessageSquarePlus className="size-4" /> Start New Conversation
          </Button>
        </div>

        {/* Active Study Document Section */}
        <div className="p-3 border-b border-border/70 space-y-2 bg-secondary/15">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
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
            <div className="rounded-xl border border-primary/30 bg-primary/5 p-2.5 text-xs space-y-0.5">
              <p className="font-bold text-primary truncate">{activeDocContext.title}</p>
              <p className="text-[10px] text-muted-foreground truncate">{activeDocContext.course}</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsLibraryModalOpen(true)}
                className="rounded-xl text-[11px] font-semibold h-8 border-border/80 hover:bg-primary/10 hover:text-primary"
              >
                <BookOpen className="size-3.5 mr-1 text-primary" /> Library
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="rounded-xl text-[11px] font-semibold h-8 border-border/80 hover:bg-primary/10 hover:text-primary"
              >
                <Upload className="size-3.5 mr-1 text-primary" /> Upload
              </Button>
            </div>
          )}
        </div>

        {/* Study Tools Quick Triggers */}
        <div className="p-3 border-b border-border/70 space-y-1.5 bg-secondary/10">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
            Study Modes &amp; Tools
          </span>
          <button
            type="button"
            onClick={() => prepareStudyPrompt("mcq")}
            className="w-full flex items-center gap-2.5 p-2 rounded-xl text-left text-xs font-semibold text-foreground hover:bg-primary/10 hover:text-primary transition-all group"
          >
            <span className="size-6 rounded-lg bg-primary/10 text-primary grid place-items-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors shrink-0">
              <CheckCircle2 className="size-3.5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="leading-tight font-semibold">MCQ Practice Quiz</p>
              <p className="text-[10px] text-muted-foreground font-normal truncate">Customizable questions on your topic</p>
            </div>
          </button>
          <button
            type="button"
            onClick={() => prepareStudyPrompt("theory")}
            className="w-full flex items-center gap-2.5 p-2 rounded-xl text-left text-xs font-semibold text-foreground hover:bg-emerald-500/10 hover:text-emerald-600 transition-all group"
          >
            <span className="size-6 rounded-lg bg-emerald-500/10 text-emerald-600 grid place-items-center group-hover:bg-emerald-600 group-hover:text-white transition-colors shrink-0">
              <FileText className="size-3.5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="leading-tight font-semibold">Theory Test &amp; Marking</p>
              <p className="text-[10px] text-muted-foreground font-normal truncate">Exam questions &amp; rubric marking</p>
            </div>
          </button>
          <button
            type="button"
            onClick={() => prepareStudyPrompt("flashcards")}
            className="w-full flex items-center gap-2.5 p-2 rounded-xl text-left text-xs font-semibold text-foreground hover:bg-indigo-500/10 hover:text-indigo-600 transition-all group"
          >
            <span className="size-6 rounded-lg bg-indigo-500/10 text-indigo-500 grid place-items-center group-hover:bg-indigo-600 group-hover:text-white transition-colors shrink-0">
              <Layers className="size-3.5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="leading-tight font-semibold">3D Flashcards</p>
              <p className="text-[10px] text-muted-foreground font-normal truncate">Physical flip cards with KaTeX</p>
            </div>
          </button>
          <button
            type="button"
            onClick={() => prepareStudyPrompt("assignment")}
            className="w-full flex items-center gap-2.5 p-2 rounded-xl text-left text-xs font-semibold text-foreground hover:bg-amber-500/10 hover:text-amber-600 transition-all group"
          >
            <span className="size-6 rounded-lg bg-amber-500/10 text-amber-500 grid place-items-center group-hover:bg-amber-600 group-hover:text-white transition-colors shrink-0">
              <GraduationCap className="size-3.5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="leading-tight font-semibold">Assignment Helper</p>
              <p className="text-[10px] text-muted-foreground font-normal truncate">Step-by-step academic breakdown</p>
            </div>
          </button>
          <button
            type="button"
            onClick={() => prepareStudyPrompt("summary")}
            className="w-full flex items-center gap-2.5 p-2 rounded-xl text-left text-xs font-semibold text-foreground hover:bg-rose-500/10 hover:text-rose-600 transition-all group"
          >
            <span className="size-6 rounded-lg bg-rose-500/10 text-rose-500 grid place-items-center group-hover:bg-rose-600 group-hover:text-white transition-colors shrink-0">
              <Sparkles className="size-3.5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="leading-tight font-semibold">Summarize Material</p>
              <p className="text-[10px] text-muted-foreground font-normal truncate">High-yield revision notes</p>
            </div>
          </button>
        </div>

        {/* Recent Chats list */}
        <div className="p-3 flex-1 min-h-0 flex flex-col space-y-2 overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
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
                className="w-full h-7 rounded-lg border border-border/70 bg-secondary/30 px-2 pl-6 text-[11px] text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:border-primary"
              />
              <Search className="size-3 text-muted-foreground absolute left-1.5 top-2" />
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
                    "group flex items-center justify-between gap-1.5 rounded-xl px-2.5 py-2 text-xs transition-all cursor-pointer border",
                    activeThreadId === t.id
                      ? "bg-primary/10 border-primary/40 font-semibold text-primary shadow-2xs"
                      : "border-transparent text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                  )}
                  onClick={() => {
                    if (activeThreadId !== t.id) {
                      setActiveThreadId(t.id);
                      setMessages([]);
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
        {/* Mobile Floating Dynamic Islands (Demarcation removed, Boss AI title removed) */}
        <div className="md:hidden absolute top-3 inset-x-3.5 z-30 flex items-center justify-between pointer-events-none">
          {/* Island 1: Recent Chats */}
          <button
            type="button"
            onClick={() => setShowMenuDrawer(true)}
            className="pointer-events-auto flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-card/90 border border-border/70 text-foreground text-xs font-semibold shadow-md backdrop-blur-md hover:bg-card active:scale-95 transition-all"
          >
            <History className="size-3.5 text-primary" />
            <span>Recent Chats</span>
            {threads.length > 0 && (
              <span className="size-4 rounded-full bg-primary/20 text-primary text-[10px] grid place-items-center font-bold">
                {threads.length}
              </span>
            )}
          </button>

          {/* Island 2: Start New Conversation (+) */}
          <button
            type="button"
            onClick={() => createNewChat()}
            className="pointer-events-auto size-8.5 rounded-full grid place-items-center bg-primary text-primary-foreground shadow-md hover:bg-primary/90 active:scale-95 transition-all"
            title="Start New Conversation"
          >
            <Plus className="size-4" />
          </button>
        </div>

        {/* Desktop Chat Header */}
        <div className="hidden md:flex items-center justify-between px-4 py-2.5 border-b border-border/60 bg-card/70 backdrop-blur-md shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="size-8 rounded-xl bg-primary/10 text-primary grid place-items-center">
              <Bot className="size-4.5" />
            </div>
            <div>
              <h2 className="text-xs font-bold text-foreground">
                {threads.find((t: any) => t.id === activeThreadId)?.title || "Boss AI Study Copilot"}
              </h2>
              <p className="text-[10px] text-muted-foreground">
                {activeDocContext ? activeDocContext.title : "Active University Session · Groq LLaMA 3.1 & Whisper"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {activeThreadId && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => deleteChat(activeThreadId)}
                className="h-7 px-2 text-[11px] text-muted-foreground hover:text-destructive gap-1"
                title="Delete this conversation"
              >
                <Trash2 className="size-3" />
                <span>Delete Chat</span>
              </Button>
            )}

            <Button
              size="sm"
              variant="outline"
              onClick={createNewChat}
              className="h-7 px-2.5 text-xs font-semibold rounded-lg gap-1 border-border/80 hover:bg-primary/10 hover:text-primary"
            >
              <Plus className="size-3.5" />
              <span>New Chat</span>
            </Button>
          </div>
        </div>



        {/* Messages Stream */}
        <div
          ref={messagesScrollRef}
          onScroll={handleScroll}
          className="flex-1 min-h-0 overflow-y-auto overscroll-contain scroll-smooth pt-14 pb-3 px-3 sm:p-4 space-y-3.5 [scrollbar-width:thin] [scrollbar-color:theme(colors.border)_transparent]"
        >
          {messages.length === 0 ? (
            <div className="grid h-full place-items-center p-4 text-center">
              <div className="max-w-md space-y-2.5">
                <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary">
                  <Bot className="size-6" />
                </div>
                <h3 className="font-display text-lg font-bold text-foreground">
                  Boss AI Study Copilot
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Ask any academic question, attach your course notes, or tap <strong>+</strong> in the typing bar to take an MCQ Quiz, Theory Test, or create Flashcards.
                </p>

                <div className="grid gap-2 pt-2 sm:grid-cols-2 text-left">
                  <button
                    type="button"
                    onClick={() => handleSend("Explain the core exam concepts in my course step-by-step")}
                    className="rounded-xl border border-border/80 bg-card p-2.5 text-xs font-medium hover:border-primary transition-all"
                  >
                    Explain core concepts step-by-step
                  </button>
                  <button
                    type="button"
                    onClick={() => prepareStudyPrompt("mcq")}
                    className="rounded-xl border border-border/80 bg-card p-2.5 text-xs font-medium hover:border-primary transition-all flex items-center justify-between"
                  >
                    <span>20 Practice MCQ Questions</span>
                    <CheckCircle2 className="size-3.5 text-primary" />
                  </button>
                  <button
                    type="button"
                    onClick={() => prepareStudyPrompt("flashcards")}
                    className="rounded-xl border border-border/80 bg-card p-2.5 text-xs font-medium hover:border-primary transition-all flex items-center justify-between"
                  >
                    <span>20 Study Flashcards</span>
                    <Layers className="size-3.5 text-indigo-500" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsLibraryModalOpen(true)}
                    className="rounded-xl border border-dashed border-primary/50 bg-primary/5 p-2.5 text-xs font-medium text-primary hover:bg-primary/10 transition-all flex items-center justify-between"
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
                    "flex flex-col space-y-1",
                    m.role === "user" ? "items-end" : "items-start"
                  )}
                >
                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground px-1">
                    <span>{m.role === "user" ? "You" : "Boss AI"}</span>
                    {isAssistant && (
                      <button
                        type="button"
                        onClick={() => speakAiResponse(m.content, m.id)}
                        title={speakingMessageId === m.id ? "Stop voice note" : "Play voice note response"}
                        className="ml-1 text-primary hover:text-primary/80 transition-colors"
                      >
                        {speakingMessageId === m.id ? (
                          <VolumeX className="size-3 text-red-500 animate-pulse" />
                        ) : (
                          <Volume2 className="size-3" />
                        )}
                      </button>
                    )}
                  </div>

                  <div
                    className={cn(
                      "rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed transition-all shadow-xs",
                      m.role === "user"
                        ? "max-w-[88%] bg-primary text-primary-foreground font-medium rounded-br-xs"
                        : "w-full max-w-[96%] md:max-w-[92%] bg-card text-foreground border border-border/70 rounded-bl-xs"
                    )}
                  >
                    {/* Attached material badge */}
                    {m.attachedMaterial && (
                      <div className="mb-2 rounded-xl bg-muted/60 border border-border/80 p-2.5 text-foreground">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-xs flex items-center gap-1.5 text-primary">
                            <CheckCircle2 className="size-3.5 text-emerald-600" />
                            Registered to Library
                          </span>
                          <span className="rounded-full bg-emerald-500/10 text-emerald-700 px-2 py-0.5 text-[10px] font-bold">
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
                      <div className="mb-2 p-2 rounded-xl bg-black/15 flex items-center gap-2">
                        <Volume2 className="size-4 text-emerald-400" />
                        <audio src={m.audioUrl} controls className="h-7 w-48" />
                      </div>
                    )}

                    {isAssistant ? (
                      <div className="space-y-2">
                        {m.content && <AiMessageRenderer content={m.content} />}
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
            <div className="flex items-center gap-2 text-xs text-muted-foreground animate-pulse p-2">
              <Bot className="size-4 text-primary animate-bounce" />
              <span>Boss AI is solving and formatting math with KaTeX...</span>
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
            className="absolute right-4 bottom-24 z-30 size-9 rounded-full bg-primary text-primary-foreground shadow-lg grid place-items-center active:scale-95 transition-all animate-bounce"
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
          className={cn(
            "shrink-0 border-t border-border/60 bg-card p-2 sm:p-3 relative z-30 transition-all duration-300 ease-out",
            !isChatScrolledDown && !showCustomKeyboard
              ? "mb-[calc(4.5rem+env(safe-area-inset-bottom))] md:mb-0"
              : "mb-0"
          )}
        >
          {/* Drop-up Menu for MCQ, Theory, Flashcards, Library, Assignments */}
          <AnimatePresence>
            {showDropUpMenu && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="absolute bottom-full left-3 mb-2 w-64 rounded-2xl border border-border/80 bg-card p-2 shadow-2xl z-40 space-y-1 font-sans"
              >
                <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Study Modes & Materials
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setShowDropUpMenu(false);
                    setIsLibraryModalOpen(true);
                  }}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left text-xs font-semibold text-foreground hover:bg-primary/10 hover:text-primary transition-all"
                >
                  <BookOpen className="size-4 text-primary" />
                  <div>
                    <p className="leading-tight">Choose from Library</p>
                    <p className="text-[10px] text-muted-foreground font-normal">Attach campus notes & past questions</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowDropUpMenu(false);
                    fileInputRef.current?.click();
                  }}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left text-xs font-semibold text-foreground hover:bg-primary/10 hover:text-primary transition-all"
                >
                  <Upload className="size-4 text-primary" />
                  <div>
                    <p className="leading-tight">Upload from Device</p>
                    <p className="text-[10px] text-muted-foreground font-normal">Upload PDF or image notes</p>
                  </div>
                </button>

                <div className="my-1 border-t border-border/60" />

                <button
                  type="button"
                  onClick={() => prepareStudyPrompt("mcq")}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left text-xs font-semibold text-foreground hover:bg-primary/10 hover:text-primary transition-all"
                >
                  <CheckCircle2 className="size-4 text-primary" />
                  <div>
                    <p className="leading-tight">MCQ Quiz</p>
                    <p className="text-[10px] text-muted-foreground font-normal">Generate practice questions on any topic</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => prepareStudyPrompt("theory")}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left text-xs font-semibold text-foreground hover:bg-primary/10 hover:text-primary transition-all"
                >
                  <FileText className="size-4 text-emerald-600" />
                  <div>
                    <p className="leading-tight">Theory Test & Marking</p>
                    <p className="text-[10px] text-muted-foreground font-normal">University grading & rubric</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => prepareStudyPrompt("flashcards")}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left text-xs font-semibold text-foreground hover:bg-primary/10 hover:text-primary transition-all"
                >
                  <Layers className="size-4 text-indigo-500" />
                  <div>
                    <p className="leading-tight">3D Flashcards</p>
                    <p className="text-[10px] text-muted-foreground font-normal">Physical flip cards with KaTeX math</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => prepareStudyPrompt("assignment")}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left text-xs font-semibold text-foreground hover:bg-primary/10 hover:text-primary transition-all"
                >
                  <GraduationCap className="size-4 text-amber-500" />
                  <div>
                    <p className="leading-tight">Assignment Helper</p>
                    <p className="text-[10px] text-muted-foreground font-normal">Step-by-step academic solution</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => prepareStudyPrompt("summary")}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left text-xs font-semibold text-foreground hover:bg-primary/10 hover:text-primary transition-all"
                >
                  <Sparkles className="size-4 text-rose-500" />
                  <div>
                    <p className="leading-tight">Summarize Material</p>
                    <p className="text-[10px] text-muted-foreground font-normal">High-yield revision notes</p>
                  </div>
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Assignment Mode indicator banner */}
          {isAssignmentMode && (
            <div className="flex items-center justify-between px-3 py-1.5 mb-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs font-semibold animate-in fade-in slide-in-from-bottom-1">
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
          <div className="rounded-2xl sm:rounded-3xl border border-border/80 bg-secondary/30 dark:bg-zinc-900/50 p-2 sm:p-2.5 shadow-xs transition-all focus-within:border-primary/50 focus-within:bg-card">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                e.target.style.height = "auto";
                e.target.style.height = `${Math.min(e.target.scrollHeight, 84)}px`;
              }}
              onKeyDown={(e) => {
                if (!isMobile && e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              onFocus={() => {
                if (isMobile) setShowCustomKeyboard(true);
              }}
              onClick={() => {
                if (isMobile) setShowCustomKeyboard(true);
              }}
              inputMode={isMobile ? "none" : "text"}
              placeholder={
                isAssignmentMode
                  ? "Type your assignment problem or question here for a step-by-step academic solution..."
                  : activeDocContext
                  ? `Ask Boss AI about ${activeDocContext.title}...`
                  : "Ask Boss AI anything or tap + for study modes..."
              }
              rows={1}
              className="w-full resize-none bg-transparent text-xs sm:text-sm text-foreground focus:outline-hidden min-h-[28px] max-h-[84px] overflow-y-auto px-1 py-0.5 leading-relaxed"
            />

            {/* Embedded Action Bar */}
            <div className="flex items-center justify-between pt-1 border-t border-border/40 mt-1">
              <div className="flex items-center gap-1">
                {/* Drop-up Study Modes & Materials Button */}
                <button
                  type="button"
                  onClick={() => setShowDropUpMenu((prev) => !prev)}
                  title="Study modes & documents"
                  className={cn(
                    "size-8 rounded-full grid place-items-center transition-all",
                    showDropUpMenu
                      ? "bg-primary text-primary-foreground rotate-45"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                  )}
                >
                  <Plus className="size-4" />
                </button>

                {/* Library attachment shortcut */}
                <button
                  type="button"
                  onClick={() => setIsLibraryModalOpen(true)}
                  title="Choose from Campus Library"
                  className="size-8 rounded-full grid place-items-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
                >
                  <BookOpen className="size-4" />
                </button>

                {/* File Upload Shortcut */}
                <button
                  type="button"
                  disabled={uploadingDoc}
                  onClick={() => fileInputRef.current?.click()}
                  title="Upload PDF or notes from device"
                  className="size-8 rounded-full grid place-items-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
                >
                  {uploadingDoc ? (
                    <Loader2 className="size-4 animate-spin text-primary" />
                  ) : (
                    <Paperclip className="size-4" />
                  )}
                </button>
              </div>

              <div className="flex items-center gap-1">
                {/* Voice Note Button */}
                <button
                  type="button"
                  onClick={toggleVoiceNoteInput}
                  title={isRecording ? "Stop voice note" : "Record voice note"}
                  className={cn(
                    "size-8 rounded-full grid place-items-center transition-all",
                    isRecording
                      ? "bg-red-600 text-white animate-pulse"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary"
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
                      ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs"
                      : "text-muted-foreground opacity-40 cursor-not-allowed"
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
                  textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 84)}px`;
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
                          setActiveThreadId(t.id);
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
              <FileText className="size-4 text-emerald-600" /> Theory Practice Test
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
              <Layers className="size-4 text-indigo-500" /> 3D Flashcards
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
              <GraduationCap className="size-4.5 text-amber-500" /> Assignment Helper
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
