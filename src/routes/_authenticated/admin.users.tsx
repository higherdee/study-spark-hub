import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Ban, Coins, Shield, ShieldOff, Undo2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin/users")({ component: AdminUsers });

function AdminUsers() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const { data = [], isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const [{ data: profiles, error }, { data: roles }, { data: mats }] = await Promise.all([
        supabase.from("profiles").select("*").order("created_at", { ascending: false }).limit(1000),
        supabase.from("user_roles").select("user_id, role").eq("role", "admin"),
        supabase.from("materials").select("user_id, status").limit(5000),
      ]);
      if (error) throw error;
      const admins = new Set((roles ?? []).map((r) => r.user_id));
      return (profiles ?? []).map((p) => ({
        ...p,
        isAdmin: admins.has(p.id),
        uploads: (mats ?? []).filter((m) => m.user_id === p.id).length,
        verified: (mats ?? []).filter((m) => m.user_id === p.id && m.status === "verified").length,
      }));
    },
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ["admin-users"] });
  const rows = data.filter((p) => !q || `${p.full_name ?? ""} ${p.email ?? ""} ${p.institution ?? ""} ${p.course ?? ""}`.toLowerCase().includes(q.toLowerCase()));

  async function toggleAdmin(id: string, isAdmin: boolean) {
    if (id === user?.id && isAdmin) { toast.error("You can't remove your own admin role"); return; }
    const { error } = isAdmin
      ? await supabase.from("user_roles").delete().eq("user_id", id).eq("role", "admin")
      : await supabase.from("user_roles").insert({ user_id: id, role: "admin" });
    if (error) { toast.error(error.message); return; }
    refresh();
  }
  async function suspend(id: string, s: boolean) {
    const { error } = await supabase.rpc("admin_set_suspended", { _user_id: id, _suspended: s });
    if (error) { toast.error(error.message); return; }
    refresh();
  }
  async function adjust(id: string) {
    const amt = Number(prompt("Points to add (use a minus sign to remove)"));
    if (!amt) return;
    const reason = prompt("Reason") ?? "";
    const { error } = await supabase.rpc("admin_adjust_points", { _user_id: id, _amount: amt, _reason: reason });
    if (error) { toast.error(error.message); return; }
    toast.success("Points updated");
    refresh();
  }

  function exportCsv() {
    const head = ["name", "email", "phone", "institution", "course", "level", "heard_from", "points", "uploads", "joined"];
    const lines = rows.map((p) => [p.full_name, p.email, p.phone, p.institution, p.course, p.level, p.referral_source, p.points, p.uploads, p.created_at].map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(","));
    const blob = new Blob([[head.join(","), ...lines].join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "syllaboss-students.csv";
    a.click();
  }

  return (
    <div>
      <PageHeader eyebrow={`${data.length} accounts`} title="Students">
        <Button variant="outline" onClick={exportCsv}>Export CSV</Button>
      </PageHeader>
      <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, email, school, course…" className="mb-4 max-w-sm" />
      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full min-w-[960px] text-sm">
          <thead className="border-b border-border text-left text-xs uppercase text-muted-foreground">
            <tr><th className="p-3">Student</th><th className="p-3">School & course</th><th className="p-3">Heard from</th><th className="p-3">Uploads</th><th className="p-3">Points</th><th className="p-3">Joined</th><th className="p-3 text-right">Actions</th></tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading && <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">Loading…</td></tr>}
            {rows.map((p) => (
              <tr key={p.id} className={p.suspended ? "bg-destructive/5" : ""}>
                <td className="p-3"><p className="font-medium">{p.full_name ?? "—"} {p.isAdmin && <span className="ml-1 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] uppercase text-primary">admin</span>}{p.suspended && <span className="ml-1 rounded bg-destructive/10 px-1.5 py-0.5 text-[10px] uppercase text-destructive">suspended</span>}</p><p className="text-xs text-muted-foreground">{p.email}{p.phone ? ` · ${p.phone}` : ""}</p></td>
                <td className="p-3 text-xs">{p.institution ?? "—"}<br /><span className="text-muted-foreground">{p.course} {p.level ? `· ${p.level}` : ""}</span></td>
                <td className="p-3 text-xs">{p.referral_source ?? "—"}</td>
                <td className="p-3">{p.verified}/{p.uploads}</td>
                <td className="p-3 font-semibold">{p.points}</td>
                <td className="p-3 text-xs">{new Date(p.created_at).toLocaleDateString()}</td>
                <td className="p-3">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" aria-label="Adjust points" onClick={() => adjust(p.id)}><Coins /></Button>
                    <Button variant="ghost" size="icon" aria-label={p.isAdmin ? "Remove admin" : "Make admin"} onClick={() => toggleAdmin(p.id, p.isAdmin)}>{p.isAdmin ? <ShieldOff /> : <Shield />}</Button>
                    <Button variant="ghost" size="icon" aria-label={p.suspended ? "Restore" : "Suspend"} onClick={() => suspend(p.id, !p.suspended)}>{p.suspended ? <Undo2 /> : <Ban className="text-destructive" />}</Button>
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
