import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { NativeLibrary } from "@/components/native-web/screens";
import { NativeWebShell } from "@/components/native-web/shell";
import { useAuth } from "@/hooks/use-auth";
export const Route = createFileRoute("/materials")({
  validateSearch: z.object({
    q: z.string().catch("").default(""),
    type: z.string().catch("").default(""),
    level: z.string().catch("").default(""),
  }),
  head: () => ({ meta: [{ title: "The library — Syllaboss" }] }),
  component: MaterialsPage,
});
function MaterialsPage() {
  const { q } = Route.useSearch();
  const { user } = useAuth();
  return (
    <NativeWebShell guest={!user}>
      <NativeLibrary guest={!user} initialQuery={q} />
    </NativeWebShell>
  );
}
