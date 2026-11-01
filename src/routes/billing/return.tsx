import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { SyllabossEmblem } from "@/components/syllaboss-logo";

export const Route = createFileRoute("/billing/return")({
  validateSearch: (search: Record<string, unknown>) => ({ checkout: typeof search["checkout"] === "string" ? search["checkout"] : "", transaction: typeof search["transaction"] === "string" ? search["transaction"] : "" }),
  head: () => ({ meta: [{ title: "Membership confirmation — Syllaboss" }, { name: "robots", content: "noindex,nofollow" }] }),
  component: BillingReturn,
});

function BillingReturn() {
  const { checkout, transaction } = Route.useSearch();
  const { user, loading, getToken } = useAuth();
  const client = useQueryClient();
  const [state, setState] = useState<"checking" | "active" | "pending">("checking");
  const [message, setMessage] = useState("");
  useEffect(() => {
    if (loading) return;
    if (!user) { setState("pending"); return; }
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    let attempts = 0;
    async function check() {
      attempts++;
      try {
        const token = await getToken();
        const params = new URLSearchParams();
        if (checkout) params.set("checkout", checkout);
        if (transaction) params.set("transaction", transaction);
        const response = await fetch(`/api/billing?${params}`, { headers: { Authorization: `Bearer ${token}` } });
        const result = await response.json();
        if (stopped) return;
        if (response.ok && result.subscription?.hasAccess) {
          setState("active");
          setMessage(result.environment === "sandbox" ? "Your test subscription was verified. Your live membership has not changed." : "Your SyllaPlus membership is active.");
          await client.invalidateQueries({ queryKey: ["profile", user!.id] });
          return;
        }
      } catch { /* Confirmation can continue through the verified webhook. */ }
      if (stopped) return;
      if (attempts < 10) timer = setTimeout(() => void check(), 3000);
      else setState("pending");
    }
    void check();
    return () => { stopped = true; clearTimeout(timer); };
  }, [checkout, transaction, loading, user, getToken, client]);
  return <main className="grid min-h-dvh place-items-center bg-background px-5"><div className="w-full max-w-md space-y-5 rounded-3xl border border-border bg-card p-7">
    <a href="/" className="flex items-center gap-3 font-display text-2xl"><SyllabossEmblem />Syllaboss</a>
    {state === "active" ? <CheckCircle2 className="size-9 text-forest" /> : state === "checking" ? <Loader2 className="size-7 animate-spin text-forest" /> : null}
    <h1 className="font-display text-3xl">{state === "active" ? "You’re ready to study." : state === "checking" ? "Checking your membership…" : "Your membership confirmation"}</h1>
    <p className="text-sm leading-relaxed text-muted-foreground">{message || (state === "checking" ? "We’re checking directly with your payment provider." : "Completed payments are verified automatically. If you subscribed from the Android app, return there and refresh your membership. Please avoid making a second payment while confirmation is pending.")}</p>
    <a href="syllaboss://billing" className="flex min-h-12 items-center justify-center rounded-xl bg-forest px-4 font-semibold text-white">Return to Android app</a>
    <a href="/dashboard/settings?membership=1" className="flex min-h-12 items-center justify-center rounded-xl border border-border px-4 font-semibold">Open account settings</a>
  </div></main>;
}
