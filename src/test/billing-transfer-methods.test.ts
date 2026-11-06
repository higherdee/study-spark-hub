import { expect, it } from "vitest";
import { supportsNgnTransfer } from "@/lib/billing/bachs.server";

it("recognizes the live Bachs transfer corridor and the documentation's legacy identifier", () => {
  expect(supportsNgnTransfer({ payment_methods: [{ id: "NGN_BANK_TRANSFER", currencies: ["NGN"] }] })).toBe(true);
  expect(supportsNgnTransfer({ data: { payment_methods: [{ id: "BANK_TRANSFER", currencies: ["NGN"] }] } })).toBe(true);
  expect(supportsNgnTransfer({ payment_methods: [{ id: "BANK_TRANSFER", currencies: ["USD"] }] })).toBe(false);
  expect(supportsNgnTransfer({ payment_methods: [{ id: "USD_CARD", currencies: ["USD"] }] })).toBe(false);
});
