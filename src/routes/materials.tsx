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
      { name: "description", content: "Find verified lecture notes, past questions and handouts shared by students globally." },
      { property: "og:title", content: "Search study materials — Syllaboss" },
      { property: "og:description", content: "Verified notes and past questions from students across global universities." },
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
      await recordMaterialViewServerFn({ data: { materialId: m.id } });
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
      toast.success("Download started. The contributor may earn a reward for an eligible first download.");
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
        <div>
          <p className="eyebrow">Academic Repository</p>
          <h1 className="mt-1 font-display text-3xl sm:text-4xl font-medium tracking-tight text-ink">
            University Study Repository
          </h1>
          <p className="mt-1.5 text-xs sm:text-sm text-muted-foreground">
            Verified course notes, past questions, and lecture handouts authenticated for Nigerian campuses.
          </p>
        </div>

        <MaterialSearchBar key={q} initial={q} className="mt-6" />

        <div className="mt-4 flex flex-wrap gap-2.5">
          <select
            value={type}
            onChange={(e) => navigate({ search: (s) => ({ ...s, type: e.target.value }) })}
            className="h-9 rounded-full border border-border bg-card px-3.5 text-xs font-semibold text-ink focus:outline-hidden press"
            aria-label="Material type"
          >
            <option value="">All Document Types</option>
            {MATERIAL_TYPES.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </div>

        <p className="mt-8 text-xs text-muted-foreground font-medium">
          {isLoading ? "Consulting repository…" : `${data.length} document${data.length === 1 ? "" : "s"}${q ? ` matching “${q}”` : ""}`}
        </p>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((m) => (
            <article
              key={m.id}
              className="group flex flex-col rounded-3xl border border-border bg-card p-5 shadow-xs transition-all hover:border-forest/40 hover:shadow-soft lift press"
            >
              <div className="flex items-start gap-3.5 cursor-pointer" onClick={() => openPreview(m)}>
                <div className="grid size-10 place-items-center rounded-xl bg-forest/10 text-forest shrink-0 transition-transform group-hover:scale-105 border border-forest/20">
                  <FileText className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="font-display text-base font-semibold leading-snug line-clamp-1 group-hover:text-forest transition-colors text-ink">
                    {m.title}
                  </h2>
                  <p className="mt-1 text-xs text-muted-foreground truncate">
                    {m.course_code ? `${m.course_code} · ` : ""}
                    {m.course}
                  </p>
                </div>
              </div>

              {m.description && (
                <p className="mt-2.5 line-clamp-2 text-xs text-muted-foreground leading-relaxed">
                  {m.description}
                </p>
              )}

              <div className="mt-auto pt-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/80 pt-3 text-xs text-muted-foreground">
                  <span className="truncate max-w-[140px] font-medium text-ink-soft">{m.institution}</span>
                  <div className="flex items-center gap-1.5">
                    <span className="rounded-full bg-surface-container px-2.5 py-0.5 text-[10px] font-semibold text-ink-soft">
                      {m.material_type}
                    </span>
                    {m.rating_count && m.rating_count > 0 ? (
                      <span className="flex items-center gap-1 text-brass text-xs font-semibold">
                        <Star className="size-3.5 fill-brass text-brass" />
                        <span className="tnum font-mono">{Number(m.rating_avg || 0).toFixed(1)}</span>
                        <span className="text-brass-ink text-[10px]">({m.rating_count})</span>
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-muted-foreground text-xs">
                        <Star className="size-3.5 text-border" />
                        <span className="text-[10px] text-muted-foreground">Unrated</span>
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-3 px-3 py-1 rounded-full bg-surface-container-low border border-border text-[11px] text-ink-soft font-mono tnum">
                    <span className="flex items-center gap-1"><FileText className="size-3 text-forest" /> {m.page_count} pgs</span>
                    <span className="flex items-center gap-1"><Eye className="size-3 text-forest" /> {m.views ?? 0}</span>
                    <span className="flex items-center gap-1"><Download className="size-3 text-forest" /> {m.downloads ?? 0}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="size-8 p-0 rounded-full hover:bg-surface-container"
                      onClick={() => openPreview(m)}
                      title="Preview material"
                    >
                      <Eye className="size-4 text-ink-soft" />
                    </Button>
                    <Button
                      size="sm"
                      className="gap-1.5 rounded-full text-xs h-8 px-3.5 bg-forest text-white hover:bg-forest/90 font-semibold press shadow-xs"
                      disabled={downloading === m.id}
                      onClick={() => download(m.id)}
                    >
                      {downloading === m.id ? (
                        <Loader2 className="animate-spin size-3.5" />
                      ) : (
                        <Download className="size-3.5" />
                      )}
                      <span>Download</span>
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

      {/* Scholar Material Preview Drawer / Modal */}
      {previewMaterial && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-ink/40 p-4 backdrop-blur-xs animate-fade-in"
          onClick={() => setPreviewMaterial(null)}
        >
          <div
            className="w-full max-w-lg rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-2xl transition-all animate-scale-in text-ink"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3.5">
                <div className="grid size-12 place-items-center rounded-2xl bg-forest/10 text-forest border border-forest/20 shrink-0">
                  <FileText className="size-6" />
                </div>
                <div>
                  <h3 className="font-display text-lg sm:text-xl font-medium leading-tight text-ink">
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
                className="rounded-full size-8 hover:bg-surface-container"
                onClick={() => setPreviewMaterial(null)}
              >
                <X className="size-4" />
              </Button>
            </div>

            {previewMaterial.description && (
              <div className="mt-4 rounded-2xl bg-surface-container-low border border-border p-3.5 text-xs leading-relaxed text-ink-soft">
                {previewMaterial.description}
              </div>
            )}

            <div className="mt-5 grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-2xl border border-border bg-surface-container-low p-3.5">
                <p className="eyebrow flex items-center gap-1.5">
                  <Building2 className="size-3.5 text-forest" /> Institution
                </p>
                <p className="font-medium text-ink mt-1 truncate">{previewMaterial.institution}</p>
              </div>
              <div className="rounded-2xl border border-border bg-surface-container-low p-3.5">
                <p className="eyebrow flex items-center gap-1.5">
                  <BookOpen className="size-3.5 text-forest" /> Classification
                </p>
                <p className="font-medium text-ink mt-1 truncate">
                  {previewMaterial.material_type} · {previewMaterial.level || "All levels"}
                </p>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground px-1 font-mono tnum">
              <span className="inline-flex items-center gap-1.5"><FileText className="size-3.5 text-forest" /> {previewMaterial.page_count} Pages</span>
              <span className="inline-flex items-center gap-1.5"><Eye className="size-3.5 text-forest" /> {previewMaterial.views ?? 0} Views</span>
              <span className="inline-flex items-center gap-1.5"><Download className="size-3.5 text-forest" /> {previewMaterial.downloads} Downloads</span>
            </div>

            <div className="mt-6 flex items-center gap-3">
              <Button
                variant="outline"
                className="flex-1 rounded-full h-10 border-border text-xs font-semibold press"
                onClick={() => setPreviewMaterial(null)}
              >
                Close
              </Button>
              <Button
                className="flex-1 rounded-full h-10 bg-forest text-white hover:bg-forest/90 font-semibold text-xs gap-2 shadow-xs press"
                disabled={downloading === previewMaterial.id}
                onClick={() => download(previewMaterial.id)}
              >
                {downloading === previewMaterial.id ? (
                  <Loader2 className="animate-spin size-4" />
                ) : (
                  <Download className="size-4" />
                )}
                <span>Download Document</span>
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
