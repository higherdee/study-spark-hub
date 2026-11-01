import { turso } from "@/integrations/turso/client.server";
import { randomUUID } from "node:crypto";
import { hasSubscriptionAccess, type BillingEnvironment, type BillingProvider, type BillingSubscription, type PlanId, type BillingTier } from "./catalog";

export const BILLING_SCHEMA = [
  `CREATE TABLE IF NOT EXISTS billing_customers (
    provider TEXT NOT NULL, environment TEXT NOT NULL, customer_id TEXT NOT NULL,
    user_id TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(provider,environment,customer_id), UNIQUE(provider,environment,user_id))`,
  `CREATE TABLE IF NOT EXISTS billing_checkouts (
    id TEXT PRIMARY KEY, user_id TEXT NOT NULL, environment TEXT NOT NULL, provider TEXT NOT NULL,
    plan TEXT NOT NULL, tier TEXT NOT NULL, country TEXT NOT NULL, currency TEXT NOT NULL,
    amount INTEGER NOT NULL, price_id TEXT NOT NULL, provider_reference TEXT, checkout_url TEXT,
    state TEXT NOT NULL DEFAULT 'creating', accepted_terms_at TEXT NOT NULL, fulfillment_lease_until TEXT, subscription_id TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, UNIQUE(provider,environment,provider_reference))`,
  `CREATE INDEX IF NOT EXISTS billing_checkouts_owner ON billing_checkouts(user_id,environment,created_at)`,
  `CREATE TABLE IF NOT EXISTS billing_subscriptions (
    provider TEXT NOT NULL, environment TEXT NOT NULL, subscription_id TEXT NOT NULL,
    customer_id TEXT NOT NULL, user_id TEXT NOT NULL, plan TEXT NOT NULL, tier TEXT NOT NULL,
    currency TEXT NOT NULL, amount INTEGER NOT NULL, status TEXT NOT NULL,
    period_start TEXT, period_end TEXT, grace_end TEXT, cancel_at TEXT,
    occurred_at TEXT NOT NULL, PRIMARY KEY(provider,environment,subscription_id))`,
  `CREATE INDEX IF NOT EXISTS billing_subscriptions_owner ON billing_subscriptions(user_id,environment)`,
  `CREATE TABLE IF NOT EXISTS billing_events (
    provider TEXT NOT NULL, environment TEXT NOT NULL, event_id TEXT NOT NULL, payload TEXT NOT NULL,
    state TEXT NOT NULL DEFAULT 'pending', attempts INTEGER NOT NULL DEFAULT 0, lease_until TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, processed_at TEXT,
    PRIMARY KEY(provider,environment,event_id))`,
  `CREATE TABLE IF NOT EXISTS billing_first_renewal_bonus (
    user_id TEXT NOT NULL, provider TEXT NOT NULL, environment TEXT NOT NULL,
    subscription_id TEXT NOT NULL, target_date TEXT NOT NULL, applied_at TEXT, PRIMARY KEY(user_id,environment))`,
  `CREATE TABLE IF NOT EXISTS membership_policy (id TEXT PRIMARY KEY, enabled_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS billing_operation_leases (scope TEXT PRIMARY KEY, token TEXT NOT NULL, expires_at TEXT NOT NULL)`,
];

let initialized: Promise<unknown> | undefined;
export async function ensureBillingTables() {
  initialized ??= turso.batch(BILLING_SCHEMA, "write").catch((error) => { initialized = undefined; throw error; });
  await initialized;
}

function subscription(row: Record<string, unknown>): BillingSubscription {
  const text = (key: string) => row[key] == null ? null : String(row[key]);
  return {
    provider: String(row["provider"]) as BillingProvider, environment: String(row["environment"]) as BillingEnvironment,
    providerId: String(row["subscription_id"]), customerId: String(row["customer_id"]), userId: String(row["user_id"]),
    plan: String(row["plan"]) as PlanId, tier: String(row["tier"]) as BillingTier, currency: String(row["currency"]), amount: Number(row["amount"]),
    status: String(row["status"]) as BillingSubscription["status"], periodStart: text("period_start"), periodEnd: text("period_end"),
    graceEnd: text("grace_end"), cancelAt: text("cancel_at"), occurredAt: String(row["occurred_at"]),
  };
}

export async function findCustomer(provider: BillingProvider, environment: BillingEnvironment, userId: string) {
  await ensureBillingTables();
  const result = await turso.execute({ sql: "SELECT customer_id FROM billing_customers WHERE provider=? AND environment=? AND user_id=?", args: [provider, environment, userId] });
  return result.rows[0] ? String(result.rows[0]["customer_id"]) : null;
}

export async function customerOwner(provider: BillingProvider, environment: BillingEnvironment, id: string) {
  await ensureBillingTables();
  const result = await turso.execute({ sql: "SELECT user_id FROM billing_customers WHERE provider=? AND environment=? AND customer_id=?", args: [provider, environment, id] });
  return result.rows[0] ? String(result.rows[0]["user_id"]) : null;
}

export async function rememberCustomer(provider: BillingProvider, environment: BillingEnvironment, userId: string, id: string) {
  await ensureBillingTables();
  // Never overwrite ownership on conflict, including a changed provider email.
  await turso.execute({ sql: "INSERT OR IGNORE INTO billing_customers(provider,environment,customer_id,user_id) VALUES(?,?,?,?)", args: [provider, environment, id, userId] });
  if (await customerOwner(provider, environment, id) !== userId) throw new Error("This billing customer is already linked to another account.");
}

export interface CheckoutRecord {
  id: string; userId: string; environment: BillingEnvironment; provider: BillingProvider; plan: PlanId;
  tier: BillingTier; country: string; currency: string; amount: number; priceId: string;
  providerReference: string | null; checkoutUrl: string | null; state: string;
}

function checkout(row: Record<string, unknown>): CheckoutRecord {
  return { id: String(row["id"]), userId: String(row["user_id"]), environment: String(row["environment"]) as BillingEnvironment,
    provider: String(row["provider"]) as BillingProvider, plan: String(row["plan"]) as PlanId, tier: String(row["tier"]) as BillingTier,
    country: String(row["country"]), currency: String(row["currency"]), amount: Number(row["amount"]), priceId: String(row["price_id"]),
    providerReference: row["provider_reference"] ? String(row["provider_reference"]) : null, checkoutUrl: row["checkout_url"] ? String(row["checkout_url"]) : null, state: String(row["state"]) };
}

export async function findCheckout(id: string, userId?: string) {
  await ensureBillingTables();
  const result = await turso.execute({ sql: `SELECT * FROM billing_checkouts WHERE id=?${userId ? " AND user_id=?" : ""}`, args: userId ? [id, userId] : [id] });
  return result.rows[0] ? checkout(result.rows[0]) : null;
}

export async function checkoutByReference(provider: BillingProvider, environment: BillingEnvironment, reference: string) {
  await ensureBillingTables();
  const result = await turso.execute({ sql: "SELECT * FROM billing_checkouts WHERE provider=? AND environment=? AND provider_reference=?", args: [provider, environment, reference] });
  return result.rows[0] ? checkout(result.rows[0]) : null;
}

export async function createCheckout(record: CheckoutRecord) {
  await ensureBillingTables();
  await turso.execute({ sql: `INSERT OR IGNORE INTO billing_checkouts(id,user_id,environment,provider,plan,tier,country,currency,amount,price_id,accepted_terms_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)`,
    args: [record["id"], record.userId, record["environment"], record["provider"], record["plan"], record["tier"], record["country"], record["currency"], record["amount"], record.priceId, new Date().toISOString()] });
  const saved = await findCheckout(record["id"]);
  if (!saved || saved.userId !== record.userId || saved["plan"] !== record["plan"] || saved["country"] !== record["country"] || saved["environment"] !== record["environment"] || saved["provider"] !== record["provider"] || saved.priceId !== record.priceId || saved["tier"] !== record["tier"] || saved["currency"] !== record["currency"] || saved["amount"] !== record["amount"]) throw new Error("Checkout request does not match its original account and plan.");
  return saved;
}

export async function readyCheckout(id: string, reference: string, url: string) {
  await turso.execute({ sql: "UPDATE billing_checkouts SET provider_reference=?,checkout_url=?,state='pending' WHERE id=? AND state='creating'", args: [reference, url, id] });
}

export async function claimBillingOperation(scope: string) {
  await ensureBillingTables();
  const token = randomUUID();
  const result = await turso.execute({ sql: `INSERT INTO billing_operation_leases(scope,token,expires_at) VALUES(?,?,?)
    ON CONFLICT(scope) DO UPDATE SET token=excluded.token,expires_at=excluded.expires_at WHERE billing_operation_leases.expires_at < ?`,
    args: [scope, token, new Date(Date.now() + 90000).toISOString(), new Date().toISOString()] });
  return result.rowsAffected === 1 ? token : null;
}

export async function releaseBillingOperation(scope: string, token: string) {
  await turso.execute({ sql: "DELETE FROM billing_operation_leases WHERE scope=? AND token=?", args: [scope, token] });
}

export async function listSubscriptions(userId: string, environment: BillingEnvironment) {
  await ensureBillingTables();
  const result = await turso.execute({ sql: "SELECT * FROM billing_subscriptions WHERE user_id=? AND environment=? ORDER BY occurred_at DESC", args: [userId, environment] });
  return result.rows.map(subscription);
}

export async function findSubscription(provider: BillingProvider, environment: BillingEnvironment, id: string) {
  await ensureBillingTables();
  const result = await turso.execute({ sql: "SELECT * FROM billing_subscriptions WHERE provider=? AND environment=? AND subscription_id=?", args: [provider, environment, id] });
  return result.rows[0] ? subscription(result.rows[0]) : null;
}

export async function bestSubscription(userId: string, environment: BillingEnvironment) {
  const all = await listSubscriptions(userId, environment);
  return all.filter((sub) => hasSubscriptionAccess(sub)).sort((a, b) => Date.parse(b.periodEnd || "") - Date.parse(a.periodEnd || ""))[0] || all[0] || null;
}

export async function projectMembership(userId: string, environment: BillingEnvironment) {
  const current = await bestSubscription(userId, environment);
  // Sandbox payments must never unlock a live account or change its rewards.
  if (environment !== "live") return;
  const hasAccess = hasSubscriptionAccess(current);
  const projection = current ? { provider: current["provider"], provider_id: current.providerId, verified: true, plan: current["plan"],
    status: current["status"] === "past_due" ? "grace_period" : current["status"], started_at: current.periodStart,
    current_period_end: current.periodEnd, grace_period_end: current.graceEnd, auto_renew: !current.cancelAt && ["active", "past_due"].includes(current["status"]),
    cancel_at: current.cancelAt, notices_sent: [] } : null;
  // json_set is atomic with settings edits. This function never awards points.
  await turso.execute({ sql: "UPDATE profiles SET sylla_plus=?,study_plan=json_set(COALESCE(study_plan,'{}'),'$.subscription',json(?)) WHERE id=?", args: [hasAccess ? 1 : 0, JSON.stringify(projection), userId] });
}

export async function saveSubscription(sub: BillingSubscription) {
  await ensureBillingTables();
  const owner = await customerOwner(sub["provider"], sub["environment"], sub.customerId);
  if (owner !== sub.userId) throw new Error("Subscription ownership could not be verified.");
  const previous = await findSubscription(sub["provider"], sub["environment"], sub.providerId);
  if (previous && previous.userId !== sub.userId) throw new Error("Subscription ownership cannot change.");
  await turso.execute({ sql: `INSERT INTO billing_subscriptions(provider,environment,subscription_id,customer_id,user_id,plan,tier,currency,amount,status,period_start,period_end,grace_end,cancel_at,occurred_at)
    VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(provider,environment,subscription_id) DO UPDATE SET
    status=excluded.status,plan=excluded.plan,tier=excluded.tier,currency=excluded.currency,amount=excluded.amount,
    period_start=excluded.period_start,period_end=excluded.period_end,grace_end=excluded.grace_end,cancel_at=excluded.cancel_at,occurred_at=excluded.occurred_at
    WHERE excluded.occurred_at >= billing_subscriptions.occurred_at`,
    args: [sub["provider"], sub["environment"], sub.providerId, sub.customerId, sub.userId, sub["plan"], sub["tier"], sub["currency"], sub["amount"], sub["status"], sub.periodStart, sub.periodEnd, sub.graceEnd, sub.cancelAt, sub.occurredAt] });
  await projectMembership(sub.userId, sub["environment"]);
}

export async function enqueueEvent(provider: BillingProvider, environment: BillingEnvironment, id: string, payload: string) {
  await ensureBillingTables();
  await turso.execute({ sql: "INSERT OR IGNORE INTO billing_events(provider,environment,event_id,payload) VALUES(?,?,?,?)", args: [provider, environment, id, payload] });
}

export async function pendingEvents(provider: BillingProvider, environment: BillingEnvironment, limit = 10) {
  await ensureBillingTables();
  const result = await turso.execute({ sql: "SELECT event_id,payload FROM billing_events WHERE provider=? AND environment=? AND (state='pending' OR (state='processing' AND lease_until < ?)) ORDER BY created_at ASC LIMIT ?", args: [provider, environment, new Date().toISOString(), limit] });
  return result.rows.map((row) => ({ id: String(row["event_id"]), payload: String(row["payload"]) }));
}

export async function finishEvent(provider: BillingProvider, environment: BillingEnvironment, id: string) {
  await turso.execute({ sql: "UPDATE billing_events SET state='processed',processed_at=CURRENT_TIMESTAMP WHERE provider=? AND environment=? AND event_id=?", args: [provider, environment, id] });
}

export async function billingEventProcessed(provider: BillingProvider, environment: BillingEnvironment, id: string) {
  await ensureBillingTables();
  const result = await turso.execute({ sql: "SELECT state FROM billing_events WHERE provider=? AND environment=? AND event_id=?", args: [provider, environment, id] });
  return result.rows[0]?.["state"] === "processed";
}

export async function claimEvent(provider: BillingProvider, environment: BillingEnvironment, id: string) {
  const result = await turso.execute({ sql: "UPDATE billing_events SET state='processing',attempts=attempts+1,lease_until=? WHERE provider=? AND environment=? AND event_id=? AND (state='pending' OR (state='processing' AND lease_until < ?))",
    args: [new Date(Date.now() + 90000).toISOString(), provider, environment, id, new Date().toISOString()] });
  return result.rowsAffected === 1;
}

export async function retryEvent(provider: BillingProvider, environment: BillingEnvironment, id: string) {
  await turso.execute({ sql: "UPDATE billing_events SET state='pending',lease_until=NULL WHERE provider=? AND environment=? AND event_id=? AND state='processing'", args: [provider, environment, id] });
}

export async function markCheckoutPaid(id: string) {
  await turso.execute({ sql: "UPDATE billing_checkouts SET state='paid',fulfillment_lease_until=NULL WHERE id=?", args: [id] });
}

export async function claimCheckoutFulfillment(id: string) {
  const result = await turso.execute({ sql: "UPDATE billing_checkouts SET fulfillment_lease_until=? WHERE id=? AND state!='paid' AND (fulfillment_lease_until IS NULL OR fulfillment_lease_until < ?)",
    args: [new Date(Date.now() + 90000).toISOString(), id, new Date().toISOString()] });
  return result.rowsAffected === 1;
}

export async function checkoutSubscriptionId(id: string) {
  const result = await turso.execute({ sql: "SELECT subscription_id FROM billing_checkouts WHERE id=?", args: [id] });
  return result.rows[0]?.["subscription_id"] ? String(result.rows[0]["subscription_id"]) : null;
}

export async function linkCheckoutSubscription(id: string, subscriptionId: string) {
  await turso.execute({ sql: "UPDATE billing_checkouts SET subscription_id=? WHERE id=? AND (subscription_id IS NULL OR subscription_id=?)", args: [subscriptionId, id, subscriptionId] });
}

export async function reserveFirstRenewalBonus(userId: string, provider: BillingProvider, environment: BillingEnvironment, subscriptionId: string, target: string) {
  await ensureBillingTables();
  await turso.execute({ sql: "INSERT OR IGNORE INTO billing_first_renewal_bonus(user_id,provider,environment,subscription_id,target_date) VALUES(?,?,?,?,?)", args: [userId, provider, environment, subscriptionId, target] });
  const result = await turso.execute({ sql: "SELECT provider,subscription_id,target_date,applied_at FROM billing_first_renewal_bonus WHERE user_id=? AND environment=?", args: [userId, environment] });
  const row = result.rows[0];
  return row && row["provider"] === provider && row["subscription_id"] === subscriptionId
    ? { target: String(row["target_date"]), applied: !!row["applied_at"] } : null;
}

export async function bonusAlreadyClaimed(userId: string, environment: BillingEnvironment) {
  await ensureBillingTables();
  const result = await turso.execute({ sql: "SELECT 1 FROM billing_first_renewal_bonus WHERE user_id=? AND environment=? LIMIT 1", args: [userId, environment] });
  return result.rows.length > 0;
}

export async function completeFirstRenewalBonus(userId: string, environment: BillingEnvironment, subscriptionId: string) {
  await turso.execute({ sql: "UPDATE billing_first_renewal_bonus SET applied_at=? WHERE user_id=? AND environment=? AND subscription_id=?", args: [new Date().toISOString(), userId, environment, subscriptionId] });
}

export async function promoteBonusReference(userId: string, environment: BillingEnvironment, originalId: string, subscriptionId: string) {
  await turso.execute({ sql: "UPDATE billing_first_renewal_bonus SET subscription_id=? WHERE user_id=? AND environment=? AND subscription_id=?", args: [subscriptionId, userId, environment, originalId] });
}
