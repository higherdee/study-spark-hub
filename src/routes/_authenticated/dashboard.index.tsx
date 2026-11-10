import { createFileRoute } from "@tanstack/react-router";
import { NativeToday } from "@/components/native-web/screens";
export const Route = createFileRoute("/_authenticated/dashboard/")({
  head: () => ({ meta: [{ title: "Today — Syllaboss" }] }),
  component: NativeToday,
});
