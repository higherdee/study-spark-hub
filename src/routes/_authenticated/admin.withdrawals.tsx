import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Check, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { PageHeader, StatusBadge } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { formatNaira } from "@/lib/constants";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin/withdrawals")({ component: AdminWithdrawals });

function AdminWithdrawals() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<"pending" | "paid" | "rejected" | "all">("pending");
  const { data = [], isLoading } = useQuery({
    queryKey: ["admin-withdrawals", filter],
    queryFn: async () => {
      let query = supabase.from("withdrawals").select("*").order("created_at", { ascending: false }).limit(500);
      if (filter !== "all") query = query.eq("status", filter);
      const { data, error } = await query;
      if (error) throw error;
      const ids = [...new Set(data.map((d) => d.user_id))];
      const { data: people } = ids.length ? await supabase.from("profiles").select("id, full_name, email").in("id", ids) : { data: [] };
      const byId = new Map((people ?? []).map((p) => [p.id, p]));
      return data.map((d) => ({ ...d, who: byId.get(d.user_id) }));
    },
  });

  async function process(id: string, status: "paid" | "rejected") {
    const note = status === "paid" ? prompt("Payment reference (optional)") ?? "" : prompt("Reason for rejecting (points are refunded)");
    if (status === "rejected" && !note) return;
    const { error } = await supabase.rpc("admin_process_withdrawal", { _id: id, _status: status, _note: note ?? "" });
    if (error) { toast.error(error.message); return; }
    toast.success(status === "paid" ? "Marked as paid" : "Rejected and refunded");
    qc.invalidateQueries({ queryKey: ["admin-withdrawals"] });
    qc.invalidateQueries({ queryKey: ["admin-metrics"] });
  }

  const total = data.reduce((a, w) => a + w.amount_naira, 0);

  return (
    <div>
      <PageHeader eyebrow={`${data.length} requests · ${formatNaira(total)}`} title="Withdrawals" />
      <div className="mb-4 flex w-fit rounded-full border border-border p-1 text-sm">
        {(["pending", "paid", "rejected", "all"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={cn("rounded-full px-3 py-1 capitalize", filter === f ? "bg-primary text-primary-foreground" : "text-muted-foreground")}>{f}</button>
        ))}
      </div>
      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full min-w-[820px] text-sm">
          <thead className="border-b border-border text-left text-xs uppercase text-muted-foreground">
            <tr><th className="p-3">Student</th><th className="p-3">Amount</th><th className="p-3">Bank details</th><th className="p-3">Requested</th><th className="p-3">Status</th><th className="p-3 text-right">Actions</th></tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading && <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">Loading…</td></tr>}
            {!isLoading && data.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No requests.</td></tr>}
            {data.map((w) => (
              <tr key={w.id}>
                <td className="p-3">{w.who?.full_name ?? "—"}<br /><span className="text-xs text-muted-foreground">{w.who?.email}</span></td>
                <td className="p-3 font-semibold">{formatNaira(w.amount_naira)}<br /><span className="text-xs font-normal text-muted-foreground">{w.points} pts</span></td>
                <td className="p-3 text-xs">{w.bank_name}<br />{w.account_number} · {w.account_name}</td>
                <td className="p-3 text-xs">{new Date(w.created_at).toLocaleString()}</td>
                <td className="p-3"><StatusBadge status={w.status} />{w.admin_note && <p className="mt-1 text-xs text-muted-foreground">{w.admin_note}</p>}</td>
                <td className="p-3">
                  {w.status === "pending" && (
                    <div className="flex justify-end gap-1">
                      <Button size="sm" onClick={() => process(w.id, "paid")}><Check /> Paid</Button>
                      <Button size="sm" variant="outline" onClick={() => process(w.id, "rejected")}><X /> Reject</Button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
