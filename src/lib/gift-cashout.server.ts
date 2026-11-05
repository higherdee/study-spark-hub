import { z } from "zod";
import { getGiftCardOptions } from "./constants";
import { normalizeCountry, quoteFor } from "./billing/catalog";
import { requestWithdrawal } from "@/integrations/turso/client.server";
import { issueMembershipGift, membershipGiftOptions } from "./membership/gifts.server";

export const membershipGiftInput = z.object({ requestId: z.string().uuid(), days: z.union([z.literal(7), z.literal(30)]) });
const regionalCountry = (country: string | null) => !normalizeCountry(country) || quoteFor(normalizeCountry(country)!, "monthly").tier === "regional";
export const membershipGiftQuotes = (country: string | null) => membershipGiftOptions(regionalCountry(country));
export const purchaseMembershipGift = (userId: string, country: string | null, input: z.infer<typeof membershipGiftInput>) => issueMembershipGift(userId, input.requestId, input.days, regionalCountry(country));

const brands = {
  amazon: "Amazon Gift Card",
  apple: "Apple Gift Card",
  visa: "Visa Virtual Card",
  steam: "Steam Wallet Code",
} as const;

export const giftCashoutInput = z.object({
  brand: z.enum(["amazon", "apple", "visa", "steam"]),
  amount: z.number().int(),
  email: z.string().trim().email().max(120),
});

export function giftCashoutOptions(country: string | null) {
  const region = normalizeCountry(country);
  return getGiftCardOptions(!region || quoteFor(region, "monthly").tier === "regional");
}

export async function requestGiftCashout(userId: string, country: string | null, input: z.infer<typeof giftCashoutInput>) {
  const quote = giftCashoutOptions(country).find(option => option.amountUsd === input.amount);
  if (!quote) throw new Error("Choose an available gift card amount.");
  const title = `Digital Gift Card: ${brands[input.brand]} (${quote.label})`;
  return requestWithdrawal(userId, quote.points, title, input.email, "Syllaboss student", "giftcard");
}
