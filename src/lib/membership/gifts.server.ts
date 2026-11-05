import { randomBytes, randomUUID, createHash } from "node:crypto";
import { turso } from "@/integrations/turso/client.server";
import { ensurePromoTables, promoInput } from "./promos.server";
import { POINT_VALUE_NAIRA, POINT_VALUE_USD, USD_TO_NAIRA_EXCHANGE_RATE } from "../constants";

export function membershipGiftOptions(regional: boolean) {
  return ([{ days: 7, amountUsd: 5 }, { days: 30, amountUsd: 12 }] as const).map(option => ({
    ...option, points: Math.round(regional ? option.amountUsd * USD_TO_NAIRA_EXCHANGE_RATE / POINT_VALUE_NAIRA : option.amountUsd / POINT_VALUE_USD),
  }));
}

// All financial writes and delivery commit together. A retry returns the original gift.
export async function issueMembershipGift(userId: string, requestId: string, days: number, regional: boolean, now = Date.now()) {
  const quote = membershipGiftOptions(regional).find(option => option.days === days);
  if (!quote) throw new Error("Choose a one-week or one-month SyllaPlus gift.");
  await ensurePromoTables();
  await turso.batch([
    "CREATE TABLE IF NOT EXISTS membership_gift_issues(user_id TEXT NOT NULL,request_id TEXT NOT NULL,promo_id TEXT NOT NULL,code TEXT NOT NULL,points INTEGER NOT NULL,days INTEGER NOT NULL,conversation_id TEXT NOT NULL,expires_at TEXT NOT NULL,PRIMARY KEY(user_id,request_id))",
    "CREATE TABLE IF NOT EXISTS direct_message_acceptance(conversation_id TEXT PRIMARY KEY,accepted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)",
  ], "write");
  const tx = await turso.transaction("write");
  try {
    const previous = (await tx.execute({ sql: "SELECT * FROM membership_gift_issues WHERE user_id=? AND request_id=?", args: [userId, requestId] })).rows[0];
    if (previous) {
      if (Number(previous["days"]) !== days) throw new Error("This request was already used for another gift.");
      await tx.commit();
      return previous;
    }
    const debit = await tx.execute({ sql: "UPDATE profiles SET points=points-? WHERE id=? AND points>=? AND suspended=0", args: [quote.points, userId, quote.points] });
    if (!debit.rowsAffected) throw new Error("Insufficient SyllaPoints or account unavailable.");
    const id = randomUUID();
    const code = `SYLLAGIFT-${randomBytes(10).toString("hex").toUpperCase()}`;
    const expiry = new Date(now);
    expiry.setUTCMonth(expiry.getUTCMonth() + 3);
    const expiresAt = expiry.toISOString();
    const definition = promoInput.parse({ id, code, label: `SyllaPlus ${days}-day gift`, effect: "plus_days", value: days, enabled: true, maxUses: 1, perUser: 1, startsAt: new Date(now).toISOString(), expiresAt });
    await tx.execute({ sql: "INSERT INTO membership_promos VALUES(?,?,?,1,?,?)", args: [id, code, JSON.stringify(definition), userId, new Date(now).toISOString()] });
    const systemId = "syllaboss-gifts-system";
    await tx.execute({ sql: "INSERT OR IGNORE INTO profiles(id,email,full_name,username,points,suspended) VALUES(?,?,?,?,0,0)", args: [systemId, "gifts@syllaboss.org", "Syllaboss Gifts", "syllaboss_gifts"] });
    const systemProfile = (await tx.execute({ sql: "SELECT id FROM profiles WHERE id=? AND username='syllaboss_gifts'", args: [systemId] })).rows[0];
    if (!systemProfile) throw new Error("Gift delivery is temporarily unavailable.");
    const conversationId = `gift-${createHash("sha256").update(userId).digest("hex").slice(0, 32)}`;
    const content = `Your ${days}-day SyllaPlus gift is ready!\n\n${code}\n\nRedeem it in SyllaPlus checkout for $0. This single-use code expires ${expiry.toISOString().slice(0, 10)}. Keep it private or share it with someone you want to gift. ${quote.points.toLocaleString()} SyllaPoints were used.`;
    await tx.execute({ sql: "INSERT OR IGNORE INTO direct_conversations(id,user1_id,user2_id) VALUES(?,?,?)", args: [conversationId, systemId, userId] });
    await tx.execute({ sql: "INSERT OR IGNORE INTO direct_message_acceptance(conversation_id) VALUES(?)", args: [conversationId] });
    await tx.execute({ sql: "INSERT INTO direct_messages(id,conversation_id,sender_id,content,is_read) VALUES(?,?,?,?,0)", args: [randomUUID(), conversationId, systemId, content] });
    await tx.execute({ sql: "UPDATE direct_conversations SET last_message_text=?,last_message_at=datetime('now') WHERE id=?", args: ["Your SyllaPlus gift code is ready", conversationId] });
    await tx.execute({ sql: "INSERT INTO points_ledger(id,user_id,amount,reason) VALUES(?,?,?,?)", args: [randomUUID(), userId, -quote.points, `SyllaPlus ${days}-day gift ${id}`] });
    await tx.execute({ sql: "INSERT INTO membership_gift_issues VALUES(?,?,?,?,?,?,?,?)", args: [userId, requestId, id, code, quote.points, days, conversationId, expiresAt] });
    await tx.commit();
    return { code, days, points: quote.points, conversation_id: conversationId, expires_at: expiresAt };
  } catch (error) { await tx.rollback(); throw error; } finally { tx.close(); }
}
