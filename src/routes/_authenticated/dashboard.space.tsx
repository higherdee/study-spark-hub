import { createFileRoute } from "@tanstack/react-router";
import { YourSpace } from "@/components/native-web/space";
export const Route = createFileRoute("/_authenticated/dashboard/space")({
  head: () => ({ meta: [{ title: "Your space — Syllaboss" }] }),
  component: YourSpace,
});
