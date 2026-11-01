import { describe, expect, it } from "vitest";
import { firstRenewalDate, formatPrice, graceEndFor, hasSubscriptionAccess, normalizeCountry, quoteFor, safeStudyPlanPatch } from "@/lib/billing/catalog";
import { createHmac } from "node:crypto";
import { verifyPaddleSignature, verifyPaystackSignature } from "@/lib/billing/signatures.server";

describe("Membership pricing and access rules", () => {
  it("formats country equivalents using the currency’s actual minor unit", () => {
    expect(formatPrice(1000, "RWF")).toContain("1,000");
    expect(formatPrice(1234, "TND")).toContain("1.234");
    expect(formatPrice(199900, "NGN")).toContain("1,999");
  });
  it("uses the approved prices in integer minor units", () => {
    expect(quoteFor("NG", "weekly")).toMatchObject({ amount: 199900, currency: "NGN", provider: "bachs" });
    expect(quoteFor("NG", "monthly").amount).toBe(699900);
    expect(quoteFor("NG", "yearly").amount).toBe(6899900);
    expect(quoteFor("US", "monthly")).toMatchObject({ amount: 1299, currency: "USD", provider: "paddle" });
    expect(quoteFor("GB", "yearly").amount).toBe(10999);
  });
  it("rejects international weekly purchases on the server", () => {
    expect(() => quoteFor("US", "weekly")).toThrow("Weekly");
    expect(quoteFor("IN", "weekly")).toMatchObject({ tier: "regional", provider: "bachs" });
  });
  it("does not silently treat an invalid country as a cheaper region", () => {
    expect(normalizeCountry("qq")).toBeNull();
    expect(normalizeCountry("XX")).toBeNull();
    expect(normalizeCountry("EU")).toBeNull();
    expect(normalizeCountry(" ng ")).toBe("NG");
  });
  it("adds seven days to the first paid interval and clamps calendar months", () => {
    expect(firstRenewalDate("2030-04-01T12:00:00Z", "monthly")).toBe("2030-05-08T12:00:00.000Z");
    expect(firstRenewalDate("2030-01-31T12:00:00Z", "monthly")).toBe("2030-03-07T12:00:00.000Z");
    expect(firstRenewalDate("2030-04-01T12:00:00Z", "weekly")).toBe("2030-04-15T12:00:00.000Z");
    expect(firstRenewalDate("2030-04-01T12:00:00Z", "monthly", 0)).toBe("2030-05-01T12:00:00.000Z");
  });
  it("keeps access after cancellation until the paid cutoff, but never forever", () => {
    const now = Date.parse("2030-04-15T00:00:00Z");
    expect(hasSubscriptionAccess({ status: "active", periodEnd: "2030-05-01T00:00:00Z", cancelAt: "2030-05-01T00:00:00Z", graceEnd: null }, now)).toBe(true);
    expect(hasSubscriptionAccess({ status: "active", periodEnd: null, cancelAt: null, graceEnd: null }, now)).toBe(false);
    expect(hasSubscriptionAccess({ status: "canceled", periodEnd: "2030-05-01T00:00:00Z", cancelAt: null, graceEnd: null }, now)).toBe(false);
  });
  it("anchors grace to an actual failure, without extending it on page visits", () => {
    const failed = "2030-04-01T00:00:00Z";
    expect(graceEndFor("monthly", failed)).toBe("2030-04-13T00:00:00.000Z");
    expect(hasSubscriptionAccess({ status: "past_due", periodEnd: failed, cancelAt: null, graceEnd: graceEndFor("monthly", failed) }, Date.parse("2030-04-14"))).toBe(false);
  });
  it("strips membership fields while retaining ordinary mobile study settings", () => {
    expect(safeStudyPlanPatch({ theme: "dark", daily_goal: 90, subscription: { status: "active" }, billing: {}, sylla_plus: true, trial: true, billing_customer_id: "someone" })).toEqual({ theme: "dark", daily_goal: 90 });
  });
});

describe("Payment signatures", () => {
  it("verifies exact Paystack body bytes and rejects changed amounts", () => {
    const body = '{"event":"charge.success","data":{"amount":699900}}';
    const signature = createHmac("sha512", "test-signing-secret").update(body).digest("hex");
    expect(verifyPaystackSignature(body, signature, "test-signing-secret")).toBe(true);
    expect(verifyPaystackSignature(body.replace("699900", "100"), signature, "test-signing-secret")).toBe(false);
    expect(verifyPaystackSignature(body, "invalid", "test-signing-secret")).toBe(false);
  });
  it("checks Paddle timestamps, rotated signatures, and unchanged body bytes", () => {
    const now = 1900000000000;
    const ts = Math.floor(now / 1000);
    const body = '{"event_id":"evt_test"}';
    const signature = createHmac("sha256", "test-endpoint-secret").update(`${ts}:${body}`).digest("hex");
    expect(verifyPaddleSignature(body, `ts=${ts};h1=${"a".repeat(64)};h1=${signature}`, "test-endpoint-secret", now)).toBe(true);
    expect(verifyPaddleSignature(body + " ", `ts=${ts};h1=${signature}`, "test-endpoint-secret", now)).toBe(false);
    expect(verifyPaddleSignature(body, `ts=${ts};h1=${signature}`, "test-endpoint-secret", now + 10000)).toBe(false);
  });
});
