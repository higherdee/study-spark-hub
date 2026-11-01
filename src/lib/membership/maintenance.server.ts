import { turso } from "@/integrations/turso/client.server";
import { ensureBillingTables } from "@/lib/billing/store.server";
import { ensureMembershipTables } from "./policy.server";
import { ensurePromoTables } from "./promos.server";

export async function runMembershipMaintenance() {
  await ensureMembershipTables();
  await ensureBillingTables();
  await ensurePromoTables();
  // This mirrors hasSubscriptionAccess: a real paid period or renewal grace
  // excludes the account from free-history deletion. Manual legacy access is
  // retained only when no canonical live subscription supersedes it.
  const canonicalAccess = `EXISTS(SELECT 1 FROM billing_subscriptions s WHERE s.user_id=p.id AND s.environment='live' AND s.period_end IS NOT NULL AND ((s.status IN ('active','trialing') AND datetime(s.period_end)>datetime('now') AND (s.cancel_at IS NULL OR datetime(s.cancel_at)>datetime('now'))) OR (s.status='past_due' AND datetime(s.grace_end)>datetime('now'))))`;
  const legacyEnd = `json_extract(CASE WHEN json_valid(p.study_plan) THEN p.study_plan ELSE '{}' END,'$.subscription.current_period_end')`;
  const paid = `(EXISTS(SELECT 1 FROM membership_promo_claims c WHERE c.user_id=p.id AND c.effect='plus_days' AND datetime(c.expires_at)>datetime('now')) OR CASE WHEN EXISTS(SELECT 1 FROM billing_subscriptions s WHERE s.user_id=p.id AND s.environment='live') THEN ${canonicalAccess} ELSE (p.sylla_plus=1 AND (${legacyEnd} IS NULL OR datetime(${legacyEnd})>datetime('now'))) END)`;
  const result = await turso.batch([
    { sql: `WITH access AS (SELECT p.id,${paid} AS paid FROM profiles p)
      INSERT INTO membership_retention(user_id,paid,free_since)
      SELECT id,paid,CASE WHEN paid=1 THEN NULL ELSE (SELECT enabled_at FROM membership_policy_settings WHERE id='free-retention') END FROM access WHERE 1
      ON CONFLICT(user_id) DO UPDATE SET paid=excluded.paid,free_since=CASE WHEN excluded.paid=1 THEN NULL WHEN membership_retention.paid=1 THEN datetime('now') ELSE COALESCE(membership_retention.free_since,excluded.free_since) END`, args: [] },
    { sql: "DELETE FROM chat_messages WHERE datetime(created_at)<datetime('now','-7 days') AND user_id IN(SELECT user_id FROM membership_retention WHERE paid=0 AND datetime(free_since)<=datetime('now','-7 days'))", args: [] },
    { sql: "DELETE FROM chat_threads WHERE datetime(updated_at)<datetime('now','-7 days') AND user_id IN(SELECT user_id FROM membership_retention WHERE paid=0 AND datetime(free_since)<=datetime('now','-7 days')) AND NOT EXISTS(SELECT 1 FROM chat_messages WHERE thread_id=chat_threads.id)", args: [] },
    { sql: "DELETE FROM membership_material_grants WHERE expires_at<?", args: [Date.now()] },
    { sql: "DELETE FROM membership_ai_requests WHERE day<date('now','-14 days')", args: [] },
    { sql: "DELETE FROM membership_ai_daily WHERE day<date('now','-14 days')", args: [] },
  ], "write");
  return { deletedMessages: result[1]?.rowsAffected || 0, deletedThreads: result[2]?.rowsAffected || 0 };
}
