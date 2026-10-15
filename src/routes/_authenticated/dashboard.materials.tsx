import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  Clock,
  Coins,
  Download,
  Eye,
  FileText,
  FileUp,
  Loader2,
  Trash2,
  Upload,
  X,
  ShieldCheck,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { PageHeader, StatusBadge } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import { deleteFromR2 } from "@/integrations/r2/client";
import { deleteMaterial, getMaterials, type Material } from "@/integrations/turso/client";
import { createComplaintServerFn } from "@/lib/upload.functions";
import { POINTS_NAME } from "@/lib/constants";

export const Route = createFileRoute("/_authenticated/dashboard/materials")({
  head: () => ({
    meta: [
      { title: "My uploads — Syllaboss" },
      { name: "description", content: "Track the status of your uploaded materials and points earned." },
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

  const verifiedCount = data.filter((m) => m.status === "verified").length;
  const totalPointsEarned = data.reduce((acc, m) => acc + (m.points_awarded || 0), 0);
  const totalDownloads = data.reduce((acc, m) => acc + (m.downloads || 0), 0);

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
      toast.success("Appeal lodged! It has entered the admin queue for immediate review.");
      setAppealMaterial(null);
      setComplaintText("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to lodge appeal.");
    } finally {
      setSubmittingAppeal(false);
    }
  }

  async function remove(id: string, path: string) {
    if (!confirm("Are you sure you want to delete this upload?")) return;
    try {
      const ok = await deleteMaterial(id, user!.id);
      if (!ok) throw new Error("Could not delete material");
      await deleteFromR2(path).catch((e) => console.warn("R2 delete error:", e));
      qc.invalidateQueries({ queryKey: ["my-materials"] });
      toast.success("Material deleted.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
    }
  }

  return (
    <div className="w-full max-w-[1200px] mx-auto space-y-6 pb-16 font-sans">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="max-w-2xl">
          <p className="eyebrow flex items-center gap-1.5">
            <FileUp className="size-3.5 text-brand" /> Contributor dashboard
          </p>
          <h1 className="mt-1.5 font-display text-3xl tracking-tight text-ink sm:text-4xl">
            My uploads
          </h1>
          <p className="mt-1.5 text-sm text-ink-soft">
            Track verification audits, community downloads, and {POINTS_NAME} yields earned from your academic deposits.
          </p>
        </div>
        <Button asChild className="self-start rounded-full bg-forest text-white hover:bg-ink md:self-auto">
          <Link to="/dashboard/upload">
            <Upload className="size-4" />
            Upload new material
          </Link>
        </Button>
      </header>

      {/* Overview Stat Ribbon */}
      <div className="stagger grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="surface p-4">
          <p className="eyebrow">Total deposits</p>
          <p className="mt-1 font-display text-2xl text-ink tnum">{data.length}</p>
          <p className="text-[11px] text-muted-foreground">Uploaded files</p>
        </div>

        <div className="surface p-4">
          <p className="eyebrow">Approved & live</p>
          <p className="mt-1 font-display text-2xl text-brand-deep tnum">{verifiedCount}</p>
          <p className="text-[11px] text-muted-foreground">In library</p>
        </div>

        <div className="surface p-4">
          <p className="eyebrow">Yield earned</p>
          <p className="mt-1 font-display text-2xl text-brass-ink tnum">{totalPointsEarned.toLocaleString()}</p>
          <p className="text-[11px] text-muted-foreground">SyllaPoints</p>
        </div>

        <div className="surface p-4">
          <p className="eyebrow">Downloads</p>
          <p className="mt-1 font-display text-2xl text-ink tnum">{totalDownloads.toLocaleString()}</p>
          <p className="text-[11px] text-muted-foreground">From students</p>
        </div>
      </div>

      {/* Main List / Table */}
      {isLoading ? (
        <div className="grid gap-3 sm:gap-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="surface p-5 space-y-3">
              <div className="skeleton h-5 w-1/3 rounded" />
              <div className="skeleton h-4 w-1/4 rounded" />
            </div>
          ))}
        </div>
      ) : data.length === 0 ? (
        <div className="surface grid place-items-center px-6 py-16 text-center animate-rise">
          <span className="grid size-12 place-items-center rounded-2xl bg-muted text-moss">
            <BookOpen className="size-6" />
          </span>
          <h3 className="mt-4 font-display text-xl text-ink">No uploads yet</h3>
          <p className="mt-1 max-w-sm text-sm text-ink-soft">
            Share past questions, lecture summaries, or textbook chapters to help campus peers and start earning {POINTS_NAME}.
          </p>
          <Button asChild className="mt-5 rounded-full bg-forest text-white hover:bg-ink">
            <Link to="/dashboard/upload">
              <Upload className="size-4" /> Deposit your first material
            </Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Mobile Card View (< sm) */}
          <div className="grid gap-3 sm:hidden">
            {data.map((m) => (
              <article key={m.id} className="surface lift p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 mb-1">
                      {m.course_code && (
                        <span className="px-2 py-0.5 rounded bg-accent text-accent-foreground font-mono text-[10px] font-bold">
                          {m.course_code}
                        </span>
                      )}
                      <span className="text-[11px] text-moss font-semibold">{m.material_type}</span>
                    </div>
                    <h3 className="font-display text-base font-semibold text-ink leading-snug line-clamp-2">
                      {m.title}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">{m.course}</p>
                  </div>
                  <StatusBadge status={m.status} />
                </div>

                {m.verification_notes && (
                  <div className="rounded-xl bg-muted/70 p-2.5 text-xs text-ink-soft border border-border">
                    <span className="font-semibold text-ink">Audit notes:</span> {m.verification_notes}
                  </div>
                )}

                <div className="flex items-center justify-between border-t border-border pt-3 text-xs text-muted-foreground tnum">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <FileText className="size-3.5 text-moss" /> {m.page_count || 1} pgs
                    </span>
                    <span className="flex items-center gap-1">
                      <Download className="size-3.5 text-moss" /> {m.downloads}
                    </span>
                    <span className="flex items-center gap-1 font-semibold text-brass-ink">
                      <Coins className="size-3.5 text-brass" /> {m.points_awarded || 0} pts
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {m.status !== "verified" && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 rounded-full text-xs gap-1 border-brass/40 text-brass-ink hover:bg-brass-soft"
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
                        className="size-8 rounded-full text-muted-foreground hover:text-destructive"
                        aria-label="Delete"
                        onClick={() => remove(m.id, m.file_path)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>

          {/* Desktop Table View (>= sm) */}
          <div className="hidden sm:block overflow-hidden rounded-2xl border border-border bg-white shadow-xs">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border bg-muted/40 text-muted-foreground uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-3.5 px-4 min-w-[240px]">Document & Course</th>
                  <th className="py-3.5 px-3">Pages</th>
                  <th className="py-3.5 px-3">Status</th>
                  <th className="py-3.5 px-3 font-mono">Yield</th>
                  <th className="py-3.5 px-3 font-mono">Downloads</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.map((m) => (
                  <tr key={m.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-3.5 px-4">
                      <p className="font-display text-sm font-semibold text-ink line-clamp-1">{m.title}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {m.course_code ? <span className="font-mono font-bold text-accent-foreground mr-1">[{m.course_code}]</span> : null}
                        {m.course} · {m.material_type}
                      </p>
                      {m.verification_notes && (
                        <p className="mt-1 text-[11px] text-ink-soft bg-muted/60 px-2 py-1 rounded-md inline-block max-w-lg truncate">
                          “{m.verification_notes}”
                        </p>
                      )}
                    </td>
                    <td className="py-3.5 px-3 text-muted-foreground font-mono">{m.page_count || "—"}</td>
                    <td className="py-3.5 px-3">
                      <StatusBadge status={m.status} />
                    </td>
                    <td className="py-3.5 px-3 font-mono font-bold text-ink">
                      +{m.points_awarded || 0} pts
                    </td>
                    <td className="py-3.5 px-3 font-mono text-muted-foreground">{m.downloads}</td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {m.status !== "verified" && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 rounded-full text-xs gap-1 border-brass/40 text-brass-ink hover:bg-brass-soft"
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
                            className="size-8 rounded-full text-muted-foreground hover:text-destructive"
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
        </div>
      )}

      {/* Lodge Appeal Modal */}
      {appealMaterial && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur-md animate-fade-in"
          onClick={() => setAppealMaterial(null)}
        >
          <div
            className="w-full max-w-lg overflow-hidden rounded-3xl border border-border bg-white shadow-2xl animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-forest px-6 py-5 text-white flex items-start justify-between">
              <div>
                <h3 className="font-display text-xl text-white">Lodge material appeal</h3>
                <p className="mt-1 text-xs text-white/70 truncate max-w-xs">
                  {appealMaterial.title}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAppealMaterial(null)}
                className="grid size-8 place-items-center rounded-full text-white/70 hover:bg-white/10"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {appealMaterial.verification_notes && (
                <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-xs text-destructive">
                  <strong>AI audit note:</strong> {appealMaterial.verification_notes}
                </div>
              )}

              <form onSubmit={handleLodgeAppeal} className="space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="complaint" className="text-xs font-semibold text-ink">
                    Reason for appeal
                  </label>
                  <Textarea
                    id="complaint"
                    required
                    rows={4}
                    value={complaintText}
                    onChange={(e) => setComplaintText(e.target.value)}
                    placeholder="Provide additional context on what lecture or semester this document represents..."
                    className="rounded-xl text-xs bg-muted/40 focus:bg-white"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    This message is sent directly to the faculty administrative panel for manual override.
                  </p>
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setAppealMaterial(null)}
                    className="rounded-full text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={submittingAppeal}
                    className="rounded-full bg-forest text-white hover:bg-ink text-xs font-semibold"
                  >
                    {submittingAppeal && <Loader2 className="animate-spin size-3.5 mr-1.5" />}
                    Submit appeal
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
