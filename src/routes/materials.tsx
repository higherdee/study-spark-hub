import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Download, FileText, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { MaterialSearchBar } from "@/components/material-search-bar";
import { SyllabossLogo } from "@/components/syllaboss-logo";
import { Button } from "@/components/ui/button";
import { UserMenu } from "@/components/user-menu";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { LEVELS, MATERIAL_TYPES } from "@/lib/constants";

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
  const [downloading, setDownloading] = useState<string | null>(null);

  const { data = [], isLoading } = useQuery({
    queryKey: ["search-materials", q, type, level],
    queryFn: async () => {
      let query = supabase
        .from("materials")
        .select("id, title, course, course_code, institution, level, material_type, page_count, downloads, description, created_at")
        .eq("status", "verified")
        .order("downloads", { ascending: false })
        .limit(60);
      const term = q.replace(/[%,()]/g, " ").trim();
      if (term) query = query.or(`title.ilike.%${term}%,course.ilike.%${term}%,course_code.ilike.%${term}%,institution.ilike.%${term}%,description.ilike.%${term}%`);
      if (type) query = query.eq("material_type", type);
      if (level) query = query.eq("level", level);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  async function download(id: string) {
    if (!user) {
      toast("Create a free account to download");
      navigate({ to: "/auth", search: { mode: "signup" } });
      return;
    }
    setDownloading(id);
    const { data: path, error } = await supabase.rpc("record_material_download", { _material_id: id });
    if (error || !path) { setDownloading(null); return toast.error(error?.message ?? "Unavailable"); }
    const { data: signed, error: sErr } = await supabase.storage.from("materials").createSignedUrl(path, 120, { download: true });
    setDownloading(null);
    if (sErr) return toast.error(sErr.message);
    window.location.href = signed.signedUrl;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6"><SyllabossLogo /><UserMenu /></div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <h1 className="font-display text-4xl font-semibold">Find study materials</h1>
        <p className="mt-2 text-muted-foreground">Every file here was checked to match its course and title.</p>
        <MaterialSearchBar key={q} initial={q} className="mt-6" />
        <div className="mt-4 flex flex-wrap gap-3">
          <select value={type} onChange={(e) => navigate({ search: (s) => ({ ...s, type: e.target.value }) })} className="h-9 rounded-md border border-input bg-background px-3 text-sm" aria-label="Material type">
            <option value="">All types</option>{MATERIAL_TYPES.map((t) => <option key={t}>{t}</option>)}
          </select>
          <select value={level} onChange={(e) => navigate({ search: (s) => ({ ...s, level: e.target.value }) })} className="h-9 rounded-md border border-input bg-background px-3 text-sm" aria-label="Level">
            <option value="">All levels</option>{LEVELS.map((t) => <option key={t}>{t}</option>)}
          </select>
        </div>

        <p className="mt-8 text-sm text-muted-foreground">{isLoading ? "Searching…" : `${data.length} result${data.length === 1 ? "" : "s"}${q ? ` for “${q}”` : ""}`}</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((m) => (
            <article key={m.id} className="flex flex-col rounded-xl border border-border bg-card p-5">
              <div className="flex items-start gap-3">
                <FileText className="mt-0.5 size-5 shrink-0 text-primary" />
                <div className="min-w-0">
                  <h2 className="font-semibold leading-snug">{m.title}</h2>
                  <p className="mt-1 text-xs text-muted-foreground">{m.course_code ? `${m.course_code} · ` : ""}{m.course}</p>
                </div>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">{m.institution}</p>
              <div className="mt-3 flex flex-wrap gap-1.5 text-[11px]">
                <span className="rounded-full bg-secondary px-2 py-0.5">{m.material_type}</span>
                {m.level && <span className="rounded-full bg-secondary px-2 py-0.5">{m.level}</span>}
                <span className="rounded-full bg-secondary px-2 py-0.5">{m.page_count} pages</span>
                <span className="rounded-full bg-secondary px-2 py-0.5">{m.downloads} downloads</span>
              </div>
              <Button className="mt-4 w-full rounded-full" variant="outline" disabled={downloading === m.id} onClick={() => download(m.id)}>
                {downloading === m.id ? <Loader2 className="animate-spin" /> : <Download />} Download
              </Button>
            </article>
          ))}
        </div>
        {!isLoading && data.length === 0 && (
          <div className="mt-6 rounded-xl border border-dashed border-border p-10 text-center">
            <p className="font-medium">No materials found yet.</p>
            <p className="mt-1 text-sm text-muted-foreground">Have notes for this course? Upload them and earn points.</p>
            <Button asChild className="mt-4 rounded-full"><Link to={user ? "/dashboard/upload" : "/auth"} search={user ? undefined : { mode: "signup" }}>Upload & earn</Link></Button>
          </div>
        )}
      </main>
    </div>
  );
}
