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
      {/* Executive Header Section */}
      <section className="pt-2 pb-2 flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#dce5df]/80">
        <div className="flex flex-col">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="inline-flex items-center justify-center w-2 h-2 rounded-full bg-[#1b7a4e] animate-pulse" />
            <span className="text-xs uppercase tracking-widest text-[#446557] font-semibold">
              Earn {POINTS_PER_VERIFIED_UPLOAD} SyllaPoints Per Verified Upload
            </span>
          </div>
          <h1 className="font-display text-3xl sm:text-4xl text-[#00110a] tracking-tight font-medium">
            Upload Academic Material
          </h1>
          <p className="text-sm text-[#424844] max-w-2xl mt-1">
            Contribute peer-reviewed course reserves, lecture manuscripts, and laboratory archives to the decentralized intellectual repository.
          </p>
        </div>

        {/* Academic Tier Balance Pill */}
        <div className="flex items-center gap-4 p-2.5 px-4 rounded-2xl bg-white shadow-xs border border-[#dce5df]">
          <div className="flex flex-col">
            <span className="text-[10px] text-[#5a6660] uppercase tracking-wider font-semibold">Yield Tier</span>
            <span className="font-display text-sm text-[#00110a] font-bold leading-tight">
              {profile?.sylla_plus ? "SyllaPlus Fellow" : "Scholar Active"}
            </span>
          </div>
          <div className="h-7 w-px bg-[#dce5df]" />
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#c6ebd9] text-[#002116] text-xs font-semibold">
            <Sparkles className="size-3.5 text-[#1b7a4e]" />
            <span>{profile?.sylla_plus ? "+30% Multiplier" : "1.0x Base"}</span>
          </div>
        </div>
      </section>

      {/* Security & Verification Notice Banner */}
      <section>
        <div className="relative overflow-hidden rounded-2xl p-5 bg-[#edf6f0] border border-[#dce5df] shadow-xs">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5 max-w-4xl">
              <div className="w-10 h-10 rounded-xl bg-[#c6ebd9] flex items-center justify-center text-[#002116] shrink-0 mt-0.5 shadow-xs font-semibold">
                <ShieldCheck className="size-5 text-[#1b7a4e]" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-[#00110a] font-bold">Automated Integrity & Semantic OCR Filter</span>
                  <span className="px-2 py-0.5 rounded-full bg-[#c6ebd9] text-[#002116] text-[10px] tracking-widest uppercase font-bold">
                    Protocol v4.2
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-[#424844] mt-1 leading-relaxed">
                  Every file is checked automatically to confirm it matches the title, course, and type you enter. Matching files are approved instantly and you get <strong>{POINTS_PER_VERIFIED_UPLOAD} SyllaPoints</strong> (+{POINTS_PER_VIEW} pts per view, +{POINTS_PER_DOWNLOAD} pts per download). Unclear files go to peer review.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white text-[#151d1a] font-mono text-xs shadow-xs border border-[#dce5df]">
                <span className="inline-block w-2 h-2 rounded-full bg-[#1b7a4e]" />
                <span>Avg. OCR speed: 1.8s</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {result && <ResultCard r={result} />}

      {/* Main Two-Column Hub Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Left Column: Form Fields & Ingestion Area (7 cols on XL) */}
        <div className="xl:col-span-7 flex flex-col gap-4">
          <form onSubmit={onSubmit} className="p-6 rounded-2xl bg-white shadow-xs border border-[#dce5df] flex flex-col gap-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#e7f0eb]">
              <div className="flex items-center gap-2">
                <FileUp className="size-5 text-[#446557]" />
                <h2 className="font-display text-xl text-[#00110a] font-semibold">Metadata Ingestion</h2>
              </div>
              <span className="text-xs uppercase tracking-wider text-[#5a6660] font-semibold">Stage 01 of 02</span>
            </div>

            {/* Material Title Field */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="material-title" className="text-xs uppercase tracking-wider text-[#5a6660] font-semibold flex items-center justify-between">
                <span>Material Title <span className="text-rose-600">*</span></span>
                <span className="font-normal lowercase tracking-normal text-[#5a6660] text-[11px]">e.g. Full semester lecture notes</span>
              </Label>
              <Input
                id="material-title"
                maxLength={120}
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Introduction to Thermodynamics — Lecture notes week 1-4"
                className="rounded-xl bg-[#edf6f0]/50 border-[#dce5df] focus:bg-white text-sm"
              />
            </div>

            {/* Two Sub-Grid Input Row: Course Code & Course Name */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
              <div className="sm:col-span-4 flex flex-col gap-1.5">
                <Label htmlFor="course-code" className="text-xs uppercase tracking-wider text-[#5a6660] font-semibold">
                  Course Code <span className="text-rose-600">*</span>
                </Label>
                <Input
                  id="course-code"
                  maxLength={20}
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="e.g. MTH 101"
                  className="rounded-xl bg-[#edf6f0]/50 border-[#dce5df] focus:bg-white text-sm uppercase font-mono"
                />
              </div>
              <div className="sm:col-span-8 flex flex-col gap-1.5">
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

            {/* Institution Field */}
            <div className="flex flex-col gap-1.5">
              <SearchSelect
                id="u-inst"
                label="Institution"
                placeholder="Search university or polytechnic"
                options={institutionOptions}
                value={inst}
                onChange={setInst}
              />
            </div>

            {/* Level & Material Type Dropdowns */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="l" className="text-xs uppercase tracking-wider text-[#5a6660] font-semibold">
                  Academic Level <span className="text-rose-600">*</span>
                </Label>
                <select
                  id="l"
                  value={level}
                  onChange={(e) => setLevel(e.target.value)}
                  className="flex h-10 w-full rounded-xl border border-[#dce5df] bg-[#edf6f0]/50 px-3 py-2 text-sm focus:outline-none focus:bg-white cursor-pointer"
                >
                  {LEVELS.map((lvl) => (
                    <option key={lvl} value={lvl}>{lvl}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="ty" className="text-xs uppercase tracking-wider text-[#5a6660] font-semibold">
                  Material Type <span className="text-rose-600">*</span>
                </Label>
                <select
                  id="ty"
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="flex h-10 w-full rounded-xl border border-[#dce5df] bg-[#edf6f0]/50 px-3 py-2 text-sm focus:outline-none focus:bg-white cursor-pointer"
                >
                  {MATERIAL_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Description (Optional) */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="desc" className="text-xs uppercase tracking-wider text-[#5a6660] font-semibold flex items-center justify-between">
                <span>Description (optional)</span>
                <span className="font-mono text-[11px] text-[#5a6660]">{desc.length} / 300</span>
              </Label>
              <Textarea
                id="desc"
                maxLength={300}
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                placeholder="Topic overview, lecturer name or semester details..."
                className="rounded-xl bg-[#edf6f0]/50 border-[#dce5df] focus:bg-white text-sm resize-none"
                rows={3}
              />
            </div>

            {/* File Upload Dropzone */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="file-input" className="text-xs uppercase tracking-wider text-[#5a6660] font-semibold flex items-center justify-between">
                <span>Source Artifact Deposit <span className="text-rose-600">*</span></span>
                <span className="text-[#446557] font-semibold text-[11px]">Max 20MB</span>
              </Label>

              <div className="relative group rounded-2xl p-6 sm:p-8 bg-[#edf6f0]/70 hover:bg-[#edf6f0] border-2 border-dashed border-[#dce5df] hover:border-[#446557] transition-all flex flex-col items-center justify-center text-center cursor-pointer">
                <input
                  id="file-input"
                  type="file"
                  accept={ACCEPTED_FILES}
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center text-[#446557] shadow-xs group-hover:scale-110 transition-transform mb-2">
                  <FileUp className="size-6" />
                </div>
                <p className="text-sm font-semibold text-[#00110a]">
                  {file ? file.name : "Drag and drop file here, or click to browse"}
                </p>
                <p className="text-xs text-[#5a6660] mt-0.5">
                  {file ? `${(file.size / (1024 * 1024)).toFixed(1)} MB • Ready for AI verification` : "Accepts PDF or images (PNG, JPG, WEBP)"}
                </p>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-1.5 text-xs text-[#5a6660]">
                <Lock className="size-3.5 text-[#446557]" />
                <span>Cryptographically time-stamped upon ingestion</span>
              </div>
              <Button
                type="submit"
                disabled={busy}
                className="w-full sm:w-auto h-11 px-6 rounded-full bg-[#0d281e] hover:bg-[#00110a] text-white text-xs font-semibold shadow-xs"
              >
                {stage === "uploading" ? (
                  <>
                    <Loader2 className="animate-spin size-4 mr-2" /> Uploading to Cloudflare R2…
                  </>
                ) : stage === "checking" ? (
                  <>
                    <Loader2 className="animate-spin size-4 mr-2" /> Running Semantic AI Audit…
                  </>
                ) : (
                  <>
                    Submit for Instant Verification <ArrowRight className="size-3.5 ml-1.5" />
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>

        {/* Right Column: Live Yield Simulator & Pipeline History (5 cols on XL) */}
        <div className="xl:col-span-5 flex flex-col gap-4">
          {/* Live Earnings & Yield Simulator */}
          <div className="p-6 rounded-2xl bg-white shadow-xs border border-[#dce5df] flex flex-col gap-4">
            <div className="flex items-center justify-between pb-1 border-b border-[#e7f0eb]">
              <div className="flex items-center gap-2">
                <Calculator className="size-4 text-[#446557]" />
                <h3 className="font-display text-lg text-[#00110a] font-semibold">Yield & Royalty Simulator</h3>
              </div>
              <span className="px-2 py-0.5 rounded bg-[#c6ebd9] text-[#002116] font-mono text-[11px] font-semibold">
                Live Model
              </span>
            </div>

            <p className="text-xs text-[#5a6660]">
              Calculate projected monthly returns generated by student citations, library rentals, and perpetual platform endowment dividends.
            </p>

            {/* Projected Value Highlight Box */}
            <div className="p-4 rounded-xl bg-[#edf6f0] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border border-[#dce5df]/60">
              <div className="flex flex-col">
                <span className="text-[10px] uppercase tracking-wider text-[#5a6660] font-semibold">Projected Yield / Month</span>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <span className="font-display text-3xl text-[#00110a] font-bold">
                    {projectedPoints.toLocaleString()}
                  </span>
                  <span className="text-xs text-[#446557] font-semibold">SyllaPoints</span>
                </div>
              </div>
              <div className="h-8 w-px bg-[#dce5df] hidden sm:block" />
              <div className="flex flex-col sm:items-end">
                <span className="text-[10px] uppercase tracking-wider text-[#5a6660] font-semibold">Cash Conversion (NGN)</span>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="font-display text-2xl font-bold text-[#00110a]">
                    {formatNaira(projectedNaira)}
                  </span>
                </div>
              </div>
            </div>

            {/* Slider 1: Estimated Peer Reads / Month */}
            <div className="flex flex-col gap-1.5 pt-1">
              <div className="flex justify-between items-center text-xs">
                <Label htmlFor="reads-slider" className="font-medium text-[#151d1a] flex items-center gap-1.5">
                  <Eye className="size-3.5 text-[#5a6660]" />
                  <span>Estimated Peer Reads / Month</span>
                </Label>
                <span className="px-2 py-0.5 rounded bg-[#e7f0eb] font-mono text-xs font-semibold text-[#00110a]">
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
                className="w-full accent-[#0d281e] h-2 rounded-lg bg-[#e7f0eb] cursor-pointer"
              />
              <div className="flex justify-between text-[11px] font-mono text-[#5a6660]">
                <span>50 reads (+100 pts)</span>
                <span>2,500 reads (+5,000 pts)</span>
              </div>
            </div>

            {/* Slider 2: Estimated Downloads */}
            <div className="flex flex-col gap-1.5 pt-1">
              <div className="flex justify-between items-center text-xs">
                <Label htmlFor="downloads-slider" className="font-medium text-[#151d1a] flex items-center gap-1.5">
                  <Download className="size-3.5 text-[#5a6660]" />
                  <span>Estimated Downloads / Month</span>
                </Label>
                <span className="px-2 py-0.5 rounded bg-[#e7f0eb] font-mono text-xs font-semibold text-[#00110a]">
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
                className="w-full accent-[#0d281e] h-2 rounded-lg bg-[#e7f0eb] cursor-pointer"
              />
              <div className="flex justify-between text-[11px] font-mono text-[#5a6660]">
                <span>10 dl (+50 pts)</span>
                <span>1,000 dl (+5,000 pts)</span>
              </div>
            </div>

            {/* Formula Breakdown Badge */}
            <div className="p-3 rounded-xl bg-[#edf6f0]/60 text-xs text-[#5a6660] flex items-center justify-between border border-[#dce5df]/40">
              <span>25 pts base + (Reads × 2) + (Downloads × 5)</span>
              <span className="font-semibold text-[#446557]">Rate: ₦20 / pt</span>
            </div>
          </div>

          {/* Recent Uploads Pipeline Section */}
          <div className="p-6 rounded-2xl bg-white shadow-xs border border-[#dce5df] flex flex-col gap-3">
            <div className="flex items-center justify-between pb-1 border-b border-[#e7f0eb]">
              <div className="flex items-center gap-2">
                <FileText className="size-4 text-[#446557]" />
                <h3 className="font-display text-lg text-[#00110a] font-semibold">Your Upload Pipeline</h3>
              </div>
              <span className="font-mono text-xs text-[#5a6660]">{myMaterials.length} Uploaded</span>
            </div>

            {myMaterials.length === 0 ? (
              <div className="py-6 text-center text-xs text-[#5a6660]">
                No files uploaded yet. Start by depositing your first syllabus notes!
              </div>
            ) : (
              <div className="flex flex-col gap-2.5">
                {myMaterials.slice(0, 3).map((m) => (
                  <div key={m.id} className="p-3 rounded-xl bg-[#edf6f0]/60 border border-[#dce5df]/50 flex flex-col gap-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-[#00110a] truncate">{m.title}</p>
                        <p className="text-[11px] text-[#5a6660] truncate">{m.course_code ? `${m.course_code} · ` : ""}{m.course}</p>
                      </div>
                      <span className={cn(
                        "px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0",
                        m.status === "verified" ? "bg-[#c6ebd9] text-[#002116]" : "bg-[#f3e8c9] text-[#71540f]"
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
      <div className="mb-6 rounded-2xl border border-[#446557]/40 bg-[#c6ebd9]/30 p-5 shadow-xs">
        <div className="flex items-center gap-2 font-display text-lg font-semibold text-[#0d281e]">
          <CheckCircle2 className="size-5 text-[#1b7a4e]" /> Approved — {POINTS_PER_VERIFIED_UPLOAD} {POINTS_NAME} awarded!
        </div>
        <p className="mt-1 text-sm text-[#151d1a]/90">
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
    <div className="mb-6 rounded-2xl border border-amber-300 bg-amber-50 p-5 shadow-xs">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 font-display text-lg font-semibold text-amber-900">
          <Clock className="size-5 text-amber-700" /> Pending Audit & Verification
        </div>
        <span className="rounded-full bg-amber-200 px-2.5 py-0.5 text-xs font-semibold text-amber-900">
          In Review
        </span>
      </div>
      <p className="mt-2 text-sm text-amber-950">
        Your file has been safely uploaded and queued for automated audit and admin review. You can check the live status of your file and track verification progress in your <b>My Materials</b> tab!
      </p>
    </div>
  );
}
