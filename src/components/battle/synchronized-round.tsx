import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { submitBattleRoundServerFn, gradeTheoryBattleServerFn } from "@/lib/battle.functions";
import type { battleRoundState } from "@/lib/battle-rounds.server";
import { AiMessageRenderer } from "@/components/ai-message-renderer";

type Sync = Awaited<ReturnType<typeof battleRoundState>>;
export function SynchronizedRound({ open, close, battle, players, sync, userId, refresh }: {
  open: boolean; close: () => void; battle: { id: string; title: string; mode: string; group_id: string; host_id: string; questions_json: string };
  players: Array<{ user_id: string; user_name: string; role: string; status: string }>; sync: Sync; userId: string; refresh: () => unknown;
}) {
  const [remaining, setRemaining] = useState(0);
  const [text, setText] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [locked, setLocked] = useState(-1);
  const round = sync.round;
  const index = round?.state === "playing" || round?.state === "review" ? round.index : -1;
  const q = index >= 0 ? JSON.parse(battle.questions_json)[index] : null;
  const self = players.find(p => p.user_id === userId);
  const spectator = self?.role !== "fighter" || !["joined", "submitted"].includes(self.status);
  const reviewing = round?.state === "review";
  const result = sync.results.find(r => r.index === index);
  const answered = sync.answeredBy.includes(userId) || locked === index;
  useEffect(() => {
    setText(""); setPhoto(null); setError("");
  }, [index]);
  useEffect(() => {
    const fetchedAt = performance.now();
    const tick = () => {
      const now = sync.serverNow + performance.now() - fetchedAt;
      const deadline = round?.state === "playing" ? round.closesAt : round?.state === "review" ? round.revealUntil ?? now : round?.state === "waiting" ? round.startsAt : now;
      setRemaining(Math.max(0, Math.ceil((deadline - now) / 1000)));
    };
    tick(); const timer = setInterval(tick, 200); return () => clearInterval(timer);
  }, [sync.serverNow, round]);
  async function submit(answer: unknown) {
    setBusy(true); setError("");
    try {
      await submitBattleRoundServerFn({ data: { battleId: battle.id, index, answer } });
      setLocked(index); void refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not send your answer."); }
    finally { setBusy(false); }
  }
  return <Dialog open={open} onOpenChange={next => { if (!next) close(); }}><DialogContent className="max-w-xl max-h-[90dvh] overflow-y-auto">
    <DialogHeader><DialogTitle>{battle.title}</DialogTitle></DialogHeader>
    {spectator && <p className="text-sm font-medium text-primary" role="status">Watching live · answers stay hidden until the round closes</p>}
    <div className="grid grid-cols-2 gap-3" aria-label="Live scoreboard">{sync.totals.map(total => <div className="rounded-xl border p-3" key={total.userId}><p className="text-sm truncate">{players.find(p => p.user_id === total.userId)?.user_name || "Player"}</p><strong className="text-2xl tabular-nums">{total.score}</strong><span className="text-xs text-muted-foreground"> pts{total.pending ? " · marking" : ""}</span></div>)}</div>
    {!round && <p>Waiting for an opponent to join. The shared countdown starts once two fighters are ready.</p>}
    {round?.state === "waiting" && <p className="text-3xl font-semibold">Starting in {remaining}…</p>}
    {q && <div className="space-y-5">
      <div className="flex justify-between text-sm"><span>Question {index + 1} of {JSON.parse(battle.questions_json).length}</span><strong aria-live="off">{remaining}s</strong></div>
      <AiMessageRenderer content={q.question} className="text-xl leading-relaxed" />
      {battle.mode === "mcq" ? q.options.map((option: string, i: number) => <Button key={i} variant="outline" className={`w-full h-auto min-h-12 whitespace-normal justify-start text-left ${reviewing && result?.correctOptionIndex === i ? "border-primary bg-primary/10" : ""}`} disabled={reviewing || spectator || busy || answered || !remaining || self?.role !== "fighter" || self.status !== "joined"} onClick={() => void submit(i)}><span className="mr-3 font-semibold">{String.fromCharCode(65 + i)}</span><AiMessageRenderer content={option} className="[&_p]:m-0 text-inherit" /></Button>) : !reviewing && !spectator && <>
        <textarea className="min-h-36 w-full rounded-xl border bg-background p-3" placeholder="Show your working…" value={text} onChange={event => setText(event.target.value.slice(0, 6000))} disabled={answered || busy} />
        <label className="block text-sm">Photo of your solution <input type="file" accept="image/jpeg,image/png,image/webp" capture="environment" disabled={answered || busy} onChange={event => setPhoto(event.target.files?.[0] || null)} /></label>
        <Button disabled={busy || answered || !remaining || (!text.trim() && !photo) || self?.role !== "fighter"} onClick={async () => {
          setBusy(true); setError("");
          try {
            let imageAttachmentId: string | undefined;
            if (photo) {
              const form = new FormData(); form.set("file", photo); form.set("target", battle.group_id);
              const response = await fetch("/api/study-media", { method: "POST", body: form });
              const result = await response.json(); if (!response.ok) throw new Error(result.error || "Photo upload failed.");
              imageAttachmentId = result.id;
            }
            await submit({ text, ...(imageAttachmentId ? { imageAttachmentId } : {}) });
          } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not send solution."); }
          finally { setBusy(false); }
        }}>Lock solution</Button>
      </>}
      {!reviewing && answered && <p role="status">Answer locked. The round closes as soon as everyone answers.</p>}
      {reviewing && result && <section className="space-y-3 rounded-xl bg-muted p-4" aria-live="polite"><h3 className="font-semibold">Round {index + 1} results</h3>{result.players.map(p => <div key={p.userId}><p className="font-medium">{players.find(player => player.user_id === p.userId)?.user_name}: {p.score == null ? "Marking…" : `+${p.score} pts`}</p><AiMessageRenderer content={p.feedback} className="text-sm" /></div>)}{result.explanation && <AiMessageRenderer content={result.explanation} className="text-sm" />}<p className="text-sm">{round?.state === "review" && round.revealUntil == null ? "The next question starts after both solutions are marked." : `Next round in ${remaining}s…`}</p></section>}
      {players.filter(p => p.user_id !== userId && sync.answeredBy.includes(p.user_id)).map(p => <p key={p.user_id} role="status">{p.user_name} has answered.</p>)}
      <p className="text-xs text-muted-foreground">Unanswered questions score zero when time expires. Correct MCQ answers earn up to 10% extra for speed.</p>
    </div>}
    {round?.state === "finished" && <div><p>All rounds are closed. Scores are being finalized.</p>{battle.mode === "theory" && battle.host_id === userId && <Button disabled={busy} onClick={async () => { setBusy(true); try { await gradeTheoryBattleServerFn({ data: { battleId: battle.id, groupId: battle.group_id } }); void refresh(); } catch (cause) { setError(cause instanceof Error ? cause.message : "Grading failed. Retry."); } finally { setBusy(false); } }}>Grade solutions</Button>}</div>}
    {error && <p role="alert" className="text-destructive">{error}</p>}
  </DialogContent></Dialog>;
}
