import { turso } from "@/integrations/turso/client.server";

let prepared: Promise<unknown> | undefined;
async function ensureShares() {
  await (prepared ??= turso
    .execute(
      "CREATE TABLE IF NOT EXISTS study_answer_shares(id TEXT PRIMARY KEY,user_id TEXT NOT NULL,message_id TEXT NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,content TEXT NOT NULL,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,UNIQUE(user_id,message_id))",
    )
    .catch((error) => {
      prepared = undefined;
      throw error;
    }));
}
function messageText(value: unknown) {
  try {
    const parts = JSON.parse(String(value));
    return Array.isArray(parts)
      ? parts.map((p) => p.text || "").join("\n")
      : parts.quizData || parts.flashcardsData ? JSON.stringify({quizData:parts.quizData,flashcardsData:parts.flashcardsData}) : String(parts.text || "");
  } catch {
    return "";
  }
}
function canonicalShareText(content: string) {
  try {
    const parsed=JSON.parse(content);
    const set=parsed.nativeStudySet||parsed.quizData||parsed.flashcardsData;
    if(!set) return content;
    const mode=parsed.flashcardsData?"flashcards":set.mode==="mcq"?"objective":set.mode;
    return JSON.stringify({nativeStudySet:{mode,topic:set.topic||"Study set",items:set.items||set.questions||set.cards||[]}});
  }catch{return content;}
}
export async function createAnswerShare(
  userId: string,
  input: { threadId: string; content: string },
) {
  await ensureShares();
  const owned = await turso.execute({
    sql: "SELECT id,parts FROM chat_messages WHERE thread_id=? AND user_id=? AND role='assistant' ORDER BY rowid DESC LIMIT 200",
    args: [input.threadId, userId],
  });
  const content=canonicalShareText(input.content);
  const message = owned.rows.find((row) => canonicalShareText(messageText(row["parts"])) === content);
  if (!message) throw new Error("Only your saved AI answers can be shared.");
  const id = crypto.randomUUID();
  await turso.execute({
    sql: "INSERT OR IGNORE INTO study_answer_shares(id,user_id,message_id,content) VALUES(?,?,?,?)",
    args: [id, userId, String(message["id"]), content],
  });
  const saved = (
    await turso.execute({
      sql: "SELECT id FROM study_answer_shares WHERE user_id=? AND message_id=?",
      args: [userId, String(message["id"])],
    })
  ).rows[0]!;
  return { url: `https://syllaboss.org/shared/${saved["id"]}` };
}
export async function readAnswerShare(id: string) {
  await ensureShares();
  const row = (
    await turso.execute({
      sql: "SELECT s.content,p.username FROM study_answer_shares s JOIN profiles p ON p.id=s.user_id JOIN chat_messages m ON m.id=s.message_id AND m.user_id=s.user_id WHERE s.id=? AND COALESCE(p.suspended,0)=0",
      args: [id],
    })
  ).rows[0];
  if (!row) throw new Error("This shared answer is unavailable.");
  return {
    content: String(row["content"]),
    author: row["username"] ? `@${row["username"]}` : "A Syllaboss student",
  };
}
