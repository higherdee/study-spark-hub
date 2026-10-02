import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Trash2, Upload } from "lucide-react";
import { toast } from "sonner";

import { PageHeader, StatusBadge } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/dashboard/materials")({
  head: () => ({ meta: [{ title: "My uploads — Syllaboss" }, { name: "description", content: "Track the status of your uploaded materials." }] }),
  component: MyMaterials,
});

function MyMaterials() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data = [], isLoading } = useQuery({
    queryKey: ["my-materials", user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      const { data, error } = await supabase.from("materials").select("*").eq("user_id", user!.id).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  async function remove(id: string, path: string) {
    if (!confirm("Delete this upload?")) return;
    const { error } = await supabase.from("materials").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    await supabase.storage.from("materials").remove([path]);
    qc.invalidateQueries({ queryKey: ["my-materials"] });
    toast.success("Deleted");
  }

  return (
    <div>
      <PageHeader eyebrow={`${data.length} uploads`} title="My uploads">
        <Button asChild className="rounded-full"><Link to="/dashboard/upload"><Upload /> New upload</Link></Button>
      </PageHeader>
      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="border-b border-border text-left text-xs uppercase text-muted-foreground">
            <tr><th className="p-3">Material</th><th className="p-3">Pages</th><th className="p-3">Status</th><th className="p-3">Points</th><th className="p-3">Downloads</th><th className="p-3" /></tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading && <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">Loading…</td></tr>}
            {!isLoading && data.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No uploads yet.</td></tr>}
            {data.map((m) => (
              <tr key={m.id} className="align-top">
                <td className="p-3">
                  <p className="font-medium">{m.title}</p>
                  <p className="text-xs text-muted-foreground">{m.course_code ? `${m.course_code} · ` : ""}{m.course} · {m.material_type}</p>
                  {m.verification_notes && <p className="mt-1 max-w-md text-xs text-muted-foreground">“{m.verification_notes}”</p>}
                </td>
                <td className="p-3">{m.page_count || "—"}</td>
                <td className="p-3"><StatusBadge status={m.status} /></td>
                <td className="p-3 font-semibold">{m.points_awarded}</td>
                <td className="p-3">{m.downloads}</td>
                <td className="p-3 text-right">
                  {m.status !== "verified" && <Button variant="ghost" size="icon" aria-label="Delete" onClick={() => remove(m.id, m.file_path)}><Trash2 /></Button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
