import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { SyllabossEmblem } from "@/components/syllaboss-logo";

interface PaddleBrowser {
  Environment: { set: (environment: "sandbox") => void };
  Initialize: (options: { token: string; eventCallback: (event: { name: string }) => void }) => void;
  Checkout: { open: (options: { transactionId: string; settings: { displayMode: string; theme: string; successUrl: string } }) => void };
}
declare global { interface Window { Paddle?: PaddleBrowser } }

export const Route = createFileRoute("/billing/checkout")({
  validateSearch: (search: Record<string, unknown>) => ({ _ptxn: typeof search["_ptxn"] === "string" ? search["_ptxn"] : "" }),
  head: () => ({ meta: [{ title: "Secure checkout — Syllaboss" }, { name: "robots", content: "noindex,nofollow" }] }),
  component: CheckoutPage,
});

function CheckoutPage() {
  const { _ptxn } = Route.useSearch();
  const [error, setError] = useState("");
  const [closed, setClosed] = useState(false);
  useEffect(() => {
    let disposed = false;
    if (!/^txn_[a-z0-9]{26}$/.test(_ptxn)) { setError("This checkout link is incomplete. Start again from your membership page."); return; }
    const successUrl = `${window.location.origin}/billing/return?transaction=${encodeURIComponent(_ptxn)}`;
    async function load() {
      const response = await fetch("/api/billing?resource=catalog");
      const configuration = await response.json();
      if (!response.ok || !configuration.clientToken) throw new Error("Checkout is not configured yet. Please return to your membership page.");
      if (!window.Paddle) await new Promise<void>((resolve, reject) => {
        const script = document.createElement("script");
        script.src = "https://cdn.paddle.com/paddle/v2/paddle.js";
        script.onload = () => resolve(); script.onerror = () => reject(new Error("Checkout could not connect. Check your connection and retry."));
        document.head.appendChild(script);
      });
      if (disposed || !window.Paddle) return;
      if (configuration.environment === "sandbox") window.Paddle.Environment.set("sandbox");
      window.Paddle.Initialize({ token: configuration.clientToken, eventCallback: (event) => {
        if (event.name === "checkout.completed") window.location.assign(successUrl);
        if (event.name === "checkout.closed") setClosed(true);
      } });
      window.Paddle.Checkout.open({ transactionId: _ptxn, settings: { displayMode: "overlay", theme: "light", successUrl } });
    }
    void load().catch((reason) => { if (!disposed) setError(reason instanceof Error ? reason.message : "Checkout could not load."); });
    return () => { disposed = true; };
  }, [_ptxn]);
  return <main className="grid min-h-dvh place-items-center bg-background px-5"><div className="w-full max-w-md space-y-6 rounded-3xl border border-border bg-card p-7">
    <a href="/" className="flex items-center gap-3 font-display text-2xl"><SyllabossEmblem />Syllaboss</a>
    <h1 className="font-display text-3xl">{closed ? "Checkout closed" : "Your secure checkout"}</h1>
    {error ? <p role="alert" className="text-sm leading-relaxed text-red-800">{error}</p> : closed ? <p className="text-sm leading-relaxed text-muted-foreground">If you completed a payment, your membership will be updated after verification.</p> : <p className="flex items-center gap-3 text-sm"><Loader2 className="size-4 animate-spin" />Opening payment options…</p>}
    <p className="text-sm leading-relaxed text-muted-foreground">You pay when subscribing. Your first SyllaPlus subscription includes seven extra days before renewal. You can cancel renewal from your account.</p>
    <a href="/dashboard/settings?membership=1" className="inline-flex min-h-12 items-center font-semibold text-forest">Return to membership</a>
  </div></main>;
}
