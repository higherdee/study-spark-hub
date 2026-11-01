export const PLAN_IDS = ["weekly", "monthly", "yearly"] as const;
export type PlanId = (typeof PLAN_IDS)[number];
export type BillingTier = "regional" | "international";
export type BillingProvider = "bachs" | "paystack" | "paddle";
export type BillingEnvironment = "sandbox" | "live";

export const REGIONAL_MARKETS = {
  NG: "Nigeria", GH: "Ghana", KE: "Kenya", ZA: "South Africa", EG: "Egypt",
  RW: "Rwanda", UG: "Uganda", TZ: "Tanzania", ET: "Ethiopia", CM: "Cameroon",
  SN: "Senegal", CI: "Ivory Coast", MA: "Morocco", DZ: "Algeria", TN: "Tunisia",
  IN: "India", PK: "Pakistan", NP: "Nepal",
} as const;

// Amounts are integer minor units. Never accept an amount or provider price ID
// from a checkout request. These preserve the site's existing two price groups.
export const BILLING_PRICES = {
  regional: { currency: "NGN", provider: "bachs", weekly: 199900, monthly: 699900, yearly: 6899900 },
  international: { currency: "USD", provider: "paddle", weekly: null, monthly: 1299, yearly: 10999 },
} as const;

export function normalizeCountry(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const code = value.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(code) || ["XX", "ZZ", "T1"].includes(code)) return null;
  try {
    const name = new Intl.DisplayNames(["en"], { type: "region" }).of(code);
    if (!name || name === code || ["EU", "UN"].includes(code)) return null;
  } catch { return null; }
  return code;
}

export function tierForCountry(country: string): BillingTier {
  return country in REGIONAL_MARKETS ? "regional" : "international";
}

export function quoteFor(country: string, plan: PlanId) {
  const normalized = normalizeCountry(country);
  if (!normalized) throw new Error("Choose your billing country.");
  const tier = tierForCountry(normalized);
  const prices = BILLING_PRICES[tier];
  if (prices[plan] === null) throw new Error("Weekly subscriptions are available only in regional markets.");
  return { plan, tier, country: normalized, amount: prices[plan] as number, currency: prices.currency, provider: prices.provider };
}

export function formatPrice(amount: number, currency: string) {
  const digits = new Intl.NumberFormat("en", { style: "currency", currency }).resolvedOptions().maximumFractionDigits ?? 2;
  return new Intl.NumberFormat("en", { style: "currency", currency, maximumFractionDigits: currency === "NGN" ? 0 : digits }).format(amount / 10 ** digits);
}

export type SubscriptionState = "active" | "trialing" | "past_due" | "paused" | "canceled" | "expired";
export interface BillingSubscription {
  provider: BillingProvider;
  environment: BillingEnvironment;
  providerId: string;
  customerId: string;
  userId: string;
  plan: PlanId;
  tier: BillingTier;
  currency: string;
  amount: number;
  status: SubscriptionState;
  periodStart: string | null;
  periodEnd: string | null;
  graceEnd: string | null;
  cancelAt: string | null;
  occurredAt: string;
}

export function hasSubscriptionAccess(sub: Pick<BillingSubscription, "status" | "periodEnd" | "graceEnd" | "cancelAt"> | null, now = Date.now()) {
  if (!sub) return false;
  const end = sub.periodEnd ? Date.parse(sub.periodEnd) : NaN;
  if (!Number.isFinite(end)) return false;
  const cutoff = sub.cancelAt ? Math.min(end, Date.parse(sub.cancelAt)) : end;
  if (sub.status === "active" || sub.status === "trialing") return Number.isFinite(cutoff) && now < cutoff;
  if (sub.status === "past_due") return !!sub.graceEnd && now < Date.parse(sub.graceEnd);
  return false;
}

export function graceEndFor(plan: PlanId, failedAt: string) {
  // A real provider failure anchors grace; simply visiting settings cannot
  // manufacture a new failed payment or extend a grace period.
  return new Date(Date.parse(failedAt) + ({ weekly: 6, monthly: 12, yearly: 14 }[plan]) * 86400000).toISOString();
}

export function firstRenewalDate(paidAt: string, plan: PlanId, bonusDays = 7) {
  const date = new Date(paidAt);
  if (!Number.isFinite(date.getTime())) throw new Error("Invalid payment date.");
  if (plan === "weekly") date.setUTCDate(date.getUTCDate() + 7);
  else {
    const day = date.getUTCDate();
    date.setUTCDate(1);
    if (plan === "yearly") date.setUTCFullYear(date.getUTCFullYear() + 1);
    else date.setUTCMonth(date.getUTCMonth() + 1);
    const endOfMonth = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
    date.setUTCDate(Math.min(day, endOfMonth));
  }
  date.setUTCDate(date.getUTCDate() + bonusDays);
  return date.toISOString();
}

export function safeStudyPlanPatch(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const reserved = new Set(["subscription", "billing", "sylla_plus", "trial", "trial_used_at", "__proto__", "constructor", "prototype"]);
  return Object.fromEntries(Object.entries(value).filter(([key]) => !reserved.has(key) && !key.startsWith("billing_")));
}

export interface BillingSummary {
  environment: BillingEnvironment;
  country: string | null;
  subscription: (Omit<BillingSubscription, "userId" | "customerId"> & { hasAccess: boolean }) | null;
  checkoutEnabled: boolean;
  providers: Record<BillingProvider, boolean>;
  firstRenewalBonusDays: number;
}
