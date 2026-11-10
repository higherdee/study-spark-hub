import { useQueryClient, useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  CheckCircle2,
  Clock,
  FileUp,
  Loader2,
  ShieldCheck,
  XCircle,
  Sparkles,
  Calculator,
  Eye,
  Download,
  Lock,
  ArrowRight,
  FileText,
} from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

import { PageHeader } from "@/components/app-shell";
import { SearchSelect, type SearchOption } from "@/components/search-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import {
  ACCEPTED_FILES,
  courseOptions,
  institutionOptions,
  LEVELS,
  MATERIAL_TYPES,
  MAX_FILE_BYTES,
  POINTS_PER_VERIFIED_UPLOAD,
  POINTS_NAME,
  POINTS_PER_VIEW,
  POINTS_PER_DOWNLOAD,
  formatNaira,
} from "@/lib/constants";
import { useProfile } from "@/lib/profile";
import { getMaterials } from "@/integrations/turso/client";

export const Route = createFileRoute("/_authenticated/dashboard/upload")({
  head: () => ({
    meta: [
      { title: "Upload Academic Material — Syllaboss" },
      {
        name: "description",
        content: "Upload study materials and earn SyllaPoints per verified upload.",
      },
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
  const [course, setCourse] = useState<SearchOption | null>(
    profile?.course ? { label: profile.course } : null,
  );
  const [inst, setInst] = useState<SearchOption | null>(
    profile?.institution ? { label: profile.institution } : null,
  );
  const [level, setLevel] = useState(profile?.level ?? "100 Level");
  const [type, setType] = useState(MATERIAL_TYPES[0]!);
  const [desc, setDesc] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [stage, setStage] = useState<"idle" | "uploading" | "checking">("idle");
  const [result, setResult] = useState<Result | null>(null);

  // Yield simulator state
  const [reads, setReads] = useState(350);
  const [downloads, setDownloads] = useState(110);

  const { data: myMaterials = [] } = useQuery({
    queryKey: ["my-materials", user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      if (!user) return [];
      return await getMaterials({ userId: user.id });
    },
  });

  const projectedPoints = 25 + reads * 2 + downloads * 5;
  const projectedNaira = projectedPoints * 20;

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
    <section className="native-upload-page">
      <header className="native-page-title">
        <p className="native-eyebrow">Help the next student</p>
        <h1>Share a material.</h1>
        <p>
          Good notes can go a long way. Upload yours and earn SyllaPoints when they’re verified.
        </p>
      </header>
      <div className="native-upload-reward">
        <ShieldCheck className="size-6" />
        <p>
          <strong>+{POINTS_PER_VERIFIED_UPLOAD} SyllaPoints</strong>
          <span>For each verified material, with more earned as students learn from it.</span>
        </p>
      </div>
      {result && <ResultCard r={result} />}
      <div className="native-upload-form">
        <form onSubmit={onSubmit} className="surface flex flex-col gap-5 p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl text-ink">Material details</h2>
            <span className="text-xs text-muted-foreground">All fields marked * are required</span>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="material-title" className="text-xs font-semibold text-ink-soft">
              Title <span className="text-destructive">*</span>
            </Label>
            <Input
              id="material-title"
              maxLength={120}
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Thermodynamics lecture notes, weeks 1–4"
              className="h-11 rounded-xl bg-muted/50 text-sm focus:bg-white"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-12">
            <div className="flex flex-col gap-1.5 sm:col-span-4">
              <Label htmlFor="course-code" className="text-xs font-semibold text-ink-soft">
                Course code <span className="text-destructive">*</span>
              </Label>
              <Input
                id="course-code"
                maxLength={20}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="MTH 101"
                className="h-11 rounded-xl bg-muted/50 text-sm uppercase tnum focus:bg-white"
              />
            </div>
            <div className="flex flex-col gap-1.5 sm:col-span-8">
              <SearchSelect
                id="u-course"
                label="Course"
                placeholder="Search course name"
                options={courseOptions}
                value={course}
                onChange={setCourse}
              />
            </div>
          </div>

          <SearchSelect
            id="u-inst"
            label="Institution"
            placeholder="Search university or polytechnic"
            options={institutionOptions}
            value={inst}
            onChange={setInst}
          />

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="u-level" className="text-xs font-semibold text-ink-soft">
              Level
            </Label>
            <select
              id="u-level"
              value={level}
              onChange={(e) => setLevel(e.target.value)}
              className="h-12 rounded-xl border border-input bg-transparent px-3 text-base"
            >
              {LEVELS.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ty" className="text-xs font-semibold text-ink-soft">
              Type <span className="text-destructive">*</span>
            </Label>
            <select
              id="ty"
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="flex h-11 w-full cursor-pointer rounded-xl border border-border bg-muted/50 px-3 text-sm focus:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {MATERIAL_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label
              htmlFor="desc"
              className="flex items-center justify-between text-xs font-semibold text-ink-soft"
            >
              <span>Description (optional)</span>
              <span className="font-normal text-muted-foreground tnum">{desc.length} / 300</span>
            </Label>
            <Textarea
              id="desc"
              maxLength={300}
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="Key syllabus concepts, topics covered, lecturer/professor…"
              className="resize-none rounded-xl bg-muted/50 text-sm focus:bg-white"
              rows={3}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label
              htmlFor="file-input"
              className="flex items-center justify-between text-xs font-semibold text-ink-soft"
            >
              <span>
                File <span className="text-destructive">*</span>
              </span>
              <span className="font-normal text-muted-foreground">PDF or image · up to 20MB</span>
            </Label>

            <div
              className={`group relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 text-center transition-colors duration-200 ${
                file
                  ? "border-brand/50 bg-accent/40"
                  : "border-border bg-muted/50 hover:border-brand/50 hover:bg-muted"
              }`}
            >
              <input
                id="file-input"
                type="file"
                accept={ACCEPTED_FILES}
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
              />
              <div className="mb-3 grid size-12 place-items-center rounded-2xl bg-white text-brand shadow-[var(--elev-1)] transition-transform duration-200 group-hover:-translate-y-0.5">
                <FileUp className="size-6" />
              </div>
              <p className="max-w-full truncate text-sm font-semibold text-ink">
                {file ? file.name : "Drop your file here, or tap to browse"}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground tnum">
                {file
                  ? `${(file.size / (1024 * 1024)).toFixed(1)} MB · ready to check`
                  : "PNG, JPG, WEBP or PDF"}
              </p>
            </div>
          </div>

          <div className="flex flex-col-reverse items-stretch justify-between gap-3 pt-1 sm:flex-row sm:items-center">
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Lock className="size-3.5 text-moss" />
              Your file is stored privately until it passes the check.
            </p>
            <Button
              type="submit"
              disabled={busy}
              className="h-11 rounded-full bg-forest px-6 text-white hover:bg-ink"
            >
              {stage === "uploading" ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Uploading…
                </>
              ) : stage === "checking" ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Checking your file…
                </>
              ) : (
                <>
                  Submit for verification <ArrowRight className="size-4" />
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </section>
  );
}

function ResultCard({ r }: { r: Result }) {
  if (r.status === "verified") {
    return (
      <div className="mb-6 rounded-2xl border border-moss/40 bg-accent/30 p-5 shadow-xs">
        <div className="flex items-center gap-2 font-display text-lg font-semibold text-forest">
          <CheckCircle2 className="size-5 text-brand" /> Approved — {POINTS_PER_VERIFIED_UPLOAD}{" "}
          {POINTS_NAME} awarded!
        </div>
        <p className="mt-1 text-sm text-foreground/90">
          We confirmed this file matches your course. You also earn +{POINTS_PER_VIEW} {POINTS_NAME}{" "}
          on every view and +{POINTS_PER_DOWNLOAD} {POINTS_NAME} on every download.
        </p>
      </div>
    );
  }
  if (r.status === "rejected") {
    return (
      <div className="mb-6 rounded-2xl border border-rose-300 bg-rose-50 p-5 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-display text-lg font-semibold text-rose-800">
            <XCircle className="size-5 text-rose-600" /> File Not Verified
          </div>
          <span className="rounded-full bg-rose-200 px-2.5 py-0.5 text-xs font-semibold text-rose-800">
            Rejected
          </span>
        </div>
        <p className="mt-2 text-sm text-rose-950">
          {r.notes ?? "The file did not match the stated course."}
        </p>
        <p className="mt-1 text-xs text-rose-700">
          Think this was a mistake? You can lodge an appeal from your Materials tab.
        </p>
      </div>
    );
  }
  return (
    <div className="mb-6 rounded-2xl border border-brass bg-brass-soft p-5 shadow-xs">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 font-display text-lg font-semibold text-brass-ink">
          <Clock className="size-5 text-brass-ink" /> Pending Audit & Verification
        </div>
        <span className="rounded-full bg-brass px-2.5 py-0.5 text-xs font-semibold text-brass-ink">
          In Review
        </span>
      </div>
      <p className="mt-2 text-sm text-brass-ink">
        Your file has been safely uploaded and queued for automated audit and admin review. You can
        check the live status of your file and track verification progress in your{" "}
        <b>My Materials</b> tab!
      </p>
    </div>
  );
}
