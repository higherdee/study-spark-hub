import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { NativeLibrary } from "@/components/native-web/screens";
export const Route = createFileRoute("/_authenticated/dashboard/library")({
  validateSearch: z.object({
    q: z.string().catch("").default(""),
    type: z.string().catch("").default(""),
    level: z.string().catch("").default(""),
  }),
  head: () => ({ meta: [{ title: "The library — Syllaboss" }] }),
  component: () => {
    const { q } = Route.useSearch();
    return <NativeLibrary initialQuery={q} />;
  },
});
