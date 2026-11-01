import { randomUUID } from "node:crypto";
import { z } from "zod";
import { turso, isUserAdmin } from "@/integrations/turso/client.server";

export const promoInput = z.object({
  id: z.string().uuid().optional(), code: z.string().trim().toUpperCase().regex(/^[A-Z0-9-]{4,32}$/),
  label: z.string().trim().min(1).max(100), effect: z.enum(["plus_days", "ai_tokens", "downloads"]),
  value: z.number().int().min(1).max(100000), enabled: z.boolean(),
  maxUses: z.number().int().min(1).max(1000000), perUser: z.number().int().min(1).max(100),
  startsAt: z.string().datetime(), expiresAt: z.string().datetime(),
}).strict().superRefine((p, ctx) => {
  if (Date.parse(p.expiresAt) <= Date.parse(p.startsAt)) ctx.addIssue({ code: "custom", message: "Expiry must follow the start date." });
  if (p.effect === "plus_days" && p.value > 366) ctx.addIssue({ code: "custom", message: "Choose up to 366 days." });
});
export const PROMO_SCHEMA = [
  "CREATE TABLE IF NOT EXISTS membership_promos(id TEXT PRIMARY KEY,code TEXT UNIQUE NOT NULL,definition TEXT NOT NULL,version INTEGER NOT NULL,updated_by TEXT NOT NULL,updated_at TEXT NOT NULL)",
  "CREATE TABLE IF NOT EXISTS membership_promo_claims(id TEXT PRIMARY KEY,promo_id TEXT NOT NULL,user_id TEXT NOT NULL,version INTEGER NOT NULL,effect TEXT NOT NULL,value INTEGER NOT NULL,claimed_at TEXT NOT NULL,expires_at TEXT NOT NULL,request_id TEXT NOT NULL,UNIQUE(user_id,request_id))",
  "CREATE TABLE IF NOT EXISTS membership_promo_audit(id TEXT PRIMARY KEY,promo_id TEXT NOT NULL,actor_id TEXT NOT NULL,definition TEXT NOT NULL,created_at TEXT NOT NULL)",
];
let ready: Promise<unknown> | undefined;
export async function ensurePromoTables() { await (ready ??= turso.batch(PROMO_SCHEMA, "write").catch(e => { ready = undefined; throw e; })); }
export async function listPromos(actor: string) {
  if (!await isUserAdmin(actor)) throw new Error("Admin access required.");
  await ensurePromoTables();
  const rows = (await turso.execute("SELECT p.*, (SELECT COUNT(*) FROM membership_promo_claims c WHERE c.promo_id=p.id) AS uses FROM membership_promos p ORDER BY updated_at DESC")).rows;
  return rows.map(r => ({ ...JSON.parse(String(r["definition"])), id: r["id"], version: r["version"], uses: r["uses"] }));
}
export async function savePromo(actor: string, input: unknown) {
  if (!await isUserAdmin(actor)) throw new Error("Admin access required.");
  const p = promoInput.parse(input); await ensurePromoTables();
  const id = p.id || randomUUID(); const definition = JSON.stringify({ ...p, id });
  const tx = await turso.transaction("write");
  try {
    if (p.id && !(await tx.execute({ sql: "SELECT 1 FROM membership_promos WHERE id=?", args: [id] })).rows.length) throw new Error("Promo code not found.");
    await tx.execute({ sql: "INSERT INTO membership_promos(id,code,definition,version,updated_by,updated_at) VALUES(?,?,?,1,?,datetime('now')) ON CONFLICT(id) DO UPDATE SET code=excluded.code,definition=excluded.definition,version=membership_promos.version+1,updated_by=excluded.updated_by,updated_at=excluded.updated_at", args: [id, p.code, definition, actor] });
    await tx.execute({ sql: "INSERT INTO membership_promo_audit VALUES(?,?,?,?,datetime('now'))", args: [randomUUID(), id, actor, definition] });
    await tx.commit(); return { id };
  } catch (e) { await tx.rollback(); throw e; } finally { tx.close(); }
}
export async function redeemPromo(userId: string, raw: unknown, now = Date.now()) {
  const input = z.object({ code: z.string().trim().toUpperCase().max(32), requestId: z.string().uuid() }).strict().parse(raw);
  await ensurePromoTables(); const tx = await turso.transaction("write");
  try {
    const previous = (await tx.execute({ sql: "SELECT effect,value,expires_at FROM membership_promo_claims WHERE user_id=? AND request_id=?", args: [userId, input.requestId] })).rows[0];
    if (previous) { await tx.commit(); return previous; }
    const row = (await tx.execute({ sql: "SELECT * FROM membership_promos WHERE code=?", args: [input.code] })).rows[0];
    if (!row) throw new Error("This promo code is unavailable.");
    const p = promoInput.parse(JSON.parse(String(row["definition"])));
    if (!p.enabled || now < Date.parse(p.startsAt) || now >= Date.parse(p.expiresAt)) throw new Error("This promo code is unavailable.");
    const counts = (await tx.execute({ sql: "SELECT COUNT(*) AS total,COALESCE(SUM(CASE WHEN user_id=? THEN 1 ELSE 0 END),0) AS own FROM membership_promo_claims WHERE promo_id=?", args: [userId, row["id"]!] })).rows[0]!;
    if (Number(counts["total"]) >= p.maxUses || Number(counts["own"]) >= p.perUser) throw new Error("This promo code has reached its redemption limit.");
    // Claim snapshots stay unchanged when an administrator edits a campaign.
    let expiresAt: string;
    if (p.effect === "plus_days") {
      const active = (await tx.execute({ sql: "SELECT MAX(expires_at) AS until FROM membership_promo_claims WHERE user_id=? AND effect='plus_days'", args: [userId] })).rows[0]?.["until"];
      expiresAt = new Date(Math.max(now, Date.parse(String(active || "")) || 0) + p.value * 86400000).toISOString();
    } else {
      const d = new Date(now); expiresAt = p.effect === "ai_tokens" ? new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1)).toISOString() : new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1)).toISOString();
    }
    await tx.execute({ sql: "INSERT INTO membership_promo_claims VALUES(?,?,?,?,?,?,?,?,?)", args: [randomUUID(), row["id"]!, userId, row["version"]!, p.effect, p.value, new Date(now).toISOString(), expiresAt, input.requestId] });
    await tx.commit(); return { effect: p.effect, value: p.value, expires_at: expiresAt };
  } catch (e) { await tx.rollback(); throw e; } finally { tx.close(); }
}
export async function promoBenefits(userId: string, now = Date.now()) {
  await ensurePromoTables();
  const rows = (await turso.execute({ sql: "SELECT effect,SUM(value) AS value,MAX(expires_at) AS expires_at FROM membership_promo_claims WHERE user_id=? AND expires_at>? GROUP BY effect", args: [userId, new Date(now).toISOString()] })).rows;
  const value = (effect: string) => Number(rows.find(r => r["effect"] === effect)?.["value"] || 0);
  return { plusUntil: rows.find(r => r["effect"] === "plus_days")?.["expires_at"] as string | undefined, aiTokens: value("ai_tokens"), downloads: value("downloads") };
}
