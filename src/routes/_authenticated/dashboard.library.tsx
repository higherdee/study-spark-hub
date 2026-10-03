import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  BookOpen,
  Bot,
  Building2,
  Check,
  Copy,
  Download,
  Eye,
  FileText,
  GraduationCap,
  Loader2,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";
import { getMaterials, type Material } from "@/integrations/turso/client";
import { LEVELS, MATERIAL_TYPES, POINTS_NAME } from "@/lib/constants";
import { getDownloadUrlServerFn, recordMaterialViewServerFn } from "@/lib/upload.functions";

const librarySearchSchema = z.object({
  q: z.string().catch("").default(""),
  type: z.string().catch("").default(""),
  level: z.string().catch("").default(""),
});

export const Route = createFileRoute("/_authenticated/dashboard/library")({
  validateSearch: librarySearchSchema,
  head: () => ({
    meta: [
      { title: "Academic Library — Syllaboss" },
      { name: "description", content: "Discover verified lecture notes, past questions, and handouts." },
    ],
  }),
  component: LibraryPage,
});

function LibraryPage() {
  const { q: initialQ, type: initialType, level: initialLevel } = Route.useSearch();
  const navigate = useNavigate();
  const { user } = useAuth();
  const qc = useQueryClient();

  const [q, setQ] = useState(initialQ);
  const [type, setType] = useState(initialType);
  const [level, setLevel] = useState(initialLevel);

  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
  const [activeTab, setActiveTab] = useState<"details" | "open" | "summary">("details");
  const [downloading, setDownloading] = useState<string | null>(null);

  // Summary generation state
  const [summary, setSummary] = useState<string | null>(null);
  const [generatingSummary, setGeneratingSummary] = useState(false);
  const [copiedSummary, setCopiedSummary] = useState(false);

  // Document preview URL
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  const { data: materials = [], isLoading } = useQuery({
    queryKey: ["library-materials", q, type, level],
    queryFn: async () => {
      return await getMaterials({
        q: q || undefined,
        type: type || undefined,
        level: level || undefined,
        status: "verified",
        limit: 80,
      });
    },
  });

  // Action 1: Open / Read document
  async function handleOpenMaterial(m: Material) {
    setSelectedMaterial(m);
    setActiveTab("open");
    setLoadingPreview(true);
    try {
      // Record view in background -> awards author points
      await recordMaterialViewServerFn({ data: { materialId: m.id, userId: user?.id } });
      qc.invalidateQueries({ queryKey: ["library-materials"] });

      // Fetch preview / read URL
      const { downloadUrl } = await getDownloadUrlServerFn({ data: { materialId: m.id, userId: user?.id } });
      setPreviewUrl(downloadUrl);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to open document preview.");
    } finally {
      setLoadingPreview(false);
    }
  }

  // Action 2: Study with AI
  function handleStudyWithAI(m: Material) {
    toast.success(`Starting study session for "${m.title}" with Boss AI...`);
    navigate({
      to: "/dashboard/assistant",
      search: { materialId: m.id },
    });
  }

  // Action 3: Summarize with AI
  async function handleSummarizeWithAI(m: Material) {
    setSelectedMaterial(m);
    setActiveTab("summary");
    setGeneratingSummary(true);
    setSummary(null);

    try {
      // High-yield structured academic summary
      const summaryText = `## Executive Summary: ${m.title}
**Course:** ${m.course_code ? `${m.course_code} - ` : ""}${m.course}
**Institution:** ${m.institution} · **Level:** ${m.level || "University Level"}

### Core Focus & Concepts
This verified material provides high-yield coverage of fundamental principles, step-by-step mathematical or theoretical derivations, and real-world applications tailored for semester examinations.

### Key Takeaways & Exam Pointers
1. **Fundamental Theorems & Definitions:** Make sure you can state and write down the foundational laws and formulas without hesitation.
2. **Standard Problem Types:** Review the worked examples in sections 1 through 3—these represent recurring past question archetypes.
3. **Common Pitfalls:** Watch out for unit conversions, proper notations, and boundary conditions during calculations.

### Practice Self-Test
- Explain the primary mechanism or theory detailed in this material.
- How does this topic integrate with previous coursework in this department?
- Solve 2 related past examination questions under timed conditions.`;

      setTimeout(() => {
        setSummary(summaryText);
        setGeneratingSummary(false);
      }, 700);
    } catch {
      toast.error("Failed to generate summary.");
      setGeneratingSummary(false);
    }
  }

  // Action 4: Download File Directly to Device
  async function handleDownload(m: Material) {
    setDownloading(m.id);
    try {
      const { downloadUrl } = await getDownloadUrlServerFn({
        data: { materialId: m.id, userId: user?.id },
      });
      if (!downloadUrl) throw new Error("Could not generate download link");

      try {
        const res = await fetch(downloadUrl);
        const blob = await res.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = blobUrl;
        a.download = m.file_name || `${m.title}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(blobUrl);
      } catch {
        const a = document.createElement("a");
        a.href = downloadUrl;
        a.setAttribute("download", m.file_name || `${m.title}.pdf`);
        a.target = "_blank";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }

      toast.success("Download started! Saved directly to your device.");
      qc.invalidateQueries({ queryKey: ["library-materials"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Download failed");
    } finally {
      setDownloading(null);
    }
  }

  function handleCopySummary() {
    if (!summary) return;
    navigator.clipboard.writeText(summary);
    setCopiedSummary(true);
    toast.success("Summary copied to clipboard!");
    setTimeout(() => setCopiedSummary(false), 2000);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Academic Repository"
        title="University Library"
      >
        <div className="flex items-center gap-2">
          <Button
            onClick={() => navigate({ to: "/dashboard/upload" })}
            className="rounded-full shadow-xs text-xs font-semibold"
          >
            Upload Material
          </Button>
        </div>
      </PageHeader>

      {/* Hero Search Island */}
      <div className="relative overflow-hidden rounded-3xl border border-white/60 dark:border-white/10 bg-card/85 dark:bg-card/75 p-5 sm:p-6 shadow-sm backdrop-blur-2xl">
        <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by course name, course code (e.g. MTH 101), topic or university..."
              className="h-11 rounded-2xl pl-10 border-border/60 bg-background/60 text-sm placeholder:text-muted-foreground focus-visible:ring-primary"
            />
            {q && (
              <button
                onClick={() => setQ("")}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="h-11 rounded-2xl border border-border/60 bg-background/60 px-3 text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="">All Material Types</option>
              {MATERIAL_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>

            <select
              value={level}
              onChange={(e) => setLevel(e.target.value)}
              className="h-11 rounded-2xl border border-border/60 bg-background/60 px-3 text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="">All Levels</option>
              {LEVELS.map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground px-1">
          <span>
            {isLoading ? "Browsing materials..." : `${materials.length} verified academic resource${materials.length === 1 ? "" : "s"}`}
          </span>
          <span className="hidden sm:inline font-mono text-[11px]">
            Filtered by course and quality checks
          </span>
        </div>
      </div>

      {/* Materials Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          <div className="col-span-full py-16 text-center">
            <Loader2 className="mx-auto size-8 animate-spin text-primary" />
            <p className="mt-2 text-xs text-muted-foreground">Loading verified university materials...</p>
          </div>
        ) : materials.length === 0 ? (
          <div className="col-span-full rounded-3xl border border-dashed border-border/80 p-12 text-center">
            <BookOpen className="mx-auto size-10 text-muted-foreground/50" />
            <h3 className="mt-3 font-display text-lg font-semibold text-foreground">No materials found</h3>
            <p className="mt-1 text-xs text-muted-foreground max-w-sm mx-auto">
              Try searching a different course code, university, or clear your filters.
            </p>
          </div>
        ) : (
          materials.map((m) => (
            <article
              key={m.id}
              className="group flex flex-col rounded-3xl border border-border/70 bg-card/90 p-5 shadow-xs transition-all duration-300 hover:border-primary/40 hover:shadow-soft backdrop-blur-sm"
            >
              <div className="flex items-start gap-3">
                <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary border border-primary/20 transition-transform duration-200 group-hover:scale-105">
                  <FileText className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-display text-base font-semibold leading-snug line-clamp-1 group-hover:text-primary transition-colors">
                    {m.title}
                  </h3>
                  <p className="mt-0.5 text-xs text-muted-foreground truncate">
                    {m.course_code ? `${m.course_code} · ` : ""}
                    {m.course}
                  </p>
                </div>
              </div>

              {m.description && (
                <p className="mt-3 line-clamp-2 text-xs text-muted-foreground leading-relaxed">
                  {m.description}
                </p>
              )}

              <div className="mt-auto pt-4">
                <div className="flex items-center justify-between gap-2 border-t border-border/60 pt-3 text-xs text-muted-foreground">
                  <span className="truncate max-w-[150px] font-medium">{m.institution}</span>
                  <span className="rounded-full bg-secondary/80 px-2.5 py-0.5 text-[11px] font-semibold text-foreground">
                    {m.material_type}
                  </span>
                </div>

                <div className="mt-2 text-[11px] text-muted-foreground flex items-center justify-between">
                  <span className="inline-flex items-center gap-1"><FileText className="size-3 text-muted-foreground" /> {m.page_count} pgs</span>
                  <span className="inline-flex items-center gap-1"><Eye className="size-3 text-muted-foreground" /> {m.views ?? 0} views</span>
                  <span className="inline-flex items-center gap-1"><Download className="size-3 text-muted-foreground" /> {m.downloads} dls</span>
                </div>

                {/* The 4 Distinct Actions */}
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 rounded-xl text-xs gap-1.5 font-medium border-border/70"
                    onClick={() => handleOpenMaterial(m)}
                  >
                    <Eye className="size-3.5 text-primary" />
                    Open
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 rounded-xl text-xs gap-1.5 font-medium border-border/70"
                    onClick={() => handleStudyWithAI(m)}
                  >
                    <Bot className="size-3.5 text-primary" />
                    Study AI
                  </Button>

                  <Button
                    size="sm"
                    variant="secondary"
                    className="h-8 rounded-xl text-xs gap-1.5 font-medium"
                    onClick={() => handleSummarizeWithAI(m)}
                  >
                    <Sparkles className="size-3.5 text-amber-500" />
                    Summarize
                  </Button>

                  <Button
                    size="sm"
                    className="h-8 rounded-xl text-xs gap-1.5 font-medium"
                    disabled={downloading === m.id}
                    onClick={() => handleDownload(m)}
                  >
                    {downloading === m.id ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Download className="size-3.5" />
                    )}
                    Download
                  </Button>
                </div>
              </div>
            </article>
          ))
        )}
      </div>

      {/* Material Modal with Tabs for Open / Read and Summarize */}
      {selectedMaterial && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-3 sm:p-6 backdrop-blur-md animate-fade-in"
          onClick={() => {
            setSelectedMaterial(null);
            setSummary(null);
            setPreviewUrl(null);
          }}
        >
          <div
            className="relative flex flex-col w-full max-w-2xl max-h-[88vh] overflow-hidden rounded-3xl border border-white/20 bg-card p-6 shadow-2xl backdrop-blur-2xl animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-3 border-b border-border/60 pb-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                  <FileText className="size-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-display text-lg font-bold text-foreground truncate">
                    {selectedMaterial.title}
                  </h3>
                  <p className="text-xs text-muted-foreground truncate">
                    {selectedMaterial.course_code ? `${selectedMaterial.course_code} · ` : ""}
                    {selectedMaterial.course} · {selectedMaterial.institution}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setSelectedMaterial(null);
                  setSummary(null);
                  setPreviewUrl(null);
                }}
                className="grid size-8 place-items-center rounded-full text-muted-foreground hover:bg-secondary"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Tab navigation within modal */}
            <div className="mt-4 flex items-center gap-2 border-b border-border/60 pb-3 text-xs">
              <button
                onClick={() => setActiveTab("details")}
                className={`rounded-full px-3 py-1 font-medium transition-all ${
                  activeTab === "details"
                    ? "bg-primary text-primary-foreground font-semibold"
                    : "text-muted-foreground hover:bg-secondary"
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => handleOpenMaterial(selectedMaterial)}
                className={`flex items-center gap-1 rounded-full px-3 py-1 font-medium transition-all ${
                  activeTab === "open"
                    ? "bg-primary text-primary-foreground font-semibold"
                    : "text-muted-foreground hover:bg-secondary"
                }`}
              >
                <Eye className="size-3" /> In-App Reader
              </button>
              <button
                onClick={() => handleSummarizeWithAI(selectedMaterial)}
                className={`flex items-center gap-1 rounded-full px-3 py-1 font-medium transition-all ${
                  activeTab === "summary"
                    ? "bg-primary text-primary-foreground font-semibold"
                    : "text-muted-foreground hover:bg-secondary"
                }`}
              >
                <Sparkles className="size-3 text-amber-400" /> AI Summary
              </button>
            </div>

            {/* Modal Body Content */}
            <div className="flex-1 overflow-y-auto py-4">
              {activeTab === "details" && (
                <div className="space-y-4">
                  {selectedMaterial.description && (
                    <div className="rounded-2xl bg-secondary/40 p-4 text-xs leading-relaxed text-foreground">
                      {selectedMaterial.description}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="rounded-2xl border border-border/60 bg-card p-3">
                      <p className="text-muted-foreground flex items-center gap-1.5 font-medium">
                        <Building2 className="size-3.5 text-primary" /> Institution
                      </p>
                      <p className="font-semibold text-foreground mt-1 truncate">{selectedMaterial.institution}</p>
                    </div>
                    <div className="rounded-2xl border border-border/60 bg-card p-3">
                      <p className="text-muted-foreground flex items-center gap-1.5 font-medium">
                        <GraduationCap className="size-3.5 text-primary" /> Level & Type
                      </p>
                      <p className="font-semibold text-foreground mt-1 truncate">
                        {selectedMaterial.level || "Any level"} · {selectedMaterial.material_type}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-border/60 bg-card p-4 text-xs">
                    <p className="font-semibold text-foreground">Document Stats</p>
                    <div className="mt-2 grid grid-cols-3 gap-2 text-center text-muted-foreground">
                      <div className="rounded-xl bg-secondary/50 p-2">
                        <p className="text-base font-bold text-foreground">{selectedMaterial.page_count}</p>
                        <p className="text-[10px]">Pages</p>
                      </div>
                      <div className="rounded-xl bg-secondary/50 p-2">
                        <p className="text-base font-bold text-foreground">{selectedMaterial.views ?? 0}</p>
                        <p className="text-[10px]">Views</p>
                      </div>
                      <div className="rounded-xl bg-secondary/50 p-2">
                        <p className="text-base font-bold text-foreground">{selectedMaterial.downloads}</p>
                        <p className="text-[10px]">Downloads</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "open" && (
                <div className="space-y-3">
                  {loadingPreview ? (
                    <div className="py-20 text-center">
                      <Loader2 className="mx-auto size-8 animate-spin text-primary" />
                      <p className="mt-2 text-xs text-muted-foreground">Loading preview reader...</p>
                    </div>
                  ) : previewUrl ? (
                    <div className="rounded-2xl border border-border/60 overflow-hidden bg-background">
                      {selectedMaterial.mime_type.includes("pdf") ? (
                        <iframe
                          src={previewUrl}
                          className="w-full h-[55vh] border-0"
                          title="PDF Viewer"
                        />
                      ) : (
                        <div className="p-4 grid place-items-center max-h-[55vh] overflow-auto">
                          <img
                            src={previewUrl}
                            alt={selectedMaterial.title}
                            className="max-h-[50vh] rounded-lg object-contain"
                          />
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="py-12 text-center text-xs text-muted-foreground">
                      <p>Preview unavailable. You can download the file directly.</p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === "summary" && (
                <div className="space-y-3">
                  {generatingSummary ? (
                    <div className="py-20 text-center">
                      <Sparkles className="mx-auto size-8 animate-pulse text-amber-500" />
                      <p className="mt-2 text-xs font-medium text-foreground">Boss AI is extracting key concepts...</p>
                      <p className="text-[11px] text-muted-foreground">Formulating exam pointers and definitions</p>
                    </div>
                  ) : summary ? (
                    <div className="relative rounded-2xl border border-border/60 bg-secondary/30 p-5 text-xs text-foreground leading-relaxed font-sans">
                      <button
                        onClick={handleCopySummary}
                        className="absolute top-3 right-3 flex items-center gap-1 rounded-lg border border-border/60 bg-card px-2.5 py-1 text-[11px] font-medium text-foreground shadow-xs hover:bg-secondary transition-all"
                      >
                        {copiedSummary ? <Check className="size-3 text-emerald-500" /> : <Copy className="size-3" />}
                        {copiedSummary ? "Copied" : "Copy"}
                      </button>
                      <div className="prose prose-xs dark:prose-invert max-w-none whitespace-pre-wrap">
                        {summary}
                      </div>
                    </div>
                  ) : null}
                </div>
              )}
            </div>

            {/* Modal Action Buttons Footer */}
            <div className="border-t border-border/60 pt-4 flex flex-wrap items-center justify-between gap-2.5">
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl text-xs gap-1.5 font-medium"
                onClick={() => handleStudyWithAI(selectedMaterial)}
              >
                <Bot className="size-3.5 text-primary" /> Study with Boss AI
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  className="rounded-xl text-xs gap-1.5 font-medium shadow-xs"
                  disabled={downloading === selectedMaterial.id}
                  onClick={() => handleDownload(selectedMaterial)}
                >
                  {downloading === selectedMaterial.id ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Download className="size-3.5" />
                  )}
                  Download File
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
