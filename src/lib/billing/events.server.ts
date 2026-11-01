import { createHash } from "node:crypto";
import { turso } from "@/integrations/turso/client.server";
import { PLAN_IDS, firstRenewalDate, graceEndFor, type BillingEnvironment, type BillingProvider, type BillingSubscription, type PlanId } from "./catalog";
import { paddle, paystack, planForProviderId } from "./providers.server";
import { bachs, bachsUsdMinor, extendBachsFirstRenewal } from "./bachs.server";
import { checkoutByReference, checkoutSubscriptionId, claimCheckoutFulfillment, claimEvent, completeFirstRenewalBonus, customerOwner, findCheckout, findSubscription, finishEvent, linkCheckoutSubscription, listSubscriptions, markCheckoutPaid, pendingEvents, promoteBonusReference, rememberCustomer, reserveFirstRenewalBonus, retryEvent, saveSubscription } from "./store.server";

type Json = Record<string, any>;
function iso(value: unknown): string | null {
  if (typeof value !== "string" || !Number.isFinite(Date.parse(value))) return null;
  return new Date(value).toISOString();
}

function identifyPlan(provider: BillingProvider, id: string, environment: BillingEnvironment) {
  return planForProviderId(provider, id, environment);
}

export function paymentEventId(provider: BillingProvider, raw: string, event: Json) {
  if (provider === "bachs" && typeof event["id"] === "string") return event["id"];
  if (provider === "paddle" && typeof event["event_id"] === "string") return event["event_id"];
  if (provider === "paystack" && typeof event["event"] === "string" && event["data"]?.id != null) {
    const revision = event["event"].startsWith("subscription.") ? event["data"].updatedAt || event["data"].updated_at || event["data"]["next_payment_date"] || event["data"]["createdAt"] || "" : "";
    return `${event["event"]}:${event["data"].id}:${revision}`;
  }
  return createHash("sha256").update(raw).digest("hex");
}

// Store only the identifiers needed to retrieve canonical provider records,
// not card authorizations, addresses, names, emails, or full invoice payloads.
export function queuedEvent(provider: BillingProvider, event: Json) {
  if (provider === "bachs") return { type: event["type"], data: { id: event["data"]?.id, subscription_id: event["data"]?.subscription_id || event["data"]?.subscription?.subscription_id, checkout_id: event["data"]?.checkout_id, payment_id: event["data"]?.payment_id } };
  return provider === "paddle"
    ? { event_type: event["event_type"], occurred_at: event["occurred_at"], data: { id: event["data"]?.id, subscription_id: event["data"]?.subscription_id } }
    : { event: event["event"], data: { id: event["data"]?.id, reference: event["data"]?.["reference"], subscription_code: event["data"]?.["subscription_code"],
      subscription: event["data"]?.subscription ? { subscription_code: event["data"].subscription["subscription_code"] } : undefined,
      customer: event["data"]?.["customer"] ? { customer_code: event["data"]["customer"].customer_code } : undefined,
      plan: event["data"]?.["plan"] ? { plan_code: event["data"]["plan"].plan_code } : undefined } };
}

export async function verifyBachsCheckout(reference: string, environment: BillingEnvironment) {
  const session = await bachs(environment).checkoutSessions.get(reference);
  const record = await checkoutByReference("bachs", environment, reference);
  if (!record || session.reference !== record.id || session.metadata?.["app_user_id"] !== record.userId || session.metadata?.["app_checkout_id"] !== record.id) throw new Error("Bachs checkout ownership could not be verified.");
  const paymentId = session.charge?.payment_id;
  if (!paymentId) throw new Error("Bachs checkout is awaiting payment.");
  const payment = await bachs(environment).payments.get(paymentId);
  if (payment.status !== "succeeded" || payment.checkout_id !== reference || payment.currency !== record.currency || bachsUsdMinor(payment.amount) !== record.amount || !payment.subscription_id) throw new Error("Bachs initial subscription payment is not verified.");
  await synchronizeBachs(payment.subscription_id, environment);
}

export async function synchronizeBachs(id: string, environment: BillingEnvironment) {
  let canonical = await bachs(environment).subscriptions.get(id);
  const checkoutId = canonical.metadata?.["app_checkout_id"];
  const userId = canonical.metadata?.["app_user_id"];
  if (typeof checkoutId !== "string" || typeof userId !== "string") throw new Error("Bachs subscription has no application ownership.");
  const record = await findCheckout(checkoutId, userId);
  if (!record || record.provider !== "bachs" || record.environment !== environment || !record.providerReference || record.currency !== "USD" || identifyPlan("bachs", record.priceId, environment) !== record.plan) throw new Error("Bachs subscription checkout did not match.");
  const session = await bachs(environment).checkoutSessions.get(record.providerReference);
  if (session.reference !== record.id || session.metadata?.["app_user_id"] !== userId || session.metadata?.["app_checkout_id"] !== record.id || !session.charge?.payment_id) throw new Error("Bachs payment ownership did not match.");
  const payment = await bachs(environment).payments.get(session.charge.payment_id);
  if (payment.status !== "succeeded" || payment.checkout_id !== record.providerReference || payment.subscription_id !== id || payment.currency !== record.currency || bachsUsdMinor(payment.amount) !== record.amount) throw new Error("Bachs initial payment has not been verified.");
  const customerId = canonical.customer?.customer_id;
  if (!customerId || session.customer?.id !== customerId || canonical.currency !== "USD" || bachsUsdMinor(canonical.amount) !== record.amount || canonical.quantity !== 1) throw new Error("Bachs customer or recurring price did not match.");
  await rememberCustomer("bachs", environment, userId, customerId);
  const previous = await findSubscription("bachs", environment, id);
  let end = iso(canonical.current_period_end);
  if (!end) throw new Error("Bachs paid period is unavailable.");
  if (["active", "trialing"].includes(canonical.status) && !canonical.cancel_at_period_end) {
    const bonus = await reserveFirstRenewalBonus(userId, "bachs", environment, id, new Date(Date.parse(end) + 7 * 86400000).toISOString());
    if (bonus && !bonus.applied) {
      if (iso(canonical.trial_end) !== bonus.target) canonical = await extendBachsFirstRenewal(id, bonus.target, environment);
      if (iso(canonical.trial_end) !== bonus.target) throw new Error("Bachs first renewal extension is pending verification.");
      await completeFirstRenewalBonus(userId, environment, id);
    }
  }
  end = canonical.status === "trialing" ? iso(canonical.trial_end) || end : iso(canonical.current_period_end) || end;
  const status = canonical.status === "unpaid" ? "past_due" : canonical.status;
  if (!["active", "trialing", "past_due", "paused", "canceled", "expired"].includes(status)) throw new Error("Unknown Bachs subscription state.");
  if (status === "past_due" && previous?.periodEnd) end = previous.periodEnd;
  await saveSubscription({ provider: "bachs", environment, providerId: id, customerId, userId, plan: record.plan, tier: record.tier,
    currency: "USD", amount: record.amount, status: status as BillingSubscription["status"], periodStart: iso(canonical.current_period_start), periodEnd: end,
    graceEnd: status === "past_due" ? previous?.status === "past_due" && previous.graceEnd ? previous.graceEnd : graceEndFor(record.plan, end) : null,
    cancelAt: canonical.cancel_at_period_end ? end : null, occurredAt: new Date().toISOString() });
  await linkCheckoutSubscription(record.id, id);
  await markCheckoutPaid(record.id);
}

export async function synchronizePaddle(id: string, environment: BillingEnvironment, allowBonus = true) {
  let canonical = await paddle(environment).subscriptions.get(id);
  const userId = await customerOwner("paddle", environment, canonical.customerId);
  if (!userId) throw new Error("Billing customer mapping is not available yet.");
  if (canonical.items.length !== 1 || canonical.items[0]!.quantity !== 1) throw new Error("Unexpected subscription items.");
  const plan = identifyPlan("paddle", canonical.items[0]!.price.id, environment);
  if (!plan) throw new Error("Subscription price is not part of the approved catalog.");
  const previous = await findSubscription("paddle", environment, id);
  const checkoutId = typeof canonical.customData?.["checkout_id"] === "string" ? canonical.customData["checkout_id"] : null;
  const record = checkoutId ? await findCheckout(checkoutId, userId) : null;
  if (!record || record.provider !== "paddle" || record.environment !== environment || record.priceId !== canonical.items[0]!.price.id || !record.providerReference) throw new Error("Subscription checkout ownership could not be verified.");
  const transaction = await paddle(environment).transactions.get(record.providerReference);
  if (transaction["status"] !== "completed" || transaction.subscriptionId !== id || transaction.customerId !== canonical.customerId) throw new Error("The initial subscription payment is not complete yet.");
  await linkCheckoutSubscription(record.id, id);
  await markCheckoutPaid(record.id);
  if (allowBonus && canonical["status"] === "active" && canonical.nextBilledAt && canonical.firstBilledAt) {
    const target = new Date(Date.parse(canonical.nextBilledAt) + 7 * 86400000).toISOString();
    const bonus = await reserveFirstRenewalBonus(userId, "paddle", environment, id, target);
    if (bonus && !bonus.applied) {
      // Fixed target, not '+7 from the current date', makes retries idempotent.
      if (Date.parse(canonical.nextBilledAt) !== Date.parse(bonus.target)) {
        canonical = await paddle(environment).subscriptions.update(id, { nextBilledAt: bonus.target, prorationBillingMode: "do_not_bill" });
      }
      await completeFirstRenewalBonus(userId, environment, id);
    }
  }
  let end = iso(canonical.currentBillingPeriod?.endsAt) || previous?.periodEnd || null;
  if (canonical["status"] === "active" && canonical.nextBilledAt && (!end || Date.parse(canonical.nextBilledAt) > Date.parse(end))) end = iso(canonical.nextBilledAt);
  const detailTotal = canonical.recurringTransactionDetails?.totals?.total;
  const amount = detailTotal && /^\d+$/.test(detailTotal) ? Number(detailTotal) : canonical.currencyCode === record["currency"] ? record["amount"] : 0;
  const failedAt = end || iso(canonical.updatedAt)!;
  const sub: BillingSubscription = {
    provider: "paddle", environment, providerId: id, customerId: canonical.customerId, userId, plan, tier: record.tier,
    currency: canonical.currencyCode, amount, status: canonical["status"],
    periodStart: iso(canonical.currentBillingPeriod?.startsAt) || previous?.periodStart || null, periodEnd: end,
    graceEnd: canonical["status"] === "past_due" ? previous?.["status"] === "past_due" && previous.graceEnd ? previous.graceEnd : graceEndFor(plan, failedAt) : null,
    cancelAt: canonical.scheduledChange?.action === "cancel" ? iso(canonical.scheduledChange.effectiveAt) : null,
    occurredAt: iso(canonical.updatedAt)!,
  };
  await saveSubscription(sub);
}

export async function synchronizePaystack(id: string, environment: BillingEnvironment, failed = false, paidThrough?: string) {
  const canonical = await paystack<Json>(`/subscription/${encodeURIComponent(id)}`, undefined, environment);
  const customerId = String(canonical["customer"]?.customer_code || "");
  const userId = await customerOwner("paystack", environment, customerId);
  if (!userId) throw new Error("Billing customer mapping is not available yet.");
  const plan = identifyPlan("paystack", String(canonical["plan"]?.plan_code || ""), environment);
  if (!plan || canonical["plan"]?.["currency"] !== "NGN") throw new Error("Unknown subscription plan.");
  const previous = await findSubscription("paystack", environment, id);
  const state = String(canonical["status"]).toLowerCase().replaceAll("_", "-");
  if (!previous && !paidThrough) throw new Error("Waiting for the verified initial payment.");
  let end = previous?.periodEnd || paidThrough || null;
  if (paidThrough && (!end || Date.parse(end) < Date.parse(paidThrough))) end = paidThrough;
  const status = failed || ["attention", "past-due"].includes(state) ? "past_due" : ["complete", "completed", "cancelled", "canceled"].includes(state) ? "canceled" : "active";
  // A failure cannot advance the last period paid for. Later failure retries
  // retain the original grace deadline instead of granting fresh grace.
  if (status === "past_due" && previous?.periodEnd) end = previous.periodEnd;
  const failedAt = previous?.periodEnd || end || iso(canonical["createdAt"]) || new Date().toISOString();
  await saveSubscription({
    provider: "paystack", environment, providerId: String(canonical["subscription_code"]), customerId, userId, plan, tier: "regional",
    currency: "NGN", amount: Number(canonical["plan"]["amount"]), status,
    periodStart: previous?.periodStart || iso(canonical["createdAt"]), periodEnd: end,
    graceEnd: status === "past_due" ? previous?.["status"] === "past_due" && previous.graceEnd ? previous.graceEnd : graceEndFor(plan, failedAt) : null,
    cancelAt: ["non-renewing", "nonrenewing"].includes(state) ? end : null,
    // Paystack's GET subscription has no reliable updated_at. This snapshot
    // was fetched from its authenticated API now, not inferred from the event.
    occurredAt: new Date().toISOString(),
  });
}

export async function verifyPaystackPayment(reference: string, environment: BillingEnvironment) {
  const payment = await paystack<Json>(`/transaction/verify/${encodeURIComponent(reference)}`, undefined, environment);
  if (payment["status"] !== "success" || payment["domain"] !== (environment === "live" ? "live" : "test")) throw new Error("Payment has not been verified.");
  const customerId = String(payment["customer"]?.customer_code || "");
  const userId = await customerOwner("paystack", environment, customerId);
  if (!userId) throw new Error("Unknown billing customer.");
  const record = await checkoutByReference("paystack", environment, reference);
  if (!record) {
    // Renewal: an actual successful, approved-plan charge must exist before
    // extending any period. Never infer a paid renewal from a clock tick.
    const plan = identifyPlan("paystack", String(payment["plan_object"]?.plan_code || payment["plan"]?.plan_code || ""), environment);
    if (!plan) return;
    const subscriptions = (await listSubscriptions(userId, environment)).filter((sub) => sub.provider === "paystack" && sub["plan"] === plan && sub.customerId === customerId && !sub.providerId.startsWith("pass_"));
    for (const sub of subscriptions) {
      if (Number(payment["amount"]) !== sub["amount"] || payment["currency"] !== sub["currency"]) throw new Error("Renewal amount does not match the subscription.");
      const paidAt = iso(payment["paid_at"]) || iso(payment["paidAt"]);
      const through = paidAt && sub.periodEnd && Date.parse(sub.periodEnd) <= Date.parse(paidAt) + 60000 ? firstRenewalDate(sub.periodEnd, plan, 0) : undefined;
      await synchronizePaystack(sub.providerId, environment, false, through);
    }
    return;
  }
  if (record.userId !== userId || payment["reference"] !== record.providerReference || Number(payment["amount"]) !== record["amount"] || payment["currency"] !== record["currency"] || payment["metadata"]?.["checkout_id"] !== record.id) throw new Error("Payment amount, currency, reference or ownership did not match checkout.");
  if (record.state === "paid") return;
  if (!await claimCheckoutFulfillment(record.id)) throw new Error("This payment is already being processed.");
  const paidAt = iso(payment["paid_at"]) || iso(payment["paidAt"]);
  if (!paidAt) throw new Error("Payment date is missing.");
  const originalBonusId = `checkout_${record.id}`;
  const target = firstRenewalDate(paidAt, record["plan"], 7);
  const bonus = await reserveFirstRenewalBonus(userId, "paystack", environment, originalBonusId, target);
  const periodEnd = bonus?.target || firstRenewalDate(paidAt, record["plan"], 0);
  let subscriptionId = await checkoutSubscriptionId(record.id);
  if (!subscriptionId && payment["authorization"]?.reusable && payment["authorization"]?.authorization_code) {
    // Recover a successful create whose HTTP response was lost before the DB
    // write, using the deterministic customer/plan/first-renewal date.
    const existing = await paystack<Json[]>(`/subscription?customer=${encodeURIComponent(String(payment["customer"].id))}&perPage=100`, undefined, environment);
    const match = existing.find((sub) => sub["customer"]?.customer_code === customerId && sub["plan"]?.plan_code === record.priceId && iso(sub["next_payment_date"]) === periodEnd);
    if (match) subscriptionId = String(match["subscription_code"]);
    else {
      const created = await paystack<Json>("/subscription", { customer: customerId, plan: record.priceId, authorization: payment["authorization"].authorization_code, start_date: periodEnd }, environment);
      subscriptionId = String(created["subscription_code"]);
    }
  }
  if (!subscriptionId) {
    // A non-reusable card still buys the advertised period, but must not be
    // represented as an automatically-renewing subscription.
    subscriptionId = `pass_${reference}`;
    await saveSubscription({ provider: "paystack", environment, providerId: subscriptionId, customerId, userId, plan: record["plan"], tier: record.tier,
      currency: record["currency"], amount: record["amount"], status: "active", periodStart: paidAt, periodEnd, graceEnd: null, cancelAt: periodEnd, occurredAt: paidAt });
  } else await synchronizePaystack(subscriptionId, environment, false, periodEnd);
  await linkCheckoutSubscription(record.id, subscriptionId);
  if (bonus) {
    await promoteBonusReference(userId, environment, originalBonusId, subscriptionId);
    await completeFirstRenewalBonus(userId, environment, subscriptionId);
  }
  await markCheckoutPaid(record.id);
}

async function processEvent(provider: BillingProvider, environment: BillingEnvironment, event: Json) {
  if (provider === "bachs") {
    const kind = String(event["type"]);
    if (kind.startsWith("subscription.") || kind.startsWith("customer.subscription.") || kind.startsWith("invoice.")) {
      const subscriptionId=event["data"]?.subscription_id || event["data"]?.subscription?.subscription_id || (kind.includes("subscription.")?event["data"]?.id:null);
      if(subscriptionId) return synchronizeBachs(String(subscriptionId),environment);
    }
    const checkout = event["data"]?.checkout_id;
    if (checkout) return verifyBachsCheckout(String(checkout), environment);
    const paymentId = event["data"]?.payment_id || (kind.startsWith("payment.") ? event["data"]?.id : null);
    if (paymentId) {
      const payment = await bachs(environment).payments.get(String(paymentId));
      if (payment.subscription_id) return synchronizeBachs(payment.subscription_id, environment);
    }
    return;
  }
  if (provider === "paddle") {
    if (String(event["event_type"]).startsWith("subscription.")) return synchronizePaddle(String(event["data"].id), environment);
    if (event["event_type"] === "transaction.completed") {
      const tx = await paddle(environment).transactions.get(String(event["data"].id));
      if (tx.subscriptionId) return synchronizePaddle(tx.subscriptionId, environment);
    }
    return;
  }
  if (event["event"] === "charge.success") return verifyPaystackPayment(String(event["data"]["reference"]), environment);
  const code = event["data"]?.["subscription_code"] || event["data"]?.subscription?.["subscription_code"];
  if (code && (String(event["event"]).startsWith("subscription.") || event["event"] === "invoice.payment_failed" || event["event"] === "invoice.update")) {
    return synchronizePaystack(String(code), environment, event["event"] === "invoice.payment_failed");
  }
}

export async function drainBillingEvents(provider: BillingProvider, environment: BillingEnvironment) {
  for (const event of await pendingEvents(provider, environment)) {
    if (!await claimEvent(provider, environment, event.id)) continue;
    try { await processEvent(provider, environment, JSON.parse(event.payload)); await finishEvent(provider, environment, event.id); }
    catch { await retryEvent(provider, environment, event.id); console.error("Billing event pending retry", provider, environment, event.id); }
  }
}
