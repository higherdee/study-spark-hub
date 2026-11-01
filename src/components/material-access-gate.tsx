import { useEffect, useRef, useState } from "react";
import { ArrowRight, Clock3, Download, Loader2, Sparkles, X } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { registerMaterialAccessListener, type MaterialAccessRequest } from "@/lib/membership/client";

async function accessCall(body: unknown, token: string | null) {
  const response = await fetch("/api/membership", { method: "POST", headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body) });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "The material could not be opened.");
  return result;
}
export function MaterialAccessGate() {
  const { user, getToken } = useAuth();
  const tokenProvider = useRef(getToken);
  tokenProvider.current = getToken;
  const active = useRef<MaterialAccessRequest | null>(null);
  const [job, setJob] = useState<MaterialAccessRequest | null>(null);
  const [gateId, setGateId] = useState("");
  const [remaining, setRemaining] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const deadline = useRef(0);
  useEffect(() => {
    const receive = (request: MaterialAccessRequest) => {
      if (active.current) { request.reject(new Error("Finish opening the current material first.")); return; }
      active.current = request; setJob(request); setBusy(true); setError(""); setGateId("");
      if (!user) { setBusy(false); setError("Sign in to open and download study materials."); return; }
      void tokenProvider.current().then(token => accessCall({ action: "start-material", materialId: request.materialId, intent: request.intent }, token)).then(async (gate) => {
        if (active.current !== request) return;
        if (gate.paid) {
          const completed = await accessCall({ action: "complete-material", id: gate.id }, await tokenProvider.current());
          if (active.current === request) { request.resolve(completed.url); active.current = null; setJob(null); }
        } else { setGateId(gate.id); deadline.current = performance.now() + gate.seconds * 1000; setRemaining(gate.seconds); }
      }).catch((failure) => setError(failure.message)).finally(() => setBusy(false));
    };
    const unregister = registerMaterialAccessListener(receive);
    return () => { unregister(); active.current?.reject(new Error("Material access cancelled.")); active.current = null; };
  }, [user?.id]);
  useEffect(() => {
    if (!gateId) return;
    const timer = window.setInterval(() => setRemaining(Math.max(0, Math.ceil((deadline.current - performance.now()) / 1000))), 250);
    return () => window.clearInterval(timer);
  }, [gateId]);
  function close() { active.current?.reject(new Error("Material access cancelled.")); active.current = null; setJob(null); }
  async function complete() {
    const request = active.current;
    if (!request || !gateId || remaining > 0) return;
    setBusy(true); setError("");
    try {
      const completed = await accessCall({ action: "complete-material", id: gateId }, await tokenProvider.current());
      if (active.current === request) { request.resolve(completed.url); active.current = null; setJob(null); }
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Please try again."); }
    finally { setBusy(false); }
  }
  return <Dialog open={!!job} onOpenChange={(open) => { if (!open) close(); }}><DialogContent className="max-w-md rounded-3xl p-6 sm:p-8">
    <DialogHeader><DialogTitle className="font-serif text-3xl">A little more room to study.</DialogTitle><DialogDescription>This is a Syllaboss promotion. Your material is next.</DialogDescription></DialogHeader>
    <div className="my-3 rounded-2xl bg-brand/8 p-5"><Sparkles className="mb-4 size-7 text-brand"/><p className="text-lg font-semibold">Make time for what clicks.</p><p className="mt-2 text-sm leading-6 text-muted-foreground">SyllaPlus gives you more AI study time, more downloads, longer chat history, and library materials alongside Boss AI.</p><p className="mt-4 text-xs leading-5 text-muted-foreground">Subscribe today and get seven extra days before your first renewal. Your first payment is taken when you subscribe.</p><Button variant="outline" className="mt-5 w-full rounded-xl" onClick={() => { close(); window.dispatchEvent(new Event("syllaboss:upgrade")); }}>See SyllaPlus plans <ArrowRight className="ml-2 size-4"/></Button></div>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    {!user ? <Button asChild className="h-12 rounded-xl"><a href="/auth?mode=signin">Sign in to continue</a></Button> : <Button onClick={() => void complete()} disabled={busy || !gateId || remaining > 0} className="h-12 rounded-xl">{busy ? <Loader2 className="mr-2 size-4 animate-spin"/> : remaining > 0 ? <Clock3 className="mr-2 size-4"/> : <Download className="mr-2 size-4"/>}{busy ? "Preparing your material…" : remaining > 0 ? `Continue in ${remaining}s` : job?.intent === "download" ? "Download material" : "Open material"}</Button>}
  </DialogContent></Dialog>;
}
