import { Environment, LogLevel, Paddle } from "@paddle/paddle-node-sdk";
import configuredCatalog from "@/data/billing-catalog.json";
import { bachsKey } from "./bachs.server";
import { PLAN_IDS, quoteFor, type BillingEnvironment, type BillingProvider, type PlanId } from "./catalog";

export function billingEnvironment(): BillingEnvironment {
  return process.env["BILLING_ENV"] === "live" ? "live" : "sandbox";
}

export function siteOrigin() {
  const origin = process.env["BILLING_SITE_ORIGIN"] || "https://syllaboss.org";
  const parsed = new URL(origin);
  if (parsed.protocol !== "https:" && parsed.hostname !== "localhost" && parsed.hostname !== "127.0.0.1") throw new Error("Billing requires a secure site address.");
  return parsed.origin;
}

export function providerKey(provider: BillingProvider, environment = billingEnvironment()) {
  if (provider === "bachs") return bachsKey(environment);
  if (provider === "paddle") return process.env[environment === "live" ? "PADDLE_LIVE_API_KEY" : "PADDLE_SANDBOX_API_KEY"] || "";
  const key = process.env[environment === "live" ? "PAYSTACK_LIVE_SECRET_KEY" : "PAYSTACK_TEST_SECRET_KEY"] || process.env["PAYSTACK_SECRET_KEY"] || "";
  return key.startsWith(environment === "live" ? "sk_live_" : "sk_test_") ? key : "";
}

export function paddleClientToken(environment = billingEnvironment()) {
  return process.env[environment === "live" ? "PADDLE_LIVE_CLIENT_TOKEN" : "PADDLE_SANDBOX_CLIENT_TOKEN"] || "";
}

export function webhookSecret(provider: BillingProvider, environment = billingEnvironment()) {
  if (provider === "bachs") return process.env[environment === "live" ? "BACHS_LIVE_WEBHOOK_SECRET" : "BACHS_SANDBOX_WEBHOOK_SECRET"] || "";
  return provider === "paystack" ? providerKey(provider, environment) : process.env[environment === "live" ? "PADDLE_LIVE_WEBHOOK_SECRET" : "PADDLE_SANDBOX_WEBHOOK_SECRET"] || "";
}

export function providerPlanId(provider: BillingProvider, plan: PlanId, environment = billingEnvironment()) {
  const prefix = `${provider.toUpperCase()}_${environment.toUpperCase()}_${provider === "paddle" ? "PRICE" : provider === "bachs" ? "PRODUCT" : "PLAN"}_${plan.toUpperCase()}`;
  const catalog = configuredCatalog.environments[environment][provider] as Partial<Record<PlanId, string>>;
  return process.env[prefix] || catalog[plan] || "";
}

export function checkoutProductId(quote: ReturnType<typeof checkoutQuote>, environment = billingEnvironment()) {
  if (quote.provider === "bachs" && quote.tier === "international") {
    const catalog = configuredCatalog.environments[environment] as { bachsInternational?: Partial<Record<PlanId, string>> };
    return process.env[`BACHS_${environment.toUpperCase()}_INTERNATIONAL_PRODUCT_${quote.plan.toUpperCase()}`] || catalog.bachsInternational?.[quote.plan] || "";
  }
  return providerPlanId(quote.provider, quote.plan, environment);
}

export function providerConfigured(provider: BillingProvider, environment = billingEnvironment()) {
  // Regional checkout is being connected to the owner's Bachs account.
  // Keep the previous Paystack adapter inactive, including in sandbox.
  if (provider === "paystack") return false;
  const key = providerKey(provider, environment);
  if (!key || !webhookSecret(provider, environment)) return false;
  if (provider === "paddle" && (!key.startsWith(environment === "live" ? "pdl_live_apikey_" : "pdl_sdbx_apikey_") || !paddleClientToken(environment))) return false;
  return (provider === "paddle" ? ["monthly", "yearly"] as const : PLAN_IDS).every((plan) => !!providerPlanId(provider, plan, environment));
}

export function planForProviderId(provider: BillingProvider, id: string, environment: BillingEnvironment) {
  if (provider === "bachs" && id) {
    const international = PLAN_IDS.find(plan =>
      process.env[`BACHS_${environment.toUpperCase()}_INTERNATIONAL_PRODUCT_${plan.toUpperCase()}`] === id
    );
    if (international) return international;
  }
  const current = PLAN_IDS.find((plan) => !!id && providerPlanId(provider, plan, environment) === id);
  if (current) return current;
  const history = configuredCatalog.history[environment][provider] as Record<string, PlanId>;
  return history[id] || null;
}

const clients = new Map<BillingEnvironment, Paddle>();
export function paddle(environment = billingEnvironment()) {
  if (!providerKey("paddle", environment)) throw new Error("International checkout is not configured yet.");
  let client = clients.get(environment);
  if (!client) {
    client = new Paddle(providerKey("paddle", environment), { environment: environment === "live" ? Environment.production : Environment.sandbox, logLevel: LogLevel.error });
    clients.set(environment, client);
  }
  return client;
}

export class ProviderRequestError extends Error {
  constructor(public readonly status: number, public readonly code: string) { super("The payment service could not complete this request. Please retry."); }
}

export async function paystack<T = Record<string, unknown>>(path: string, body?: unknown, environment = billingEnvironment()): Promise<T> {
  const key = providerKey("paystack", environment);
  if (!key) throw new Error("Naira checkout is not configured yet.");
  const response = await fetch(`https://api.paystack.co${path}`, {
    method: body === undefined ? "GET" : "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal: AbortSignal.timeout(15000),
  });
  const result = await response.json().catch(() => null) as { status?: boolean; data?: T; code?: string } | null;
  if (!response.ok || !result?.status) throw new ProviderRequestError(response.status, result?.code || "payment_service_error");
  return result.data as T;
}

export interface MarketPrices {
  currency: string; weekly: number; monthly: number; yearly: number;
  equivalentCurrency?: string; equivalentWeekly?: number; equivalentMonthly?: number; equivalentYearly?: number;
}

export function checkoutQuote(country: string, plan: PlanId) {
  const base = quoteFor(country, plan);
  if (base.tier === "international") {
    const override = process.env["BILLING_BACHS_ONLY"];
    const bachsOnly = override === undefined ? billingEnvironment() === "live" : override === "true";
    return bachsOnly ? { ...base, provider: "bachs" as const } : base;
  }
  const market = (configuredCatalog.markets as Record<string, MarketPrices>)[country];
  if (!market || !Number.isSafeInteger(market[plan]) || market[plan] <= 0) throw new Error("Pricing for your billing country is being configured.");
  const equivalent = market[({ weekly: "equivalentWeekly", monthly: "equivalentMonthly", yearly: "equivalentYearly" } as const)[plan]];
  return { ...base, amount: market[plan], currency: market.currency,
    approximateAmount: equivalent ?? null, approximateCurrency: market.equivalentCurrency || null };
}
