import { turso } from "@/integrations/turso/client.server";
import { uploadToR2, getFromR2 } from "@/integrations/r2/client.server";
import { getStudyGroupMembersWithBalances } from "@/integrations/turso/community.server";

let prepared: Promise<unknown> | undefined;
async function prepare() {
  prepared ??= turso.execute(`CREATE TABLE IF NOT EXISTS study_media (
    id TEXT PRIMARY KEY,user_id TEXT NOT NULL,target_id TEXT,title TEXT NOT NULL,
    file_key TEXT NOT NULL,mime_type TEXT NOT NULL,file_size INTEGER NOT NULL,
    duration INTEGER NOT NULL DEFAULT 0,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`).catch(e => { prepared = undefined; throw e; });
  await prepared;
}
export const MEDIA_LIMIT = 3 * 1024 * 1024;
export function detectStudyMedia(bytes: Uint8Array): string {
  const head = Buffer.from(bytes.subarray(0, 16));
  if (head.subarray(0, 4).toString() === "%PDF") return "application/pdf";
  if (head[0] === 255 && head[1] === 216 && head[2] === 255) return "image/jpeg";
  if (head.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) return "image/png";
  if (head.subarray(0, 4).toString() === "RIFF" && head.subarray(8, 12).toString() === "WEBP") return "image/webp";
  if (head.subarray(4, 8).toString() === "ftyp") return "audio/mp4";
  if (head.subarray(0, 4).toString() === "OggS") return "audio/ogg";
  if (head.subarray(0, 4).equals(Buffer.from([26,69,223,163]))) return "audio/webm";
  throw new Error("Choose a PDF, a document photo, or a recorded voice note.");
}
export async function saveStudyMedia(userId: string, file: File, targetId?: string, duration = 0) {
  if (!file.size || file.size > MEDIA_LIMIT) throw new Error("Choose a file smaller than 3 MB for chat.");
  // A target is a verified DM or group membership, never a client supplied recipient ACL.
  if (targetId) await getStudyGroupMembersWithBalances(targetId, userId);
  const bytes = new Uint8Array(await file.arrayBuffer());
  const mime = detectStudyMedia(bytes);
  await prepare();
  const count = await turso.execute({ sql: "SELECT count(*) AS n FROM study_media WHERE user_id=? AND created_at>datetime('now','-1 day')", args: [userId] });
  if (Number(count.rows[0]?.['n']) >= 50) throw new Error("You have reached today's attachment limit. Try again tomorrow.");
  const id = crypto.randomUUID();
  const title = file.name.replace(/[\x00-\x1f]/g, "").slice(0, 180) || "Study attachment";
  const key = `study-media/${userId}/${id}`;
  await uploadToR2(key, bytes, mime);
  await turso.execute({ sql: "INSERT INTO study_media(id,user_id,target_id,title,file_key,mime_type,file_size,duration) VALUES(?,?,?,?,?,?,?,?)", args: [id,userId,targetId || null,title,key,mime,bytes.length,Math.max(0,Math.min(120,Math.floor(duration)))] });
  return { id, title, mime, bytes: bytes.length, duration, url: `/api/study-media?id=${id}` };
}
export async function ownedStudyDocument(userId: string, id: string) {
  await prepare();
  const row = (await turso.execute({ sql: "SELECT * FROM study_media WHERE id=? AND user_id=? AND target_id IS NULL", args: [id,userId] })).rows[0];
  if (!row || !/^(application\/pdf|image\/)/.test(String(row['mime_type']))) return null;
  return { id, user_id:userId, title:String(row['title']), course:"Your uploaded document", file_path:String(row['file_key']), mime_type:String(row['mime_type']), file_size:Number(row['file_size']) };
}
export async function readStudyMedia(userId: string, id: string) {
  await prepare();
  const row = (await turso.execute({ sql: "SELECT * FROM study_media WHERE id=?", args: [id] })).rows[0];
  if (!row) throw new Error("Attachment not found.");
  if (String(row['user_id']) !== userId) {
    if (!row['target_id']) throw new Error("Attachment not found.");
    await getStudyGroupMembersWithBalances(String(row['target_id']),userId);
  }
  const file = await getFromR2(String(row['file_key']));
  return { ...file, title:String(row['title']), mime:String(row['mime_type']) };
}
export async function peerAttachment(userId: string, target: string, id: string) {
  await prepare();
  const row = (await turso.execute({
    sql: "SELECT id,title,mime_type,file_size,duration FROM study_media WHERE id=? AND user_id=? AND target_id=?",
    args: [id, userId, target],
  })).rows[0];
  if (!row) throw new Error("This attachment does not belong to this conversation.");
  return { id, title: String(row['title']), mime: String(row['mime_type']), bytes: Number(row['file_size']), duration: Number(row['duration']) };
}
export async function transcribeStudyVoice(userId: string, file: File) {
  if (!file.size || file.size > MEDIA_LIMIT) throw new Error("Record a voice note under two minutes.");
  const bytes = new Uint8Array(await file.arrayBuffer());
  const mime = detectStudyMedia(bytes);
  if (!mime.startsWith("audio/")) throw new Error("This file is not a voice note.");
  const key = process.env['GROQ_API_KEY'];
  if (!key) throw new Error("Voice transcription is temporarily unavailable.");
  await turso.execute("CREATE TABLE IF NOT EXISTS study_voice_usage (user_id TEXT PRIMARY KEY, hour INTEGER NOT NULL, attempts INTEGER NOT NULL)");
  const hour = Math.floor(Date.now() / 3_600_000);
  const claimed = await turso.execute({
    sql: `INSERT INTO study_voice_usage(user_id,hour,attempts) VALUES(?,?,1)
          ON CONFLICT(user_id) DO UPDATE SET hour=excluded.hour,
          attempts=CASE WHEN study_voice_usage.hour=excluded.hour THEN attempts+1 ELSE 1 END
          WHERE study_voice_usage.hour<>excluded.hour OR attempts<20 RETURNING attempts`,
    args: [userId, hour],
  });
  if (!claimed.rows.length) throw new Error("Voice note limit reached. Try again next hour or type your question.");
  // Speech fills an editable draft. It must not consume the separate AI-answer request.
  const form = new FormData(); form.set("file",new Blob([bytes],{type:mime}),file.name); form.set("model","whisper-large-v3-turbo");
  const response = await fetch("https://api.groq.com/openai/v1/audio/transcriptions",{method:"POST",headers:{Authorization:`Bearer ${key}`},body:form,signal:AbortSignal.timeout(25000)});
  if (!response.ok) throw new Error("Your voice note could not be transcribed. Please retry or type your question.");
  const data = await response.json();
  if (typeof data.text !== "string" || !data.text.trim()) throw new Error("No speech was detected. Try again in a quieter place.");
  return {transcript:data.text.trim().slice(0,12000)};
}
