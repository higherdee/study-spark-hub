import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertCircle, HelpCircle, Loader2, MessageSquare, Trash2, Upload, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { PageHeader, StatusBadge } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import { deleteFromR2 } from "@/integrations/r2/client";
import { deleteMaterial, getMaterials, type Material } from "@/integrations/turso/client";
import { createComplaintServerFn } from "@/lib/upload.functions";

export const Route = createFileRoute("/_authenticated/dashboard/materials")({
  head: () => ({
    meta: [
      { title: "My uploads — Syllaboss" },
      { name: "description", content: "Track the status of your uploaded materials." },
    ],
  }),
  component: MyMaterials,
});

function MyMaterials() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [appealMaterial, setAppealMaterial] = useState<Material | null>(null);
  const [complaintText, setComplaintText] = useState("");
  const [submittingAppeal, setSubmittingAppeal] = useState(false);

  const { data = [], isLoading } = useQuery({
    queryKey: ["my-materials", user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      if (!user) return [];
      return await getMaterials({ userId: user.id });
    },
  });

  async function handleLodgeAppeal(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !appealMaterial) return;
    if (complaintText.trim().length < 5) {
      toast.error("Please explain the issue in a few words.");
      return;
    }

    setSubmittingAppeal(true);
    try {
      await createComplaintServerFn({
        data: {
          materialId: appealMaterial.id,
          userId: user.id,
          complaintText: complaintText.trim(),
        },
      });
      toast.success("Appeal lodged! It has entered the admin dashboard for immediate review.");
      setAppealMaterial(null);
      setComplaintText("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to lodge appeal.");
    } finally {
      setSubmittingAppeal(false);
    }
  }

  async function remove(id: string, path: string) {
    if (!confirm("Delete this upload?")) return;
    try {
      const ok = await deleteMaterial(id, user!.id);
      if (!ok) throw new Error("Could not delete material");
      await deleteFromR2(path).catch((e) => console.warn("R2 delete error:", e));
      qc.invalidateQueries({ queryKey: ["my-materials"] });
      toast.success("Deleted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
    }
  }

  return (
    <div>
      <PageHeader eyebrow={`${data.length} uploads`} title="My uploads">
        <Button asChild className="rounded-full">
          <Link to="/dashboard/upload">
            <Upload /> New upload
          </Link>
        </Button>
      </PageHeader>
      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="border-b border-border text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="p-3">Material</th>
              <th className="p-3">Pages</th>
              <th className="p-3">Status</th>
              <th className="p-3">Points</th>
              <th className="p-3">Downloads</th>
              <th className="p-3" />
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
                  No uploads yet.
                </td>
              </tr>
            )}
            {data.map((m) => (
              <tr key={m.id} className="align-top">
                <td className="p-3">
                  <p className="font-medium">{m.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {m.course_code ? `${m.course_code} · ` : ""}
                    {m.course} · {m.material_type}
                  </p>
                  {m.verification_notes && (
                    <p className="mt-1 max-w-md text-xs text-muted-foreground">
                      “{m.verification_notes}”
                    </p>
                  )}
                </td>
                <td className="p-3">{m.page_count || "—"}</td>
                <td className="p-3">
                  <StatusBadge status={m.status} />
                </td>
                <td className="p-3 font-semibold">{m.points_awarded}</td>
                <td className="p-3">{m.downloads}</td>
                <td className="p-3 text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    {m.status !== "verified" && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 rounded-full text-xs gap-1 border-amber-500/30 text-amber-700 dark:text-amber-300 hover:bg-amber-500/10"
                        onClick={() => {
                          setAppealMaterial(m);
                          setComplaintText("");
                        }}
                      >
                        <AlertCircle className="size-3.5" /> Appeal
                      </Button>
                    )}
                    {m.status !== "verified" && (
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Delete"
                        onClick={() => remove(m.id, m.file_path)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Lodge Complaint / Appeal Modal */}
      {appealMaterial && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur-md animate-fade-in"
          onClick={() => setAppealMaterial(null)}
        >
          <div
            className="w-full max-w-lg overflow-hidden rounded-3xl border border-white/20 bg-card p-6 sm:p-7 shadow-2xl backdrop-blur-2xl animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-display text-xl font-bold text-foreground">
                  Lodge Material Appeal
                </h3>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {appealMaterial.title} · {appealMaterial.course}
                </p>
              </div>
              <button
                onClick={() => setAppealMaterial(null)}
                className="grid size-8 place-items-center rounded-full text-muted-foreground hover:bg-secondary"
              >
                <X className="size-4" />
              </button>
            </div>

            {appealMaterial.verification_notes && (
              <div className="mt-4 rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-xs text-destructive">
                <strong>Audit Note:</strong> {appealMaterial.verification_notes}
              </div>
            )}

            <form onSubmit={handleLodgeAppeal} className="mt-4 space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="complaint" className="text-xs font-semibold text-foreground">
                  Your Explanation / Complaint
                </label>
                <Textarea
                  id="complaint"
                  required
                  rows={4}
                  value={complaintText}
                  onChange={(e) => setComplaintText(e.target.value)}
                  placeholder="Explain why this upload is legitimate, what course it covers, or what needs clarification..."
                  className="rounded-2xl text-xs"
                />
                <p className="text-[11px] text-muted-foreground">
                  Your appeal will be routed straight to the admin dashboard. You'll receive a phone and web notification as soon as an admin replies.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setAppealMaterial(null)}
                  className="rounded-xl text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submittingAppeal}
                  className="rounded-xl text-xs font-semibold"
                >
                  {submittingAppeal && <Loader2 className="animate-spin size-3.5 mr-1.5" />}
                  Submit Appeal
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
