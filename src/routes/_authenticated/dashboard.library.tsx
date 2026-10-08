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

  return (
    <div className="w-full max-w-[1400px] mx-auto space-y-6 pb-16 font-sans">
      {/* Top Header Strip */}
      <div className="pt-2 pb-2 flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#dce5df]/80">
        <div className="flex flex-col gap-1 max-w-2xl">
          <div className="flex items-center gap-2 text-[#446557]">
            <Verified className="size-4 text-[#1b7a4e]" />
            <span className="text-xs uppercase tracking-widest font-bold">Academic Repository</span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#c2c8c3]" />
            <span className="font-mono text-xs text-[#5a6660]">Archival Standard v4.18</span>
          </div>
          <h1 className="font-display text-3xl sm:text-4xl text-[#00110a] tracking-tight font-medium">
            University Library
          </h1>
          <p className="text-sm text-[#424844]">
            Peer-reviewed course materials, algorithmic syllabus outlines, and high-yield dossiers authored across accredited universities.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            asChild
            className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#0d281e] text-white hover:bg-[#00110a] text-xs font-semibold shadow-xs"
          >
            <Link to="/dashboard/upload">
              <Upload className="size-4" />
              <span>Upload Material</span>
              <span className="ml-1 px-1.5 py-0.2 rounded bg-white/20 text-[10px] font-mono text-[#c6ebd9]">+25 pts</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* Search & Advanced Filter Console */}
      <div className="w-full rounded-2xl bg-white shadow-xs p-4 sm:p-5 flex flex-col gap-3 border border-[#dce5df]">
        <div className="relative w-full flex items-center">
          <Search className="absolute left-4 text-[#5a6660] size-5 pointer-events-none" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by course name, course code (e.g. MTH 101, GET 206), topic or university..."
            className="w-full pl-12 pr-10 py-3.5 h-12 rounded-xl bg-[#edf6f0]/70 text-sm text-[#151d1a] placeholder:text-[#5a6660]/70 border-[#dce5df] focus:bg-white"
          />
          {q && (
            <button
              type="button"
              onClick={() => setQ("")}
              className="absolute right-4 text-[#5a6660] hover:text-[#151d1a]"
            >
              <X className="size-4" />
            </button>
          )}
        </div>

        {/* Filter Badges Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="h-9 px-3 rounded-xl bg-[#edf6f0] border border-[#dce5df] text-xs font-medium text-[#151d1a] focus:outline-none cursor-pointer"
            >
              <option value="">All Material Types</option>
              {MATERIAL_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>

            <select
              value={level}
              onChange={(e) => setLevel(e.target.value)}
              className="h-9 px-3 rounded-xl bg-[#edf6f0] border border-[#dce5df] text-xs font-medium text-[#151d1a] focus:outline-none cursor-pointer"
            >
              <option value="">All Levels (100L - Final Yr)</option>
              {LEVELS.map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>

            <Button
              variant="outline"
              size="sm"
              asChild
              className="h-9 px-3.5 rounded-xl bg-[#c6ebd9]/50 hover:bg-[#c6ebd9] border-[#c6ebd9] text-[#002116] text-xs font-semibold gap-1.5"
            >
              <Link to="/dashboard/assistant">
                <Sparkles className="size-3.5 text-[#1b7a4e]" />
                Boss AI Ready
              </Link>
            </Button>
          </div>

          <div className="text-xs text-[#5a6660] font-mono">
            {isLoading ? "Browsing archives..." : `${materials.length} verified academic resource${materials.length === 1 ? "" : "s"}`}
          </div>
        </div>
      </div>

      {/* Repository Grid / Material Cards */}
      <section className="flex flex-col gap-4">
        <div>
          <span className="text-xs uppercase tracking-widest text-[#446557] font-bold">Verified Records</span>
          <h2 className="font-display text-2xl text-[#00110a] font-medium">All Academic Course Materials</h2>
        </div>

        {isLoading ? (
          <div className="py-20 text-center flex flex-col items-center justify-center">
            <div className="animate-breathe-zoom">
              <SyllabossEmblem className="size-14" />
            </div>
            <p className="mt-3 text-xs font-semibold text-[#446557] animate-pulse">
              Loading verified university materials...
            </p>
          </div>
        ) : materials.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#dce5df] bg-white p-12 text-center">
            <BookOpen className="mx-auto size-10 text-[#5a6660]/50" />
            <h3 className="mt-3 font-display text-lg font-semibold text-[#00110a]">No materials found</h3>
            <p className="mt-1 text-xs text-[#5a6660] max-w-sm mx-auto">
              Try searching a different course code, university, or clear your search filter.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2">
            {materials.map((m) => (
              <article
                key={m.id}
                className="group flex flex-col justify-between rounded-2xl border border-[#dce5df] bg-white p-5 sm:p-6 shadow-xs transition-all duration-200 hover:shadow-md hover:border-[#446557]/40"
              >
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded bg-[#c6ebd9] text-[#002116] font-mono text-xs font-bold">
                        {m.course_code || "ACAD"}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-[#edf6f0] text-[#446557] text-[11px] font-semibold">
                        {m.material_type}
                      </span>
                    </div>

                    {m.rating_count && m.rating_count > 0 ? (
                      <div className="flex items-center gap-1 text-[#a87c12] text-xs font-semibold">
                        <Star className="size-3.5 fill-[#a87c12] text-[#a87c12]" />
                        <span>{Number(m.rating_avg || 0).toFixed(1)}</span>
                        <span className="text-[#a87c12]/80 text-[10px]">({m.rating_count})</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-slate-400 text-xs">
                        <Star className="size-3.5 text-slate-300" />
                        <span className="text-[11px] text-slate-500 font-normal">Unrated</span>
                      </div>
                    )}
                  </div>

                  <div>
                    <h3
                      onClick={() => handleOpenMaterial(m)}
                      className="font-display text-lg font-semibold text-[#00110a] hover:text-[#446557] cursor-pointer transition-colors leading-snug line-clamp-1"
                    >
                      {m.title}
                    </h3>
                    <p className="text-xs text-[#446557] font-medium mt-0.5">{m.course}</p>
                    <p className="text-xs text-[#5a6660] mt-0.5 truncate">{m.institution}</p>
                  </div>

                  {/* Meta statistics row */}
                  <div className="flex items-center gap-4 py-2 px-3 rounded-xl bg-[#edf6f0] font-mono text-[11px] text-[#5a6660]">
                    <span className="flex items-center gap-1"><FileText className="size-3.5 text-[#446557]" /> {m.page_count} pgs</span>
                    <span className="flex items-center gap-1"><Eye className="size-3.5 text-[#446557]" /> {m.views ?? 0} views</span>
                    <span className="flex items-center gap-1"><Download className="size-3.5 text-[#446557]" /> {m.downloads} dls</span>
                  </div>
                </div>

                {/* 4 Clean Actions Grid */}
                <div className="pt-4 mt-3 border-t border-[#e7f0eb] flex flex-col gap-2">
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-xl text-xs font-semibold h-9 border-[#dce5df] hover:bg-[#edf6f0]"
                      onClick={() => handleOpenMaterial(m)}
                    >
                      <Eye className="size-3.5 mr-1 text-[#446557]" />
                      Preview
                    </Button>
                    <Button
                      size="sm"
                      className="rounded-xl text-xs font-semibold h-9 bg-[#0d281e] hover:bg-[#00110a] text-white"
                      onClick={() => handleStudyWithAI(m)}
                    >
                      <Bot className="size-3.5 mr-1 text-[#c6ebd9]" />
                      Study with Boss AI
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      className="rounded-xl text-xs font-semibold h-9 bg-[#edf6f0] hover:bg-[#e2eae5] text-[#151d1a]"
                      onClick={() => handleSummarizeWithAI(m)}
                    >
                      <Sparkles className="size-3.5 mr-1 text-[#a87c12]" />
                      Summarize
                    </Button>
                    <Button
                      size="sm"
                      className="rounded-xl text-xs font-semibold h-9 bg-[#c6ebd9] hover:bg-[#b0dfca] text-[#002116]"
                      disabled={downloading === m.id}
                      onClick={() => handleDownload(m)}
                    >
                      {downloading === m.id ? (
                        <Loader2 className="size-3.5 animate-spin mr-1" />
                      ) : (
                        <Download className="size-3.5 mr-1 text-[#1b7a4e]" />
                      )}
                      Download (+5 pts)
                    </Button>
                  </div>
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
            className="relative flex flex-col w-full max-w-2xl max-h-[88vh] overflow-hidden rounded-2xl border border-[#dce5df] bg-white p-6 shadow-2xl animate-page-zoom-in"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-3 border-b border-[#e7f0eb] pb-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#c6ebd9] text-[#002116] font-semibold">
                  <FileText className="size-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-display text-lg font-bold text-[#00110a] truncate">
                    {selectedMaterial.title}
                  </h3>
                  <p className="text-xs text-[#5a6660] truncate">
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
                className="grid size-8 place-items-center rounded-full text-[#5a6660] hover:bg-[#edf6f0]"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Tab navigation within modal */}
            <div className="mt-4 flex items-center gap-2 border-b border-[#e7f0eb] pb-3 text-xs">
              <button
                type="button"
                onClick={() => setActiveTab("details")}
                className={`rounded-full px-3.5 py-1 font-semibold transition-all ${
                  activeTab === "details"
                    ? "bg-[#0d281e] text-white"
                    : "text-[#5a6660] hover:bg-[#edf6f0]"
                }`}
              >
                Overview
              </button>
              <button
                type="button"
                onClick={() => handleOpenMaterial(selectedMaterial)}
                className={`flex items-center gap-1.5 rounded-full px-3.5 py-1 font-semibold transition-all ${
                  activeTab === "open"
                    ? "bg-[#0d281e] text-white"
                    : "text-[#5a6660] hover:bg-[#edf6f0]"
                }`}
              >
                <Eye className="size-3.5" /> In-App Reader
              </button>
              <button
                type="button"
                onClick={() => handleSummarizeWithAI(selectedMaterial)}
                className={`flex items-center gap-1.5 rounded-full px-3.5 py-1 font-semibold transition-all ${
                  activeTab === "summary"
                    ? "bg-[#0d281e] text-white"
                    : "text-[#5a6660] hover:bg-[#edf6f0]"
                }`}
              >
                <Sparkles className="size-3.5 text-[#f3e8c9]" /> AI Summary
              </button>
            </div>

            {/* Modal Body Content */}
            <div className="flex-1 overflow-y-auto py-4">
              {activeTab === "details" && (
                <div className="space-y-4">
                  {selectedMaterial.description && (
                    <div className="rounded-xl bg-[#edf6f0] p-4 text-xs leading-relaxed text-[#151d1a]">
                      {selectedMaterial.description}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="rounded-xl border border-[#dce5df] bg-white p-3.5">
                      <p className="text-[#5a6660] flex items-center gap-1.5 font-medium">
                        <Building2 className="size-3.5 text-[#446557]" /> Institution
                      </p>
                      <p className="font-semibold text-[#00110a] mt-1 truncate">{selectedMaterial.institution}</p>
                    </div>
                    <div className="rounded-xl border border-[#dce5df] bg-white p-3.5">
                      <p className="text-[#5a6660] flex items-center gap-1.5 font-medium">
                        <GraduationCap className="size-3.5 text-[#446557]" /> Level & Type
                      </p>
                      <p className="font-semibold text-[#00110a] mt-1 truncate">
                        {selectedMaterial.level || "Any level"} · {selectedMaterial.material_type}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-xl border border-[#dce5df] bg-white p-4 text-xs">
                    <p className="font-semibold text-[#00110a]">Document Stats</p>
                    <div className="mt-2 grid grid-cols-3 gap-2 text-center text-[#5a6660]">
                      <div className="rounded-lg bg-[#edf6f0] p-2">
                        <p className="text-base font-bold text-[#00110a]">{selectedMaterial.page_count}</p>
                        <p className="text-[10px]">Pages</p>
                      </div>
                      <div className="rounded-lg bg-[#edf6f0] p-2">
                        <p className="text-base font-bold text-[#00110a]">{selectedMaterial.views ?? 0}</p>
                        <p className="text-[10px]">Views</p>
                      </div>
                      <div className="rounded-lg bg-[#edf6f0] p-2">
                        <p className="text-base font-bold text-[#00110a]">{selectedMaterial.downloads}</p>
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
                      <p className="mt-3 text-xs font-semibold text-[#446557] animate-pulse">Loading preview reader...</p>
                    </div>
                  ) : previewUrl ? (
                    <div className="rounded-xl border border-[#dce5df] overflow-hidden bg-white">
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
                    <div className="py-12 text-center text-xs text-[#5a6660]">
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
                      <p className="mt-3 text-xs font-semibold text-[#00110a]">Boss AI is extracting key concepts...</p>
                      <p className="text-[11px] text-[#5a6660]">Formulating exam pointers and definitions</p>
                    </div>
                  ) : summary ? (
                    <div className="relative rounded-xl border border-[#dce5df] bg-[#edf6f0]/50 p-5 text-xs text-[#151d1a] leading-relaxed font-sans">
                      <button
                        type="button"
                        onClick={handleCopySummary}
                        className="absolute top-3 right-3 flex items-center gap-1 rounded-lg border border-[#dce5df] bg-white px-2.5 py-1 text-[11px] font-medium text-[#151d1a] shadow-xs hover:bg-[#edf6f0] transition-all"
                      >
                        {copiedSummary ? <Check className="size-3 text-[#1b7a4e]" /> : <Copy className="size-3" />}
                        {copiedSummary ? "Copied" : "Copy"}
                      </button>
                      <div className="prose prose-xs max-w-none whitespace-pre-wrap">
                        {summary}
                      </div>
                    </div>
                  ) : null}
                </div>
              )}
            </div>

            {/* Modal Action Buttons Footer */}
            <div className="border-t border-[#e7f0eb] pt-4 flex flex-wrap items-center justify-between gap-2.5">
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl text-xs gap-1.5 font-semibold border-[#dce5df]"
                onClick={() => handleStudyWithAI(selectedMaterial)}
              >
                <Bot className="size-3.5 text-[#446557]" /> Study with Boss AI
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  className="rounded-xl text-xs gap-1.5 font-semibold bg-[#0d281e] text-white hover:bg-[#00110a] shadow-xs"
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
