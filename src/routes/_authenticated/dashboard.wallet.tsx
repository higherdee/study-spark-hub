import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Coins,
  Loader2,
  Wallet,
  CheckCircle2,
  AlertCircle,
  Building2,
  Sparkles,
  ArrowUpRight,
  ArrowDownLeft,
  Clock,
  Upload,
  Zap,
  TrendingUp,
} from "lucide-react";
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
  const [activityTab, setActivityTab] = useState<"all" | "withdrawals" | "earnings">("all");

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
    <div className="space-y-6">
      {/* Trust Wallet-Inspired Hero Balance Card */}
      <div className="relative overflow-hidden rounded-3xl border border-emerald-500/25 bg-gradient-to-br from-[#061e14] via-[#0b2b1d] to-[#04140d] p-6 sm:p-8 text-white shadow-[0_24px_50px_-15px_rgba(4,20,13,0.5)]">
        {/* Ambient Glow Orbs */}
        <div className="pointer-events-none absolute -right-16 -top-16 size-64 rounded-full bg-emerald-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -left-16 -bottom-16 size-64 rounded-full bg-teal-500/10 blur-3xl" />

        <div className="relative z-10 flex flex-col gap-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/15 px-3 py-1 font-mono text-[11px] font-bold uppercase tracking-wider text-emerald-300">
                <Coins className="size-3 text-emerald-400" />
                SyllaPoints Wallet
              </span>
              {isPlus && (
                <span className="rounded-full border border-amber-500/40 bg-amber-500/20 px-2.5 py-0.5 text-[10px] font-bold text-amber-300">
                  ⚡ 1.3x SyllaPlus Active
                </span>
              )}
            </div>

            <span className="text-xs font-medium text-emerald-200/70">
              1 Naira = {POINTS_PER_NAIRA} {POINTS_NAME}
            </span>
          </div>

          <div>
            <p className="text-xs uppercase tracking-wider text-emerald-300/80 font-bold">
              Total Cash Value
            </p>
            <div className="mt-1 flex flex-wrap items-baseline gap-3">
              <h1 className="font-display text-4xl sm:text-5xl font-extrabold tracking-tight text-white">
                {formatNaira(pointsToNaira(points))}
              </h1>
              <span className="text-sm sm:text-base font-semibold text-emerald-200/90 font-mono">
                ≈ {points.toLocaleString()} pts
              </span>
            </div>
          </div>

          {/* Quick Action Pills (Trust Wallet action bar) */}
          <div className="flex flex-wrap items-center gap-2.5 pt-2">
            <Button
              asChild
              className="h-10 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs gap-1.5 shadow-md active:scale-95 transition-all"
            >
              <a href="#withdraw-form">
                <ArrowUpRight className="size-4 stroke-[2.5]" />
                Withdraw to Bank
              </a>
            </Button>

            {!isPlus && (
              <Button
                onClick={() => setShowPlusModal(true)}
                className="h-10 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-bold text-xs gap-1.5 shadow-md active:scale-95 transition-all"
              >
                <Zap className="size-4 stroke-[2.5] text-black" />
                Upgrade to SyllaPlus (1.3x)
              </Button>
            )}

            <Button
              asChild
              variant="outline"
              className="h-10 rounded-2xl border-white/20 bg-white/5 hover:bg-white/10 text-white font-semibold text-xs gap-1.5 active:scale-95 transition-all"
            >
              <Link to="/dashboard/upload">
                <Upload className="size-3.5" />
                Upload & Earn
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Metric Cards Row */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex items-center gap-4 rounded-2xl border border-border/80 bg-card p-5 shadow-xs">
          <div className="grid size-12 place-items-center rounded-2xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
            <ArrowUpRight className="size-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Total Cashed Out
            </p>
            <p className="font-display text-2xl font-bold text-foreground mt-0.5">
              {formatNaira(paid)}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Directly deposited to your Nigerian bank
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-2xl border border-border/80 bg-card p-5 shadow-xs">
          <div className="grid size-12 place-items-center rounded-2xl bg-amber-500/10 text-amber-700 dark:text-amber-400">
            <Clock className="size-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Pending Payouts
            </p>
            <p className="font-display text-2xl font-bold text-foreground mt-0.5">
              {(withdrawals.data ?? []).filter((w) => w.status === "pending").length} requests
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Processed every weekday via automated payout
            </p>
          </div>
        </div>
      </div>

      <div id="withdraw-form" className="mt-8 grid gap-6 xl:grid-cols-2">
        <form onSubmit={onSubmit} className="space-y-4 rounded-3xl border border-border/80 bg-card p-6 shadow-xs">
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

        {/* Recent Transactions & Activity Stream */}
        <section className="rounded-3xl border border-border/80 bg-card p-6 shadow-xs flex flex-col">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-border/60">
            <h2 className="font-display text-lg font-bold">Activity Ledger</h2>
            <div className="flex items-center gap-1 rounded-xl bg-secondary/40 p-1 text-xs">
              <button
                type="button"
                onClick={() => setActivityTab("all")}
                className={cn(
                  "rounded-lg px-2.5 py-1 font-semibold transition-all text-[11px]",
                  activityTab === "all"
                    ? "bg-card text-foreground shadow-2xs font-bold"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setActivityTab("withdrawals")}
                className={cn(
                  "rounded-lg px-2.5 py-1 font-semibold transition-all text-[11px]",
                  activityTab === "withdrawals"
                    ? "bg-card text-foreground shadow-2xs font-bold"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Cash Outs
              </button>
              <button
                type="button"
                onClick={() => setActivityTab("earnings")}
                className={cn(
                  "rounded-lg px-2.5 py-1 font-semibold transition-all text-[11px]",
                  activityTab === "earnings"
                    ? "bg-card text-foreground shadow-2xs font-bold"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Earnings
              </button>
            </div>
          </div>

          <div className="mt-4 flex-1 overflow-y-auto max-h-[440px] pr-1 space-y-2">
            {/* Withdrawals items */}
            {(activityTab === "all" || activityTab === "withdrawals") &&
              (withdrawals.data ?? []).map((w) => (
                <div
                  key={`w-${w.id}`}
                  className="flex items-center justify-between gap-3 p-3 rounded-2xl border border-border/60 bg-secondary/15 hover:bg-secondary/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="grid size-9 place-items-center rounded-xl bg-red-500/10 text-red-600 shrink-0">
                      <ArrowUpRight className="size-4" />
                    </div>
                    <div>
                      <p className="font-bold text-xs text-foreground">
                        Withdrawal: {formatNaira(w.amount_naira)}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {w.bank_name} ••{w.account_number.slice(-4)} · {new Date(w.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right flex flex-col items-end gap-1">
                    <span className="font-mono text-xs font-bold text-red-600">
                      -{w.points.toLocaleString()} pts
                    </span>
                    <StatusBadge status={w.status} />
                  </div>
                </div>
              ))}

            {/* Earnings items */}
            {(activityTab === "all" || activityTab === "earnings") &&
              (ledger.data ?? []).map((l) => (
                <div
                  key={`l-${l.id}`}
                  className="flex items-center justify-between gap-3 p-3 rounded-2xl border border-border/60 bg-secondary/15 hover:bg-secondary/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "grid size-9 place-items-center rounded-xl shrink-0",
                      l.amount > 0 ? "bg-emerald-500/10 text-emerald-600" : "bg-red-500/10 text-red-600"
                    )}>
                      {l.amount > 0 ? (
                        <ArrowDownLeft className="size-4" />
                      ) : (
                        <ArrowUpRight className="size-4" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-xs text-foreground truncate max-w-[180px] sm:max-w-xs">
                        {l.reason}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {new Date(l.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <span className={cn(
                    "font-mono text-xs font-bold shrink-0",
                    l.amount > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"
                  )}>
                    {l.amount > 0 ? `+${l.amount.toLocaleString()}` : l.amount.toLocaleString()} pts
                  </span>
                </div>
              ))}

            {/* Empty state */}
            {((activityTab === "withdrawals" && (withdrawals.data ?? []).length === 0) ||
              (activityTab === "earnings" && (ledger.data ?? []).length === 0) ||
              (activityTab === "all" && (withdrawals.data ?? []).length === 0 && (ledger.data ?? []).length === 0)) && (
              <div className="py-12 text-center text-xs text-muted-foreground">
                No transaction activity found.
              </div>
            )}
          </div>
        </section>
      </div>

      {/* SyllaPlus Modal */}
      <SyllaPlusModal
        open={showPlusModal}
        onClose={() => setShowPlusModal(false)}
      />
    </div>
  );
}
