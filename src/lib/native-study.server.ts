import { z } from "zod";
import { turso } from "@/integrations/turso/client.server";
import { generateFlashcards, generatePracticeQuestions, gradeTheoryAnswer, type Flashcard, type QuizQuestion } from "./academic-ai";
import { generationCount } from "./membership/policy";
import { membershipAccess, enforceChatRetention } from "./membership/policy.server";
import { budgetedAiFetch, withAiAllowance } from "./membership/ai.server";

export async function nativeStudySet(userId: string, raw: unknown) {
  const input = z.object({ topic: z.string().trim().max(300).default(""), mode: z.enum(["flashcards", "objective", "theory"]), count: z.number().int().min(1).max(50), useConversation: z.boolean().default(false), threadId: z.string().uuid().optional() }).parse(raw);
  const count = generationCount(input.count, await membershipAccess(userId));
  await enforceChatRetention(userId);
  let context = ""; let topic = input.topic;
  if (input.threadId) {
    if (!(await turso.execute({ sql: "SELECT id FROM chat_threads WHERE id=? AND user_id=?", args: [input.threadId, userId] })).rows.length) throw new Error("Conversation not found.");
    if (input.useConversation) {
      const rows = (await turso.execute({ sql: "SELECT role,parts FROM chat_messages WHERE thread_id=? AND user_id=? ORDER BY created_at DESC,rowid DESC LIMIT 8", args: [input.threadId,userId] })).rows;
      context = rows.reverse().map(r => { try { const parts = JSON.parse(String(r["parts"])); return Array.isArray(parts) ? parts.filter(p => p.type === "text").map(p => p.text || "").join("\n") : String(parts.text || ""); } catch { return ""; } }).join("\n").slice(-16000);
      if (context.trim().length < 40) throw new Error("Add a topic first; this conversation does not have enough study context.");
      topic ||= "Revision from this conversation";
    }
  }
  if (!topic) throw new Error("Enter a topic before generating study material.");
  const items = await withAiAllowance<Flashcard[] | QuizQuestion[]>(userId, async () => input.mode === "flashcards" ? await generateFlashcards(topic, context || topic, count, budgetedAiFetch) : await generatePracticeQuestions(topic,context || topic,input.mode,count,budgetedAiFetch));
  if (!items.length) throw new Error("Boss AI could not generate valid study items. Please retry.");
  const threadId = input.threadId || crypto.randomUUID();
  const studySet = { mode: input.mode, topic, items };
  const content = JSON.stringify({ text: `${items.length} ${input.mode === "objective" ? "practice questions" : input.mode} · ${topic}`, nativeStudySet: studySet,
    ...(input.mode === "flashcards" ? { flashcardsData: { cards: items, topic, type: "qa", totalCount: items.length } } : { quizData: { questions: items, topic, mode: input.mode, totalCount: items.length, markingMode: "as_you_go" } }) });
  const tx = await turso.transaction("write");
  try {
    if (!input.threadId) await tx.execute({ sql: "INSERT INTO chat_threads(id,user_id,title) VALUES(?,?,?)", args: [threadId,userId,topic.slice(0,60)] });
    const id = crypto.randomUUID();
    await tx.execute({ sql: "INSERT INTO chat_messages(id,thread_id,user_id,message_id,role,parts) VALUES(?,?,?,?,'assistant',?)", args: [id,threadId,userId,id,JSON.stringify([{ type: "text", text: content }])] });
    await tx.execute({ sql: "UPDATE chat_threads SET updated_at=datetime('now') WHERE id=? AND user_id=?", args: [threadId,userId] });
    await tx.commit(); return { threadId, content, studySet };
  } catch (e) { await tx.rollback(); throw e; } finally { tx.close(); }
}
export async function nativeTheoryGrade(userId: string, raw: unknown) {
  const input = z.object({ question: z.string().trim().min(1).max(6000), modelAnswer: z.string().max(6000), studentAnswer: z.string().trim().min(1).max(12000) }).parse(raw);
  return withAiAllowance(userId, () => gradeTheoryAnswer(input.question,input.modelAnswer,input.studentAnswer,budgetedAiFetch));
}
