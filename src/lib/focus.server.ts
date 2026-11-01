import { turso } from "@/integrations/turso/client.server";
export const FOCUS_SCHEMA = [
  "CREATE TABLE IF NOT EXISTS study_activity(user_id TEXT PRIMARY KEY,active_ms INTEGER NOT NULL DEFAULT 0,last_ping INTEGER NOT NULL DEFAULT 0,last_active INTEGER NOT NULL DEFAULT 0)",
  "CREATE TABLE IF NOT EXISTS study_daily_progress(user_id TEXT NOT NULL,day TEXT NOT NULL,minutes INTEGER NOT NULL DEFAULT 0,PRIMARY KEY(user_id,day))",
];
let initialized: Promise<unknown> | undefined;
export async function ensureFocusTables() {
  initialized ??= turso.batch(FOCUS_SCHEMA, "write").catch((error) => { initialized = undefined; throw error; });
  await initialized;
}
export function verifiedElapsed(previousPing: number, previousActive: boolean, active: boolean, now: number) {
  const gap = now - previousPing;
  return previousPing > 0 && previousActive && active && gap > 0 && gap <= 90_000 ? Math.min(gap, 60_000) : 0;
}
export async function focusSnapshot(userId: string) {
  await ensureFocusTables();
  const [activity, daily] = await Promise.all([
    turso.execute({ sql: "SELECT active_ms,last_ping,last_active FROM study_activity WHERE user_id=?", args: [userId] }),
    turso.execute({ sql: "SELECT minutes FROM study_daily_progress WHERE user_id=? AND day=date('now')", args: [userId] }),
  ]);
  return { activeSeconds: Math.floor(Number(activity.rows[0]?.["active_ms"] || 0) / 1000), dailyMinutes: Number(daily.rows[0]?.["minutes"] || 0), intervalSeconds: 1800, lastPing: Number(activity.rows[0]?.["last_ping"] || 0) };
}
export async function focusHeartbeat(userId: string, active: boolean, now = Date.now()) {
  await ensureFocusTables();
  const tx = await turso.transaction("write");
  try {
    await tx.execute({ sql: "INSERT OR IGNORE INTO study_activity(user_id) VALUES(?)", args: [userId] });
    const prior = (await tx.execute({ sql: "SELECT last_ping,last_active FROM study_activity WHERE user_id=?", args: [userId] })).rows[0]!;
    const elapsed = verifiedElapsed(Number(prior["last_ping"]), Boolean(prior["last_active"]), active, now);
    await tx.execute({ sql: "UPDATE study_activity SET active_ms=active_ms+?,last_ping=?,last_active=? WHERE user_id=?", args: [elapsed, now, active ? 1 : 0, userId] });
    await tx.commit();
  } catch (error) { await tx.rollback(); throw error; } finally { tx.close(); }
  const { recordStudySession } = await import("@/integrations/turso/client.server");
  const award = await recordStudySession(userId, 30);
  return { ...await focusSnapshot(userId), pointsAwarded: award.pointsAwarded };
}
