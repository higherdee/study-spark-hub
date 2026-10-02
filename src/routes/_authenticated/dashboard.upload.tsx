import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, Clock, FileUp, Loader2, ShieldCheck, XCircle } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/app-shell";
import { SearchSelect, type SearchOption } from "@/components/search-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import { ACCEPTED_FILES, courseOptions, institutionOptions, LEVELS, MATERIAL_TYPES, MAX_FILE_BYTES, POINTS_PER_VERIFIED_UPLOAD, POINTS_NAME, POINTS_PER_VIEW, POINTS_PER_DOWNLOAD } from "@/lib/constants";
import { useProfile } from "@/lib/profile";
import { createMaterialServerFn, getUploadUrlServerFn } from "@/lib/upload.functions";
import { verifyMaterial } from "@/lib/verify.functions";

export const Route = createFileRoute("/_authenticated/dashboard/upload")({
  head: () => ({
    meta: [
      { title: "Upload material — Syllaboss" },
      { name: "description", content: "Upload study materials and earn SyllaPoints per verified upload." },
    ],
  }),
  component: UploadPage,
});

type Result = { status: string; score: number | null; notes: string | null; pages: number };

function UploadPage() {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [code, setCode] = useState("");
  const [course, setCourse] = useState<SearchOption | null>(profile?.course ? { label: profile.course } : null);
  const [inst, setInst] = useState<SearchOption | null>(profile?.institution ? { label: profile.institution } : null);
  const [level, setLevel] = useState(profile?.level ?? "100 Level");
  const [type, setType] = useState(MATERIAL_TYPES[0]!);
  const [desc, setDesc] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [stage, setStage] = useState<"idle" | "uploading" | "checking">("idle");
  const [result, setResult] = useState<Result | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (profile?.suspended) {
      toast.error("Your account is suspended. Contact support.");
      return;
    }
    if (title.trim().length < 3 || !course || !inst || !file) {
      toast.error("Fill in the title, course, school and pick a file");
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      toast.error("File is larger than 20MB");
      return;
    }
    if (!ACCEPTED_FILES.split(",").includes(file.type)) {
      toast.error("Upload a PDF or an image (PNG, JPG, WEBP)");
      return;
    }

    setResult(null);
    setStage("uploading");

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("userId", user.id);
      formData.append("title", title.trim());
      formData.append("course", course.label);
      if (code.trim()) formData.append("courseCode", code.trim());
      formData.append("institution", inst.label);
      formData.append("level", level);
      formData.append("materialType", type);
      if (desc.trim()) formData.append("description", desc.trim());

      setStage("uploading");
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `Upload failed (${res.statusText})`);
      }

      setStage("checking");
      const data = await res.json();
      const audit = data.auditResult || {
        status: "pending",
        score: null,
        notes: "Uploaded. Queued for audit and review.",
      };

      setResult({
        status: audit.status || "pending",
        score: audit.score ?? null,
        notes: audit.notes ?? "File queued for review.",
        pages: data.material?.page_count || 1,
      });

      if (audit.status === "verified") {
        toast.success("Verified! SyllaPoints added to your wallet.");
      } else {
        toast.info("Upload submitted! Status: Pending verification.");
      }

      qc.invalidateQueries({ queryKey: ["profile"] });
      qc.invalidateQueries({ queryKey: ["my-materials"] });
      setTitle("");
      setCode("");
      setDesc("");
      setFile(null);
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setStage("idle");
    }
  }

  const busy = stage !== "idle";

  return (
    <div className="max-w-3xl">
      <PageHeader eyebrow={`Earn ${POINTS_PER_VERIFIED_UPLOAD} ${POINTS_NAME} per verified upload`} title="Upload a material" />

      <div className="mb-6 flex gap-3 rounded-xl border border-border bg-secondary p-4 text-sm">
        <ShieldCheck className="size-5 shrink-0 text-primary" />
        <p className="text-muted-foreground">
          Every file is checked automatically to confirm it matches the title, course and type you enter.
          Matching files are approved and you get <b className="text-foreground">{POINTS_PER_VERIFIED_UPLOAD} {POINTS_NAME}</b> (+{POINTS_PER_VIEW} pts per view, +{POINTS_PER_DOWNLOAD} pts per download). Unclear files go to an admin.
        </p>
      </div>

      {result && <ResultCard r={result} />}

      <form onSubmit={onSubmit} className="space-y-5 rounded-xl border border-border bg-card p-5 sm:p-7">
        <div className="grid gap-4 sm:grid-cols-[1fr_180px]">
          <div className="space-y-2">
            <Label htmlFor="t">Title</Label>
            <Input
              id="t"
              maxLength={120}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Introduction to Calculus — Lecture notes week 1-4"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="c">Course code</Label>
            <Input
              id="c"
              maxLength={20}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="MTH 101"
            />
          </div>
        </div>
        <SearchSelect
          id="u-course"
          label="Course"
          placeholder="Search course"
          options={courseOptions}
          value={course}
          onChange={setCourse}
        />
        <SearchSelect
          id="u-inst"
          label="Institution"
          placeholder="Search school"
          options={institutionOptions}
          value={inst}
          onChange={setInst}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="l">Level</Label>
            <select
              id="l"
              value={level}
              onChange={(e) => setLevel(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {LEVELS.map((l) => (
                <option key={l}>{l}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="ty">Material type</Label>
            <select
              id="ty"
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {MATERIAL_TYPES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="d">Description (optional)</Label>
          <Textarea
            id="d"
            maxLength={300}
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            placeholder="Topic overview, lecturer name or semester details"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="f">File (PDF or image, max 20MB)</Label>
          <Input
            id="f"
            type="file"
            accept={ACCEPTED_FILES}
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </div>
        <Button type="submit" disabled={busy} className="h-11 w-full rounded-full">
          {stage === "uploading" ? (
            <>
              <Loader2 className="animate-spin" /> Uploading to Cloudflare R2…
            </>
          ) : stage === "checking" ? (
            <>
              <Loader2 className="animate-spin" /> Checking material with AI…
            </>
          ) : (
            <>
              <FileUp /> Submit and check
            </>
          )}
        </Button>
      </form>
    </div>
  );
}

function ResultCard({ r }: { r: Result }) {
  if (r.status === "verified") {
    return (
      <div className="mb-6 rounded-xl border border-primary/30 bg-primary/10 p-5">
        <div className="flex items-center gap-2 font-display text-lg font-semibold text-primary">
          <CheckCircle2 className="size-5" /> Approved — {POINTS_PER_VERIFIED_UPLOAD} {POINTS_NAME} awarded!
        </div>
        <p className="mt-1 text-sm text-foreground/80">
          We confirmed this file matches your course. You also earn +{POINTS_PER_VIEW} {POINTS_NAME} on every view and +{POINTS_PER_DOWNLOAD} {POINTS_NAME} on every download.
        </p>
      </div>
    );
  }
  if (r.status === "rejected") {
    return (
      <div className="mb-6 rounded-2xl border border-destructive/30 bg-destructive/10 p-5 backdrop-blur-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-display text-lg font-semibold text-destructive">
            <XCircle className="size-5" /> File Not Verified
          </div>
          <span className="rounded-full bg-destructive/20 px-2.5 py-0.5 text-xs font-semibold text-destructive">
            Rejected
          </span>
        </div>
        <p className="mt-2 text-sm text-foreground/80">{r.notes ?? "The file did not match the stated course."}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Think this was a mistake? You can lodge an appeal from your Materials tab.
        </p>
        <div className="mt-3">
          <Button asChild size="sm" variant="outline" className="rounded-full text-xs border-destructive/40 text-destructive hover:bg-destructive/10">
            <Link to="/dashboard/materials">Lodge a Complaint in My Materials</Link>
          </Button>
        </div>
      </div>
    );
  }
  return (
    <div className="mb-6 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5 backdrop-blur-md">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 font-display text-lg font-semibold text-amber-700 dark:text-amber-300">
          <Clock className="size-5" /> Pending Audit & Verification
        </div>
        <span className="rounded-full bg-amber-500/20 px-2.5 py-0.5 text-xs font-semibold text-amber-800 dark:text-amber-200">
          In Review
        </span>
      </div>
      <p className="mt-2 text-sm text-foreground/80">
        Your file has been safely uploaded and queued for automated audit and admin review. You can check the live status of your file and track verification progress in your <b>My Materials</b> tab!
      </p>
      <div className="mt-3">
        <Button asChild size="sm" variant="outline" className="rounded-full text-xs">
          <Link to="/dashboard/materials">Check Status in My Materials</Link>
        </Button>
      </div>
    </div>
  );
}
