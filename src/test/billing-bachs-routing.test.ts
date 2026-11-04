import { afterEach, expect, it, vi } from "vitest";
import { checkoutProductId, checkoutQuote, planForProviderId } from "@/lib/billing/providers.server";

afterEach(() => vi.unstubAllEnvs());

it("routes international checkout to a separate Bachs product without changing its price", () => {
  vi.stubEnv("BILLING_BACHS_ONLY", "false");
  const original = checkoutQuote("US", "monthly");
  vi.stubEnv("BILLING_BACHS_ONLY", "true");
  vi.stubEnv("BACHS_LIVE_INTERNATIONAL_PRODUCT_MONTHLY", "international-monthly");
  vi.stubEnv("BACHS_LIVE_PRODUCT_MONTHLY", "regional-monthly");
  const international = checkoutQuote("US", "monthly");
  expect(international).toEqual({ ...original, provider: "bachs" });
  expect(checkoutProductId(international, "live")).toBe("international-monthly");
  expect(checkoutProductId(checkoutQuote("NG", "monthly"), "live")).toBe("regional-monthly");
  expect(planForProviderId("bachs", "international-monthly", "live")).toBe("monthly");
});
