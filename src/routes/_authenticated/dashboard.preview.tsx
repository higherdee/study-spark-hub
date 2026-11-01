import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { getMaterialById } from "@/integrations/turso/client";
import { DocumentWorkspace } from "@/components/document-workspace";
import { Button } from "@/components/ui/button";
const previewSearchSchema = z.object({ id: z.string().catch(""), split: z.enum(["true", "false"]).catch("false").optional() });
export const Route = createFileRoute("/_authenticated/dashboard/preview")({ validateSearch: previewSearchSchema, head: () => ({ meta: [{ title: "Read and study — Syllaboss" }, { name: "description", content: "Read your course material with a movable Boss AI study window, student reviews and clear study tools." }] }), component: DocumentPreviewPage });
function DocumentPreviewPage() {
  const { id, split } = Route.useSearch();
  const navigate = useNavigate();
  const result = useQuery({ queryKey: ["material-preview", id], enabled: !!id, queryFn: () => getMaterialById(id) });
  const back = () => { void navigate({ to: "/dashboard/library" }); };
  if (result.isPending && id) return <div role="status" className="grid h-full min-h-64 place-content-center gap-4 p-8"><div className="h-8 w-52 animate-pulse rounded-xl bg-muted"/><p className="text-sm text-muted-foreground">Opening your study space…</p></div>;
  if (!result.data) return <div className="grid min-h-64 place-content-center gap-4 p-8 text-center"><h1 className="font-serif text-3xl">Material unavailable.</h1><p className="text-sm text-muted-foreground">It may have been removed or could not be loaded.</p><Button onClick={back}>Return to library</Button></div>;
  return <DocumentWorkspace key={result.data.id} material={result.data} initialAssistant={split === "true"} back={back}/>;
}
