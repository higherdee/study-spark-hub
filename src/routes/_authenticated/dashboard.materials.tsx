import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { ArrowRight, CheckCircle2, Clock, FileText, Loader2, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { getMaterials, deleteMaterial, type Material } from "@/integrations/turso/client";
import { deleteFromR2 } from "@/integrations/r2/client";
import { createComplaintServerFn } from "@/lib/upload.functions";
import { NativeLoading, NativePageTitle } from "@/components/native-web/screens";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
export const Route = createFileRoute("/_authenticated/dashboard/materials")({
  head: () => ({ meta: [{ title: "My uploads — Syllaboss" }] }),
  component: MyMaterials,
});
function MyMaterials() {
  const { user } = useAuth();
  const cache = useQueryClient();
  const [appeal, setAppeal] = useState<Material | null>(null);
  const [removing, setRemoving] = useState<Material | null>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const result = useQuery({
    queryKey: ["my-materials", user?.id],
    enabled: !!user,
    queryFn: () => getMaterials({ userId: user!.id }),
    refetchInterval: 15000,
  });
  const materials = result.data || [];
  async function submitAppeal(e: FormEvent) {
    e.preventDefault();
    if (!user || !appeal || busy) return;
    setBusy(true);
    try {
      await createComplaintServerFn({
        data: { materialId: appeal.id, userId: user.id, complaintText: text.trim() },
      });
      toast.success("Your appeal has been sent for review.");
      setAppeal(null);
      setText("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Your appeal could not be sent.");
    } finally {
      setBusy(false);
    }
  }
  async function remove() {
    if (!user || !removing || busy) return;
    const material = removing;
    setBusy(true);
    try {
      const deleted = await deleteMaterial(material.id, user.id);
      if (!deleted) throw Error("This material could not be deleted.");
      await deleteFromR2(material.file_path).catch(() => {});
      await cache.invalidateQueries({ queryKey: ["my-materials"] });
      setRemoving(null);
      toast.success("Material deleted.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "This material could not be deleted.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="native-my-uploads">
      <NativePageTitle
        eyebrow="Your contribution"
        title="Good notes travel."
        description="Keep track of what you’ve shared and the students it helps."
      />
      <div className="native-space-stats mt-6">
        <div>
          <span>Materials</span>
          <strong>{materials.length}</strong>
        </div>
        <div>
          <span>Verified</span>
          <strong>{materials.filter((m) => m.status === "verified").length}</strong>
        </div>
        <div>
          <span>Points earned</span>
          <strong>
            {materials.reduce((n, m) => n + (m.points_awarded || 0), 0).toLocaleString()}
          </strong>
        </div>
      </div>
      <Link to="/dashboard/upload" className="native-primary-button mb-6">
        <span className="flex items-center gap-3">
          <Upload className="size-5" />
          Share a material
        </span>
        <ArrowRight />
      </Link>
      {result.isPending ? (
        <NativeLoading />
      ) : result.isError ? (
        <div className="native-empty" role="alert">
          Your uploads couldn’t load.
          <button className="native-text-button" onClick={() => void result.refetch()}>
            Try again
          </button>
        </div>
      ) : !materials.length ? (
        <div className="native-empty">
          <p>
            Your first contribution starts here. Share notes, summaries or another useful course
            material.
          </p>
        </div>
      ) : (
        <div className="native-my-upload-grid">
          {materials.map((material) => (
            <article key={material.id} className="native-own-material">
              <div className="native-own-material-heading">
                <FileText />
                <span>
                  <small>{material.course_code || material.course}</small>
                  <Link to="/dashboard/preview" search={{ id: material.id }}>
                    {material.title}
                  </Link>
                </span>
                <button
                  className="native-icon-button"
                  aria-label={`Delete ${material.title}`}
                  onClick={() => setRemoving(material)}
                >
                  <Trash2 />
                </button>
              </div>
              <div className="native-own-material-status" data-status={material.status}>
                {material.status === "verified" ? <CheckCircle2 /> : <Clock />}
                <span>
                  {material.status === "verified"
                    ? "Verified and in the library"
                    : material.status === "pending"
                      ? "Verification in progress"
                      : "Needs another look"}
                </span>
              </div>
              <div className="native-own-material-metrics">
                <span>{material.views || 0} reads</span>
                <span>{material.downloads || 0} downloads</span>
                <strong>+{material.points_awarded || 0} pts</strong>
              </div>
              {material.verification_notes && material.status !== "verified" && (
                <p className="native-own-material-note">{material.verification_notes}</p>
              )}
              {material.status === "rejected" && (
                <button
                  className="native-text-button"
                  onClick={() => {
                    setText("");
                    setAppeal(material);
                  }}
                >
                  Ask for a review
                  <ArrowRight className="size-4" />
                </button>
              )}
            </article>
          ))}
        </div>
      )}
      <Dialog
        open={!!appeal}
        onOpenChange={(open) => {
          if (!open && !busy) setAppeal(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ask for another look.</DialogTitle>
            <DialogDescription>
              Explain why this material should be reviewed again.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submitAppeal} className="grid gap-5">
            <textarea
              aria-label="Your appeal"
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={2000}
              minLength={5}
              required
              rows={5}
              className="rounded-xl border border-input bg-transparent p-4 text-base"
            />
            <button
              className="native-primary-button justify-center"
              disabled={busy || text.trim().length < 5}
            >
              {busy ? <Loader2 className="size-5 animate-spin" /> : null}Send appeal
            </button>
          </form>
        </DialogContent>
      </Dialog>
      <AlertDialog
        open={!!removing}
        onOpenChange={(open) => {
          if (!open && !busy) setRemoving(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this material?</AlertDialogTitle>
            <AlertDialogDescription>
              {removing?.title} will be removed from your uploads and the library.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Keep material</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy}
              onClick={(e) => {
                e.preventDefault();
                void remove();
              }}
            >
              {busy ? "Deleting…" : "Delete material"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
