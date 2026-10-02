import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Ban, Coins, Shield, ShieldOff, Undo2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";
import {
  adminAdjustPoints,
  adminSetSuspended,
  adminToggleAdmin,
  turso,
  type Profile,
} from "@/integrations/turso/client";

export const Route = createFileRoute("/_authenticated/admin/users")({ component: AdminUsers });

function AdminUsers() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const { data = [], isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const [pRs, rRs, mRs] = await Promise.all([
        turso.execute("SELECT * FROM profiles ORDER BY created_at DESC LIMIT 1000"),
        turso.execute("SELECT user_id FROM user_roles WHERE role = 'admin'"),
        turso.execute("SELECT user_id, status FROM materials LIMIT 5000"),
      ]);

      const profiles = pRs.rows as unknown as Profile[];
      const adminSet = new Set(rRs.rows.map((r) => String(r['user_id'])));
      const materials = mRs.rows as unknown as { user_id: string; status: string }[];

      return profiles.map((p) => ({
        ...p,
        isAdmin: adminSet.has(p.id),
        uploads: materials.filter((m) => m.user_id === p.id).length,
        verified: materials.filter((m) => m.user_id === p.id && m.status === "verified").length,
      }));
    },
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ["admin-users"] });
  const rows = data.filter(
    (p) =>
      !q ||
      `${p.full_name ?? ""} ${p.email ?? ""} ${p.institution ?? ""} ${p.course ?? ""}`
        .toLowerCase()
        .includes(q.toLowerCase())
  );

  async function toggleAdmin(id: string, isAdmin: boolean) {
    if (id === user?.id && isAdmin) {
      toast.error("You can't remove your own admin role");
      return;
    }
    try {
      await adminToggleAdmin(id, !isAdmin);
      refresh();
      toast.success(isAdmin ? "Removed admin role" : "Granted admin role");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Role update failed");
    }
  }

  async function suspend(id: string, s: boolean) {
    try {
      await adminSetSuspended(id, s);
      refresh();
      toast.success(s ? "User suspended" : "User unsuspended");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Suspension update failed");
    }
  }

  async function adjust(id: string) {
    const amt = Number(prompt("Points to add (use a minus sign to remove)"));
    if (!amt) return;
    const reason = prompt("Reason") ?? "";
    try {
      await adminAdjustPoints(id, amt, reason);
      toast.success("Points updated");
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Adjustment failed");
    }
  }

  return (
    <div>
      <PageHeader eyebrow={`${data.length} registered students`} title="User management">
        <Input
          placeholder="Filter users…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="h-9 w-64"
        />
      </PageHeader>

      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full min-w-[880px] text-sm">
          <thead className="border-b border-border text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="p-3">User</th>
              <th className="p-3">Academic info</th>
              <th className="p-3">Points</th>
              <th className="p-3">Uploads</th>
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
            {!isLoading && rows.length === 0 && (
              <tr>
                <td colSpan={6} className="p-8 text-center text-muted-foreground">
                  No users.
                </td>
              </tr>
            )}
            {rows.map((p) => (
              <tr key={p.id} className="align-top">
                <td className="p-3">
                  <p className="font-medium text-foreground">{p.full_name || "Student"}</p>
                  <p className="text-xs text-muted-foreground">{p.email || p.id}</p>
                </td>
                <td className="p-3 text-xs">
                  <p className="font-medium text-foreground">{p.course || "No course"}</p>
                  <p className="text-muted-foreground">
                    {p.institution || "No school"} · {p.level || "—"}
                  </p>
                </td>
                <td className="p-3">
                  <span className="font-semibold">{p.points}</span>
                </td>
                <td className="p-3 text-xs">
                  <p className="font-medium text-foreground">{p.uploads} uploaded</p>
                  <p className="text-muted-foreground">{p.verified} approved</p>
                </td>
                <td className="p-3">
                  {p.suspended ? (
                    <span className="rounded-full bg-destructive/10 px-2.5 py-0.5 text-xs font-medium text-destructive">
                      Suspended
                    </span>
                  ) : p.isAdmin ? (
                    <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                      Admin
                    </span>
                  ) : (
                    <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                      Active
                    </span>
                  )}
                </td>
                <td className="p-3 text-right">
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Adjust points"
                      aria-label="Adjust points"
                      onClick={() => adjust(p.id)}
                    >
                      <Coins className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      title={p.suspended ? "Unsuspend" : "Suspend"}
                      aria-label="Suspend"
                      className={p.suspended ? "text-primary" : "text-destructive"}
                      onClick={() => suspend(p.id, !p.suspended)}
                    >
                      {p.suspended ? <Undo2 className="size-4" /> : <Ban className="size-4" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      title={p.isAdmin ? "Remove admin" : "Make admin"}
                      aria-label="Admin toggle"
                      onClick={() => toggleAdmin(p.id, p.isAdmin)}
                    >
                      {p.isAdmin ? <ShieldOff className="size-4" /> : <Shield className="size-4" />}
                    </Button>
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
