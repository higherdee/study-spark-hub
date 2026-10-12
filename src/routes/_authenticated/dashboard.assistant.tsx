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

  // MCQ Configuration & Execution State
  const [mcqMode, setMcqMode] = useState<"as_you_go" | "at_the_end">("as_you_go");
  const [mcqCount, setMcqCount] = useState<number>(5);
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[] | null>(null);
  const [currentQuizIndex, setCurrentQuizIndex] = useState(0);
  const [selectedObjectiveAnswers, setSelectedObjectiveAnswers] = useState<Record<number, number>>({});
  const [quizScores, setQuizScores] = useState<Record<number, number>>({});
  const [isMcqSubmittedAtEnd, setIsMcqSubmittedAtEnd] = useState(false);
  const [unansweredWarningQuestions, setUnansweredWarningQuestions] = useState<number[] | null>(null);

  // Theory Configuration & Execution State
  const [theoryMode, setTheoryMode] = useState<"as_you_go" | "at_the_end">("as_you_go");
  const [theoryCount, setTheoryCount] = useState<number>(5);
  const [theoryAnswerInput, setTheoryAnswerInput] = useState("");
  const [theoryAnswersMap, setTheoryAnswersMap] = useState<Record<number, string>>({});
  const [theoryFeedbackMap, setTheoryFeedbackMap] = useState<Record<number, any>>({});
  const [gradingTheory, setGradingTheory] = useState(false);

  // Flashcards Configuration & State
  const [flashcardCount, setFlashcardCount] = useState<number>(10);
  const [flashcardType, setFlashcardType] = useState<"qa" | "fill_blank">("qa");
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
  const recognitionRef = useRef<any>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const menuFileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesScrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Live Predictive Suggestions
  const predictiveSuggestions = useMemo(() => {
    return getPredictiveSuggestions(input, activeDocContext?.title);
  }, [input, activeDocContext?.title]);

  // Voice note speech recognition (Listening to voice note)
  function toggleVoiceNoteInput() {
    if (isRecording) {
      stopAndSendVoiceNote();
      return;
    }

    // Try Speech Recognition for direct live transcription
    const SpeechRec =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (SpeechRec) {
      try {
        const recognition = new SpeechRec();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = "en-US";

        recognition.onstart = () => {
          setIsRecording(true);
          setRecordingSeconds(0);
          recordingTimerRef.current = setInterval(() => {
            setRecordingSeconds((s) => s + 1);
          }, 1000);
          toast.info("Listening to your voice note...");
        };

        recognition.onresult = (e: any) => {
          const transcript = Array.from(e.results)
            .map((res: any) => res[0].transcript)
            .join("");
          setInput(transcript);
          // Auto adjust textarea height
          if (textareaRef.current) {
            textareaRef.current.style.height = "auto";
            textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 84)}px`;
          }
        };

        recognition.onend = () => {
          setIsRecording(false);
          if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
        };

        recognition.onerror = () => {
          setIsRecording(false);
          if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
          startMediaRecordingFallback();
        };

        recognitionRef.current = recognition;
        recognition.start();
        return;
      } catch {
        startMediaRecordingFallback();
      }
    } else {
      startMediaRecordingFallback();
    }
  }

  async function startMediaRecordingFallback() {
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
      toast.info("Recording voice note...");
    } catch {
      toast.error("Microphone access unavailable or denied on this device.");
    }
  }

  async function stopAndSendVoiceNote() {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }

    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);

    if (mediaRecorderRef.current && isRecording) {
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
          content: input.trim() || `[Voice Note (${duration}s)] Student Audio Inquiry`,
          audioUrl,
          timestamp: new Date().toISOString(),
        };

        setMessages((prev) => [...prev, voiceUserMsg]);
        setInput("");
        setThinking(true);

        try {
          const result = await askBossAiServerFn({
            data: {
              userId: user!.id,
              threadId: targetThreadId,
              query: voiceUserMsg.content,
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
    } else {
      setIsRecording(false);
      if (input.trim()) {
        handleSend();
      }
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

  // Voice Note Response Playback (Text to Speech)
  function toggleSpeechPlayback(msgId: string, text: string) {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      toast.error("Text-to-speech audio not supported on this device.");
      return;
    }

    if (speakingMessageId === msgId) {
      window.speechSynthesis.cancel();
      setSpeakingMessageId(null);
      return;
    }

    window.speechSynthesis.cancel();
    const cleanText = text
      .replace(/[*#_`>]/g, "")
      .replace(/\[.*?\]/g, "")
      .slice(0, 500);

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.onend = () => setSpeakingMessageId(null);
    utterance.onerror = () => setSpeakingMessageId(null);

    setSpeakingMessageId(msgId);
    window.speechSynthesis.speak(utterance);
    toast.info("Playing Boss AI voice note response...");
  }

  // Scroll position listener for floating arrow button
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
          toast.success(`Loaded context for "${m.title}".`);
        }
      });
    }
  }, [materialId]);

  useEffect(() => {
    if (view === "history") {
      setShowMenuDrawer(true);
    }
  }, [view]);

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
        const loaded = await getStudyMessagesServerFn({ data: { threadId: activeThreadId! } });
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
      toast.success("New conversation started.");
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

  // Handle Document Upload in Chat (Autonomous Library Registration)
  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 25 * 1024 * 1024) {
      toast.error("File exceeds 25 MB limit.");
      return;
    }

    setUploadingDoc(true);
    toast.loading("Analyzing document with Boss AI...", { id: "doc-proc" });

    try {
      let extractedSample = "";
      if (file.type.includes("text") || file.name.endsWith(".txt")) {
        extractedSample = await file.text();
      } else {
        extractedSample = `${file.name} - Academic Course Material for ${profile?.institution || "University"}`;
      }

      const cat = await categorizeDocumentAutonomously(file.name, extractedSample, profile);
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

      setActiveDocContext({
        title: cat.title,
        course: cat.course,
        text: extractedSample.slice(0, 3000),
      });

      let targetThreadId = activeThreadId;
      if (!targetThreadId) {
        targetThreadId = await createNewChat();
      }

      if (targetThreadId) {
        await saveStudyMessageServerFn({
          data: {
            threadId: targetThreadId,
            userId: user.id,
            role: "assistant",
            content: `I've registered and indexed "${cat.title}" (${cat.course}). What would you like to study or test?`,
            attachedMaterial: {
              id: createdMat.id,
              title: cat.title,
              course: cat.course,
              courseCode: cat.course_code,
              institution: cat.institution,
              department: profile?.department || "Department",
              level: cat.level,
              status: "verified",
            },
          },
        });

        const loaded = await getStudyMessagesServerFn({ data: { threadId: targetThreadId } });
        setMessages(loaded as ChatMessage[]);
      }

      toast.success(`Attached "${cat.title}"!`, { id: "doc-proc" });
    } catch (err) {
      console.error("Document ingestion error:", err);
      toast.error(err instanceof Error ? err.message : "Failed to process document", { id: "doc-proc" });
    } finally {
      setUploadingDoc(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
      if (menuFileInputRef.current) menuFileInputRef.current.value = "";
    }
  }

  // Send Chat Prompt to Boss AI with Autonomous Conversation Naming
  async function handleSend(textToSend?: string) {
    const query = (textToSend || input).trim();
    if (!query || thinking || !user) return;

    let targetThreadId = activeThreadId;
    const isBrandNewSession = !targetThreadId || messages.length === 0;

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
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
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

      // Requirement: Every new conversation should be named by the AI!
      if (isBrandNewSession) {
        const cleanPrompt = query.replace(/^(what is|how to|explain|summarize|give me|quiz me on)\s+/i, "");
        const words = cleanPrompt.split(/\s+/).slice(0, 4).join(" ");
        const autoName = words ? words.charAt(0).toUpperCase() + words.slice(1) : "Study Session";
        updateStudyThreadTitleServerFn({
          data: { threadId: targetThreadId, title: autoName },
        }).then(() => refetchThreads()).catch(() => {});
      } else {
        refetchThreads();
      }
    } catch (err) {
      console.error("AI inference error:", err);
      toast.error("Failed to generate response. Please try again.");
    } finally {
      setThinking(false);
    }
  }

  // Quick Action: Summarize Document
  async function triggerSummarize() {
    setShowDropUpMenu(false);
    const title = activeDocContext?.title || "your uploaded document";
    handleSend(`Please provide a high-yield executive summary of ${title}, highlighting the core definitions, formulas, and most likely exam questions.`);
  }

  // Quick Action: MCQ Quiz Generation (from Sketch 2 & 3)
  async function startMcqQuiz() {
    setIsMcqConfigOpen(false);
    setShowDropUpMenu(false);
    setThinking(true);
    toast.loading(`Generating ${mcqCount} MCQ questions...`, { id: "quiz-gen" });

    try {
      const title = activeDocContext?.title || profile?.course || "General Coursework";
      const sample = activeDocContext?.text || "University semester exam preparation concepts.";
      const questions = await generatePracticeQuestions(title, sample, "objective", mcqCount);

      setQuizQuestions(questions);
      setCurrentQuizIndex(0);
      setSelectedObjectiveAnswers({});
      setQuizScores({});
      setIsMcqSubmittedAtEnd(false);
      setUnansweredWarningQuestions(null);

      toast.success(`${questions.length} MCQ Questions Ready!`, { id: "quiz-gen" });
    } catch {
      toast.error("Failed to generate quiz", { id: "quiz-gen" });
    } finally {
      setThinking(false);
    }
  }

  // MCQ Submission with Unanswered Questions Check (Sketch 2 requirement)
  function handleMcqSubmitAtEnd() {
    if (!quizQuestions) return;
    const unanswered: number[] = [];
    quizQuestions.forEach((_, idx) => {
      if (selectedObjectiveAnswers[idx] === undefined) {
        unanswered.push(idx + 1);
      }
    });

    if (unanswered.length > 0) {
      setUnansweredWarningQuestions(unanswered);
      return;
    }

    finalizeMcqSubmission();
  }

  function finalizeMcqSubmission() {
    if (!quizQuestions) return;
    const scores: Record<number, number> = {};
    quizQuestions.forEach((q, idx) => {
      if (selectedObjectiveAnswers[idx] === q.correctOptionIndex) {
        scores[idx] = 1;
      } else {
        scores[idx] = 0;
      }
    });
    setQuizScores(scores);
    setIsMcqSubmittedAtEnd(true);
    setUnansweredWarningQuestions(null);

    const totalCorrect = Object.values(scores).reduce((a, b) => a + b, 0);
    toast.success(`Exam submitted! Scored ${totalCorrect}/${quizQuestions.length}`);
  }

  // Quick Action: Theory Test Generation (from Sketch 2 & 4)
  async function startTheoryQuiz() {
    setIsTheoryConfigOpen(false);
    setShowDropUpMenu(false);
    setThinking(true);
    toast.loading(`Preparing ${theoryCount} theory questions with marking scheme...`, { id: "theory-gen" });

    try {
      const title = activeDocContext?.title || profile?.course || "General Coursework";
      const sample = activeDocContext?.text || "University semester exam preparation concepts.";
      const questions = await generatePracticeQuestions(title, sample, "theory", theoryCount);

      setQuizQuestions(questions);
      setCurrentQuizIndex(0);
      setTheoryAnswerInput("");
      setTheoryAnswersMap({});
      setTheoryFeedbackMap({});

      toast.success(`${questions.length} Theory Questions prepared!`, { id: "theory-gen" });
    } catch {
      toast.error("Failed to generate theory questions", { id: "theory-gen" });
    } finally {
      setThinking(false);
    }
  }

  // Grade Theory Answer (Teacher-Style Marking)
  async function handleGradeCurrentTheory() {
    if (!quizQuestions || !theoryAnswerInput.trim()) return;
    const q = quizQuestions[currentQuizIndex];
    if (!q) return;

    setGradingTheory(true);
    try {
      const result = await gradeTheoryAnswer(q.question, q.modelAnswer, theoryAnswerInput);
      setTheoryFeedbackMap((prev) => ({ ...prev, [currentQuizIndex]: result }));
      setTheoryAnswersMap((prev) => ({ ...prev, [currentQuizIndex]: theoryAnswerInput }));
      setQuizScores((prev) => ({ ...prev, [currentQuizIndex]: result.score }));
      toast.success(`Marked: Scored ${result.score}/10!`);
    } catch {
      toast.error("Grading failed. Please try again.");
    } finally {
      setGradingTheory(false);
    }
  }

  // Quick Action: Flashcards (from Sketch 1 & 2)
  async function startFlashcards() {
    setIsFlashcardConfigOpen(false);
    setShowDropUpMenu(false);
    setThinking(true);
    toast.loading(`Generating ${flashcardCount} colorful study flashcards...`, { id: "fc-gen" });

    try {
      const title = activeDocContext?.title || profile?.course || "Academic Revision";
      const sample = activeDocContext?.text || "Course definitions and formulas.";
      const cards = await generateFlashcards(title, sample, flashcardCount);

      setFlashcards(cards);
      setCurrentCardIndex(0);
      setCardFlipped(false);
      toast.success(`${cards.length} Flashcards ready to study!`, { id: "fc-gen" });
    } catch {
      toast.error("Could not generate flashcards", { id: "fc-gen" });
    } finally {
      setThinking(false);
    }
  }

  // Assignment Helper
  function handleAssignmentSubmit() {
    if (!assignmentInput.trim()) return;
    setIsAssignmentModalOpen(false);
    setShowDropUpMenu(false);
    const prompt = `[Assignment Helper - ${assignmentMode.toUpperCase()}]\n${assignmentInput.trim()}\nPlease provide a ${assignmentMode === "detailed" ? "comprehensive, well-structured academic breakdown with citations and step-by-step working" : "concise, direct summary and key bullet points to solve this assignment"}.`;
    handleSend(prompt);
    setAssignmentInput("");
  }

  return (
    <div className="flex flex-1 min-h-0 h-full max-h-full w-full overflow-hidden flex-col bg-background relative font-sans">
      {/* ========================================================================= */}
      {/* MINIMAL TOP BAR: Only Vertical Triple Dots at Top Right Corner per User */}
      {/* ========================================================================= */}
      <div className="shrink-0 flex items-center justify-between px-3 py-2 border-b border-border/50 bg-card/95 z-20">
        <div className="flex items-center gap-2 min-w-0">
          <div className="size-8 rounded-xl bg-primary/10 text-primary grid place-items-center shrink-0">
            <Bot className="size-4.5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-sm font-bold text-foreground truncate">Boss AI</h1>
            <p className="text-[10px] text-muted-foreground truncate">
              {activeDocContext ? activeDocContext.title : "Academic Assistant"}
            </p>
          </div>
        </div>

        {/* Top Right Corner: Vertical Triple Dots Menu Trigger */}
        <button
          type="button"
          onClick={() => setShowMenuDrawer(true)}
          title="Conversation options & previous chats"
          className="size-9 rounded-full grid place-items-center text-foreground hover:bg-secondary active:scale-90 transition-all border border-border/60"
        >
          <MoreVertical className="size-4.5" />
        </button>
      </div>

      {/* ========================================================================= */}
      {/* MAIN CHAT & INTERACTIVE WORKSPACE */}
      {/* ========================================================================= */}
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden relative">
        {/* Interactive Mode 1: Flashcards Mode (Sketch 1 & 2) */}
        {flashcards && flashcards.length > 0 && (
          <div className="border-b border-border/80 bg-secondary/30 p-3 sm:p-4 shrink-0 transition-all">
            <div className="flex items-center justify-between pb-1.5">
              <span className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                <Layers className="size-3.5" />
                Flashcard {currentCardIndex + 1} of {flashcards.length}
              </span>
              <button
                type="button"
                onClick={() => setFlashcards(null)}
                className="text-xs text-muted-foreground hover:text-foreground font-semibold flex items-center gap-1"
              >
                <X className="size-3.5" /> Close
              </button>
            </div>

            {/* 3D Colorful Flashcard (from Sketch 1: "Colorful cards, Flip, < Prev, Next >") */}
            <div
              onClick={() => setCardFlipped((f) => !f)}
              className={cn(
                "mt-2 min-h-36 sm:min-h-40 cursor-pointer select-none rounded-2xl border p-5 shadow-sm flex flex-col justify-center items-center text-center transition-all bg-linear-to-br hover:shadow-md active:scale-98",
                FLASHCARD_GRADIENTS[currentCardIndex % FLASHCARD_GRADIENTS.length]
              )}
            >
              <span className="text-[10px] font-bold uppercase tracking-widest opacity-80 mb-1.5">
                {cardFlipped ? "Answer / Definition" : "Question / Concept"}
              </span>
              <p className="font-display text-base sm:text-lg font-bold leading-relaxed px-2">
                {cardFlipped ? flashcards[currentCardIndex]?.back : flashcards[currentCardIndex]?.front}
              </p>
              <span className="mt-3 text-[10px] opacity-75 font-medium flex items-center gap-1">
                <RotateCcw className="size-2.5" /> Tap card to flip
              </span>
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
                className="h-8 rounded-xl text-xs font-semibold"
              >
                &lt; Prev
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={() => setCardFlipped((f) => !f)}
                className="h-8 rounded-xl text-xs gap-1 font-semibold"
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
                Next &gt;
              </Button>
            </div>
          </div>
        )}

        {/* Interactive Mode 2: MCQ Quiz (Sketch 2 & 3) */}
        {quizQuestions && quizQuestions[0]?.type === "objective" && (
          <div className="border-b border-border/80 bg-primary/5 p-3 sm:p-4 shrink-0 transition-all max-h-[48vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-1.5">
              <span className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                <HelpCircle className="size-3.5" />
                MCQ Question {currentQuizIndex + 1} of {quizQuestions.length}
                <span className="text-[10px] font-normal lowercase text-muted-foreground">
                  ({mcqMode === "as_you_go" ? "instant marking" : "mark at end"})
                </span>
              </span>
              <button
                type="button"
                onClick={() => setQuizQuestions(null)}
                className="text-xs text-muted-foreground hover:text-foreground font-semibold flex items-center gap-1"
              >
                <X className="size-3.5" /> Close
              </button>
            </div>

            <p className="font-semibold text-xs sm:text-sm text-foreground mt-1">
              {quizQuestions[currentQuizIndex]?.question}
            </p>

            {/* Radio Choices A, B, C, D */}
            <div className="mt-2.5 grid gap-1.5 sm:grid-cols-2">
              {quizQuestions[currentQuizIndex]?.options?.map((opt, i) => {
                const userChoice = selectedObjectiveAnswers[currentQuizIndex];
                const isSelected = userChoice === i;
                const isCorrect = i === quizQuestions[currentQuizIndex]?.correctOptionIndex;
                const showFeedback =
                  mcqMode === "as_you_go"
                    ? userChoice !== undefined
                    : isMcqSubmittedAtEnd;

                return (
                  <button
                    key={i}
                    type="button"
                    disabled={showFeedback && mcqMode === "as_you_go"}
                    onClick={() => {
                      setSelectedObjectiveAnswers((prev) => ({ ...prev, [currentQuizIndex]: i }));
                      if (mcqMode === "as_you_go") {
                        if (isCorrect) {
                          setQuizScores((prev) => ({ ...prev, [currentQuizIndex]: 1 }));
                          toast.success("Correct answer!");
                        } else {
                          toast.error("Incorrect. See explanation.");
                        }
                      }
                    }}
                    className={cn(
                      "rounded-xl border p-2.5 text-left text-xs font-medium transition-all",
                      !showFeedback
                        ? isSelected
                          ? "border-primary bg-primary/10 text-primary font-bold"
                          : "border-border bg-card hover:border-primary/50"
                        : isCorrect
                        ? "border-emerald-500 bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 font-bold"
                        : isSelected
                        ? "border-destructive bg-destructive/15 text-destructive font-bold"
                        : "border-border/60 opacity-60"
                    )}
                  >
                    <span className="font-mono mr-2">{String.fromCharCode(65 + i)}.</span>
                    {opt}
                  </button>
                );
              })}
            </div>

            {/* Explanation when marked */}
            {((mcqMode === "as_you_go" && selectedObjectiveAnswers[currentQuizIndex] !== undefined) ||
              isMcqSubmittedAtEnd) && (
              <div className="mt-2.5 rounded-xl bg-card p-2.5 text-[11px] border border-border/70">
                <p className="font-bold text-foreground">Explanation:</p>
                <p className="text-muted-foreground mt-0.5">{quizQuestions[currentQuizIndex]?.explanation}</p>
              </div>
            )}

            {/* MCQ Controls */}
            <div className="mt-3 flex items-center justify-between border-t border-border/40 pt-2">
              <Button
                size="sm"
                variant="ghost"
                disabled={currentQuizIndex === 0}
                onClick={() => setCurrentQuizIndex((i) => i - 1)}
                className="h-7 text-xs"
              >
                Previous
              </Button>

              {mcqMode === "at_the_end" && !isMcqSubmittedAtEnd && (
                <Button
                  size="sm"
                  onClick={handleMcqSubmitAtEnd}
                  className="h-7 text-xs font-bold bg-primary text-primary-foreground"
                >
                  Submit Quiz
                </Button>
              )}

              <Button
                size="sm"
                variant="outline"
                disabled={currentQuizIndex >= quizQuestions.length - 1}
                onClick={() => setCurrentQuizIndex((i) => i + 1)}
                className="h-7 text-xs font-semibold gap-1"
              >
                Next <ChevronRight className="size-3" />
              </Button>
            </div>
          </div>
        )}

        {/* Interactive Mode 3: Theory Quiz (Sketch 2 & 4) */}
        {quizQuestions && quizQuestions[0]?.type === "theory" && (
          <div className="border-b border-border/80 bg-primary/5 p-3 sm:p-4 shrink-0 transition-all max-h-[50vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-1.5">
              <span className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                <FileText className="size-3.5" />
                Theory Question {currentQuizIndex + 1} of {quizQuestions.length}
                <span className="rounded-full bg-primary/10 text-primary px-2 py-0.5 text-[10px] font-bold">
                  (5 Marks)
                </span>
              </span>
              <button
                type="button"
                onClick={() => setQuizQuestions(null)}
                className="text-xs text-muted-foreground hover:text-foreground font-semibold flex items-center gap-1"
              >
                <X className="size-3.5" /> Close
              </button>
            </div>

            <p className="font-semibold text-xs sm:text-sm text-foreground mt-1">
              {quizQuestions[currentQuizIndex]?.question}
            </p>

            {/* Theory Answer Field with Tactile Keyboard Integration */}
            <div className="mt-2.5 space-y-2">
              <textarea
                value={theoryAnswerInput}
                onChange={(e) => setTheoryAnswerInput(e.target.value)}
                onFocus={() => setShowCustomKeyboard(true)}
                onClick={() => setShowCustomKeyboard(true)}
                inputMode="none"
                placeholder="Type your structured examination answer using Syllaboss keyboard..."
                className="w-full min-h-20 rounded-xl border border-border bg-card p-2.5 text-xs text-foreground resize-none focus:outline-hidden"
              />

              <div className="flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground">
                  Marked against academic rubrics
                </span>
                <Button
                  size="sm"
                  disabled={gradingTheory || !theoryAnswerInput.trim()}
                  onClick={handleGradeCurrentTheory}
                  className="h-7 text-xs font-bold gap-1"
                >
                  {gradingTheory ? <Loader2 className="size-3 animate-spin" /> : <Check className="size-3" />}
                  Submit for Marking
                </Button>
              </div>

              {/* Theory Feedback from Teacher */}
              {theoryFeedbackMap[currentQuizIndex] && (
                <div className="rounded-xl border border-primary/40 bg-card p-3 text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-foreground">Score Awarded:</span>
                    <span className="rounded-full bg-primary text-primary-foreground font-bold px-2.5 py-0.5 text-xs">
                      {theoryFeedbackMap[currentQuizIndex].score} / 10 Marks
                    </span>
                  </div>
                  <p className="text-muted-foreground">{theoryFeedbackMap[currentQuizIndex].feedback}</p>
                  <p className="text-[10px] text-muted-foreground border-t border-border/50 pt-1">
                    <strong>Model Answer:</strong> {quizQuestions[currentQuizIndex]?.modelAnswer}
                  </p>
                </div>
              )}
            </div>

            {/* Controls */}
            <div className="mt-3 flex items-center justify-between border-t border-border/40 pt-2">
              <Button
                size="sm"
                variant="ghost"
                disabled={currentQuizIndex === 0}
                onClick={() => {
                  setCurrentQuizIndex((i) => i - 1);
                  setTheoryAnswerInput(theoryAnswersMap[currentQuizIndex - 1] || "");
                }}
                className="h-7 text-xs"
              >
                Previous
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={currentQuizIndex >= quizQuestions.length - 1}
                onClick={() => {
                  setCurrentQuizIndex((i) => i + 1);
                  setTheoryAnswerInput(theoryAnswersMap[currentQuizIndex + 1] || "");
                }}
                className="h-7 text-xs font-semibold gap-1"
              >
                Next <ChevronRight className="size-3" />
              </Button>
            </div>
          </div>
        )}

        {/* Messages Stream */}
        <div
          ref={messagesScrollRef}
          onScroll={handleScroll}
          className="flex-1 min-h-0 overflow-y-auto overscroll-contain scroll-smooth p-3 sm:p-4 space-y-3.5 [scrollbar-width:thin] [scrollbar-color:theme(colors.border)_transparent]"
        >
          {messages.length === 0 ? (
            <div className="grid h-full place-items-center p-4 text-center">
              <div className="max-w-md space-y-2.5">
                <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary">
                  <Bot className="size-6" />
                </div>
                <h3 className="font-display text-lg font-bold text-foreground">
                  Boss AI Assistant
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Ask any question, attach your lecture notes, or tap <strong>+</strong> in the typing bar to take an MCQ Quiz, Theory Test, or create Flashcards.
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
                    onClick={() => {
                      setMcqCount(5);
                      setIsMcqConfigOpen(true);
                    }}
                    className="rounded-xl border border-border/80 bg-card p-2.5 text-xs font-medium hover:border-primary transition-all"
                  >
                    5 Practice Multiple Choice Questions
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFlashcardCount(10);
                      setIsFlashcardConfigOpen(true);
                    }}
                    className="rounded-xl border border-border/80 bg-card p-2.5 text-xs font-medium hover:border-primary transition-all"
                  >
                    Generate 10 Study Flashcards
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="rounded-xl border border-dashed border-primary/50 bg-primary/5 p-2.5 text-xs font-medium text-primary hover:bg-primary/10 transition-all"
                  >
                    Attach note / past question
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
                        onClick={() => toggleSpeechPlayback(m.id, m.content)}
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
                      <AiMessageRenderer content={m.content} />
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
              <span>Boss AI is composing your response...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Floating Scroll to Bottom Arrow Button (per prompt requirement) */}
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
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={cancelRecording}
                className="text-xs text-muted-foreground hover:text-red-600 font-medium px-2 py-1"
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

        {/* ========================================================================= */}
        {/* MODERN GEMINI / CHATGPT AUTOGROWING TYPING BAR */}
        {/* ========================================================================= */}
        <div className="shrink-0 border-t border-border/60 bg-card p-2 sm:p-3 relative z-20">
          {/* Drop-up Menu for MCQ, Theory, Flashcards, Assignments */}
          <AnimatePresence>
            {showDropUpMenu && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="absolute bottom-full left-3 mb-2 w-64 rounded-2xl border border-border/80 bg-card p-2 shadow-2xl z-40 space-y-1 font-sans"
              >
                <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Study Modes & Tools
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setShowDropUpMenu(false);
                    setIsMcqConfigOpen(true);
                  }}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left text-xs font-semibold text-foreground hover:bg-primary/10 hover:text-primary transition-all"
                >
                  <CheckCircle2 className="size-4 text-primary" />
                  <div>
                    <p className="leading-tight">MCQ Quiz</p>
                    <p className="text-[10px] text-muted-foreground font-normal">5 to 30 practice questions</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowDropUpMenu(false);
                    setIsTheoryConfigOpen(true);
                  }}
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
                  onClick={() => {
                    setShowDropUpMenu(false);
                    setIsFlashcardConfigOpen(true);
                  }}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left text-xs font-semibold text-foreground hover:bg-primary/10 hover:text-primary transition-all"
                >
                  <Layers className="size-4 text-indigo-500" />
                  <div>
                    <p className="leading-tight">Flashcards</p>
                    <p className="text-[10px] text-muted-foreground font-normal">Colorful 3D cards</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowDropUpMenu(false);
                    setIsAssignmentModalOpen(true);
                  }}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left text-xs font-semibold text-foreground hover:bg-primary/10 hover:text-primary transition-all"
                >
                  <BookOpen className="size-4 text-amber-500" />
                  <div>
                    <p className="leading-tight">Assignment Helper</p>
                    <p className="text-[10px] text-muted-foreground font-normal">Detailed or short breakdown</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={triggerSummarize}
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

          {/* Autogrowing Typing Capsule */}
          <div className="rounded-2xl sm:rounded-3xl border border-border/80 bg-secondary/30 dark:bg-zinc-900/50 p-2 sm:p-2.5 shadow-xs transition-all focus-within:border-primary/50 focus-within:bg-card">
            {/* Native keyboard completely suppressed: inputMode="none" */}
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                // 1 line default, lifts smoothly to line 2 & 3, scrolls at line 4+
                e.target.style.height = "auto";
                e.target.style.height = `${Math.min(e.target.scrollHeight, 84)}px`;
              }}
              onFocus={() => setShowCustomKeyboard(true)}
              onClick={() => setShowCustomKeyboard(true)}
              inputMode="none"
              placeholder={
                activeDocContext
                  ? `Ask about "${activeDocContext.title}"...`
                  : "Type prompt or tap + for study modes..."
              }
              rows={1}
              className="w-full resize-none bg-transparent text-xs sm:text-sm text-foreground focus:outline-hidden min-h-[26px] max-h-[84px] overflow-y-auto px-1 py-0.5 leading-relaxed"
            />

            {/* Inner Actions Row: + Drop-up, Upload, Voice Note, Send ALL INSIDE typing bar */}
            <div className="flex items-center justify-between pt-1 border-t border-border/40 mt-1">
              <div className="flex items-center gap-1">
                {/* + Drop-up Menu Trigger */}
                <button
                  type="button"
                  onClick={() => setShowDropUpMenu((prev) => !prev)}
                  title="Study modes: MCQ, Theory, Flashcards, Assignments"
                  className={cn(
                    "size-8 rounded-full grid place-items-center transition-all text-foreground hover:bg-secondary",
                    showDropUpMenu && "bg-primary text-primary-foreground"
                  )}
                >
                  <Plus className="size-4" />
                </button>

                {/* Upload Button Inside Typing Bar */}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  className="hidden"
                  accept=".pdf,.doc,.docx,.txt,image/*"
                />
                <button
                  type="button"
                  disabled={uploadingDoc}
                  onClick={() => fileInputRef.current?.click()}
                  title="Attach file to library & study"
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
                {/* Voice Note Button Inside Typing Bar */}
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

                {/* Send Button Inside Typing Bar */}
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
        {/* CUSTOM KEYBOARD: Rendered fixed edge-to-edge full width of phone */}
        {/* ========================================================================= */}
        <AnimatePresence>
          {showCustomKeyboard && (
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
      {/* TOP RIGHT VERTICAL TRIPLE DOTS MENU (Previous Chats + New Chat) */}
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

            {/* Document upload in menu */}
            <div className="rounded-xl border border-dashed border-primary/40 bg-primary/5 p-2.5 text-center">
              <input
                type="file"
                ref={menuFileInputRef}
                onChange={(e) => {
                  handleFileUpload(e);
                  setShowMenuDrawer(false);
                }}
                className="hidden"
                accept=".pdf,.doc,.docx,.txt,image/*"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={uploadingDoc}
                onClick={() => menuFileInputRef.current?.click()}
                className="w-full gap-2 rounded-lg text-xs font-semibold border-primary/30 text-primary hover:bg-primary/10 h-8"
              >
                <Paperclip className="size-3.5" />
                {uploadingDoc ? "Processing..." : "Add Document to Session"}
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
      {/* MODAL: MCQ CONFIGURATION (Sketch 2: Mark as you go vs at the end; 5-30) */}
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
                {[5, 10, 15, 20, 25, 30].map((num) => (
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
              onClick={startMcqQuiz}
              className="w-full mt-2 rounded-xl font-bold h-9 text-xs"
            >
              Start MCQ Quiz
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL: MCQ UNANSWERED QUESTIONS WARNING (Sketch 2 requirement) */}
      {/* ========================================================================= */}
      <Dialog
        open={Boolean(unansweredWarningQuestions)}
        onOpenChange={() => setUnansweredWarningQuestions(null)}
      >
        <DialogContent className="max-w-sm rounded-3xl p-5 border-border bg-card">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-amber-600">
              <AlertCircle className="size-4" /> Unanswered Questions
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 mt-2 text-xs">
            <p className="text-muted-foreground leading-relaxed">
              You haven't answered question(s):{" "}
              <strong>{unansweredWarningQuestions?.join(", ")}</strong>.
            </p>
            <p className="text-muted-foreground">
              Would you like to go back and answer them or skip and submit anyway?
            </p>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  if (unansweredWarningQuestions?.[0]) {
                    setCurrentQuizIndex(unansweredWarningQuestions[0] - 1);
                  }
                  setUnansweredWarningQuestions(null);
                }}
                className="rounded-xl text-xs"
              >
                Answer Question
              </Button>
              <Button
                variant="destructive"
                onClick={finalizeMcqSubmission}
                className="rounded-xl text-xs"
              >
                Skip & Submit
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL: THEORY CONFIGURATION (Sketch 2 & 4: Mark as you go vs end; 5-30) */}
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
                {[5, 10, 15, 20, 25, 30].map((num) => (
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
              onClick={startTheoryQuiz}
              className="w-full mt-2 rounded-xl font-bold h-9 text-xs"
            >
              Start Theory Test
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL: FLASHCARD CONFIGURATION (Sketch 1 & 2: Q&A / Fill in blank; 5-50) */}
      {/* ========================================================================= */}
      <Dialog open={isFlashcardConfigOpen} onOpenChange={setIsFlashcardConfigOpen}>
        <DialogContent className="max-w-sm rounded-3xl p-5 border-border bg-card">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Layers className="size-4 text-indigo-500" /> Create Study Flashcards
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 mt-2 text-xs">
            <div>
              <label className="font-semibold text-muted-foreground block mb-1">
                Flashcard Style:
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
                  Q & A Mode
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
                  Fill in the Blank
                </button>
              </div>
            </div>

            <div>
              <label className="font-semibold text-muted-foreground block mb-1">
                Number of Flashcards (Sketch 1):
              </label>
              <div className="flex items-center gap-1.5 flex-wrap">
                {[5, 10, 15, 20, 30, 40, 50].map((num) => (
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
              onClick={startFlashcards}
              className="w-full mt-2 rounded-xl font-bold h-9 text-xs"
            >
              Generate Flashcards
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL: ASSIGNMENT HELPER (Sketch 2: Detailed vs Short) */}
      {/* ========================================================================= */}
      <Dialog open={isAssignmentModalOpen} onOpenChange={setIsAssignmentModalOpen}>
        <DialogContent className="max-w-md rounded-3xl p-5 border-border bg-card">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <BookOpen className="size-4 text-amber-500" /> Assignment Helper
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 mt-2 text-xs">
            <p className="text-muted-foreground">
              Paste your assignment question or essay prompt below:
            </p>

            <textarea
              value={assignmentInput}
              onChange={(e) => setAssignmentInput(e.target.value)}
              placeholder="Paste assignment problem, essay prompt, or case study..."
              className="w-full min-h-24 rounded-xl border border-border bg-secondary/30 p-2.5 text-xs text-foreground resize-none focus:outline-hidden"
            />

            <div>
              <label className="font-semibold text-muted-foreground block mb-1">
                Solution Format:
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
                  Detailed (Step-by-step)
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
                  Short (Key Highlights)
                </button>
              </div>
            </div>

            <Button
              type="button"
              disabled={!assignmentInput.trim()}
              onClick={handleAssignmentSubmit}
              className="w-full mt-2 rounded-xl font-bold h-9 text-xs"
            >
              Analyze & Assist with Assignment
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
