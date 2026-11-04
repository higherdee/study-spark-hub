import { createClerkClient, verifyToken } from "@clerk/backend";
import { bachs } from "./bachs.server";
import { CLERK_SECRET_KEY } from "@/integrations/clerk";
import { getProfile, turso } from "@/integrations/turso/client.server";
import { hasSubscriptionAccess, normalizeCountry, type BillingEnvironment, type BillingProvider, type BillingSummary, type PlanId } from "./catalog";
import { billingEnvironment, checkoutQuote, paddle, paddleClientToken, paystack, providerConfigured, checkoutProductId, siteOrigin } from "./providers.server";
import { bestSubscription, bonusAlreadyClaimed, claimBillingOperation, createCheckout, findCheckout, findCustomer, listSubscriptions, projectMembership, readyCheckout, releaseBillingOperation, rememberCustomer } from "./store.server";

export class BillingError extends Error {
  constructor(message: string, public readonly status = 400) { super(message); }
}

export async function billingIdentity(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token || !CLERK_SECRET_KEY) throw new BillingError("Sign in to manage your membership.", 401);
  let userId: string;
  try { userId = (await verifyToken(token, { secretKey: CLERK_SECRET_KEY })).sub; }
  catch { throw new BillingError("Sign in to manage your membership.", 401); }
  if (!userId) throw new BillingError("Sign in to manage your membership.", 401);
  return userId;
}

async function verifiedEmail(userId: string) {
  const user = await createClerkClient({ secretKey: CLERK_SECRET_KEY }).users.getUser(userId);
  const primary = user.emailAddresses.find((email) => email.id === user.primaryEmailAddressId);
  if (!primary || primary.verification?.status !== "verified") throw new BillingError("Verify your email address before subscribing.");
  return primary.emailAddress;
}

export async function ensureCustomer(provider: BillingProvider, environment: BillingEnvironment, userId: string) {
  if (provider === "bachs") throw new BillingError("Bachs customers are created through verified checkout.");
  const existing = await findCustomer(provider, environment, userId);
  if (existing) return existing;
  const scope = `customer:${provider}:${environment}:${userId}`;
  const token = await claimBillingOperation(scope);
  if (!token) throw new BillingError("Your billing account is being prepared. Please retry in a moment.", 409);
  try {
  const linked = await findCustomer(provider, environment, userId);
  if (linked) return linked;
  const email = await verifiedEmail(userId);
  let id: string;
  if (provider === "paddle") {
    const matches = await paddle(environment).customers.list({ email: [email], perPage: 10 }).next();
    const owned = matches.find((customer) => customer.customData?.["app_user_id"] === userId);
    const customer = owned || await paddle(environment).customers.create({ email, customData: { app_user_id: userId } });
    id = customer.id;
  } else {
    const customer = await paystack<{ customer_code: string }>("/customer", { email, metadata: { app_user_id: userId } }, environment);
    id = customer.customer_code;
  }
  await rememberCustomer(provider, environment, userId, id);
  return id;
  } finally { await releaseBillingOperation(scope, token); }
}

export async function billingSummary(userId: string, country?: string | null): Promise<BillingSummary> {
  const environment = billingEnvironment();
  const current = await bestSubscription(userId, environment);
  if (current) await projectMembership(userId, environment);
  const providers = { bachs: providerConfigured("bachs", environment), paddle: providerConfigured("paddle", environment), paystack: providerConfigured("paystack", environment) };
  const { userId: _owner, customerId: _customer, ...publicSubscription } = current || {} as NonNullable<typeof current>;
  return {
    environment, country: normalizeCountry(country),
    subscription: current ? { ...publicSubscription, hasAccess: hasSubscriptionAccess(current) } : null,
    checkoutEnabled: process.env["BILLING_ENABLED"] === "true", providers, firstRenewalBonusDays: await bonusAlreadyClaimed(userId, environment) ? 0 : 7,
  };
}

export async function startCheckout(userId: string, input: { id: string; plan: PlanId; country: string; acceptedTerms: true; recurringConsent: true }) {
  const environment = billingEnvironment();
  const profile = await getProfile(userId);
  if (!profile || profile.suspended) throw new BillingError("This account cannot start a subscription.", 403);
  if (process.env["BILLING_ENABLED"] !== "true") throw new BillingError("Subscription checkout is being prepared. Please try again later.", 503);
  let quote;
  try { quote = checkoutQuote(input.country, input.plan); }
  catch (error) { throw new BillingError(error instanceof Error ? error.message : "Choose a valid country and plan.", error instanceof Error && /Weekly|Choose/.test(error.message) ? 400 : 503); }
  if (!providerConfigured(quote.provider, environment)) throw new BillingError("Checkout for your billing country is not ready yet.", 503);
  if ((await listSubscriptions(userId, environment)).some((sub) => hasSubscriptionAccess(sub))) throw new BillingError("You already have SyllaPlus. Use Manage billing to change or cancel your plan.", 409);
  const priceId = checkoutProductId(quote, environment);
  if (!priceId) throw new BillingError("Checkout for this plan is being configured.", 503);
  let record = await createCheckout({ id: input.id, userId, environment, ...quote, priceId, providerReference: null, checkoutUrl: null, state: "creating" });
  if (record.checkoutUrl && record.state === "pending") return { id: record.id, url: record.checkoutUrl, environment };
  if (record.state !== "creating") throw new BillingError("This checkout has already been used. Refresh your membership.", 409);
  const scope = `checkout:${record.id}`;
  const operation = await claimBillingOperation(scope);
  if (!operation) throw new BillingError("Your checkout is already being prepared. Please retry in a moment.", 409);
  try {
  record = (await findCheckout(record.id, userId))!;
  if (record.checkoutUrl && record.state === "pending") return { id: record.id, url: record.checkoutUrl, environment };
  if (record.state !== "creating") throw new BillingError("This checkout has already been used. Refresh your membership.", 409);
  // Bachs creates a customer with checkout. Bind it to this owner only after
  // retrieving the paid checkout from its authenticated API.
  const customerId = quote.provider === "bachs" ? await findCustomer("bachs", environment, userId) : await ensureCustomer(quote.provider, environment, userId);
  let url: string; let reference: string;
  if (quote.provider === "bachs") {
    const email = await verifiedEmail(userId);
    const session = await bachs(environment).checkoutSessions.create({
      product_cart: [{ product_id: priceId, quantity: 1 }], billing_currency: "USD", payment_method_types: ["USD_CARD"],
      customer: customerId ? { customer_id: customerId } : { email, name: "Syllaboss member" },
      ...(customerId ? {} : { customer_creation: "always" as const }),
      success_url: `${siteOrigin()}/billing/return?checkout=${encodeURIComponent(record.id)}`,
      cancel_url: `${siteOrigin()}/billing/return?checkout=${encodeURIComponent(record.id)}`,
      reference: record.id, metadata: { app_user_id: userId, app_checkout_id: record.id, plan: input.plan },
    }, { idempotencyKey: `syllaboss-checkout-${record.id}` });
    reference = session.checkout_id; url = session.checkout_url;
  } else {
    const transaction = await paddle(environment).transactions.create({
      items: [{ priceId, quantity: 1 }], customerId, collectionMode: "automatic",
      customData: { app_user_id: userId, checkout_id: record.id, first_renewal_bonus_days: 7 },
      checkout: { url: `${siteOrigin()}/billing/checkout` },
    });
    if (!transaction.checkout?.url) throw new BillingError("The payment checkout could not open. Please retry.", 503);
    reference = transaction.id; url = transaction.checkout.url;
  }
  const destination = new URL(url);
  const allowed = quote.provider === "bachs" ? destination.hostname === (environment === "sandbox" ? "sandbox-checkout.bachs.io" : "checkout.bachs.io") : destination.origin === siteOrigin();
  if (destination.protocol !== "https:" || !allowed) throw new BillingError("The payment service returned an unexpected checkout address.", 503);
  await readyCheckout(record.id, reference, url);
  record = (await findCheckout(record.id, userId))!;
  return { id: record.id, url: record.checkoutUrl!, environment };
  } finally { await releaseBillingOperation(scope, operation); }
}

export async function managementUrl(userId: string) {
  const environment = billingEnvironment();
  const sub = await bestSubscription(userId, environment);
  if (!sub) throw new BillingError("You do not have a subscription to manage.", 404);
  if (sub.provider === "paddle") {
    const portal = await paddle(environment).customerPortalSessions.create(sub.customerId, [sub.providerId]);
    return portal.urls.general.overview;
  }
  if (sub.provider === "bachs") return (await bachs(environment).customerPortal.createSession(sub.customerId)).url;
  if (sub.providerId.startsWith("pass_")) throw new BillingError("This membership does not renew automatically.");
  return (await paystack<{ link: string }>(`/subscription/${encodeURIComponent(sub.providerId)}/manage/link`, undefined, environment)).link;
}

export async function cancelRenewal(userId: string) {
  const environment = billingEnvironment();
  const sub = await bestSubscription(userId, environment);
  if (!sub) throw new BillingError("You do not have an active subscription.", 404);
  if (sub.cancelAt) return { endsAt: sub.cancelAt };
  if (sub.provider === "paddle") {
    await paddle(environment).subscriptions.cancel(sub.providerId, { effectiveFrom: "next_billing_period" });
  } else if (sub.provider === "bachs") {
    await bachs(environment).subscriptions.cancel(sub.providerId, { cancel_at_period_end: true, reason: "Customer requested" });
  } else {
    const canonical = await paystack<{ subscription_code: string; email_token: string }>(`/subscription/${encodeURIComponent(sub.providerId)}`, undefined, environment);
    await paystack("/subscription/disable", { code: canonical.subscription_code, token: canonical.email_token }, environment);
  }
  const { saveSubscription } = await import("./store.server");
  await saveSubscription({ ...sub, cancelAt: sub.periodEnd });
  return { endsAt: sub.periodEnd };
}

export function publicCheckoutConfiguration() {
  return { environment: billingEnvironment(), clientToken: paddleClientToken(), bonusDays: 7 };
}

export async function membershipStatus(userId: string) {
  const { promoBenefits } = await import("@/lib/membership/promos.server");
  const promo = await promoBenefits(userId);
  const sub = await bestSubscription(userId, "live");
  const profile = await getProfile(userId);
  if (sub) await projectMembership(userId, "live");
  const legacy = profile?.study_plan?.["subscription"] as Record<string, unknown> | undefined;
  const legacyEnd = typeof legacy?.["current_period_end"] === "string" ? legacy["current_period_end"] : null;
  const hasAccess = !!promo.plusUntil || (sub ? hasSubscriptionAccess(sub) : !!profile?.sylla_plus && (!legacyEnd || Date.parse(legacyEnd) > Date.now()));
  if (!sub && profile?.sylla_plus && !hasAccess) await turso.execute({ sql: "UPDATE profiles SET sylla_plus=0 WHERE id=?", args: [userId] });
  const grace = sub?.status === "past_due";
  return { sylla_plus: hasAccess, suspended: !!profile?.suspended, status: grace ? "grace_period" as const : hasAccess ? "active" as const : "expired" as const,
    plan: sub?.plan || "monthly" as const, current_period_end: sub?.periodEnd || legacyEnd, grace_period_end: sub?.graceEnd || null,
    daysRemainingInGrace: grace && sub.graceEnd ? Math.max(0, Math.ceil((Date.parse(sub.graceEnd) - Date.now()) / 86400000)) : 0,
    notice: grace ? "Your payment provider reported a renewal issue. Update your payment method to keep SyllaPlus." : null };
}
