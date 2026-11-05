import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { submitBattleRoundServerFn, gradeTheoryBattleServerFn } from "@/lib/battle.functions";
import type { battleRoundState } from "@/lib/battle-rounds.server";

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
  const index = round?.state === "playing" ? round.index : -1;
  const q = index >= 0 ? JSON.parse(battle.questions_json)[index] : null;
  const self = players.find(p => p.user_id === userId);
  const answered = sync.answeredBy.includes(userId) || locked === index;
  useEffect(() => {
    setText(""); setPhoto(null); setError("");
  }, [index]);
  useEffect(() => {
    const fetchedAt = performance.now();
    const tick = () => {
      const now = sync.serverNow + performance.now() - fetchedAt;
      const deadline = round?.state === "playing" ? round.closesAt : round?.state === "waiting" ? round.startsAt : now;
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
    {!round && <p>Waiting for an opponent to join. The shared countdown starts once two fighters are ready.</p>}
    {round?.state === "waiting" && <p className="text-3xl font-semibold">Starting in {remaining}…</p>}
    {q && <div className="space-y-5">
      <div className="flex justify-between text-sm"><span>Question {index + 1} of {JSON.parse(battle.questions_json).length}</span><strong aria-live="off">{remaining}s</strong></div>
      <p className="text-xl leading-relaxed">{q.question}</p>
      {battle.mode === "mcq" ? q.options.map((option: string, i: number) => <Button key={i} variant="outline" className="w-full h-auto min-h-12 whitespace-normal justify-start text-left" disabled={busy || answered || !remaining || self?.role !== "fighter" || self.status !== "joined"} onClick={() => void submit(i)}>{option}</Button>) : <>
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
      {answered && <p role="status">Answer locked. Waiting for the next shared round.</p>}
      {players.filter(p => p.user_id !== userId && sync.answeredBy.includes(p.user_id)).map(p => <p key={p.user_id} role="status">{p.user_name} has answered.</p>)}
      <p className="text-xs text-muted-foreground">Unanswered questions score zero when time expires. Correct MCQ answers earn up to 10% extra for speed.</p>
    </div>}
    {round?.state === "finished" && <div><p>All rounds are closed. Scores are being finalized.</p>{battle.mode === "theory" && battle.host_id === userId && <Button disabled={busy} onClick={async () => { setBusy(true); try { await gradeTheoryBattleServerFn({ data: { battleId: battle.id, groupId: battle.group_id } }); void refresh(); } catch (cause) { setError(cause instanceof Error ? cause.message : "Grading failed. Retry."); } finally { setBusy(false); } }}>Grade solutions</Button>}</div>}
    {error && <p role="alert" className="text-destructive">{error}</p>}
  </DialogContent></Dialog>;
}
