import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Check, Eye, Trash2, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { PageHeader, StatusBadge } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin/materials")({ component: AdminMaterials });

type Status = "pending" | "verified" | "rejected";

function AdminMaterials() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<Status | "all">("pending");
  const [q, setQ] = useState("");
  const { data = [], isLoading } = useQuery({
    queryKey: ["admin-materials", filter],
    queryFn: async () => {
      let query = supabase.from("materials").select("*").order("created_at", { ascending: false }).limit(500);
      if (filter !== "all") query = query.eq("status", filter);
      const { data, error } = await query;
      if (error) throw error;
      const ids = [...new Set(data.map((d) => d.user_id))];
      const { data: people } = ids.length ? await supabase.from("profiles").select("id, full_name, email").in("id", ids) : { data: [] };
      const byId = new Map((people ?? []).map((p) => [p.id, p]));
      return data.map((d) => ({ ...d, uploader: byId.get(d.user_id) }));
    },
  });

  const rows = data.filter((m) => !q || `${m.title} ${m.course} ${m.course_code ?? ""} ${m.institution} ${m.uploader?.email ?? ""}`.toLowerCase().includes(q.toLowerCase()));

  async function review(id: string, status: Status) {
    const note = status === "rejected" ? prompt("Reason for rejection (shown to the student)") : "Approved by admin.";
    if (status === "rejected" && !note) return;
    const { error } = await supabase.rpc("admin_review_material", { _material_id: id, _status: status, _notes: note ?? "" });
    if (error) { toast.error(error.message); return; }
    toast.success(`Marked ${status}`);
    qc.invalidateQueries({ queryKey: ["admin-materials"] });
    qc.invalidateQueries({ queryKey: ["admin-metrics"] });
  }

  async function view(path: string) {
    const { data, error } = await supabase.storage.from("materials").createSignedUrl(path, 300);
    if (error) { toast.error(error.message); return; }
    window.open(data.signedUrl, "_blank", "noopener");
  }

  async function remove(id: string, path: string) {
    if (!confirm("Delete this material permanently?")) return;
    const { error } = await supabase.from("materials").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    await supabase.storage.from("materials").remove([path]);
    qc.invalidateQueries({ queryKey: ["admin-materials"] });
  }

  return (
    <div>
      <PageHeader eyebrow="Moderation" title="Materials review" />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex rounded-full border border-border p-1 text-sm">
          {(["pending", "verified", "rejected", "all"] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)} className={cn("rounded-full px-3 py-1 capitalize", filter === f ? "bg-primary text-primary-foreground" : "text-muted-foreground")}>{f}</button>
          ))}
        </div>
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search title, course, uploader…" className="max-w-xs" />
      </div>
      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="border-b border-border text-left text-xs uppercase text-muted-foreground">
            <tr><th className="p-3">Material</th><th className="p-3">Uploader</th><th className="p-3">Pages</th><th className="p-3">Auto-check</th><th className="p-3">Status</th><th className="p-3 text-right">Actions</th></tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading && <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">Loading…</td></tr>}
            {!isLoading && rows.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Nothing here.</td></tr>}
            {rows.map((m) => (
              <tr key={m.id} className="align-top">
                <td className="p-3"><p className="font-medium">{m.title}</p><p className="text-xs text-muted-foreground">{m.course_code ? `${m.course_code} · ` : ""}{m.course} · {m.material_type} · {m.level}</p><p className="text-xs text-muted-foreground">{m.institution}</p></td>
                <td className="p-3 text-xs">{m.uploader?.full_name ?? "—"}<br /><span className="text-muted-foreground">{m.uploader?.email}</span></td>
                <td className="p-3">{m.page_count}</td>
                <td className="max-w-xs p-3 text-xs">{m.verification_score !== null && <b>{m.verification_score}/100 </b>}<span className="text-muted-foreground">{m.verification_notes}</span></td>
                <td className="p-3"><StatusBadge status={m.status} /></td>
                <td className="p-3">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" aria-label="View file" onClick={() => view(m.file_path)}><Eye /></Button>
                    {m.status !== "verified" && <Button variant="ghost" size="icon" aria-label="Approve" onClick={() => review(m.id, "verified")}><Check className="text-primary" /></Button>}
                    {m.status !== "rejected" && <Button variant="ghost" size="icon" aria-label="Reject" onClick={() => review(m.id, "rejected")}><X className="text-destructive" /></Button>}
                    <Button variant="ghost" size="icon" aria-label="Delete" onClick={() => remove(m.id, m.file_path)}><Trash2 /></Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
