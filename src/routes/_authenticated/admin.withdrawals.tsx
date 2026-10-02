import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Check, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { PageHeader, StatusBadge } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import {
  adminProcessWithdrawal,
  getProfile,
  turso,
  type Withdrawal,
  type Profile,
} from "@/integrations/turso/client";
import { formatNaira } from "@/lib/constants";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin/withdrawals")({ component: AdminWithdrawals });

function AdminWithdrawals() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<"pending" | "paid" | "rejected" | "all">("pending");
  const { data = [], isLoading } = useQuery({
    queryKey: ["admin-withdrawals", filter],
    queryFn: async () => {
      const whereClause = filter !== "all" ? "WHERE status = ?" : "";
      const args = filter !== "all" ? [filter] : [];
      const rs = await turso.execute({
        sql: `SELECT * FROM withdrawals ${whereClause} ORDER BY created_at DESC LIMIT 500`,
        args,
      });
      const list = rs.rows as unknown as Withdrawal[];
      const userIds = [...new Set(list.map((w) => w.user_id))];
      const profiles = await Promise.all(userIds.map((uid) => getProfile(uid)));
      const byId = new Map<string, Profile | null>(
        userIds.map((uid, i) => [uid, profiles[i] ?? null] as [string, Profile | null])
      );

      return list.map((w) => ({
        ...w,
        who: byId.get(w.user_id),
      }));
    },
  });

  async function process(id: string, status: "paid" | "rejected") {
    const note =
      status === "paid"
        ? prompt("Payment reference (optional)") ?? ""
        : prompt("Reason for rejecting (points are refunded)");
    if (status === "rejected" && !note) return;
    try {
      await adminProcessWithdrawal(id, status, note ?? "");
      toast.success(status === "paid" ? "Marked as paid" : "Rejected and refunded");
      qc.invalidateQueries({ queryKey: ["admin-withdrawals"] });
      qc.invalidateQueries({ queryKey: ["admin-metrics"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Processing failed");
    }
  }

  const total = data.reduce((a, w) => a + w.amount_naira, 0);

  return (
    <div>
      <PageHeader eyebrow={`${data.length} requests · ${formatNaira(total)}`} title="Withdrawals" />
      <div className="mb-4 flex w-fit rounded-full border border-border p-1 text-sm">
        {(["pending", "paid", "rejected", "all"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "rounded-full px-3 py-1 capitalize",
              filter === f ? "bg-primary text-primary-foreground" : "text-muted-foreground"
            )}
          >
            {f}
          </button>
        ))}
      </div>
      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full min-w-[820px] text-sm">
          <thead className="border-b border-border text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="p-3">Student</th>
              <th className="p-3">Amount</th>
              <th className="p-3">Bank details</th>
              <th className="p-3">Requested</th>
              <th className="p-3">Status</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading && (
              <tr>
                <td colSpan={6} className="p-6 text-center text-muted-foreground">
                  Loading…
                </td>
              </tr>
            )}
            {!isLoading && data.length === 0 && (
              <tr>
                <td colSpan={6} className="p-8 text-center text-muted-foreground">
                  No requests.
                </td>
              </tr>
            )}
            {data.map((w) => (
              <tr key={w.id} className="align-top">
                <td className="p-3">
                  <p className="font-medium text-foreground">{w.who?.full_name ?? "Student"}</p>
                  <p className="text-xs text-muted-foreground">{w.who?.email ?? w.user_id}</p>
                </td>
                <td className="p-3">
                  <p className="font-semibold text-foreground">{formatNaira(w.amount_naira)}</p>
                  <p className="text-xs text-muted-foreground">{w.points} points</p>
                </td>
                <td className="p-3 text-xs">
                  <p className="font-medium text-foreground">{w.bank_name}</p>
                  <p className="font-mono text-muted-foreground">{w.account_number}</p>
                  <p className="text-muted-foreground">{w.account_name}</p>
                </td>
                <td className="p-3 text-xs text-muted-foreground">
                  {new Date(w.created_at).toLocaleDateString()}
                  {w.admin_note && <p className="mt-1 text-xs text-foreground/80">Note: {w.admin_note}</p>}
                </td>
                <td className="p-3">
                  <StatusBadge status={w.status} />
                </td>
                <td className="p-3 text-right">
                  {w.status === "pending" && (
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-primary"
                        aria-label="Pay"
                        onClick={() => process(w.id, "paid")}
                      >
                        <Check className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive"
                        aria-label="Reject"
                        onClick={() => process(w.id, "rejected")}
                      >
                        <X className="size-4" />
                      </Button>
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
