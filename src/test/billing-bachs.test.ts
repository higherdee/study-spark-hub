import { afterEach, describe, expect, it, vi } from "vitest";
import { bachs, bachsKey, bachsUsdMinor, bachsWebhookEvent } from "@/lib/billing/bachs.server";
import { checkoutQuote, providerConfigured } from "@/lib/billing/providers.server";
import { REGIONAL_MARKETS } from "@/lib/billing/catalog";

afterEach(() => vi.unstubAllEnvs());

describe("Bachs provider isolation", () => {
  it("routes every regional country through Bachs with the same approved USD charge", () => {
    for (const country of Object.keys(REGIONAL_MARKETS)) {
      expect(checkoutQuote(country, "weekly")).toMatchObject({ provider: "bachs", currency: "USD", amount: 149 });
      expect(checkoutQuote(country, "monthly")).toMatchObject({ provider: "bachs", currency: "USD", amount: 520 });
      expect(checkoutQuote(country, "yearly")).toMatchObject({ provider: "bachs", currency: "USD", amount: 5127 });
    }
    expect(checkoutQuote("NG", "monthly")).toMatchObject({ approximateAmount: 699900, approximateCurrency: "NGN" });
    expect(checkoutQuote("US", "monthly")).toMatchObject({ provider: "paddle", amount: 1299 });
  });
  it("parses USD decimal amounts exactly and refuses precision or malformed values", () => {
    expect(bachsUsdMinor("5.20")).toBe(520);
    expect(bachsUsdMinor("1.49")).toBe(149);
    for (const value of ["1.499", "-1.00", "1e2", "", 5.2, null]) expect(() => bachsUsdMinor(value)).toThrow();
  });
  it("does not accept a live key in the sandbox setting", () => {
    vi.stubEnv("BACHS_SANDBOX_SECRET_KEY", "sk_live_fixture");
    expect(bachsKey("sandbox")).toBe("");
    expect(() => bachs("sandbox")).toThrow("not configured");
  });
  it("does not use another provider’s credential", () => {
    vi.stubEnv("BACHS_LIVE_SECRET_KEY", "");
    vi.stubEnv("PAYSTACK_LIVE_SECRET_KEY", "sk_live_other_provider_fixture");
    expect(bachsKey("live")).toBe("");
  });
  it("constructs a sandbox client without making a payment request", () => {
    vi.stubEnv("BACHS_SANDBOX_SECRET_KEY", "sk_sandbox_fixture");
    expect(bachs("sandbox").environment).toBe("sandbox");
  });
  it("refuses webhook events without a mode-specific signing secret", () => {
    vi.stubEnv("BACHS_SANDBOX_WEBHOOK_SECRET", "");
    vi.stubEnv("BACHS_LIVE_WEBHOOK_SECRET", "live-signing-fixture");
    expect(() => bachsWebhookEvent("{}", new Headers(), "sandbox")).toThrow("not configured");
  });
  it("keeps the unused Paystack checkout disabled", () => {
    expect(providerConfigured("paystack", "sandbox")).toBe(false);
    expect(providerConfigured("paystack", "live")).toBe(false);
  });
  it("does not require an international weekly price to enable Paddle", () => {
    vi.stubEnv("PADDLE_SANDBOX_API_KEY", "pdl_sdbx_apikey_fixture");
    vi.stubEnv("PADDLE_SANDBOX_CLIENT_TOKEN", "test_fixture");
    vi.stubEnv("PADDLE_SANDBOX_WEBHOOK_SECRET", "signing-fixture");
    expect(providerConfigured("paddle", "sandbox")).toBe(true);
  });
});
