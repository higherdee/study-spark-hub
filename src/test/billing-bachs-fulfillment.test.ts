import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/integrations/turso/client.server", async () => {
  const { createClient } = await import("@libsql/client");
  return { turso: createClient({ url: "file::memory:" }) };
});
const provider = vi.hoisted(() => ({ getSubscription: vi.fn(), getCheckout: vi.fn(), getPayment: vi.fn(), extend: vi.fn() }));
vi.mock("@/lib/billing/bachs.server", async (original) => {
  const actual = await original<typeof import("@/lib/billing/bachs.server")>();
  return { ...actual, bachs: () => ({ subscriptions: { get: provider.getSubscription }, checkoutSessions: { get: provider.getCheckout }, payments: { get: provider.getPayment } }), extendBachsFirstRenewal: provider.extend };
});
import { turso } from "@/integrations/turso/client.server";
import { synchronizeBachs, verifyBachsCheckout } from "@/lib/billing/events.server";
import { createCheckout, ensureBillingTables, findSubscription, readyCheckout } from "@/lib/billing/store.server";
import catalog from "@/data/billing-catalog.json";

let canonical: Record<string, any>;
let payment: Record<string, any>;
let session: Record<string, any>;
beforeAll(async () => {
  await turso.execute("CREATE TABLE profiles(id TEXT PRIMARY KEY, sylla_plus INTEGER NOT NULL DEFAULT 0, study_plan TEXT DEFAULT '{}')");
  await ensureBillingTables();
});
beforeEach(async () => {
  vi.clearAllMocks();
  await turso.executeMultiple("DELETE FROM billing_subscriptions; DELETE FROM billing_customers; DELETE FROM billing_checkouts; DELETE FROM billing_first_renewal_bonus; DELETE FROM profiles;");
  await turso.execute("INSERT INTO profiles(id,study_plan) VALUES('owner','{\"theme\":\"dark\"}')");
  await createCheckout({ id: "checkout", userId: "owner", provider: "bachs", environment: "sandbox", plan: "monthly", tier: "regional", country: "NG", currency: "USD", amount: 520, priceId: catalog.environments.sandbox.bachs.monthly, providerReference: null, checkoutUrl: null, state: "creating" });
  await readyCheckout("checkout", "session", "https://sandbox-checkout.bachs.io/test");
  canonical = { id: "sub", status: "active", customer: { customer_id: "customer" }, metadata: { app_checkout_id: "checkout", app_user_id: "owner" }, currency: "USD", amount: "5.20", quantity: 1, current_period_start: "2030-01-01T00:00:00Z", current_period_end: "2030-02-01T00:00:00Z", cancel_at_period_end: false };
  session = { checkout_id: "session", reference: "checkout", customer: { id: "customer" }, metadata: { app_checkout_id: "checkout", app_user_id: "owner" }, charge: { payment_id: "payment" } };
  payment = { payment_id: "payment", status: "succeeded", checkout_id: "session", subscription_id: "sub", currency: "USD", amount: "5.20" };
  provider.getSubscription.mockImplementation(async () => ({ ...canonical }));
  provider.getCheckout.mockImplementation(async () => ({ ...session }));
  provider.getPayment.mockImplementation(async () => ({ ...payment }));
  provider.extend.mockImplementation(async (_id, target) => { canonical = { ...canonical, trial_end: target, status: "trialing" }; return { ...canonical }; });
});

describe("Bachs verified fulfillment", () => {
  it("grants live SyllaPlus after a verified charge and advances access on renewal", async () => {
    await turso.execute({ sql: "UPDATE billing_checkouts SET environment='live', price_id=? WHERE id='checkout'", args: [catalog.environments.live.bachs.monthly] });
    await verifyBachsCheckout("session", "live");
    expect((await turso.execute("SELECT sylla_plus FROM profiles WHERE id='owner'")).rows[0]?.["sylla_plus"]).toBe(1);
    canonical = {
      ...canonical,
      status: "active",
      trial_end: null,
      current_period_start: "2030-02-08T00:00:00Z",
      current_period_end: "2030-03-08T00:00:00Z",
    };
    await synchronizeBachs("sub", "live");
    expect(await findSubscription("bachs", "live", "sub")).toMatchObject({ status: "active", periodEnd: "2030-03-08T00:00:00.000Z" });
    expect(provider.extend).toHaveBeenCalledTimes(1);
  });
  it("requires paid ownership, extends first renewal once, and keeps sandbox benefits isolated", async () => {
    await verifyBachsCheckout("session", "sandbox");
    await synchronizeBachs("sub", "sandbox");
    expect(provider.extend).toHaveBeenCalledTimes(1);
    expect(provider.extend).toHaveBeenCalledWith("sub", "2030-02-08T00:00:00.000Z", "sandbox");
    expect(await findSubscription("bachs", "sandbox", "sub")).toMatchObject({ userId: "owner", periodEnd: "2030-02-08T00:00:00.000Z", amount: 520 });
    const profile = (await turso.execute("SELECT * FROM profiles WHERE id='owner'")).rows[0]!;
    expect(profile["sylla_plus"]).toBe(0);
    expect(JSON.parse(String(profile["study_plan"]))).toEqual({ theme: "dark" });
  });
  it("does not grant access for an unpaid checkout", async () => {
    payment["status"] = "processing";
    await expect(verifyBachsCheckout("session", "sandbox")).rejects.toThrow("not verified");
    expect(await findSubscription("bachs", "sandbox", "sub")).toBeNull();
    expect(provider.extend).not.toHaveBeenCalled();
  });
  it("recovers an extension whose response was lost without adding seven days again", async () => {
    provider.extend.mockImplementationOnce(async (_id, target) => {
      canonical = { ...canonical, trial_end: target, status: "trialing" };
      throw new Error("Connection lost after provider committed the extension");
    });
    await expect(synchronizeBachs("sub", "sandbox")).rejects.toThrow("Connection lost");
    expect(await findSubscription("bachs", "sandbox", "sub")).toMatchObject({ status: "active", periodEnd: "2030-02-01T00:00:00.000Z" });
    await synchronizeBachs("sub", "sandbox");
    expect(provider.extend).toHaveBeenCalledTimes(1);
    expect(await findSubscription("bachs", "sandbox", "sub")).toMatchObject({ periodEnd: "2030-02-08T00:00:00.000Z" });
  });
  it("rejects a payment belonging to a different subscription or amount", async () => {
    payment["subscription_id"] = "another-subscription";
    await expect(synchronizeBachs("sub", "sandbox")).rejects.toThrow("not been verified");
    payment["subscription_id"] = "sub";
    payment["amount"] = "0.01";
    await expect(synchronizeBachs("sub", "sandbox")).rejects.toThrow("not been verified");
    expect(await findSubscription("bachs", "sandbox", "sub")).toBeNull();
  });
  it("rejects an account ownership mismatch", async () => {
    session["metadata"] = { app_checkout_id: "checkout", app_user_id: "intruder" };
    await expect(synchronizeBachs("sub", "sandbox")).rejects.toThrow("ownership");
    expect(provider.extend).not.toHaveBeenCalled();
  });
  it("preserves paid access when renewal is scheduled to stop", async () => {
    canonical["cancel_at_period_end"] = true;
    await synchronizeBachs("sub", "sandbox");
    expect(provider.extend).not.toHaveBeenCalled();
    expect(await findSubscription("bachs", "sandbox", "sub")).toMatchObject({ status: "active", cancelAt: "2030-02-01T00:00:00.000Z", periodEnd: "2030-02-01T00:00:00.000Z" });
  });
});
