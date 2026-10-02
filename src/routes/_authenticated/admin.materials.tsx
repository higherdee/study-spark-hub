import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Check, Eye, Trash2, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { PageHeader, StatusBadge } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { deleteFromR2, getSignedDownloadUrl } from "@/integrations/r2/client";
import { deleteMaterial, getMaterials, getProfile, setMaterialStatus, type Material, type Profile } from "@/integrations/turso/client";
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
      const mats = await getMaterials({
        status: filter !== "all" ? filter : undefined,
        limit: 500,
      });

      const userIds = [...new Set(mats.map((m) => m.user_id))];
      const profiles = await Promise.all(userIds.map((uid) => getProfile(uid)));
      const profileMap = new Map<string, Profile | null>(
        userIds.map((uid, i) => [uid, profiles[i] ?? null] as [string, Profile | null])
      );

      return mats.map((m) => ({
        ...m,
        uploader: profileMap.get(m.user_id),
      }));
    },
  });

  const rows = data.filter(
    (m) =>
      !q ||
      `${m.title} ${m.course} ${m.course_code ?? ""} ${m.institution} ${m.uploader?.email ?? ""}`
        .toLowerCase()
        .includes(q.toLowerCase())
  );

  async function review(id: string, status: Status) {
    const note = status === "rejected" ? prompt("Reason for rejection (shown to the student)") : "Approved by admin.";
    if (status === "rejected" && !note) return;
    try {
      await setMaterialStatus(id, status, status === "verified" ? 100 : 0, note ?? "");
      toast.success(`Marked ${status}`);
      qc.invalidateQueries({ queryKey: ["admin-materials"] });
      qc.invalidateQueries({ queryKey: ["admin-metrics"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Review failed");
    }
  }

  async function view(path: string) {
    try {
      const url = await getSignedDownloadUrl(path, 300);
      window.open(url, "_blank", "noopener");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not open file");
    }
  }

  async function remove(id: string, path: string) {
    if (!confirm("Delete this material permanently?")) return;
    try {
      await deleteMaterial(id, "");
      await deleteFromR2(path).catch((e) => console.warn(e));
      toast.success("Deleted");
      qc.invalidateQueries({ queryKey: ["admin-materials"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    }
  }

  return (
    <div>
      <PageHeader eyebrow="Review" title="Material vetting" />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex w-fit rounded-full border border-border p-1 text-sm">
          {(["pending", "verified", "rejected", "all"] as const).map((f) => (
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
        <Input
          placeholder="Filter materials or uploader…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="h-9 w-64"
        />
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full min-w-[880px] text-sm">
          <thead className="border-b border-border text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="p-3">Material</th>
              <th className="p-3">Uploader</th>
              <th className="p-3">Pages</th>
              <th className="p-3">AI score</th>
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
                  No materials found.
                </td>
              </tr>
            )}
            {rows.map((m) => (
              <tr key={m.id} className="align-top">
                <td className="p-3">
                  <p className="font-medium">{m.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {m.course_code ? `${m.course_code} · ` : ""}
                    {m.course} · {m.institution} · {m.material_type}
                  </p>
                  {m.verification_notes && (
                    <p className="mt-1 max-w-md text-xs text-muted-foreground">“{m.verification_notes}”</p>
                  )}
                </td>
                <td className="p-3 text-xs">
                  <p className="font-medium text-foreground">{m.uploader?.full_name ?? "—"}</p>
                  <p className="text-muted-foreground">{m.uploader?.email ?? m.user_id}</p>
                </td>
                <td className="p-3">{m.page_count}</td>
                <td className="p-3">
                  {m.verification_score !== null ? (
                    <span
                      className={`font-semibold ${
                        m.verification_score >= 70
                          ? "text-primary"
                          : m.verification_score < 40
                            ? "text-destructive"
                            : "text-accent"
                      }`}
                    >
                      {m.verification_score}%
                    </span>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="p-3">
                  <StatusBadge status={m.status} />
                </td>
                <td className="p-3 text-right">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" aria-label="View" onClick={() => view(m.file_path)}>
                      <Eye className="size-4" />
                    </Button>
                    {m.status !== "verified" && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-primary"
                        aria-label="Approve"
                        onClick={() => review(m.id, "verified")}
                      >
                        <Check className="size-4" />
                      </Button>
                    )}
                    {m.status !== "rejected" && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive"
                        aria-label="Reject"
                        onClick={() => review(m.id, "rejected")}
                      >
                        <X className="size-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Delete"
                      onClick={() => remove(m.id, m.file_path)}
                    >
                      <Trash2 className="size-4" />
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
