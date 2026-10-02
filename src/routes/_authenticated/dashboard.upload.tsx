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
import { supabase } from "@/integrations/supabase/client";
import { ACCEPTED_FILES, courseOptions, institutionOptions, LEVELS, MATERIAL_TYPES, MAX_FILE_BYTES, POINTS_PER_PAGE } from "@/lib/constants";
import { useProfile } from "@/lib/profile";
import { verifyMaterial } from "@/lib/verify.functions";

export const Route = createFileRoute("/_authenticated/dashboard/upload")({
  head: () => ({ meta: [{ title: "Upload material — Syllaboss" }, { name: "description", content: "Upload study materials and earn points per page." }] }),
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
    if (profile?.suspended) { toast.error("Your account is suspended. Contact support."); return; }
    if (title.trim().length < 3 || !course || !inst || !file) { toast.error("Fill in the title, course, school and pick a file"); return; }
    if (file.size > MAX_FILE_BYTES) { toast.error("File is larger than 20MB"); return; }
    if (!ACCEPTED_FILES.split(",").includes(file.type)) { toast.error("Upload a PDF or an image (PNG, JPG, WEBP)"); return; }

    setResult(null);
    setStage("uploading");
    const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-80);
    const path = `${user.id}/${crypto.randomUUID()}-${safe}`;
    const up = await supabase.storage.from("materials").upload(path, file, { contentType: file.type });
    if (up.error) { setStage("idle"); { toast.error(up.error.message); return; } }

    const { data: row, error } = await supabase
      .from("materials")
      .insert({
        user_id: user.id, title: title.trim(), course_code: code.trim() || null, course: course.label, institution: inst.label,
        level, material_type: type, description: desc.trim() || null, file_path: path, file_name: file.name, mime_type: file.type, file_size: file.size,
      })
      .select("id")
      .single();
    if (error || !row) { await supabase.storage.from("materials").remove([path]); setStage("idle"); { toast.error(error?.message ?? "Upload failed"); return; } }

    setStage("checking");
    try {
      const r = await verifyMaterial({ data: { materialId: row.id } });
      setResult(r);
      if (r.status === "verified") toast.success("Verified! Points added to your wallet.");
    } catch (err) {
      setResult({ status: "pending", score: null, notes: "We couldn't finish the automatic check. An admin will review it.", pages: 0 });
      console.error(err);
    }
    setStage("idle");
    qc.invalidateQueries({ queryKey: ["profile"] });
    qc.invalidateQueries({ queryKey: ["my-materials"] });
    setTitle(""); setCode(""); setDesc(""); setFile(null);
  }

  const busy = stage !== "idle";

  return (
    <div className="max-w-3xl">
      <PageHeader eyebrow={`Earn ${POINTS_PER_PAGE} points per page`} title="Upload a material" />

      <div className="mb-6 flex gap-3 rounded-xl border border-border bg-secondary p-4 text-sm">
        <ShieldCheck className="size-5 shrink-0 text-primary" />
        <p className="text-muted-foreground">Every file is checked automatically to confirm it matches the title, course and type you enter. Matching files are approved and you get <b className="text-foreground">{POINTS_PER_PAGE} points per page</b> (up to 500 per file). Unclear files go to an admin.</p>
      </div>

      {result && <ResultCard r={result} />}

      <form onSubmit={onSubmit} className="space-y-5 rounded-xl border border-border bg-card p-5 sm:p-7">
        <div className="grid gap-4 sm:grid-cols-[1fr_180px]">
          <div className="space-y-2"><Label htmlFor="t">Title</Label><Input id="t" maxLength={120} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Introduction to Calculus — Lecture notes week 1-4" /></div>
          <div className="space-y-2"><Label htmlFor="c">Course code</Label><Input id="c" maxLength={20} value={code} onChange={(e) => setCode(e.target.value)} placeholder="MTH 101" /></div>
        </div>
        <SearchSelect id="u-course" label="Course" placeholder="Search course" options={courseOptions} value={course} onChange={setCourse} />
        <SearchSelect id="u-inst" label="Institution" placeholder="Search school" options={institutionOptions} value={inst} onChange={setInst} />
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="lv">Level</Label>
            <select id="lv" value={level} onChange={(e) => setLevel(e.target.value)} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm">{LEVELS.map((l) => <option key={l}>{l}</option>)}</select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="ty">Material type</Label>
            <select id="ty" value={type} onChange={(e) => setType(e.target.value)} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm">{MATERIAL_TYPES.map((l) => <option key={l}>{l}</option>)}</select>
          </div>
        </div>
        <div className="space-y-2"><Label htmlFor="d">Short description (optional)</Label><Textarea id="d" maxLength={500} value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Topics covered, lecturer, session…" /></div>
        <label htmlFor="f" className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-border p-8 text-center transition hover:border-primary">
          <FileUp className="size-8 text-primary" />
          <span className="text-sm font-medium">{file ? file.name : "Choose a PDF or image"}</span>
          <span className="text-xs text-muted-foreground">{file ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : "Max 20MB"}</span>
          <input id="f" type="file" accept={ACCEPTED_FILES} className="sr-only" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        </label>
        <Button type="submit" disabled={busy} className="h-12 w-full rounded-full">
          {busy && <Loader2 className="animate-spin" />}
          {stage === "uploading" ? "Uploading…" : stage === "checking" ? "Checking your file…" : "Upload & verify"}
        </Button>
      </form>
    </div>
  );
}

function ResultCard({ r }: { r: Result }) {
  const Icon = r.status === "verified" ? CheckCircle2 : r.status === "rejected" ? XCircle : Clock;
  const tone = r.status === "verified" ? "border-primary bg-primary/5" : r.status === "rejected" ? "border-destructive bg-destructive/5" : "border-accent bg-accent/10";
  return (
    <div className={`mb-6 rounded-xl border p-5 ${tone}`}>
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 size-5 shrink-0" />
        <div>
          <p className="font-semibold capitalize">{r.status === "pending" ? "Sent for admin review" : r.status}</p>
          <p className="mt-1 text-sm text-muted-foreground">{r.notes}</p>
          <p className="mt-2 text-xs text-muted-foreground">{r.pages} page(s){r.score !== null ? ` · match score ${r.score}/100` : ""}</p>
          <Link to="/dashboard/materials" className="mt-2 inline-block text-sm text-primary">See all my uploads</Link>
        </div>
      </div>
    </div>
  );
}
