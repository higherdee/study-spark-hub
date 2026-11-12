import { createFileRoute } from "@tanstack/react-router";
import { GiftCashout } from "@/components/native-web/gift-cashout";
export const Route = createFileRoute("/_authenticated/dashboard/wallet")({
  head: () => ({ meta: [{ title: "Gift card cashout — Syllaboss" }] }),
  component: GiftCashout,
});
