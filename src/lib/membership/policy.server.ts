import { randomUUID } from "node:crypto";
import { turso, recordMaterialDownload } from "@/integrations/turso/client.server";
import { membershipStatus } from "@/lib/billing/service.server";
import { FREE_LIMITS, MembershipLimitError, utcDay, utcMonth } from "./policy";
import { promoBenefits } from "./promos.server";

export const MEMBERSHIP_SCHEMA = [
  "CREATE TABLE IF NOT EXISTS membership_ai_daily(user_id TEXT NOT NULL,day TEXT NOT NULL,tokens_used INTEGER NOT NULL DEFAULT 0,last_request INTEGER NOT NULL DEFAULT 0,PRIMARY KEY(user_id,day))",
  "CREATE TABLE IF NOT EXISTS membership_ai_requests(id TEXT PRIMARY KEY,user_id TEXT NOT NULL,day TEXT NOT NULL,reserved INTEGER NOT NULL,settled INTEGER NOT NULL DEFAULT 0)",
  "CREATE TABLE IF NOT EXISTS membership_ai_rate(user_id TEXT PRIMARY KEY,last_request INTEGER NOT NULL DEFAULT 0)",
  "CREATE TABLE IF NOT EXISTS membership_downloads(user_id TEXT NOT NULL,material_id TEXT NOT NULL,month TEXT NOT NULL,PRIMARY KEY(user_id,material_id,month))",
  "CREATE TABLE IF NOT EXISTS membership_material_grants(id TEXT PRIMARY KEY,user_id TEXT NOT NULL,material_id TEXT NOT NULL,intent TEXT NOT NULL,ready_at INTEGER NOT NULL,expires_at INTEGER NOT NULL,completed_at INTEGER)",
  "CREATE TABLE IF NOT EXISTS membership_retention(user_id TEXT PRIMARY KEY,paid INTEGER NOT NULL DEFAULT 0,free_since TEXT,notice_at TEXT)",
  "CREATE TABLE IF NOT EXISTS membership_policy_settings(id TEXT PRIMARY KEY,enabled_at TEXT NOT NULL)",
  "INSERT OR IGNORE INTO membership_policy_settings(id,enabled_at) VALUES('free-retention',datetime('now'))",
  "CREATE TABLE IF NOT EXISTS membership_consents(user_id TEXT PRIMARY KEY,version TEXT NOT NULL,accepted_at TEXT NOT NULL,cookie_preferences TEXT)",
];
let ready: Promise<unknown> | undefined;
export async function ensureMembershipTables() {
  ready ??= turso.batch(MEMBERSHIP_SCHEMA, "write").catch((error) => { ready = undefined; throw error; });
  await ready;
}
export async function membershipAccess(userId: string) {
  await ensureMembershipTables();
  const status = await membershipStatus(userId);
  if (status.suspended) throw new MembershipLimitError("This account is unavailable.", 403);
  await turso.execute({ sql: `INSERT INTO membership_retention(user_id,paid,free_since) VALUES(?,?,CASE WHEN ?=1 THEN NULL ELSE datetime('now') END)
    ON CONFLICT(user_id) DO UPDATE SET paid=excluded.paid,free_since=CASE WHEN excluded.paid=1 THEN NULL WHEN membership_retention.paid=1 THEN datetime('now') ELSE COALESCE(membership_retention.free_since,datetime('now')) END`, args: [userId, status.sylla_plus ? 1 : 0, status.sylla_plus ? 1 : 0] });
  return status.sylla_plus;
}
export async function requireLibraryAiAccess(userId: string) {
  if (!await membershipAccess(userId)) throw new MembershipLimitError("Studying a library material with Boss AI is included with SyllaPlus. You can still read the material and ask questions about a topic.", 403);
}
export interface AiAllowance { id: string | null; userId: string; day: string; paid: boolean; limit: number }
export async function beginAiRequest(userId: string, now = Date.now()): Promise<AiAllowance> {
  const paid = await membershipAccess(userId);
  if (paid) return { id: null, userId, day: utcDay(now), paid, limit: 8000 };
  const day = utcDay(now);
  const benefits = await promoBenefits(userId, now);
  const tx = await turso.transaction("write");
  try {
    await tx.execute({ sql: "INSERT OR IGNORE INTO membership_ai_daily(user_id,day) VALUES(?,?)", args: [userId, day] });
    await tx.execute({ sql: "INSERT OR IGNORE INTO membership_ai_rate(user_id) VALUES(?)", args: [userId] });
    const row = (await tx.execute({ sql: "SELECT tokens_used,last_request FROM membership_ai_daily WHERE user_id=? AND day=?", args: [userId, day] })).rows[0]!;
    const rate = (await tx.execute({ sql: "SELECT last_request FROM membership_ai_rate WHERE user_id=?", args: [userId] })).rows[0]!;
    const retry = FREE_LIMITS.aiIntervalMs - (now - Number(rate["last_request"]));
    if (retry > 0) throw new MembershipLimitError("Free accounts can send one AI request per minute. Get SyllaPlus for more study time.", 429, Math.ceil(retry / 1000));
    const limit = FREE_LIMITS.aiResponseTokensPerDay + benefits.aiTokens - Number(row["tokens_used"]);
    if (limit <= 0) throw new MembershipLimitError("You have used today's 1,000 AI response tokens. Your allowance resets at midnight UTC, or you can get SyllaPlus.");
    const id = randomUUID();
    // Reserve the entire remaining allowance atomically. A concurrent request
    // cannot spend it again; verified provider usage releases unused tokens.
    await tx.execute({ sql: "UPDATE membership_ai_daily SET tokens_used=tokens_used+?,last_request=? WHERE user_id=? AND day=?", args: [limit, now, userId, day] });
    await tx.execute({ sql: "UPDATE membership_ai_rate SET last_request=? WHERE user_id=?", args: [now, userId] });
    await tx.execute({ sql: "INSERT INTO membership_ai_requests(id,user_id,day,reserved) VALUES(?,?,?,?)", args: [id, userId, day, limit] });
    await tx.commit();
    return { id, userId, day, paid, limit };
  } catch (error) { await tx.rollback(); throw error; } finally { tx.close(); }
}
export async function settleAiRequest(allowance: AiAllowance, actual?: number) {
  if (!allowance.id) return;
  const used = actual == null || !Number.isFinite(actual) ? allowance.limit : Math.max(0, Math.min(allowance.limit, Math.ceil(actual)));
  const tx = await turso.transaction("write");
  try {
    const claim = await tx.execute({ sql: "UPDATE membership_ai_requests SET settled=1 WHERE id=? AND user_id=? AND settled=0 RETURNING reserved", args: [allowance.id, allowance.userId] });
    if (claim.rows.length) await tx.execute({ sql: "UPDATE membership_ai_daily SET tokens_used=MAX(0,tokens_used-?+?) WHERE user_id=? AND day=?", args: [Number(claim.rows[0]!["reserved"]), used, allowance.userId, allowance.day] });
    await tx.commit();
  } catch (error) { await tx.rollback(); throw error; } finally { tx.close(); }
}
export async function enforceChatRetention(userId: string, paid?: boolean) {
  const hasAccess = paid ?? await membershipAccess(userId);
  if (hasAccess) return { days: null, startsAt: null };
  const row = (await turso.execute({ sql: "SELECT free_since FROM membership_retention WHERE user_id=?", args: [userId] })).rows[0];
  const since = String(row?.["free_since"] || new Date().toISOString());
  // Existing and formerly paid conversations get seven days of notice. The
  // per-message age still controls deletion once that transition has elapsed.
  const startsAt = new Date(Date.parse(since.replace(" ", "T") + (since.endsWith("Z") ? "" : "Z")) + 7 * 86400000).toISOString();
  if (Date.now() >= Date.parse(startsAt)) await turso.batch([
    { sql: "DELETE FROM chat_messages WHERE user_id=? AND datetime(created_at)<datetime('now','-7 days')", args: [userId] },
    { sql: "DELETE FROM chat_threads WHERE user_id=? AND datetime(updated_at)<datetime('now','-7 days') AND NOT EXISTS(SELECT 1 FROM chat_messages WHERE thread_id=chat_threads.id)", args: [userId] },
  ], "write");
  return { days: 7, startsAt };
}
export async function membershipSnapshot(userId: string) {
  const paid = await membershipAccess(userId);
  const retention = await enforceChatRetention(userId, paid);
  const benefits = await promoBenefits(userId);
  const [tokens, downloads] = await Promise.all([
    turso.execute({ sql: "SELECT tokens_used FROM membership_ai_daily WHERE user_id=? AND day=?", args: [userId, utcDay()] }),
    turso.execute({ sql: "SELECT COUNT(*) AS n FROM membership_downloads WHERE user_id=? AND month=?", args: [userId, utcMonth()] }),
  ]);
  return { paid, limits: paid ? null : FREE_LIMITS, responseTokensRemaining: paid ? null : Math.max(0, 1000 + benefits.aiTokens - Number(tokens.rows[0]?.["tokens_used"] || 0)), downloadsRemaining: paid ? null : Math.max(0, 6 + benefits.downloads - Number(downloads.rows[0]?.["n"] || 0)), retention };
}
export async function startMaterialGate(userId: string, materialId: string, intent: "preview" | "download", now = Date.now()) {
  const paid = await membershipAccess(userId);
  const material = (await turso.execute({ sql: "SELECT id,status,user_id FROM materials WHERE id=?", args: [materialId] })).rows[0];
  if (!material || material["status"] !== "verified" && material["user_id"] !== userId) throw new MembershipLimitError("This material is unavailable.", 404);
  const id = randomUUID();
  const seconds = paid ? 0 : intent === "download" ? FREE_LIMITS.downloadPromotionSeconds : FREE_LIMITS.previewPromotionSeconds;
  await turso.execute({ sql: "INSERT INTO membership_material_grants(id,user_id,material_id,intent,ready_at,expires_at) VALUES(?,?,?,?,?,?)", args: [id, userId, materialId, intent, now + seconds * 1000, now + 15 * 60_000] });
  return { id, paid, readyAt: now + seconds * 1000, seconds, promotion: paid ? null : "syllaplus" };
}
export async function completeMaterialGate(userId: string, id: string, now = Date.now()) {
  await ensureMembershipTables();
  const paid = await membershipAccess(userId);
  const benefits = await promoBenefits(userId, now);
  const tx = await turso.transaction("write");
  let materialId: string; let intent: string;
  try {
    const row = (await tx.execute({ sql: "SELECT * FROM membership_material_grants WHERE id=? AND user_id=?", args: [id, userId] })).rows[0];
    if (!row || Number(row["expires_at"]) <= now) throw new MembershipLimitError("This access link expired. Please try again.", 410);
    if (Number(row["ready_at"]) > now) throw new MembershipLimitError("Please finish the promotion before opening this material.", 429, Math.ceil((Number(row["ready_at"]) - now) / 1000));
    materialId = String(row["material_id"]); intent = String(row["intent"]);
    if (intent === "download") {
      const month = utcMonth(now);
      const existing = await tx.execute({ sql: "SELECT 1 FROM membership_downloads WHERE user_id=? AND material_id=? AND month=?", args: [userId, materialId, month] });
      if (!existing.rows.length) {
        const count = Number((await tx.execute({ sql: "SELECT COUNT(*) AS n FROM membership_downloads WHERE user_id=? AND month=?", args: [userId, month] })).rows[0]!["n"]);
        if (!paid && count >= 6 + benefits.downloads) throw new MembershipLimitError(benefits.downloads ? "You have used this month's material downloads. Get SyllaPlus for more downloads." : "You have downloaded six materials this month. Get SyllaPlus for more downloads.");
        await tx.execute({ sql: "INSERT INTO membership_downloads(user_id,material_id,month) VALUES(?,?,?)", args: [userId, materialId, month] });
      }
    }
    await tx.execute({ sql: "UPDATE membership_material_grants SET completed_at=COALESCE(completed_at,?) WHERE id=?", args: [now, id] });
    await tx.commit();
  } catch (error) { await tx.rollback(); throw error; } finally { tx.close(); }
  if (intent === "download") await recordMaterialDownload(materialId, userId);
  return { url: `/api/materials?id=${encodeURIComponent(materialId)}&grant=${encodeURIComponent(id)}${intent === "download" ? "&download=true" : ""}` };
}
export async function validateMaterialGrant(materialId: string, intent: "preview" | "download", id: string, now = Date.now()) {
  await ensureMembershipTables();
  const row = (await turso.execute({ sql: "SELECT 1 FROM membership_material_grants WHERE id=? AND material_id=? AND intent=? AND completed_at IS NOT NULL AND expires_at>?", args: [id, materialId, intent, now] })).rows[0];
  return !!row;
}
export async function materialGrantOwner(materialId: string, intent: "preview" | "download", id: string, now = Date.now()) {
  await ensureMembershipTables();
  const row = (await turso.execute({ sql: "SELECT user_id FROM membership_material_grants WHERE id=? AND material_id=? AND intent=? AND completed_at IS NOT NULL AND expires_at>?", args: [id, materialId, intent, now] })).rows[0];
  return row ? String(row["user_id"]) : null;
}
