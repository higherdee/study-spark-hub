import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Coins, Loader2, Wallet, CheckCircle2, AlertCircle, Building2, Sparkles } from "lucide-react";
import { useState, useEffect, type FormEvent } from "react";
import { toast } from "sonner";

import { PageHeader, StatCard, StatusBadge } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SyllaPlusModal } from "@/components/syllaplus-modal";
import { useAuth } from "@/hooks/use-auth";
import { getPointsLedger, getWithdrawals } from "@/integrations/turso/client";
import {
  formatNaira,
  POINTS_NAME,
  POINTS_PER_NAIRA,
  MINIMUM_WITHDRAWAL_POINTS,
  MINIMUM_WITHDRAWAL_NAIRA,
  pointsToNaira,
} from "@/lib/constants";
import { NIGERIAN_BANKS, type NigerianBank } from "@/lib/nigerian-banks";
import { useProfile } from "@/lib/profile";
import { requestWithdrawalServerFn, resolveBankAccountServerFn } from "@/lib/upload.functions";

export const Route = createFileRoute("/_authenticated/dashboard/wallet")({
  head: () => ({
    meta: [
      { title: "SyllaPoints & Cash Out — Syllaboss" },
      { name: "description", content: "Convert your SyllaPoints to Naira." },
    ],
  }),
  component: WalletPage,
});

function WalletPage() {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const qc = useQueryClient();
  const points = profile?.points ?? 0;
  const isPlus = Boolean(profile?.sylla_plus);
  const [showPlusModal, setShowPlusModal] = useState(false);

  const [amount, setAmount] = useState(MINIMUM_WITHDRAWAL_POINTS);
  const [bankQuery, setBankQuery] = useState("");
  const [selectedBank, setSelectedBank] = useState<NigerianBank | null>(null);
  const [showBankDropdown, setShowBankDropdown] = useState(false);
  const [acct, setAcct] = useState("");
  const [name, setName] = useState("");
  const [isResolving, setIsResolving] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [resolveError, setResolveError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Filtered Nigerian banks for autocomplete
  const filteredBanks = NIGERIAN_BANKS.filter((b) =>
    b.name.toLowerCase().includes(bankQuery.toLowerCase())
  ).slice(0, 10);

  // Auto-resolve account name with Paystack when bank and 10 digits are filled
  useEffect(() => {
    if (!selectedBank || acct.length !== 10) {
      setIsVerified(false);
      setResolveError(null);
      return;
    }

    let isCurrent = true;
    async function resolve() {
      setIsResolving(true);
      setResolveError(null);
      setIsVerified(false);
      try {
        const res = await resolveBankAccountServerFn({
          data: {
            accountNumber: acct,
            bankCode: selectedBank!.code,
          },
        });
        if (!isCurrent) return;
        if (res.verified && res.accountName) {
          setName(res.accountName);
          setIsVerified(true);
          setResolveError(null);
          toast.success(`Account verified: ${res.accountName}`);
        } else {
          setIsVerified(false);
          setResolveError(res.error || "Unable to match account name. Please verify account number.");
        }
      } catch (err) {
        if (!isCurrent) return;
        setIsVerified(false);
        setResolveError("Verification service temporarily unavailable.");
      } finally {
        if (isCurrent) setIsResolving(false);
      }
    }

    resolve();
    return () => {
      isCurrent = false;
    };
  }, [selectedBank, acct]);

  const ledger = useQuery({
    queryKey: ["ledger", user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      if (!user) return [];
      return await getPointsLedger(user.id);
    },
  });

  const withdrawals = useQuery({
    queryKey: ["withdrawals", user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      if (!user) return [];
      return await getWithdrawals(user.id);
    },
  });

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (amount < MINIMUM_WITHDRAWAL_POINTS) {
      toast.error(`Minimum withdrawal is ${MINIMUM_WITHDRAWAL_POINTS.toLocaleString()} ${POINTS_NAME}`);
      return;
    }
    if (points < amount) {
      toast.error(`Insufficient balance. You have ${points.toLocaleString()} ${POINTS_NAME}`);
      return;
    }
    if (!selectedBank) {
      toast.error("Please select your bank from the list.");
      return;
    }
    if (acct.length !== 10) {
      toast.error("Please enter a valid 10-digit account number.");
      return;
    }
    if (!name.trim()) {
      toast.error("Account name could not be resolved. Please verify details.");
      return;
    }

    setBusy(true);
    try {
      await requestWithdrawalServerFn({
        data: {
          userId: user.id,
          points: amount,
          bankName: selectedBank.name,
          accountNumber: acct.trim(),
          accountName: name.trim(),
        },
      });
      toast.success("Withdrawal requested! Payout will be sent to your verified bank account.");
      qc.invalidateQueries({ queryKey: ["profile"] });
      qc.invalidateQueries({ queryKey: ["ledger"] });
      qc.invalidateQueries({ queryKey: ["withdrawals"] });
      setBankQuery("");
      setSelectedBank(null);
      setAcct("");
      setName("");
      setIsVerified(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Withdrawal request failed");
    } finally {
      setBusy(false);
    }
  }

  const paid = (withdrawals.data ?? [])
    .filter((w) => w.status === "paid")
    .reduce((a, w) => a + w.amount_naira, 0);

  return (
    <div>
      <PageHeader
        eyebrow={`Rate: 1 Naira = ${POINTS_PER_NAIRA} ${POINTS_NAME}`}
        title={`${POINTS_NAME} & Cash Out`}
      >
        {!isPlus && (
          <Button
            onClick={() => setShowPlusModal(true)}
            className="rounded-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-sm text-xs font-semibold"
          >
            <Sparkles className="size-3.5 mr-1.5" />
            Upgrade to SyllaPlus (1.3x)
          </Button>
        )}
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label={`${POINTS_NAME} Balance`}
          value={`${points.toLocaleString()} pts`}
          hint="Eligible for bank withdrawal"
          icon={Coins}
        />
        <StatCard label="Cashed out" value={formatNaira(paid)} icon={Wallet} />
        <StatCard
          label="Pending requests"
          value={(withdrawals.data ?? []).filter((w) => w.status === "pending").length}
          hint="Under review & processing"
          icon={Loader2}
        />
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-2">
        <form onSubmit={onSubmit} className="space-y-4 rounded-2xl border border-border/60 bg-card p-6 shadow-xs">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl font-semibold">Withdraw to bank</h2>
            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
              Min: {MINIMUM_WITHDRAWAL_POINTS.toLocaleString()} {POINTS_NAME}
            </span>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amt">{POINTS_NAME} to cash out</Label>
            <Input
              id="amt"
              type="number"
              min={MINIMUM_WITHDRAWAL_POINTS}
              step={100}
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="h-11 rounded-xl"
            />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>You will receive: <strong className="text-foreground">{formatNaira(pointsToNaira(amount))}</strong></span>
              <span>Min withdrawal: {formatNaira(MINIMUM_WITHDRAWAL_NAIRA)}</span>
            </div>
          </div>

          {/* Searchable Bank Selector with Nigerian Banks Autofill */}
          <div className="relative space-y-2">
            <Label htmlFor="bk">Select Nigerian Bank</Label>
            <div className="relative">
              <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                id="bk"
                required
                value={selectedBank ? selectedBank.name : bankQuery}
                onChange={(e) => {
                  setBankQuery(e.target.value);
                  setSelectedBank(null);
                  setShowBankDropdown(true);
                  setIsVerified(false);
                }}
                onFocus={() => setShowBankDropdown(true)}
                placeholder="Type your bank (e.g. OPay, GTBank, Kuda, Zenith...)"
                className="h-11 rounded-xl pl-10"
              />
            </div>

            {/* Bank dropdown list */}
            {showBankDropdown && !selectedBank && filteredBanks.length > 0 && (
              <div className="absolute z-30 mt-1 max-h-56 w-full overflow-y-auto rounded-2xl border border-border bg-card p-1.5 shadow-xl backdrop-blur-md">
                {filteredBanks.map((b) => (
                  <button
                    key={b.code}
                    type="button"
                    onClick={() => {
                      setSelectedBank(b);
                      setBankQuery(b.name);
                      setShowBankDropdown(false);
                    }}
                    className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs font-medium text-foreground hover:bg-secondary/70 transition-colors"
                  >
                    <span>{b.name}</span>
                    <span className="text-[10px] text-muted-foreground font-mono">Bank</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="ac">Account number (10 digits)</Label>
              <Input
                id="ac"
                inputMode="numeric"
                required
                maxLength={10}
                value={acct}
                onChange={(e) => setAcct(e.target.value.replace(/\D/g, ""))}
                placeholder="0123456789"
                className="h-11 rounded-xl font-mono text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="an">Account holder name</Label>
              <Input
                id="an"
                readOnly
                value={name}
                placeholder={isResolving ? "Verifying with Paystack..." : "Auto-verified name"}
                className={`h-11 rounded-xl font-medium ${isVerified ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-semibold" : ""}`}
              />
            </div>
          </div>

          {/* Real-time Paystack Verification Status Banner */}
          {isResolving && (
            <div className="flex items-center gap-2 rounded-xl bg-secondary/60 p-3 text-xs text-muted-foreground animate-pulse">
              <Loader2 className="size-4 animate-spin text-primary" />
              <span>Verifying account details with Paystack API...</span>
            </div>
          )}

          {isVerified && (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-700 dark:text-emerald-300">
              <CheckCircle2 className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span>Verified Account Holder: <strong>{name}</strong></span>
            </div>
          )}

          {resolveError && (
            <div className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
              <AlertCircle className="size-4 shrink-0" />
              <span>{resolveError}</span>
            </div>
          )}

          <Button
            type="submit"
            disabled={busy || points < MINIMUM_WITHDRAWAL_POINTS || !isVerified}
            className="w-full h-11 rounded-xl font-medium shadow-xs transition-all active:scale-[0.98] mt-2"
          >
            {busy && <Loader2 className="animate-spin size-4 mr-2" />}
            {points < MINIMUM_WITHDRAWAL_POINTS
              ? `Earn ${MINIMUM_WITHDRAWAL_POINTS.toLocaleString()} ${POINTS_NAME} to cash out`
              : !selectedBank
              ? "Select your bank to proceed"
              : !isVerified
              ? "Verify account number first"
              : "Request Withdrawal"}
          </Button>
        </form>

        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="font-display text-xl font-semibold">Withdrawals</h2>
          <ul className="mt-3 divide-y divide-border">
            {(withdrawals.data ?? []).length === 0 && (
              <li className="py-6 text-center text-sm text-muted-foreground">No withdrawals yet.</li>
            )}
            {(withdrawals.data ?? []).map((w) => (
              <li key={w.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                <div>
                  <p className="font-medium">
                    {formatNaira(w.amount_naira)} · {w.points} pts
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {w.bank_name} ••{w.account_number.slice(-4)} · {new Date(w.created_at).toLocaleDateString()}
                    {w.admin_note ? ` · ${w.admin_note}` : ""}
                  </p>
                </div>
                <StatusBadge status={w.status} />
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="mt-6 rounded-xl border border-border bg-card p-5">
        <h2 className="font-display text-xl font-semibold">Points history</h2>
        <ul className="mt-3 divide-y divide-border">
          {(ledger.data ?? []).length === 0 && (
            <li className="py-6 text-center text-sm text-muted-foreground">No activity yet.</li>
          )}
          {(ledger.data ?? []).map((l) => (
            <li key={l.id} className="flex items-center justify-between gap-3 py-3 text-sm">
              <div>
                <p className="font-medium">{l.reason}</p>
                <p className="text-xs text-muted-foreground">{new Date(l.created_at).toLocaleDateString()}</p>
              </div>
              <span className={`font-semibold ${l.amount > 0 ? "text-primary" : "text-muted-foreground"}`}>
                {l.amount > 0 ? `+${l.amount}` : l.amount}
              </span>
            </li>
          ))}
        </ul>
      </section>

      {/* SyllaPlus Modal */}
      <SyllaPlusModal
        open={showPlusModal}
        onClose={() => setShowPlusModal(false)}
      />
    </div>
  );
}
