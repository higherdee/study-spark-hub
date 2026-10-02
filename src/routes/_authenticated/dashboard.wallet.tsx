import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Coins, Loader2, Wallet } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";

import { PageHeader, StatCard, StatusBadge } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { formatNaira, NAIRA_PER_50_POINTS, pointsToNaira } from "@/lib/constants";
import { useProfile } from "@/lib/profile";

export const Route = createFileRoute("/_authenticated/dashboard/wallet")({
  head: () => ({ meta: [{ title: "Points & cash out — Syllaboss" }, { name: "description", content: "Convert your points to cash." }] }),
  component: WalletPage,
});

function WalletPage() {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const qc = useQueryClient();
  const points = profile?.points ?? 0;
  const [amount, setAmount] = useState(50);
  const [bank, setBank] = useState("");
  const [acct, setAcct] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  const ledger = useQuery({
    queryKey: ["ledger", user?.id],
    enabled: Boolean(user),
    queryFn: async () => (await supabase.from("points_ledger").select("*").eq("user_id", user!.id).order("created_at", { ascending: false }).limit(50)).data ?? [],
  });
  const withdrawals = useQuery({
    queryKey: ["withdrawals", user?.id],
    enabled: Boolean(user),
    queryFn: async () => (await supabase.from("withdrawals").select("*").eq("user_id", user!.id).order("created_at", { ascending: false })).data ?? [],
  });

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.rpc("request_withdrawal", { _points: amount, _bank: bank, _account_number: acct, _account_name: name });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Withdrawal requested. You'll be paid after review.");
    qc.invalidateQueries({ queryKey: ["profile"] });
    qc.invalidateQueries({ queryKey: ["ledger"] });
    qc.invalidateQueries({ queryKey: ["withdrawals"] });
  }

  const paid = (withdrawals.data ?? []).filter((w) => w.status === "paid").reduce((a, w) => a + w.amount_naira, 0);

  return (
    <div>
      <PageHeader eyebrow={`50 points = ${formatNaira(NAIRA_PER_50_POINTS)}`} title="Points & cash out" />
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Balance" value={points} hint={`Worth ${formatNaira(pointsToNaira(points))}`} icon={Coins} />
        <StatCard label="Cashed out" value={formatNaira(paid)} icon={Wallet} />
        <StatCard label="Pending requests" value={(withdrawals.data ?? []).filter((w) => w.status === "pending").length} icon={Loader2} />
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-2">
        <form onSubmit={onSubmit} className="space-y-4 rounded-xl border border-border bg-card p-5">
          <h2 className="font-display text-xl font-semibold">Withdraw to bank</h2>
          <div className="space-y-2">
            <Label htmlFor="amt">Points to convert (multiples of 50)</Label>
            <Input id="amt" type="number" min={50} step={50} value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
            <p className="text-xs text-muted-foreground">You'll receive {formatNaira(pointsToNaira(amount))}</p>
          </div>
          <div className="space-y-2"><Label htmlFor="bk">Bank name</Label><Input id="bk" value={bank} onChange={(e) => setBank(e.target.value)} placeholder="e.g. GTBank" /></div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2"><Label htmlFor="ac">Account number</Label><Input id="ac" inputMode="numeric" maxLength={10} value={acct} onChange={(e) => setAcct(e.target.value.replace(/\D/g, ""))} /></div>
            <div className="space-y-2"><Label htmlFor="an">Account name</Label><Input id="an" value={name} onChange={(e) => setName(e.target.value)} /></div>
          </div>
          <Button type="submit" disabled={busy || points < 50} className="w-full rounded-full">{busy && <Loader2 className="animate-spin" />}{points < 50 ? "Earn 50 points to cash out" : "Request withdrawal"}</Button>
        </form>

        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="font-display text-xl font-semibold">Withdrawals</h2>
          <ul className="mt-3 divide-y divide-border">
            {(withdrawals.data ?? []).length === 0 && <li className="py-6 text-center text-sm text-muted-foreground">No withdrawals yet.</li>}
            {(withdrawals.data ?? []).map((w) => (
              <li key={w.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                <div><p className="font-medium">{formatNaira(w.amount_naira)} · {w.points} pts</p><p className="text-xs text-muted-foreground">{w.bank_name} ••{w.account_number.slice(-4)} · {new Date(w.created_at).toLocaleDateString()}{w.admin_note ? ` · ${w.admin_note}` : ""}</p></div>
                <StatusBadge status={w.status} />
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="mt-6 rounded-xl border border-border bg-card p-5">
        <h2 className="font-display text-xl font-semibold">Points history</h2>
        <ul className="mt-3 divide-y divide-border">
          {(ledger.data ?? []).length === 0 && <li className="py-6 text-center text-sm text-muted-foreground">No activity yet.</li>}
          {(ledger.data ?? []).map((l) => (
            <li key={l.id} className="flex justify-between gap-3 py-3 text-sm">
              <span>{l.reason}<span className="block text-xs text-muted-foreground">{new Date(l.created_at).toLocaleString()}</span></span>
              <span className={l.amount > 0 ? "font-semibold text-primary" : "font-semibold text-destructive"}>{l.amount > 0 ? "+" : ""}{l.amount}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
