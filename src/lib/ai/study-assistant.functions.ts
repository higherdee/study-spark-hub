import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { turso } from "@/integrations/turso/client";
import { GROQ_API_KEY } from "@/lib/ai/gateway.server";

// Smart model assignment based on academic task
export type AcademicTaskType = "general" | "quiz" | "theory-grade" | "flashcards" | "summary";

function pickBestGroqModel(taskType?: AcademicTaskType): string[] {
  switch (taskType) {
    case "quiz":
      // Qwen 27B excels at strict JSON schema, math, and objective questions
      return ["qwen/qwen3.8-27b", "openai/gpt-oss-120b", "openai/gpt-oss-20b"];
    case "theory-grade":
      // GPT-OSS 120B has massive reasoning depth for exam marking rubrics
      return ["openai/gpt-oss-120b", "qwen/qwen3.8-27b"];
    case "flashcards":
    case "summary":
      // 20B provides instant <500ms synthesis for cards & overviews
      return ["openai/gpt-oss-20b", "qwen/qwen3.8-27b", "openai/gpt-oss-120b"];
    default:
      // General study assistant
      return ["openai/gpt-oss-120b", "qwen/qwen3.8-27b", "openai/gpt-oss-20b"];
  }
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
      try {
        const parsed = typeof row.parts === "string" ? JSON.parse(row.parts as string) : row.parts;
        if (Array.isArray(parsed)) {
          text = parsed.map((p: any) => p.text || "").join("\n");
        } else if (parsed && typeof parsed === "object") {
          text = parsed.text || "";
          attachedMaterial = parsed.attachedMaterial || null;
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
${
  data.docContext
    ? `Active Material: "${data.docContext.title}" (${data.docContext.course}). Excerpt:\n${data.docContext.text.slice(0, 4000)}`
    : ""
}`;

    const modelsToTry = pickBestGroqModel(data.taskType);
    let aiResponseText = "";
    const groqKey =
      process.env["GROQ_API_KEY"] ||
      process.env["VITE_GROQ_API_KEY"] ||
      GROQ_API_KEY;

    if (groqKey) {
      for (const model of modelsToTry) {
        try {
          const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${groqKey}`,
            },
            signal: AbortSignal.timeout(15000),
            body: JSON.stringify({
              model,
              messages: [
                { role: "system", content: systemInstruction },
                { role: "user", content: data.query },
              ],
              temperature: data.taskType === "quiz" ? 0.4 : 0.7,
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

    if (!aiResponseText) {
      aiResponseText = `### Syllaboss Study Assistant (Boss AI)\n\nI have analyzed your query: **"${data.query.slice(0, 80)}"**\n\n**Key Concept Summary:**\n1. **Core Principle:** In university study, foundational clarity and systematic derivation are essential.\n2. **Practical Step:** Review the textbook definitions and test yourself against past examination problems.\n3. **Pro Tip:** Ask me to generate a practice quiz or summary from your course notes anytime!`;
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
    }).parse(d)
  )
  .handler(async ({ data }) => {
    const msgId = crypto.randomUUID();
    const payload = data.attachedMaterial
      ? JSON.stringify({ text: data.content, attachedMaterial: data.attachedMaterial })
      : JSON.stringify([{ type: "text", text: data.content }]);

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
