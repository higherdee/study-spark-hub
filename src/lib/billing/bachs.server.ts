import { Bachs, webhooks } from "@bachs/sdk";
import type { BillingEnvironment } from "./catalog";

const clients = new Map<BillingEnvironment, Bachs>();

export function bachsKey(environment: BillingEnvironment) {
  const key = process.env[environment === "live" ? "BACHS_LIVE_SECRET_KEY" : "BACHS_SANDBOX_SECRET_KEY"] || "";
  return key.startsWith(environment === "live" ? "sk_live_" : "sk_sandbox_") ? key : "";
}

export function bachs(environment: BillingEnvironment) {
  const apiKey = bachsKey(environment);
  if (!apiKey) throw new Error("Bachs is not configured for this payment environment.");
  let client = clients.get(environment);
  if (!client) {
    client = new Bachs({ apiKey, environment: environment === "live" ? "production" : "sandbox", timeoutMs: 15000, maxRetries: 1, logLevel: "off" });
    clients.set(environment, client);
  }
  return client;
}

export function bachsWebhookEvent(raw: string, headers: Headers, environment: BillingEnvironment) {
  const secret = process.env[environment === "live" ? "BACHS_LIVE_WEBHOOK_SECRET" : "BACHS_SANDBOX_WEBHOOK_SECRET"];
  if (!secret) throw new Error("Bachs webhook verification is not configured.");
  return webhooks.constructEvent(raw, headers, secret);
}

/** Bachs money values are decimal strings, never floating-point minor units. */
export function bachsUsdMinor(value: unknown) {
  if (typeof value !== "string" || !/^\d+(?:\.\d{1,2})?$/.test(value)) throw new Error("Invalid Bachs USD amount.");
  const [whole, fraction = ""] = value.split(".");
  const amount = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  if (!Number.isSafeInteger(amount) || amount < 0) throw new Error("Invalid Bachs USD amount.");
  return amount;
}

let transferSupport: { environment: BillingEnvironment; until: number; available: boolean } | undefined;
export async function bachsNgnTransferAvailable(environment: BillingEnvironment) {
  if (transferSupport?.environment === environment && transferSupport.until > Date.now()) return transferSupport.available;
  const response = await fetch(`${environment === "live" ? "https://api.bachs.io" : "https://sandbox-api.bachs.io"}/v1/payment-methods`, {
    headers: { Authorization: `Bearer ${bachsKey(environment)}` }, signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) return false;
  const body = await response.json();
  const methods = body.data?.payment_methods ?? body.payment_methods;
  const available = Array.isArray(methods) && methods.some((method: { id?: string; currencies?: string[] }) => method.id === "BANK_TRANSFER" && method.currencies?.includes("NGN"));
  transferSupport = { environment, until: Date.now() + 300000, available };
  return available;
}

// Subscription edits are documented by the REST API but not exposed in SDK 2.
// Do not retry writes blindly: callers reconcile the fixed target first.
export async function extendBachsFirstRenewal(id: string, target: string, environment: BillingEnvironment) {
  const response = await fetch(`${environment === "live" ? "https://api.bachs.io" : "https://sandbox-api.bachs.io"}/v1/subscriptions/${encodeURIComponent(id)}`, {
    method: "PATCH", headers: { Authorization: `Bearer ${bachsKey(environment)}`, "Content-Type": "application/json" },
    body: JSON.stringify({ trial_end: target }), signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error("Bachs could not extend the first paid renewal.");
  return bachs(environment).subscriptions.get(id);
}
