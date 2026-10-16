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
    <div className="w-full max-w-[1400px] mx-auto space-y-6 pb-16 font-sans">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="max-w-2xl">
          <p className="eyebrow flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-brand" />
            Earn {POINTS_PER_VERIFIED_UPLOAD} SyllaPoints per verified upload
          </p>
          <h1 className="mt-1.5 font-display text-3xl tracking-tight text-ink sm:text-4xl">
            Upload a material
          </h1>
          <p className="mt-1.5 text-sm text-ink-soft">
            Share notes, past questions or lab reports. Each file is checked against the details
            you enter, and approved uploads earn points every time they're viewed or downloaded.
          </p>
        </div>
        <div className="flex items-center gap-3 self-start rounded-2xl border border-border bg-white px-4 py-2.5 shadow-[var(--elev-1)] md:self-auto">
          <div>
            <p className="eyebrow">Earning rate</p>
            <p className="font-display text-sm text-ink">
              {profile?.sylla_plus ? "SyllaPlus" : "Standard"}
            </p>
          </div>
          <span className="flex items-center gap-1.5 rounded-full bg-brass-soft px-3 py-1 text-xs font-semibold text-brass-ink tnum">
            <Sparkles className="size-3.5" />
            {profile?.sylla_plus ? "1.3x" : "1.0x"}
          </span>
        </div>
      </header>

      <section className="flex items-start gap-3 rounded-2xl border border-border bg-muted/60 p-4">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand/15 text-brand">
          <ShieldCheck className="size-4.5" />
        </span>
        <p className="text-sm text-ink-soft">
          <strong className="font-semibold text-ink">How it works.</strong> Matching files are
          approved instantly and you get <strong>{POINTS_PER_VERIFIED_UPLOAD} SyllaPoints</strong>{" "}
          (+{POINTS_PER_VIEW} per view, +{POINTS_PER_DOWNLOAD} per download). Unclear files go to
          peer review.
        </p>
      </section>

      {result && <ResultCard r={result} />}

      {/* Main Two-Column Hub Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Left Column: Form Fields & Ingestion Area (7 cols on XL) */}
        <div className="xl:col-span-7 flex flex-col gap-4">
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
              <Label htmlFor="desc" className="flex items-center justify-between text-xs font-semibold text-ink-soft">
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
              <Label htmlFor="file-input" className="flex items-center justify-between text-xs font-semibold text-ink-soft">
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

        {/* Right Column: Live Yield Simulator & Pipeline History (5 cols on XL) */}
        <div className="xl:col-span-5 flex flex-col gap-4">
          {/* Live Earnings & Yield Simulator */}
          <div className="p-6 rounded-2xl bg-white shadow-xs border border-border flex flex-col gap-4">
            <div className="flex items-center justify-between pb-1 border-b border-surface-container">
              <div className="flex items-center gap-2">
                <Calculator className="size-4 text-moss" />
                <h3 className="font-display text-lg text-ink font-semibold">Yield & Royalty Simulator</h3>
              </div>
              <span className="px-2 py-0.5 rounded bg-accent text-accent-foreground font-mono text-[11px] font-semibold">
                Live Model
              </span>
            </div>

            <p className="text-xs text-muted-foreground">
              Calculate projected monthly returns generated by student citations, library rentals, and perpetual platform endowment dividends.
            </p>

            {/* Projected Value Highlight Box */}
            <div className="p-4 rounded-xl bg-muted flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border border-border/60">
              <div className="flex flex-col">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Projected Yield / Month</span>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <span className="font-display text-3xl text-ink font-bold">
                    {projectedPoints.toLocaleString()}
                  </span>
                  <span className="text-xs text-moss font-semibold">SyllaPoints</span>
                </div>
              </div>
              <div className="h-8 w-px bg-border hidden sm:block" />
              <div className="flex flex-col sm:items-end">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Cash Conversion (NGN)</span>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="font-display text-2xl font-bold text-ink">
                    {formatNaira(projectedNaira)}
                  </span>
                </div>
              </div>
            </div>

            {/* Slider 1: Estimated Peer Reads / Month */}
            <div className="flex flex-col gap-1.5 pt-1">
              <div className="flex justify-between items-center text-xs">
                <Label htmlFor="reads-slider" className="font-medium text-foreground flex items-center gap-1.5">
                  <Eye className="size-3.5 text-muted-foreground" />
                  <span>Estimated Peer Reads / Month</span>
                </Label>
                <span className="px-2 py-0.5 rounded bg-surface-container font-mono text-xs font-semibold text-ink">
                  {reads.toLocaleString()} views
                </span>
              </div>
              <input
                id="reads-slider"
                type="range"
                min="50"
                max="2500"
                step="25"
                value={reads}
                onChange={(e) => setReads(parseInt(e.target.value, 10))}
                className="w-full accent-forest h-2 rounded-lg bg-surface-container cursor-pointer"
              />
              <div className="flex justify-between text-[11px] font-mono text-muted-foreground">
                <span>50 reads (+100 pts)</span>
                <span>2,500 reads (+5,000 pts)</span>
              </div>
            </div>

            {/* Slider 2: Estimated Downloads */}
            <div className="flex flex-col gap-1.5 pt-1">
              <div className="flex justify-between items-center text-xs">
                <Label htmlFor="downloads-slider" className="font-medium text-foreground flex items-center gap-1.5">
                  <Download className="size-3.5 text-muted-foreground" />
                  <span>Estimated Downloads / Month</span>
                </Label>
                <span className="px-2 py-0.5 rounded bg-surface-container font-mono text-xs font-semibold text-ink">
                  {downloads.toLocaleString()} dls
                </span>
              </div>
              <input
                id="downloads-slider"
                type="range"
                min="10"
                max="1000"
                step="10"
                value={downloads}
                onChange={(e) => setDownloads(parseInt(e.target.value, 10))}
                className="w-full accent-forest h-2 rounded-lg bg-surface-container cursor-pointer"
              />
              <div className="flex justify-between text-[11px] font-mono text-muted-foreground">
                <span>10 dl (+50 pts)</span>
                <span>1,000 dl (+5,000 pts)</span>
              </div>
            </div>

            {/* Formula Breakdown Badge */}
            <div className="p-3 rounded-xl bg-muted/60 text-xs text-muted-foreground flex items-center justify-between border border-border/40">
              <span>25 pts base + (Reads × 2) + (Downloads × 5)</span>
              <span className="font-semibold text-moss">Rate: ₦20 / pt</span>
            </div>
          </div>

          {/* Recent Uploads Pipeline Section */}
          <div className="p-6 rounded-2xl bg-white shadow-xs border border-border flex flex-col gap-3">
            <div className="flex items-center justify-between pb-1 border-b border-surface-container">
              <div className="flex items-center gap-2">
                <FileText className="size-4 text-moss" />
                <h3 className="font-display text-lg text-ink font-semibold">Your Upload Pipeline</h3>
              </div>
              <span className="font-mono text-xs text-muted-foreground">{myMaterials.length} Uploaded</span>
            </div>

            {myMaterials.length === 0 ? (
              <div className="py-6 text-center text-xs text-muted-foreground">
                No files uploaded yet. Start by depositing your first syllabus notes!
              </div>
            ) : (
              <div className="flex flex-col gap-2.5">
                {myMaterials.slice(0, 3).map((m) => (
                  <div key={m.id} className="p-3 rounded-xl bg-muted/60 border border-border/50 flex flex-col gap-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-ink truncate">{m.title}</p>
                        <p className="text-[11px] text-muted-foreground truncate">{m.course_code ? `${m.course_code} · ` : ""}{m.course}</p>
                      </div>
                      <span className={cn(
                        "px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0",
                        m.status === "verified" ? "bg-accent text-accent-foreground" : "bg-brass-soft text-brass-ink"
                      )}>
                        {m.status === "verified" ? "Verified" : "Pending Audit"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ResultCard({ r }: { r: Result }) {
  if (r.status === "verified") {
    return (
      <div className="mb-6 rounded-2xl border border-moss/40 bg-accent/30 p-5 shadow-xs">
        <div className="flex items-center gap-2 font-display text-lg font-semibold text-forest">
          <CheckCircle2 className="size-5 text-brand" /> Approved — {POINTS_PER_VERIFIED_UPLOAD} {POINTS_NAME} awarded!
        </div>
        <p className="mt-1 text-sm text-foreground/90">
          We confirmed this file matches your course. You also earn +{POINTS_PER_VIEW} {POINTS_NAME} on every view and +{POINTS_PER_DOWNLOAD} {POINTS_NAME} on every download.
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
        <p className="mt-2 text-sm text-rose-950">{r.notes ?? "The file did not match the stated course."}</p>
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
        Your file has been safely uploaded and queued for automated audit and admin review. You can check the live status of your file and track verification progress in your <b>My Materials</b> tab!
      </p>
    </div>
  );
}
