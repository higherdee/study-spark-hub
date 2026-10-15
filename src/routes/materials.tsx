import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Download, Eye, FileText, Loader2, X, Sparkles, BookOpen, GraduationCap, Building2, Star } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { MaterialSearchBar } from "@/components/material-search-bar";
import { SyllabossLogo } from "@/components/syllaboss-logo";
import { Button } from "@/components/ui/button";
import { UserMenu } from "@/components/user-menu";
import { useAuth } from "@/hooks/use-auth";
import { getMaterials, type Material } from "@/integrations/turso/client";
import { LEVELS, MATERIAL_TYPES, POINTS_NAME } from "@/lib/constants";
import { getDownloadUrlServerFn, recordMaterialViewServerFn } from "@/lib/upload.functions";

const searchSchema = z.object({
  q: z.string().catch("").default(""),
  type: z.string().catch("").default(""),
  level: z.string().catch("").default(""),
});

export const Route = createFileRoute("/materials")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Search study materials — Syllaboss" },
      { name: "description", content: "Find verified lecture notes, past questions and handouts shared by students." },
      { property: "og:title", content: "Search study materials — Syllaboss" },
      { property: "og:description", content: "Verified notes and past questions from students across Nigerian universities." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MaterialsPage,
});

function MaterialsPage() {
  const { q, type, level } = Route.useSearch();
  const navigate = useNavigate({ from: "/materials" });
  const { user } = useAuth();
  const qc = useQueryClient();
  const [downloading, setDownloading] = useState<string | null>(null);
  const [previewMaterial, setPreviewMaterial] = useState<Material | null>(null);

  const { data = [], isLoading } = useQuery({
    queryKey: ["search-materials", q, type, level],
    queryFn: async () => {
      return await getMaterials({
        q: q || undefined,
        type: type || undefined,
        level: level || undefined,
        status: "verified",
        limit: 60,
      });
    },
  });

  async function openPreview(m: Material) {
    if (user) {
      navigate({ to: "/dashboard/preview", search: { id: m.id } });
      return;
    }
    setPreviewMaterial(m);
    try {
      await recordMaterialViewServerFn({ data: { materialId: m.id, userId: user?.id } });
      qc.invalidateQueries({ queryKey: ["search-materials"] });
    } catch (e) {
      console.warn("View record failed", e);
    }
  }

  async function download(id: string) {
    if (!user) {
      toast("Create a free account to download");
      navigate({ to: "/auth", search: { mode: "signup" } });
      return;
    }
    setDownloading(id);
    try {
      const { downloadUrl } = await getDownloadUrlServerFn({ data: { materialId: id } });
      if (!downloadUrl) throw new Error("Could not generate download link");
      window.location.href = downloadUrl;
      toast.success("Download started! Uploader earned +5 SyllaPoints.");
      qc.invalidateQueries({ queryKey: ["search-materials"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Download failed");
    } finally {
      setDownloading(null);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <SyllabossLogo />
          <UserMenu />
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <h1 className="font-display text-4xl font-semibold">Find study materials</h1>
        <p className="mt-2 text-muted-foreground">Every file here was checked to match its course and title.</p>
        <MaterialSearchBar key={q} initial={q} className="mt-6" />
        <div className="mt-4 flex flex-wrap gap-3">
          <select
            value={type}
            onChange={(e) => navigate({ search: (s) => ({ ...s, type: e.target.value }) })}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            aria-label="Material type"
          >
            <option value="">All types</option>
            {MATERIAL_TYPES.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
          <select
            value={level}
            onChange={(e) => navigate({ search: (s) => ({ ...s, level: e.target.value }) })}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            aria-label="Level"
          >
            <option value="">All levels</option>
            {LEVELS.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </div>

        <p className="mt-8 text-sm text-muted-foreground">
          {isLoading ? "Searching…" : `${data.length} result${data.length === 1 ? "" : "s"}${q ? ` for “${q}”` : ""}`}
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((m) => (
            <article
              key={m.id}
              className="group flex flex-col rounded-2xl border border-border/70 bg-card p-5 shadow-xs transition-all hover:border-primary/40 hover:shadow-soft"
            >
              <div className="flex items-start gap-3 cursor-pointer" onClick={() => openPreview(m)}>
                <div className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary shrink-0 transition-transform group-hover:scale-105">
                  <FileText className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="font-display text-lg font-semibold leading-tight line-clamp-1 group-hover:text-primary transition-colors">
                    {m.title}
                  </h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {m.course_code ? `${m.course_code} · ` : ""}
                    {m.course}
                  </p>
                </div>
              </div>
              {m.description && <p className="mt-3 line-clamp-2 text-xs text-muted-foreground">{m.description}</p>}
              <div className="mt-auto pt-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3 text-xs text-muted-foreground">
                  <span className="truncate max-w-[140px]">{m.institution}</span>
                  <div className="flex items-center gap-1.5">
                    <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium">{m.material_type}</span>
                    {m.rating_count && m.rating_count > 0 ? (
                      <span className="flex items-center gap-1 text-brass text-xs font-semibold">
                        <Star className="size-3.5 fill-brass text-brass" />
                        <span>{Number(m.rating_avg || 0).toFixed(1)}</span>
                        <span className="text-brass/80 text-[10px]">({m.rating_count})</span>
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-slate-400 text-xs">
                        <Star className="size-3.5 text-slate-300" />
                        <span className="text-[10px] text-muted-foreground">Unrated</span>
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-3 px-3 py-1 rounded-full bg-muted border border-border text-[11px] text-moss font-medium font-mono">
                    <span className="flex items-center gap-1"><FileText className="size-3 text-brand" /> {m.page_count} pgs</span>
                    <span className="flex items-center gap-1"><Eye className="size-3 text-brand" /> {m.views ?? 0} views</span>
                    <span className="flex items-center gap-1"><Download className="size-3 text-brand" /> {m.downloads ?? 0} dls</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="size-8 p-0 rounded-full"
                      onClick={() => openPreview(m)}
                      title="Preview material"
                    >
                      <Eye className="size-4" />
                    </Button>
                    <Button
                      size="sm"
                      className="gap-1.5 rounded-full text-xs h-8 px-3 bg-forest text-white hover:bg-ink"
                      disabled={downloading === m.id}
                      onClick={() => download(m.id)}
                    >
                      {downloading === m.id ? <Loader2 className="animate-spin size-3.5" /> : <Download className="size-3.5" />}
                      Download
                    </Button>
                  </div>
                </div>
              </div>
            </article>

          ))}
        </div>

        {!isLoading && data.length === 0 && (
          <div className="mt-8 rounded-3xl border border-dashed border-border bg-card p-10 text-center space-y-4">
            <BookOpen className="size-10 text-muted-foreground/60 mx-auto" />
            <h3 className="font-display text-lg font-bold text-foreground">
              {q ? `No materials found matching "${q}"` : "Explore Verified Academic Courses"}
            </h3>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              Looking for standardized lecture summaries and syllabus breakdowns? Explore our National Curriculum directory or try a common course code.
            </p>
            <div className="pt-2 flex flex-wrap justify-center gap-2">
              <Button asChild size="sm" className="rounded-full bg-primary text-primary-foreground text-xs font-semibold">
                <Link to="/curriculum">
                  <span>Browse NUC CCMAS Curriculum</span>
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm" className="rounded-full text-xs font-semibold">
                <Link to="/materials" search={{ q: "GST", type: "", level: "" }}>
                  <span>General Studies (GST)</span>
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm" className="rounded-full text-xs font-semibold">
                <Link to="/materials" search={{ q: "MTH", type: "", level: "" }}>
                  <span>Mathematics (MTH)</span>
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm" className="rounded-full text-xs font-semibold">
                <Link to="/materials" search={{ q: "CSC", type: "", level: "" }}>
                  <span>Computer Science (CSC)</span>
                </Link>
              </Button>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border/80 bg-card py-10 mt-16 text-center text-xs text-muted-foreground">
        <div className="mx-auto max-w-5xl px-4 flex flex-wrap justify-center gap-6 mb-3">
          <Link to="/privacy" className="hover:text-foreground">Privacy Policy</Link>
          <Link to="/terms" className="hover:text-foreground">Terms of Service</Link>
          <Link to="/about" className="hover:text-foreground">About Us</Link>
          <Link to="/contact" className="hover:text-foreground">Contact Us</Link>
          <Link to="/curriculum" className="hover:text-foreground">Academic Curriculum</Link>
        </div>
        <p>© 2026 Syllaboss Technologies. All rights reserved.</p>
      </footer>

      {/* iOS Liquid Glass Material Preview Drawer / Modal */}
      {previewMaterial && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-foreground/30 p-4 backdrop-blur-md animate-fade-in"
          onClick={() => setPreviewMaterial(null)}
        >
          <div
            className="w-full max-w-lg rounded-3xl border border-white/40 dark:border-white/10 bg-card/90 p-6 sm:p-7 shadow-2xl backdrop-blur-2xl transition-all animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary border border-primary/20">
                  <FileText className="size-6" />
                </div>
                <div>
                  <h3 className="font-display text-xl font-bold leading-tight text-foreground">
                    {previewMaterial.title}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {previewMaterial.course_code ? `${previewMaterial.course_code} · ` : ""}
                    {previewMaterial.course}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full size-8"
                onClick={() => setPreviewMaterial(null)}
              >
                <X className="size-4" />
              </Button>
            </div>

            {previewMaterial.description && (
              <div className="mt-4 rounded-xl bg-secondary/50 p-3.5 text-xs leading-relaxed text-foreground">
                {previewMaterial.description}
              </div>
            )}

            <div className="mt-5 grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-xl border border-border/60 bg-background/50 p-3">
                <p className="text-muted-foreground flex items-center gap-1.5">
                  <Building2 className="size-3.5 text-primary" /> Institution
                </p>
                <p className="font-semibold text-foreground mt-1 truncate">{previewMaterial.institution}</p>
              </div>
              <div className="rounded-xl border border-border/60 bg-background/50 p-3">
                <p className="text-muted-foreground flex items-center gap-1.5">
                  <BookOpen className="size-3.5 text-primary" /> Type & Level
                </p>
                <p className="font-semibold text-foreground mt-1 truncate">
                  {previewMaterial.material_type} · {previewMaterial.level || "Any level"}
                </p>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground px-1">
              <span className="inline-flex items-center gap-1.5"><FileText className="size-3.5" /> {previewMaterial.page_count} Pages</span>
              <span className="inline-flex items-center gap-1.5"><Eye className="size-3.5" /> {previewMaterial.views ?? 0} Views</span>
              <span className="inline-flex items-center gap-1.5"><Download className="size-3.5" /> {previewMaterial.downloads} Downloads</span>
            </div>

            <div className="mt-6 flex items-center gap-3">
              <Button
                variant="outline"
                className="flex-1 rounded-xl h-11"
                onClick={() => setPreviewMaterial(null)}
              >
                Close
              </Button>
              <Button
                className="flex-1 rounded-xl h-11 font-medium gap-2 shadow-xs"
                disabled={downloading === previewMaterial.id}
                onClick={() => download(previewMaterial.id)}
              >
                {downloading === previewMaterial.id ? (
                  <Loader2 className="animate-spin size-4" />
                ) : (
                  <Download className="size-4" />
                )}
                Download File
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
