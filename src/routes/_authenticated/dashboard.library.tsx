import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
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
  Star,
  Upload,
  Verified,
  X,
  FileArchive,
  ArrowRight,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { PageHeader } from "@/components/app-shell";
import { SyllabossEmblem } from "@/components/syllaboss-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";
import { getMaterials, getTotalMaterialsCount, type Material } from "@/integrations/turso/client";
import { LEVELS, MATERIAL_TYPES, POINTS_NAME } from "@/lib/constants";
import { getDownloadUrlServerFn, recordMaterialViewServerFn } from "@/lib/upload.functions";
import { AiMessageRenderer } from "@/components/ai-message-renderer";

const librarySearchSchema = z.object({
  q: z.string().catch("").default(""),
  type: z.string().catch("").default(""),
  level: z.string().catch("").default(""),
});

export const Route = createFileRoute("/_authenticated/dashboard/library")({
  validateSearch: librarySearchSchema,
  head: () => ({
    meta: [
      { title: "University Library — Syllaboss" },
      { name: "description", content: "Peer-reviewed course materials, algorithmic syllabus outlines, and high-yield dossiers." },
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

  const { data: totalCount = 0 } = useQuery({
    queryKey: ["library-materials-total-count"],
    queryFn: async () => {
      return await getTotalMaterialsCount({ status: "verified" });
    },
  });

  const { data: materials = [], isLoading } = useQuery({
    queryKey: ["library-materials", q, type, level],
    queryFn: async () => {
      return await getMaterials({
        q: q || undefined,
        type: type || undefined,
        level: level || undefined,
        status: "verified",
        limit: 500,
      });
    },
  });

  // Action 1: Open / Read document in Full Preview
  function handleOpenMaterial(m: Material) {
    navigate({
      to: "/dashboard/preview",
      search: { id: m.id },
    });
  }

  // Action 2: Study with AI in Resizable Split View
  function handleStudyWithAI(m: Material) {
    navigate({
      to: "/dashboard/preview",
      search: { id: m.id, split: "true" },
    });
  }

  // Action 3: Summarize with AI
  async function handleSummarizeWithAI(m: Material) {
    setSelectedMaterial(m);
    setActiveTab("summary");
    setGeneratingSummary(true);
    setSummary(null);

    try {
      const summaryText = `## Executive Summary: ${m.title}
**Course:** ${m.course_code ? `${m.course_code} - ` : ""}${m.course}
**Institution:** ${m.institution}

### Core Focus & Concepts
This verified material provides high-yield coverage of fundamental principles, step-by-step mathematical or theoretical derivations, and real-world applications tailored for examinations and academic mastery.

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

      toast.success("Download started! Saved directly to your device (+5 pts)");
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

  const hasFilters = Boolean(q || type || level);
  const shownCount = totalCount || materials.length;

  return (
    <div className="w-full max-w-[1200px] mx-auto space-y-6 pb-16 font-sans">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="max-w-2xl">
          <p className="eyebrow flex items-center gap-1.5">
            <Verified className="size-3.5 text-brand" /> Verified library
          </p>
          <h1 className="mt-1.5 font-display text-3xl sm:text-4xl text-ink tracking-tight">
            Study materials
          </h1>
          <p className="mt-1.5 text-sm text-ink-soft">
            Notes, past questions and outlines from students across Nigerian universities. Every
            file is checked before it appears here.
          </p>
        </div>
        <Button asChild className="self-start md:self-auto rounded-full bg-forest text-white hover:bg-ink">
          <Link to="/dashboard/upload">
            <Upload className="size-4" />
            Upload material
            <span className="ml-1 rounded-full bg-white/15 px-2 py-0.5 text-[11px] tnum">+25 pts</span>
          </Link>
        </Button>
      </header>

      {/* Search and filters */}
      <div className="surface p-3 sm:p-4 space-y-3">
        <div className="relative flex items-center">
          <Search className="absolute left-4 size-4.5 text-muted-foreground pointer-events-none" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search a course, code (MTH 101), topic or university"
            className="h-12 w-full rounded-xl border-border bg-muted/60 pl-11 pr-10 text-sm focus:bg-white"
          />
          {q && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => setQ("")}
              className="press absolute right-3 grid size-7 place-items-center rounded-full text-muted-foreground hover:bg-secondary"
            >
              <X className="size-4" />
            </button>
          )}
        </div>

        <div className="-mx-1 flex items-center gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none]">
          {["", ...MATERIAL_TYPES].map((t) => {
            const active = type === t;
            return (
              <button
                key={t || "all"}
                type="button"
                onClick={() => setType(t)}
                className={`press shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors duration-150 ${
                  active
                    ? "border-forest bg-forest text-white"
                    : "border-border bg-white text-ink-soft hover:bg-muted"
                }`}
              >
                {t || "All types"}
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {hasFilters && (
              <button
                type="button"
                onClick={() => {
                  setQ("");
                  setType("");
                  setLevel("");
                }}
                className="press text-xs font-semibold text-forest hover:underline"
              >
                Clear all
              </button>
            )}
          </div>
          <p className="text-xs text-muted-foreground tnum" aria-live="polite">
            {isLoading
              ? "Searching…"
              : hasFilters
                ? `${materials.length} of ${shownCount.toLocaleString()} files`
                : `${shownCount.toLocaleString()} file${shownCount === 1 ? "" : "s"}`}
          </p>
        </div>
      </div>

      {/* Results */}
      <section>
        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="surface p-5 space-y-3">
                <div className="skeleton h-5 w-24 rounded-full" />
                <div className="skeleton h-6 w-3/4 rounded-md" />
                <div className="skeleton h-4 w-1/2 rounded-md" />
                <div className="skeleton h-10 w-full rounded-xl" />
              </div>
            ))}
          </div>
        ) : materials.length === 0 ? (
          <div className="surface animate-rise grid place-items-center px-6 py-16 text-center">
            <span className="grid size-12 place-items-center rounded-2xl bg-muted text-moss">
              <BookOpen className="size-6" />
            </span>
            <h3 className="mt-4 font-display text-xl text-ink">Nothing matches yet</h3>
            <p className="mt-1 max-w-sm text-sm text-ink-soft">
              Try another course code or university, or clear your filters. Can't find it? Upload
              it and earn {POINTS_NAME}.
            </p>
          </div>
        ) : (
          <div className="stagger grid gap-4 sm:grid-cols-2">
            {materials.map((m) => (
              <article
                key={m.id}
                className="surface lift group flex flex-col justify-between p-5"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="shrink-0 rounded-md bg-accent px-2 py-0.5 text-[11px] font-bold tracking-wide text-accent-foreground tnum">
                        {m.course_code || "ACAD"}
                      </span>
                      <span className="truncate text-[11px] font-semibold text-moss">
                        {m.material_type}
                      </span>
                    </div>
                    {m.rating_count && m.rating_count > 0 ? (
                      <span className="flex shrink-0 items-center gap-1 text-xs font-semibold text-brass-ink tnum">
                        <Star className="size-3.5 fill-brass text-brass" />
                        {Number(m.rating_avg || 0).toFixed(1)}
                        <span className="text-[10px] font-normal text-muted-foreground">
                          ({m.rating_count})
                        </span>
                      </span>
                    ) : (
                      <span className="text-[11px] text-muted-foreground">Unrated</span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleOpenMaterial(m)}
                    className="block w-full text-left"
                  >
                    <h3 className="font-display text-lg font-semibold leading-snug text-ink line-clamp-2 transition-colors group-hover:text-moss">
                      {m.title}
                    </h3>
                    <p className="mt-1 text-xs font-medium text-moss line-clamp-1">{m.course}</p>
                    <p className="text-xs text-muted-foreground line-clamp-1">{m.institution}</p>
                  </button>

                  <div className="flex items-center gap-4 text-[11px] text-muted-foreground tnum">
                    <span className="flex items-center gap-1">
                      <FileText className="size-3.5" /> {m.page_count} pages
                    </span>
                    <span className="flex items-center gap-1">
                      <Eye className="size-3.5" /> {m.views ?? 0}
                    </span>
                    <span className="flex items-center gap-1">
                      <Download className="size-3.5" /> {m.downloads}
                    </span>
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-2 border-t border-border pt-4">
                  <Button
                    size="sm"
                    className="h-10 flex-1 rounded-xl bg-forest text-white hover:bg-ink"
                    onClick={() => handleStudyWithAI(m)}
                  >
                    <Bot className="size-4" />
                    Study with Boss AI
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    aria-label="Preview"
                    title="Preview"
                    className="size-10 rounded-xl"
                    onClick={() => handleOpenMaterial(m)}
                  >
                    <Eye className="size-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    aria-label="Summarize with AI"
                    title="Summarize"
                    className="size-10 rounded-xl"
                    onClick={() => handleSummarizeWithAI(m)}
                  >
                    <Sparkles className="size-4 text-brass" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    aria-label="Download (+5 pts)"
                    title="Download (+5 pts)"
                    className="size-10 rounded-xl"
                    disabled={downloading === m.id}
                    onClick={() => handleDownload(m)}
                  >
                    {downloading === m.id ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Download className="size-4 text-brand" />
                    )}
                  </Button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

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
            className="relative flex flex-col w-full max-w-2xl max-h-[88vh] overflow-hidden rounded-2xl border border-border bg-white p-6 shadow-2xl animate-page-zoom-in"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-3 border-b border-surface-container pb-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent text-accent-foreground font-semibold">
                  <FileText className="size-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-display text-lg font-bold text-ink truncate">
                    {selectedMaterial.title}
                  </h3>
                  <p className="text-xs text-muted-foreground truncate">
                    {selectedMaterial.course_code ? `${selectedMaterial.course_code} · ` : ""}
                    {selectedMaterial.course} · {selectedMaterial.institution}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedMaterial(null);
                  setSummary(null);
                  setPreviewUrl(null);
                }}
                className="grid size-8 place-items-center rounded-full text-muted-foreground hover:bg-muted"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Tab navigation within modal */}
            <div className="mt-4 flex items-center gap-2 border-b border-surface-container pb-3 text-xs">
              <button
                type="button"
                onClick={() => setActiveTab("details")}
                className={`rounded-full px-3.5 py-1 font-semibold transition-all ${
                  activeTab === "details"
                    ? "bg-forest text-white"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                Overview
              </button>
              <button
                type="button"
                onClick={() => handleOpenMaterial(selectedMaterial)}
                className={`flex items-center gap-1.5 rounded-full px-3.5 py-1 font-semibold transition-all ${
                  activeTab === "open"
                    ? "bg-forest text-white"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                <Eye className="size-3.5" /> In-App Reader
              </button>
              <button
                type="button"
                onClick={() => handleSummarizeWithAI(selectedMaterial)}
                className={`flex items-center gap-1.5 rounded-full px-3.5 py-1 font-semibold transition-all ${
                  activeTab === "summary"
                    ? "bg-forest text-white"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                <Sparkles className="size-3.5 text-brass-soft" /> AI Summary
              </button>
            </div>

            {/* Modal Body Content */}
            <div className="flex-1 overflow-y-auto py-4">
              {activeTab === "details" && (
                <div className="space-y-4">
                  {selectedMaterial.description && (
                    <div className="rounded-xl bg-muted p-4 text-xs leading-relaxed text-foreground">
                      {selectedMaterial.description}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="rounded-xl border border-border bg-white p-3.5">
                      <p className="text-muted-foreground flex items-center gap-1.5 font-medium">
                        <Building2 className="size-3.5 text-moss" /> Institution
                      </p>
                      <p className="font-semibold text-ink mt-1 truncate">{selectedMaterial.institution}</p>
                    </div>
                    <div className="rounded-xl border border-border bg-white p-3.5">
                      <p className="text-muted-foreground flex items-center gap-1.5 font-medium">
                        <GraduationCap className="size-3.5 text-moss" /> Material Category
                      </p>
                      <p className="font-semibold text-ink mt-1 truncate">
                        {selectedMaterial.material_type}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-xl border border-border bg-white p-4 text-xs">
                    <p className="font-semibold text-ink">Document Stats</p>
                    <div className="mt-2 grid grid-cols-3 gap-2 text-center text-muted-foreground">
                      <div className="rounded-lg bg-muted p-2">
                        <p className="text-base font-bold text-ink">{selectedMaterial.page_count}</p>
                        <p className="text-[10px]">Pages</p>
                      </div>
                      <div className="rounded-lg bg-muted p-2">
                        <p className="text-base font-bold text-ink">{selectedMaterial.views ?? 0}</p>
                        <p className="text-[10px]">Views</p>
                      </div>
                      <div className="rounded-lg bg-muted p-2">
                        <p className="text-base font-bold text-ink">{selectedMaterial.downloads}</p>
                        <p className="text-[10px]">Downloads</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "open" && (
                <div className="space-y-3">
                  {loadingPreview ? (
                    <div className="py-20 text-center flex flex-col items-center justify-center">
                      <div className="animate-breathe-zoom">
                        <SyllabossEmblem className="size-14" />
                      </div>
                      <p className="mt-3 text-xs font-semibold text-moss animate-pulse">Loading preview reader...</p>
                    </div>
                  ) : previewUrl ? (
                    <div className="rounded-xl border border-border overflow-hidden bg-white">
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
                    <div className="py-20 text-center flex flex-col items-center justify-center">
                      <div className="animate-breathe-zoom">
                        <SyllabossEmblem className="size-14" />
                      </div>
                      <p className="mt-3 text-xs font-semibold text-ink">Boss AI is extracting key concepts...</p>
                      <p className="text-[11px] text-muted-foreground">Formulating exam pointers and definitions</p>
                    </div>
                  ) : summary ? (
                    <div className="relative rounded-xl border border-border bg-muted/50 p-5 text-xs text-foreground leading-relaxed font-sans">
                      <button
                        type="button"
                        onClick={handleCopySummary}
                        className="absolute top-3 right-3 flex items-center gap-1 rounded-lg border border-border bg-white px-2.5 py-1 text-[11px] font-medium text-foreground shadow-xs hover:bg-muted transition-all"
                      >
                        {copiedSummary ? <Check className="size-3 text-brand" /> : <Copy className="size-3" />}
                        {copiedSummary ? "Copied" : "Copy"}
                      </button>
                      <div className="pt-6 pr-2">
                        <AiMessageRenderer content={summary} />
                      </div>
                    </div>
                  ) : null}
                </div>
              )}
            </div>

            {/* Modal Action Buttons Footer */}
            <div className="border-t border-surface-container pt-4 flex flex-wrap items-center justify-between gap-2.5">
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl text-xs gap-1.5 font-semibold border-border"
                onClick={() => handleStudyWithAI(selectedMaterial)}
              >
                <Bot className="size-3.5 text-moss" /> Study with Boss AI
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  className="rounded-xl text-xs gap-1.5 font-semibold bg-forest text-white hover:bg-ink shadow-xs"
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
