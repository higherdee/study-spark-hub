import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("@/integrations/turso/client.server", async () => {
  const { createClient } = await import("@libsql/client");
  return { turso: createClient({ url: "file::memory:" }) };
});
import { turso } from "@/integrations/turso/client.server";
import { billingEventProcessed, bonusAlreadyClaimed, claimBillingOperation, claimEvent, completeFirstRenewalBonus, createCheckout, customerOwner, enqueueEvent, ensureBillingTables, findSubscription, finishEvent, releaseBillingOperation, rememberCustomer, reserveFirstRenewalBonus, saveSubscription } from "@/lib/billing/store.server";
import type { BillingSubscription } from "@/lib/billing/catalog";

const active = (overrides: Partial<BillingSubscription> = {}): BillingSubscription => ({ provider: "paystack", environment: "live", providerId: "SUB_test", customerId: "CUS_test", userId: "owner", plan: "monthly", tier: "regional", currency: "NGN", amount: 699900, status: "active", periodStart: "2030-01-01T00:00:00Z", periodEnd: "2030-02-08T00:00:00Z", graceEnd: null, cancelAt: null, occurredAt: "2030-01-01T00:00:00Z", ...overrides });

beforeAll(async () => {
  await turso.execute("CREATE TABLE profiles(id TEXT PRIMARY KEY, sylla_plus INTEGER NOT NULL DEFAULT 0, points INTEGER NOT NULL DEFAULT 10, study_plan TEXT DEFAULT '{}')");
  await ensureBillingTables();
});
beforeEach(async () => {
  await turso.executeMultiple("DELETE FROM billing_events; DELETE FROM billing_subscriptions; DELETE FROM billing_customers; DELETE FROM billing_checkouts; DELETE FROM billing_first_renewal_bonus; DELETE FROM profiles;");
  await turso.execute({ sql: "INSERT INTO profiles(id,study_plan) VALUES(?,?)", args: ["owner", JSON.stringify({ theme: "dark", daily_goal: 90 })] });
});

describe("Verified membership storage", () => {
  it("rejects a customer ownership reassignment", async () => {
    await rememberCustomer("paystack", "live", "owner", "CUS_test");
    await expect(rememberCustomer("paystack", "live", "intruder", "CUS_test")).rejects.toThrow("another account");
    expect(await customerOwner("paystack", "live", "CUS_test")).toBe("owner");
  });
  it("will not accept an unlinked subscription", async () => {
    await expect(saveSubscription(active())).rejects.toThrow("ownership");
    const row = (await turso.execute("SELECT sylla_plus FROM profiles WHERE id='owner'")).rows[0];
    expect(row?.["sylla_plus"]).toBe(0);
  });
  it("preserves mobile settings and reward balances when verified access changes", async () => {
    await rememberCustomer("paystack", "live", "owner", "CUS_test");
    await saveSubscription(active());
    const row = (await turso.execute("SELECT * FROM profiles WHERE id='owner'")).rows[0]!;
    expect(row["sylla_plus"]).toBe(1); expect(row["points"]).toBe(10);
    expect(JSON.parse(String(row["study_plan"]))).toMatchObject({ theme: "dark", daily_goal: 90, subscription: { verified: true, provider: "paystack" } });
  });
  it("does not grant live benefits for sandbox payments", async () => {
    await rememberCustomer("paystack", "sandbox", "owner", "CUS_test");
    await saveSubscription(active({ environment: "sandbox" }));
    expect((await turso.execute("SELECT sylla_plus FROM profiles WHERE id='owner'")).rows[0]?.["sylla_plus"]).toBe(0);
  });
  it("ignores older provider state delivered out of order", async () => {
    await rememberCustomer("paystack", "live", "owner", "CUS_test");
    await saveSubscription(active({ occurredAt: "2030-01-02T00:00:00Z" }));
    await saveSubscription(active({ status: "canceled", occurredAt: "2030-01-01T00:00:00Z" }));
    expect((await findSubscription("paystack", "live", "SUB_test"))?.status).toBe("active");
  });
  it("claims each webhook once even with concurrent deliveries", async () => {
    await enqueueEvent("paystack", "live", "charge:1", "{}");
    await enqueueEvent("paystack", "live", "charge:1", "{}");
    const claims = await Promise.all([claimEvent("paystack", "live", "charge:1"), claimEvent("paystack", "live", "charge:1")]);
    expect(claims.filter(Boolean)).toHaveLength(1);
  });
  it("reserves a fixed seven-day bonus once per account, separately from sandbox", async () => {
    const first = await reserveFirstRenewalBonus("owner", "paystack", "live", "SUB_first", "2030-02-08T00:00:00Z");
    expect(first?.target).toBe("2030-02-08T00:00:00Z");
    await completeFirstRenewalBonus("owner", "live", "SUB_first");
    const duplicate = await reserveFirstRenewalBonus("owner", "paystack", "live", "SUB_first", "2030-02-15T00:00:00Z");
    expect(duplicate).toEqual({ target: "2030-02-08T00:00:00Z", applied: true });
    expect(await reserveFirstRenewalBonus("owner", "paddle", "live", "sub_second", "2030-03-08T00:00:00Z")).toBeNull();
    expect(await bonusAlreadyClaimed("owner", "sandbox")).toBe(false);
  });
  it("does not allow a checkout ID to be reused for another owner or plan", async () => {
    const checkout = { id: "checkout-1", userId: "owner", provider: "paystack" as const, environment: "live" as const, plan: "monthly" as const, tier: "regional" as const, currency: "NGN", country: "NG", amount: 699900, priceId: "PLN_month", providerReference: null, checkoutUrl: null, state: "creating" };
    await createCheckout(checkout);
    await expect(createCheckout({ ...checkout, userId: "intruder" })).rejects.toThrow("original account");
    await expect(createCheckout({ ...checkout, plan: "yearly" })).rejects.toThrow("original account");
    await expect(createCheckout({ ...checkout, amount: 1 })).rejects.toThrow("original account");
    await expect(createCheckout({ ...checkout, currency: "USD" })).rejects.toThrow("original account");
    await expect(createCheckout({ ...checkout, priceId: "PLN_other" })).rejects.toThrow("original account");
  });
  it("serializes checkout creation and rejects a stale lock release", async () => {
    const [first, second] = await Promise.all([claimBillingOperation("checkout:race"), claimBillingOperation("checkout:race")]);
    const lease = first || second;
    expect([first, second].filter(Boolean)).toHaveLength(1);
    await releaseBillingOperation("checkout:race", "not-the-owner");
    expect(await claimBillingOperation("checkout:race")).toBeNull();
    await releaseBillingOperation("checkout:race", lease!);
    expect(await claimBillingOperation("checkout:race")).toBeTruthy();
  });
  it("only acknowledges a webhook after its processing is committed", async () => {
    await enqueueEvent("paystack", "live", "charge:verified", "{}");
    expect(await billingEventProcessed("paystack", "live", "charge:verified")).toBe(false);
    await claimEvent("paystack", "live", "charge:verified");
    expect(await billingEventProcessed("paystack", "live", "charge:verified")).toBe(false);
    await finishEvent("paystack", "live", "charge:verified");
    expect(await billingEventProcessed("paystack", "live", "charge:verified")).toBe(true);
  });
});
