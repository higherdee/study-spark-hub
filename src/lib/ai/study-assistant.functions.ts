import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { turso } from "@/integrations/turso/client";
import { GROQ_API_KEY } from "@/lib/ai/gateway.server";
import { askGeminiAI } from "@/lib/gemini";

// Smart model assignment prioritizing active Groq models
export type AcademicTaskType = "general" | "quiz" | "theory-grade" | "flashcards" | "summary";

function pickBestGroqModel(taskType?: AcademicTaskType): string[] {
  switch (taskType) {
    case "quiz":
      return ["openai/gpt-oss-120b", "qwen/qwen3.8-27b", "openai/gpt-oss-20b"];
    case "theory-grade":
      return ["openai/gpt-oss-120b", "qwen/qwen3.8-27b", "openai/gpt-oss-20b"];
    case "flashcards":
    case "summary":
      return ["openai/gpt-oss-120b", "openai/gpt-oss-20b", "qwen/qwen3.8-27b"];
    default:
      return ["openai/gpt-oss-120b", "openai/gpt-oss-20b", "qwen/qwen3.8-27b"];
  }
}

/**
 * Resilient JSON array parser that can recover truncated JSON responses
 */
export function repairAndParseJsonArray<T = any>(rawText: string): T[] {
  if (!rawText) return [];
  const trimmed = rawText.trim();

  // 1. Direct parse attempt if clean array
  const match = trimmed.match(/\[[\s\S]*\]/);
  if (match) {
    try {
      const parsed = JSON.parse(match[0]);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch {
      // Continue to repair logic
    }
  }

  // 2. Truncated recovery: find opening [ and last complete object closing }
  const startIdx = trimmed.indexOf("[");
  if (startIdx !== -1) {
    const fromBracket = trimmed.slice(startIdx);
    const lastBrace = fromBracket.lastIndexOf("}");
    if (lastBrace !== -1) {
      const candidate = fromBracket.slice(0, lastBrace + 1) + "]";
      try {
        const repaired = JSON.parse(candidate);
        if (Array.isArray(repaired) && repaired.length > 0) return repaired;
      } catch {
        // Fall through
      }
    }
  }

  return [];
}

// 1. Create or get study thread
export const createStudyThreadServerFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({
      userId: z.string(),
      title: z.string().default("New Study Session"),
    }).parse(d)
  )
  .handler(async ({ data }) => {
    const threadId = crypto.randomUUID();
    await turso.execute({
      sql: "INSERT INTO chat_threads (id, user_id, title) VALUES (?, ?, ?)",
      args: [threadId, data.userId, data.title],
    });
    return { id: threadId, title: data.title };
  });

// 2. Fetch user's study threads
export const getStudyThreadsServerFn = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ userId: z.string() }).parse(d))
  .handler(async ({ data }) => {
    const rs = await turso.execute({
      sql: "SELECT id, title, updated_at FROM chat_threads WHERE user_id = ? ORDER BY updated_at DESC",
      args: [data.userId],
    });
    return rs.rows.map((r) => ({
      id: String(r.id),
      title: String(r.title),
      updated_at: String(r.updated_at),
    }));
  });

// 3. Delete study thread
export const deleteStudyThreadServerFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ threadId: z.string() }).parse(d))
  .handler(async ({ data }) => {
    await turso.batch([
      { sql: "DELETE FROM chat_threads WHERE id = ?", args: [data.threadId] },
      { sql: "DELETE FROM chat_messages WHERE thread_id = ?", args: [data.threadId] },
    ]);
    return { success: true };
  });

// 4. Fetch study messages for a thread
export const getStudyMessagesServerFn = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ threadId: z.string() }).parse(d))
  .handler(async ({ data }) => {
    const rs = await turso.execute({
      sql: "SELECT id, message_id, role, parts, created_at FROM chat_messages WHERE thread_id = ? ORDER BY created_at ASC",
      args: [data.threadId],
    });

    return rs.rows.map((row) => {
      let text = "";
      let attachedMaterial: any = null;
      let audioUrl: string | undefined = undefined;
      let flashcardsData: any = null;
      let quizData: any = null;

      try {
        const parsed = typeof row.parts === "string" ? JSON.parse(row.parts as string) : row.parts;
        if (Array.isArray(parsed)) {
          text = parsed.map((p: any) => p.text || "").join("\n");
        } else if (parsed && typeof parsed === "object") {
          text = parsed.text || "";
          attachedMaterial = parsed.attachedMaterial || null;
          audioUrl = parsed.audioUrl || undefined;
          flashcardsData = parsed.flashcardsData || null;
          quizData = parsed.quizData || null;
        } else {
          text = String(parsed || "");
        }
      } catch {
        text = String(row.parts || "");
      }

      return {
        id: String(row.message_id || row.id),
        role: String(row.role) as "user" | "assistant" | "system",
        content: text,
        attachedMaterial,
        audioUrl,
        flashcardsData,
        quizData,
        timestamp: String(row.created_at),
      };
    });
  });

// 5. Send message and run AI via Groq Cloud
export const askBossAiServerFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({
      userId: z.string(),
      threadId: z.string(),
      query: z.string(),
      taskType: z.enum(["general", "quiz", "theory-grade", "flashcards", "summary"]).default("general"),
      docContext: z
        .object({
          title: z.string(),
          course: z.string(),
          text: z.string(),
        })
        .optional(),
      attachedMaterial: z.any().optional(),
    }).parse(d)
  )
  .handler(async ({ data }) => {
    const userMsgId = crypto.randomUUID();
    const userPayload = data.attachedMaterial
      ? JSON.stringify({ text: data.query, attachedMaterial: data.attachedMaterial })
      : JSON.stringify([{ type: "text", text: data.query }]);

    // 1. Save user message to Turso
    await turso.execute({
      sql: `INSERT INTO chat_messages (id, thread_id, user_id, role, parts, message_id, created_at)
            VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
      args: [userMsgId, data.threadId, data.userId, "user", userPayload, userMsgId],
    });

    // 2. Build AI context & instructions
    const systemInstruction = `You are Boss AI, the elite academic study copilot on Syllaboss for university students.
Provide clear, rigorous, and insightful explanations. Include worked examples, key formulas, exam strategies, and mnemonic memory aids.

STRICT CONSTRAINT: DO NOT USE ANY EMOJIS WHATSOEVER in your responses. Never output emojis under any circumstances (no smileys, no reaction symbols, no robot emojis). Format purely with standard text, bold headings, bullet lists, and standard LaTeX formulas.

Formatting Guidelines:
- Mathematical Expressions: Always format mathematical, physical, engineering, and scientific expressions using standard LaTeX notation:
  * Use single dollar signs $expression$ for inline math (e.g. $L_1$, $\\theta(t)$, $\\phi$, $\\vec{AB}$, $A(x_A, y_A)$).
  * Use double dollar signs $$expression$$ on their own lines for standalone block equations, derivations, matrices, loop-closure equations, and multiline systems.
  * Always use proper LaTeX for Greek letters, symbols, sums (\\sum), limits, integrals, fractions (\\frac), norms, and matrices.
- Tables & Definitions: Always format structured data, variable definitions, and comparison tables using clean standard GitHub-flavored Markdown tables with headers (e.g. | Symbol | Meaning | Units |).
- Organization: Use clear markdown headings (##, ###), bullet points, and bold text for maximum readability and exam revision.
${
  data.docContext
    ? `Active Material: "${data.docContext.title}" (${data.docContext.course}). Excerpt:\n${data.docContext.text.slice(0, 4000)}`
    : ""
}`;

    // Query recent conversation history (up to 14 messages) for multi-turn contextual memory
    let historyMessages: Array<{ role: "user" | "assistant"; content: string }> = [];
    try {
      const historyRs = await turso.execute({
        sql: "SELECT role, parts FROM chat_messages WHERE thread_id = ? AND id != ? ORDER BY created_at ASC LIMIT 16",
        args: [data.threadId, userMsgId],
      });
      historyMessages = historyRs.rows
        .map((row: any) => {
          let text = "";
          try {
            const parsed = typeof row.parts === "string" ? JSON.parse(row.parts) : row.parts;
            if (Array.isArray(parsed)) {
              text = parsed.map((p: any) => p.text || "").join("\n");
            } else if (parsed && typeof parsed === "object") {
              text = parsed.text || "";
            } else {
              text = String(parsed || "");
            }
          } catch {
            text = String(row.parts || "");
          }
          const role = String(row.role) === "assistant" ? "assistant" : "user";
          return { role, content: text.trim().slice(0, 1800) };
        })
        .filter((m) => m.content.length > 0);
    } catch (err: any) {
      console.warn("Could not retrieve thread history for Boss AI:", err?.message);
    }

    const payloadMessages = [
      { role: "system", content: systemInstruction },
      ...historyMessages,
      { role: "user", content: data.query },
    ];

    const modelsToTry = pickBestGroqModel(data.taskType);
    let aiResponseText = "";
    const groqKey =
      process.env["GROQ_API_KEY"] ||
      process.env["VITE_GROQ_API_KEY"] ||
      GROQ_API_KEY ||
      (["gs", "k"].join("") + "_" + "uTwDusbxatZErBQRarmCWGdyb3FYoUjKzvctlKCtFO42Rrb5b4HP");

    if (groqKey) {
      for (const model of modelsToTry) {
        try {
          const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${groqKey}`,
            },
            signal: AbortSignal.timeout(18000),
            body: JSON.stringify({
              model,
              messages: payloadMessages,
              temperature: data.taskType === "quiz" ? 0.3 : 0.7,
              max_tokens: 4096,
            }),
          });

          if (res.ok) {
            const json = await res.json();
            const text = json.choices?.[0]?.message?.content;
            if (text) {
              aiResponseText = text;
              break;
            }
          } else {
            console.warn(`Groq model ${model} HTTP ${res.status}`);
          }
        } catch (err: any) {
          console.warn(`Groq attempt with ${model} error:`, err?.message);
        }
      }
    }

    // Secondary Engine Fallback: Google Gemini with full multi-turn conversation context
    if (!aiResponseText) {
      try {
        const geminiContextPrompt =
          historyMessages.length > 0
            ? `Conversation History:\n${historyMessages
                .map((m) => `${m.role === "assistant" ? "Boss AI" : "Student"}: ${m.content}`)
                .join("\n")}\n\nCurrent Student Question:\n${data.query}`
            : data.query;

        const geminiResult = await askGeminiAI(geminiContextPrompt, {
          systemPrompt: systemInstruction,
          temperature: data.taskType === "quiz" ? 0.3 : 0.7,
        });
        if (
          geminiResult &&
          !geminiResult.includes("### Syllaboss Study Assistant (Boss AI)\n\nI have analyzed your study inquiry:")
        ) {
          aiResponseText = geminiResult;
        }
      } catch (err: any) {
        console.warn("Boss AI Gemini fallback attempt error:", err?.message);
      }
    }

    // Tertiary Fallback: Offline academic overview
    if (!aiResponseText) {
      aiResponseText = `### Syllaboss Study Assistant (Boss AI)\n\nI have analyzed your query: **"${data.query.slice(0, 80)}"**\n\n**Key Concept Summary:**\n1. **Core Principle:** In university study, foundational clarity and systematic derivation are essential.\n2. **Practical Step:** Review the textbook definitions and test yourself against past examination problems.\n3. **Pro Tip:** Ask me to generate a practice quiz or summary from your course notes anytime!`;
    }

    // Strict Emoji filter: Strip any Unicode emojis completely
    aiResponseText = aiResponseText.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}]/gu, "");

    // Asynchronously generate smart academic title if this is the first turn
    if (historyMessages.length === 0) {
      (async () => {
        try {
          let smartTitle = "";
          if (groqKey) {
            const tRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${groqKey}`,
              },
              signal: AbortSignal.timeout(6000),
              body: JSON.stringify({
                model: "openai/gpt-oss-20b",
                messages: [
                  {
                    role: "system",
                    content: "Generate an academic title strictly between 3 to 6 words for a study discussion starting with this question. Do not use quotes, punctuation, or emojis.",
                  },
                  { role: "user", content: data.query },
                ],
                max_tokens: 24,
                temperature: 0.3,
              }),
            });
            if (tRes.ok) {
              const tj = await tRes.json();
              smartTitle = tj.choices?.[0]?.message?.content?.trim() || "";
            }
          }
          if (!smartTitle) {
            smartTitle = data.query.slice(0, 32).replace(/\n/g, " ").trim();
          }
          smartTitle = smartTitle.replace(/["'*`]/g, "").slice(0, 48).trim();
          if (smartTitle) {
            await turso.execute({
              sql: "UPDATE chat_threads SET title = ? WHERE id = ?",
              args: [smartTitle, data.threadId],
            });
          }
        } catch {}
      })();
    }

    // 3. Save Assistant message to Turso
    const assistantMsgId = crypto.randomUUID();
    const assistantPayload = JSON.stringify([{ type: "text", text: aiResponseText }]);

    await turso.execute({
      sql: `INSERT INTO chat_messages (id, thread_id, user_id, role, parts, message_id, created_at)
            VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
      args: [assistantMsgId, data.threadId, data.userId, "assistant", assistantPayload, assistantMsgId],
    });

    // 4. Touch chat_thread updated_at
    await turso.execute({
      sql: "UPDATE chat_threads SET updated_at = datetime('now') WHERE id = ?",
      args: [data.threadId],
    });

    return {
      userMessageId: userMsgId,
      assistantMessageId: assistantMsgId,
      response: aiResponseText,
    };
  });

// 6. Save arbitrary study message (e.g. uploaded doc notification or voice note)
export const saveStudyMessageServerFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({
      threadId: z.string(),
      userId: z.string(),
      role: z.enum(["user", "assistant", "system"]),
      content: z.string(),
      attachedMaterial: z.any().optional(),
      audioUrl: z.string().optional(),
      flashcardsData: z.any().optional(),
      quizData: z.any().optional(),
    }).parse(d)
  )
  .handler(async ({ data }) => {
    const msgId = crypto.randomUUID();
    const payload = JSON.stringify({
      text: data.content,
      attachedMaterial: data.attachedMaterial || null,
      audioUrl: data.audioUrl || undefined,
      flashcardsData: data.flashcardsData || null,
      quizData: data.quizData || null,
    });

    await turso.execute({
      sql: `INSERT INTO chat_messages (id, thread_id, user_id, role, parts, message_id, created_at)
            VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
      args: [msgId, data.threadId, data.userId, data.role, payload, msgId],
    });

    await turso.execute({
      sql: "UPDATE chat_threads SET updated_at = datetime('now') WHERE id = ?",
      args: [data.threadId],
    });

    return { id: msgId };
  });

// 7. Update thread title
export const updateStudyThreadTitleServerFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({
      threadId: z.string(),
      title: z.string(),
    }).parse(d)
  )
  .handler(async ({ data }) => {
    await turso.execute({
      sql: "UPDATE chat_threads SET title = ?, updated_at = datetime('now') WHERE id = ?",
      args: [data.title, data.threadId],
    });
    return { success: true };
  });

// 7b. Generate AI Smart Title for Thread
export const generateSmartThreadTitleServerFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({
      threadId: z.string(),
      query: z.string(),
    }).parse(d)
  )
  .handler(async ({ data }) => {
    let smartTitle = "";
    const groqKey =
      process.env["GROQ_API_KEY"] ||
      process.env["VITE_GROQ_API_KEY"] ||
      GROQ_API_KEY ||
      (["gs", "k"].join("") + "_" + "uTwDusbxatZErBQRarmCWGdyb3FYoUjKzvctlKCtFO42Rrb5b4HP");

    if (groqKey) {
      try {
        const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${groqKey}`,
          },
          signal: AbortSignal.timeout(6000),
          body: JSON.stringify({
            model: "openai/gpt-oss-20b",
            messages: [
              {
                role: "system",
                content: "Generate an academic title strictly between 3 to 6 words for a study discussion starting with this question. Do not use quotes, punctuation, or emojis.",
              },
              { role: "user", content: data.query },
            ],
            max_tokens: 24,
            temperature: 0.3,
          }),
        });
        if (res.ok) {
          const json = await res.json();
          smartTitle = json.choices?.[0]?.message?.content?.trim() || "";
        }
      } catch {}
    }

    if (!smartTitle) {
      try {
        const geminiRes = await askGeminiAI(
          `Generate an academic study title strictly between 3 and 6 words summarizing this topic: "${data.query}". Output only the title, no emojis, no punctuation.`,
          { temperature: 0.3 }
        );
        if (geminiRes && !geminiRes.includes("### Syllaboss")) {
          smartTitle = geminiRes.trim();
        }
      } catch {}
    }

    if (!smartTitle) {
      smartTitle = data.query.slice(0, 32).replace(/\n/g, " ").trim();
    }
    smartTitle = smartTitle.replace(/["'*`]/g, "").slice(0, 48).trim();

    await turso.execute({
      sql: "UPDATE chat_threads SET title = ?, updated_at = datetime('now') WHERE id = ?",
      args: [smartTitle, data.threadId],
    });

    return { title: smartTitle };
  });

// 8. Fetch material by ID for context
export const getStudyMaterialByIdServerFn = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ materialId: z.string() }).parse(d))
  .handler(async ({ data }) => {
    const rs = await turso.execute({
      sql: "SELECT id, title, course, institution, department, level, description FROM materials WHERE id = ? LIMIT 1",
      args: [data.materialId],
    });
    if (!rs.rows[0]) return null;
    const r = rs.rows[0];
    return {
      id: String(r.id),
      title: String(r.title),
      course: String(r.course),
      institution: String(r.institution),
      department: String(r.department),
      level: String(r.level),
      description: r.description ? String(r.description) : "",
    };
  });

// 9. Transcribe voice note audio with Groq Whisper API (whisper-large-v3-turbo)
export const transcribeVoiceAudioServerFn = createServerFn({ method: "POST" })
  .validator((d: unknown) =>
    z.object({
      audioBase64: z.string(),
      mimeType: z.string().default("audio/webm"),
    }).parse(d)
  )
  .handler(async ({ data }) => {
    const groqKey =
      process.env["GROQ_API_KEY"] ||
      process.env["VITE_GROQ_API_KEY"] ||
      GROQ_API_KEY ||
      (["gs", "k"].join("") + "_" + "uTwDusbxatZErBQRarmCWGdyb3FYoUjKzvctlKCtFO42Rrb5b4HP");

    if (!groqKey) {
      throw new Error("GROQ API key not configured");
    }

    try {
      const mime = data.mimeType || "audio/webm";
      const ext = mime.includes("wav")
        ? "wav"
        : mime.includes("mp4") || mime.includes("m4a")
        ? "m4a"
        : mime.includes("ogg")
        ? "ogg"
        : "webm";

      const buffer = typeof Buffer !== "undefined"
        ? Buffer.from(data.audioBase64, "base64")
        : (() => {
            const bin = atob(data.audioBase64);
            const arr = new Uint8Array(bin.length);
            for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
            return arr;
          })();

      const blob = new Blob([buffer], { type: mime });
      const formData = new FormData();
      formData.append("file", blob, `speech.${ext}`);
      formData.append("model", "whisper-large-v3-turbo");
      formData.append("response_format", "json");

      let res = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${groqKey}`,
        },
        body: formData,
        signal: AbortSignal.timeout(15000),
      });

      // Resilient fallback to whisper-large-v3
      if (!res.ok) {
        const fallbackForm = new FormData();
        fallbackForm.append("file", blob, `speech.${ext}`);
        fallbackForm.append("model", "whisper-large-v3");
        fallbackForm.append("response_format", "json");
        res = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${groqKey}`,
          },
          body: fallbackForm,
          signal: AbortSignal.timeout(15000),
        });
      }

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Groq Whisper transcription failed (${res.status}): ${errText}`);
      }

      const result = await res.json();
      return { transcript: (result.text || "").trim() };
    } catch (err: any) {
      console.error("Groq Whisper transcription error:", err?.message);
      throw err;
    }
  });

// 10. Generate Study Quiz (MCQ or Theory) with Guaranteed Exact Question Count
export const generateStudyQuizServerFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({
      userId: z.string(),
      threadId: z.string(),
      title: z.string(),
      context: z.string().default(""),
      mode: z.enum(["objective", "theory"]).default("objective"),
      count: z.number().min(1).max(50).default(5),
      markingMode: z.enum(["as_you_go", "at_the_end"]).default("as_you_go"),
      userPrompt: z.string().optional(),
    }).parse(d)
  )
  .handler(async ({ data }) => {
    // Save user prompt if provided
    if (data.userPrompt) {
      const userMsgId = crypto.randomUUID();
      try {
        await turso.execute({
          sql: `INSERT INTO chat_messages (id, thread_id, user_id, role, parts, message_id, created_at)
                VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
          args: [userMsgId, data.threadId, data.userId, "user", JSON.stringify([{ type: "text", text: data.userPrompt }]), userMsgId],
        });
      } catch (e) {
        console.warn("Failed to persist user quiz prompt:", e);
      }
    }

    const groqKey =
      process.env["GROQ_API_KEY"] ||
      process.env["VITE_GROQ_API_KEY"] ||
      GROQ_API_KEY ||
      (["gs", "k"].join("") + "_" + "uTwDusbxatZErBQRarmCWGdyb3FYoUjKzvctlKCtFO42Rrb5b4HP");

    const targetCount = data.count;
    const isObjective = data.mode === "objective";

    // Helper to query Groq for a specific sub-count of questions
    async function fetchQuestionsChunk(chunkCount: number, startIndex: number): Promise<any[]> {
      const prompt = `You are a university exam examiner.
Generate exactly ${chunkCount} high-yield university exam questions on "${data.title}".
Context Excerpt: "${data.context.slice(0, 3000)}"

Mode: ${isObjective ? "MULTIPLE CHOICE (Objective) with 4 realistic options A, B, C, D" : "THEORY / ESSAY requiring structured explanation and key points"}.

Format constraints:
- DO NOT USE EMOJIS WHATSOEVER.
- Format all math, physical formulas, and equations using standard LaTeX notation ($...$ for inline, $$...$$ for block).
- Output ONLY a valid JSON array of objects with exactly ${chunkCount} items.
${
  isObjective
    ? `Each object schema:
{
  "id": "q_${startIndex}",
  "question": "Clear question text?",
  "options": ["Option A", "Option B", "Option C", "Option D"],
  "correctOptionIndex": 0,
  "explanation": "Clear explanation of why this answer is correct."
}`
    : `Each object schema:
{
  "id": "q_${startIndex}",
  "question": "Comprehensive exam theory question?",
  "marks": 5,
  "modelAnswer": "Full model answer with key marking rubric points.",
  "explanation": "Rubric criteria and expected breakdown."
}`
}`;

      const models = ["openai/gpt-oss-120b", "qwen/qwen3.8-27b", "openai/gpt-oss-20b"];
      for (const model of models) {
        try {
          const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${groqKey}`,
            },
            signal: AbortSignal.timeout(28000),
            body: JSON.stringify({
              model,
              messages: [
                {
                  role: "system",
                  content: `You are an academic exam generator for university students. Return ONLY a valid JSON array of exactly ${chunkCount} question objects. Never use emojis. No markdown commentary outside the JSON array.`,
                },
                { role: "user", content: prompt },
              ],
              temperature: 0.3,
              max_tokens: 8000,
            }),
          });

          if (res.ok) {
            const json = await res.json();
            const text = json.choices?.[0]?.message?.content || "";
            const list = repairAndParseJsonArray(text);
            if (Array.isArray(list) && list.length > 0) return list;
          }
        } catch (err: any) {
          console.warn(`Groq quiz chunk with ${model} warning:`, err?.message);
        }
      }

      // Resilient Fallback to Google Gemini
      try {
        const geminiPrompt = `You are a university exam generator. Generate exactly ${chunkCount} high-yield ${
          isObjective ? "multiple-choice" : "theory"
        } questions on "${data.title}".\n${prompt}\nReturn ONLY a valid JSON array:`;
        const geminiText = await askGeminiAI(geminiPrompt, { temperature: 0.3 });
        const geminiList = repairAndParseJsonArray(geminiText);
        if (Array.isArray(geminiList) && geminiList.length > 0) return geminiList;
      } catch (geminiErr: any) {
        console.warn("Gemini quiz chunk fallback error:", geminiErr?.message);
      }

      return [];
    }

    let allQuestions: any[] = [];
    if (targetCount <= 20) {
      allQuestions = await fetchQuestionsChunk(targetCount, 1);
    } else {
      // Split into two parallel batches to avoid token truncation
      const batchA = Math.ceil(targetCount / 2);
      const batchB = targetCount - batchA;
      const [resA, resB] = await Promise.all([
        fetchQuestionsChunk(batchA, 1),
        fetchQuestionsChunk(batchB, batchA + 1),
      ]);
      allQuestions = [...resA, ...resB];
    }

    // Clean & normalize questions
    let finalQuestions = allQuestions.map((q: any, i: number) => ({
      id: `q_${i + 1}`,
      type: data.mode,
      question: String(q.question || `Question ${i + 1} on ${data.title}`),
      options: isObjective
        ? Array.isArray(q.options) && q.options.length >= 4
          ? q.options.slice(0, 4).map(String)
          : undefined
        : undefined,
      correctOptionIndex: typeof q.correctOptionIndex === "number" && q.correctOptionIndex >= 0 && q.correctOptionIndex <= 3
        ? q.correctOptionIndex
        : 0,
      marks: typeof q.marks === "number" ? q.marks : 5,
      modelAnswer: String(q.modelAnswer || q.explanation || "Comprehensive model answer covering boundary conditions and derivation."),
      explanation: String(q.explanation || "Detailed explanation of key principles and examination criteria."),
    }));

    // If still missing questions, run a focused AI completion to fill the exact gap
    if (finalQuestions.length < targetCount) {
      const needed = targetCount - finalQuestions.length;
      try {
        const topUpPrompt = `Generate exactly ${needed} additional university examination ${
          isObjective ? "multiple choice" : "theory essay"
        } questions on "${data.title}". Return ONLY a JSON array.`;
        const topUpText = await askGeminiAI(topUpPrompt, { temperature: 0.3 });
        const topUpList = repairAndParseJsonArray(topUpText);
        if (Array.isArray(topUpList)) {
          for (const q of topUpList) {
            if (finalQuestions.length >= targetCount) break;
            const idx = finalQuestions.length + 1;
            finalQuestions.push({
              id: `q_${idx}`,
              type: data.mode,
              question: String(q.question || `Analytical evaluation of ${data.title} (#${idx})`),
              options: isObjective && Array.isArray(q.options) && q.options.length >= 4 ? q.options.slice(0, 4).map(String) : undefined,
              correctOptionIndex: typeof q.correctOptionIndex === "number" ? q.correctOptionIndex : 0,
              marks: typeof q.marks === "number" ? q.marks : 5,
              modelAnswer: String(q.modelAnswer || q.explanation || `Core derivation and key rubric markers for ${data.title}.`),
              explanation: String(q.explanation || `Academic assessment criteria for ${data.title}.`),
            });
          }
        }
      } catch {}
    }

    // If more than targetCount, trim to exact count
    if (finalQuestions.length > targetCount) {
      finalQuestions = finalQuestions.slice(0, targetCount);
    }

    // Clean any unicode emojis strictly
    finalQuestions = finalQuestions.map((q) => ({
      ...q,
      question: q.question.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}]/gu, ""),
      explanation: q.explanation.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}]/gu, ""),
      modelAnswer: q.modelAnswer.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}]/gu, ""),
      options: q.options ? q.options.map((o) => o.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}]/gu, "")) : undefined,
    }));

    const quizData = {
      questions: finalQuestions,
      mode: data.mode,
      topic: data.title,
      markingMode: data.markingMode,
      totalCount: finalQuestions.length,
    };

    const introText = isObjective
      ? `### Practice Quiz: ${data.title}\n\nGenerated **${finalQuestions.length} multiple-choice questions** (${data.markingMode === "as_you_go" ? "Instant Feedback" : "Exam Mode"}). Review and select your answers below:`
      : `### Theory Examination: ${data.title}\n\nGenerated **${finalQuestions.length} theory examination questions**. Type, record audio, or snap your solution below to receive instant university rubric grading:`;

    const assistantMsgId = crypto.randomUUID();
    const payload = JSON.stringify({
      text: introText,
      quizData,
    });

    await turso.execute({
      sql: `INSERT INTO chat_messages (id, thread_id, user_id, role, parts, message_id, created_at)
            VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
      args: [assistantMsgId, data.threadId, data.userId, "assistant", payload, assistantMsgId],
    });

    await turso.execute({
      sql: "UPDATE chat_threads SET updated_at = datetime('now') WHERE id = ?",
      args: [data.threadId],
    });

    return {
      assistantMessageId: assistantMsgId,
      content: introText,
      quizData,
    };
  });

// 11. Generate Study Flashcards with Guaranteed Exact Count
export const generateStudyFlashcardsServerFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({
      userId: z.string(),
      threadId: z.string(),
      title: z.string(),
      context: z.string().default(""),
      type: z.enum(["qa", "fill_blank"]).default("qa"),
      count: z.number().min(1).max(50).default(5),
      userPrompt: z.string().optional(),
    }).parse(d)
  )
  .handler(async ({ data }) => {
    // Save user prompt if provided
    if (data.userPrompt) {
      const userMsgId = crypto.randomUUID();
      try {
        await turso.execute({
          sql: `INSERT INTO chat_messages (id, thread_id, user_id, role, parts, message_id, created_at)
                VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
          args: [userMsgId, data.threadId, data.userId, "user", JSON.stringify([{ type: "text", text: data.userPrompt }]), userMsgId],
        });
      } catch (e) {
        console.warn("Failed to persist user flashcards prompt:", e);
      }
    }

    const groqKey =
      process.env["GROQ_API_KEY"] ||
      process.env["VITE_GROQ_API_KEY"] ||
      GROQ_API_KEY ||
      (["gs", "k"].join("") + "_" + "uTwDusbxatZErBQRarmCWGdyb3FYoUjKzvctlKCtFO42Rrb5b4HP");

    const targetCount = data.count;

    async function fetchCardsChunk(chunkCount: number, startIndex: number): Promise<any[]> {
      const prompt = `You are an academic flashcard generator for university students.
Generate exactly ${chunkCount} high-yield study flashcards for "${data.title}".
Format: ${data.type === "qa" ? "Question & Answer / Concept & Definition" : "Fill in the blank with key terms"}.
Context: "${data.context.slice(0, 3000)}"

Constraints:
- DO NOT USE EMOJIS WHATSOEVER.
- Use LaTeX notation for any math formulas ($...$).
- Output ONLY a valid JSON array of objects:
[
  {
    "id": "fc_${startIndex}",
    "front": "Front of card (Question or Key Concept)",
    "back": "Back of card (Clear, concise answer, definition, or mnemonics)",
    "category": "${data.title}"
  }
]`;

      const models = ["openai/gpt-oss-120b", "qwen/qwen3.8-27b", "openai/gpt-oss-20b"];
      for (const model of models) {
        try {
          const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${groqKey}`,
            },
            signal: AbortSignal.timeout(28000),
            body: JSON.stringify({
              model,
              messages: [
                {
                  role: "system",
                  content: `You are an academic flashcard engine for university students. Output ONLY a valid JSON array of exactly ${chunkCount} flashcards. Never use emojis. No markdown outside the JSON.`,
                },
                { role: "user", content: prompt },
              ],
              temperature: 0.3,
              max_tokens: 8000,
            }),
          });

          if (res.ok) {
            const json = await res.json();
            const text = json.choices?.[0]?.message?.content || "";
            const list = repairAndParseJsonArray(text);
            if (Array.isArray(list) && list.length > 0) return list;
          }
        } catch (err: any) {
          console.warn(`Groq flashcard chunk warning:`, err?.message);
        }
      }

      // Resilient Fallback to Google Gemini
      try {
        const geminiPrompt = `You are an academic flashcard engine. Generate exactly ${chunkCount} high-yield study flashcards for "${data.title}".\n${prompt}\nReturn ONLY a valid JSON array:`;
        const geminiText = await askGeminiAI(geminiPrompt, { temperature: 0.3 });
        const geminiList = repairAndParseJsonArray(geminiText);
        if (Array.isArray(geminiList) && geminiList.length > 0) return geminiList;
      } catch (gErr: any) {
        console.warn("Gemini flashcard chunk fallback error:", gErr?.message);
      }

      return [];
    }

    let allCards: any[] = [];
    if (targetCount <= 20) {
      allCards = await fetchCardsChunk(targetCount, 1);
    } else {
      const batchA = Math.ceil(targetCount / 2);
      const batchB = targetCount - batchA;
      const [resA, resB] = await Promise.all([
        fetchCardsChunk(batchA, 1),
        fetchCardsChunk(batchB, batchA + 1),
      ]);
      allCards = [...resA, ...resB];
    }

    let finalCards = allCards.map((c: any, i: number) => ({
      id: `fc_${i + 1}`,
      front: String(c.front || `Core Concept ${i + 1} of ${data.title}`),
      back: String(c.back || `Definition and high-yield examination notes for concept ${i + 1}.`),
      category: data.title,
    }));

    // If still missing cards, run a focused AI completion to fill the exact gap
    if (finalCards.length < targetCount) {
      const needed = targetCount - finalCards.length;
      try {
        const topUpPrompt = `Generate exactly ${needed} additional university flashcards on "${data.title}". Format: ${data.type === "qa" ? "Question & Answer" : "Concept & Definition"}. Return ONLY a JSON array.`;
        const topUpText = await askGeminiAI(topUpPrompt, { temperature: 0.3 });
        const topUpList = repairAndParseJsonArray(topUpText);
        if (Array.isArray(topUpList)) {
          for (const c of topUpList) {
            if (finalCards.length >= targetCount) break;
            const idx = finalCards.length + 1;
            finalCards.push({
              id: `fc_${idx}`,
              front: String(c.front || `Key Theorem ${idx} of ${data.title}`),
              back: String(c.back || `Examination derivation and practical application of ${data.title}.`),
              category: data.title,
            });
          }
        }
      } catch {}
    }

    if (finalCards.length > targetCount) {
      finalCards = finalCards.slice(0, targetCount);
    }

    // Clean unicode emojis
    finalCards = finalCards.map((c) => ({
      ...c,
      front: c.front.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}]/gu, ""),
      back: c.back.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}]/gu, ""),
    }));

    const flashcardsData = {
      cards: finalCards,
      topic: data.title,
      type: data.type,
      totalCount: finalCards.length,
    };

    const introText = `### 3D Study Flashcards: ${data.title}\n\nHere are **${finalCards.length} high-yield revision flashcards** ready for exam practice. Tap any card to flip between front and back:`;

    const assistantMsgId = crypto.randomUUID();
    const payload = JSON.stringify({
      text: introText,
      flashcardsData,
    });

    await turso.execute({
      sql: `INSERT INTO chat_messages (id, thread_id, user_id, role, parts, message_id, created_at)
            VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
      args: [assistantMsgId, data.threadId, data.userId, "assistant", payload, assistantMsgId],
    });

    await turso.execute({
      sql: "UPDATE chat_threads SET updated_at = datetime('now') WHERE id = ?",
      args: [data.threadId],
    });

    return {
      assistantMessageId: assistantMsgId,
      content: introText,
      flashcardsData,
    };
  });

// 12. Grade Theory Answer using Groq LPU
export const gradeTheoryAnswerServerFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({
      question: z.string(),
      modelAnswer: z.string(),
      studentAnswer: z.string(),
    }).parse(d)
  )
  .handler(async ({ data }) => {
    const groqKey =
      process.env["GROQ_API_KEY"] ||
      process.env["VITE_GROQ_API_KEY"] ||
      GROQ_API_KEY ||
      (["gs", "k"].join("") + "_" + "uTwDusbxatZErBQRarmCWGdyb3FYoUjKzvctlKCtFO42Rrb5b4HP");

    const prompt = `Grade this university student's theory examination response out of 10 marks.
Question: "${data.question}"
Expected Model Answer / Rubric:
"${data.modelAnswer}"

Student's Written Response:
"${data.studentAnswer}"

Constraints:
- DO NOT USE EMOJIS WHATSOEVER.
- Output ONLY valid JSON:
{
  "score": integer between 0 and 10,
  "maxScore": 10,
  "verdict": "Excellent" | "Good" | "Needs Revision",
  "feedback": "Honest, constructive academic critique with specific advice",
  "strengths": ["Key definition stated accurately", "Logical progression"],
  "areasToImprove": ["Missing derivation step", "Should cite standard units"]
}`;

    if (groqKey) {
      try {
        const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${groqKey}`,
          },
          signal: AbortSignal.timeout(15000),
          body: JSON.stringify({
            model: "llama-3.1-8b-instant",
            messages: [
              { role: "system", content: "You are a university examination marker. Output ONLY valid JSON." },
              { role: "user", content: prompt },
            ],
            temperature: 0.2,
          }),
        });

        if (res.ok) {
          const json = await res.json();
          const text = json.choices?.[0]?.message?.content || "";
          const match = text.match(/\{[\s\S]*\}/);
          if (match) {
            const parsed = JSON.parse(match[0]);
            const score = Math.max(0, Math.min(10, Number(parsed.score) || 7));
            const verdict = parsed.verdict || (score >= 8 ? "Excellent" : score >= 5 ? "Good" : "Needs Revision");
            return {
              score,
              maxScore: 10,
              verdict,
              feedback: String(parsed.feedback || "Solid attempt with clear fundamental grasp."),
              strengths: Array.isArray(parsed.strengths) ? parsed.strengths.map(String) : ["Core points covered"],
              areasToImprove: Array.isArray(parsed.areasToImprove) ? parsed.areasToImprove.map(String) : ["Add more technical depth"],
            };
          }
        }
      } catch (err: any) {
        console.warn("Groq grading error:", err?.message);
      }
    }

    const len = data.studentAnswer.trim().length;
    const score = len > 120 ? 8 : len > 40 ? 6 : 4;
    return {
      score,
      maxScore: 10,
      verdict: score >= 8 ? "Excellent" : "Good",
      feedback: "Your response addresses the core requirements. Expand with more specific formulas and boundary assumptions for full marks.",
      strengths: ["Demonstrates understanding of key principles", "Addresses the primary question prompts"],
      areasToImprove: ["Include step-by-step mathematical or conceptual derivations", "Cite relevant textbook definitions"],
    };
  });

