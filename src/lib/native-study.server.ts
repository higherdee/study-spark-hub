import { z } from "zod";
import { turso } from "@/integrations/turso/client.server";
import { generateFlashcards, generatePracticeQuestions, gradeTheoryAnswer, type Flashcard, type QuizQuestion } from "./academic-ai";
import { generationCount } from "./membership/policy";
import { membershipAccess, enforceChatRetention } from "./membership/policy.server";
import { budgetedAiFetch, withAiAllowance } from "./membership/ai.server";
import { generateFromStoredDocument } from "./document-study.server";
import { parseStudyArray } from "./ai/study-json";
import { detectStudyMedia } from "./study-media.server";

export async function nativeStudySet(userId: string, raw: unknown) {
  const input = z.object({ topic: z.string().trim().max(300).default(""), mode: z.enum(["flashcards", "objective", "theory"]), count: z.number().int().min(1).max(50), useConversation: z.boolean().default(false), threadId: z.string().uuid().optional(), sourceMaterialId:z.string().min(1).max(100).optional() }).parse(raw);
  const count = generationCount(input.count, await membershipAccess(userId));
  await enforceChatRetention(userId);
  let context = ""; let topic = input.topic;
  if (input.threadId) {
    if (!(await turso.execute({ sql: "SELECT id FROM chat_threads WHERE id=? AND user_id=?", args: [input.threadId, userId] })).rows.length) throw new Error("Conversation not found.");
    if (input.useConversation) {
      const rows = (await turso.execute({ sql: "SELECT role,parts FROM chat_messages WHERE thread_id=? AND user_id=? ORDER BY created_at DESC,rowid DESC LIMIT 8", args: [input.threadId,userId] })).rows;
      context = rows.reverse().map(r => { try { const parts = JSON.parse(String(r["parts"])); return Array.isArray(parts) ? parts.filter(p => p.type === "text").map(p => p.text || "").join("\n") : String(parts.text || ""); } catch { return ""; } }).join("\n").slice(-16000);
      if (context.trim().length < 40 && !input.topic && !input.sourceMaterialId) throw new Error("Add a topic first; this conversation does not have enough study context.");
      topic ||= "Revision from this conversation";
    }
  }
  if (!topic && input.sourceMaterialId) topic="Revision from your document";
  if (!topic) throw new Error("Enter a topic before generating study material.");
  const items = await withAiAllowance<Flashcard[] | QuizQuestion[]>(userId, async () => {
    if(input.sourceMaterialId){
      const schema=input.mode==="flashcards"?'[{"id":"fc1","front":"question","back":"answer with source page"}]':input.mode==="objective"?'[{"id":"q1","type":"objective","question":"question","options":["A","B","C","D"],"correctOptionIndex":0,"modelAnswer":"answer","explanation":"explanation with source page","marks":1}]':'[{"id":"q1","type":"theory","question":"question","modelAnswer":"correct worked solution with source page","explanation":"marking guidance","marks":10}]';
      const raw=await generateFromStoredDocument(userId,input.sourceMaterialId,`Generate ${count} ${input.mode} items from the actual source. Focus: ${topic}. ${context?`Conversation context: ${context}`:""} Return JSON only in this schema: ${schema}`);
      const data=parseStudyArray(raw).slice(0,count);
      if(input.mode==="flashcards")return z.array(z.object({id:z.string(),front:z.string().min(1),back:z.string().min(1)})).parse(data);
      return z.array(z.object({id:z.string(),type:z.enum(["objective","theory"]),question:z.string().min(1),options:z.array(z.string()).length(4).optional(),correctOptionIndex:z.number().int().min(0).max(3).optional(),modelAnswer:z.string().min(1),explanation:z.string(),marks:z.number().int().positive().max(100).default(input.mode==="objective"?1:10)}).refine(q=>input.mode!=="objective"||!!q.options&&q.correctOptionIndex!==undefined,"Incomplete multiple-choice question")).parse(data);
    }
    return input.mode === "flashcards" ? await generateFlashcards(topic, context || topic, count, budgetedAiFetch) : await generatePracticeQuestions(topic,context || topic,input.mode,count,budgetedAiFetch);
  });
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
  const input = z.object({ question: z.string().trim().min(1).max(6000), modelAnswer: z.string().max(12000), studentAnswer: z.string().trim().max(12000).default(""), imageBase64:z.string().max(3_000_000).optional(), maxScore:z.number().int().min(1).max(100).default(10) }).refine(d=>!!d.studentAnswer||!!d.imageBase64,"Type an answer or attach a clear solution photo.").parse(raw);
  let image: {base64:string;mimeType:string}|undefined;
  if(input.imageBase64){const bytes=Buffer.from(input.imageBase64,"base64");const mimeType=detectStudyMedia(bytes);if(!mimeType.startsWith("image/"))throw new Error("Choose a clear photo of your solution.");image={base64:input.imageBase64,mimeType};}
  return withAiAllowance(userId, () => gradeTheoryAnswer(input.question,input.modelAnswer,input.studentAnswer,budgetedAiFetch,image,input.maxScore));
}
