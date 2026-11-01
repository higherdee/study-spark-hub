import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Star } from "lucide-react";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { getMaterialReviewsServerFn, submitMaterialReviewServerFn } from "@/lib/material-reviews.functions";
export function MaterialReviews({ materialId, open, close }: { materialId: string; open: boolean; close: () => void }) {
  const query = useQueryClient();
  const result = useQuery({ queryKey: ["material-reviews", materialId], enabled: open, queryFn: () => getMaterialReviewsServerFn({ data: { materialId } }) });
  const [rating, setRating] = useState(5);
  const [review, setReview] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => { const own = result.data?.reviews.find((item) => item.own); if (own) { setRating(own.rating); setReview(own.review); } }, [result.data]);
  async function save() {
    setSaving(true); setError("");
    try { await submitMaterialReviewServerFn({ data: { materialId, rating, review } }); await query.invalidateQueries({ queryKey: ["material-reviews", materialId] }); void query.invalidateQueries({ queryKey: ["library-materials"] }); void query.invalidateQueries({ queryKey: ["material-preview", materialId] }); }
    catch { setError("Your review could not be saved. Please retry."); }
    finally { setSaving(false); }
  }
  return <Dialog open={open} onOpenChange={(value) => { if (!value) close(); }}><DialogContent className="max-h-[90dvh] max-w-lg overflow-y-auto overscroll-contain rounded-3xl p-6"><DialogHeader><DialogTitle className="font-serif text-3xl">What students think.</DialogTitle><DialogDescription>{result.data?.count ? `${result.data.average.toFixed(1)} out of 5 · ${result.data.count} ratings` : "Be the first to rate this material."}</DialogDescription></DialogHeader><section className="rounded-2xl bg-muted/50 p-4"><p className="text-sm font-semibold">Your review</p><div className="my-3 flex gap-1" aria-label="Choose a rating">{[1, 2, 3, 4, 5].map((value) => <button key={value} aria-label={`${value} stars`} aria-pressed={rating === value} onClick={() => setRating(value)} className="grid size-11 place-items-center rounded-xl hover:bg-brand/10"><Star className={`size-6 ${value <= rating ? "fill-amber-400 text-amber-500" : "text-muted-foreground"}`}/></button>)}</div><textarea value={review} onChange={(event) => setReview(event.target.value)} maxLength={1500} rows={3} placeholder="Was it clear, useful and relevant to your course?" aria-label="Your material review" className="w-full resize-none rounded-xl border border-border bg-background p-3 text-base leading-6"/><p className="mt-2 text-xs text-muted-foreground">Your username is shown with your review. One rating per account; you can update it.</p><Button className="mt-4 rounded-xl" disabled={saving || result.isPending} onClick={() => void save()}>{saving ? "Saving…" : "Save review"}</Button>{error && <p role="alert" className="mt-2 text-sm text-destructive">{error}</p>}</section><div className="space-y-4">{result.isPending ? <p role="status" className="text-sm text-muted-foreground">Loading student reviews…</p> : result.isError ? <p role="alert" className="text-sm text-destructive">Reviews could not be loaded.</p> : result.data.reviews.map((item, index) => <article key={index} className="border-b border-border pb-4"><div className="flex items-center justify-between gap-3 text-sm"><span className="font-semibold">{item.author}{item.own ? " · You" : ""}</span><span className="flex items-center gap-1"><Star className="size-3.5 fill-amber-400 text-amber-500"/>{item.rating.toFixed(1)}</span></div>{item.review && <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{item.review}</p>}</article>)}</div></DialogContent></Dialog>;
}
