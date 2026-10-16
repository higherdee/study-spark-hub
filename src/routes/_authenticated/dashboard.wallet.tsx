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
  CreditCard,
  Gift,
  Globe,
  Calendar,
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
  formatUsd,
  POINTS_NAME,
  MINIMUM_WITHDRAWAL_POINTS,
  MINIMUM_WITHDRAWAL_NAIRA,
  MINIMUM_WITHDRAWAL_USD,
  pointsToNaira,
  pointsToUsd,
  isWeekendWithdrawalWindow,
} from "@/lib/constants";
import { NIGERIAN_BANKS, type NigerianBank } from "@/lib/nigerian-banks";
import { useProfile } from "@/lib/profile";
import { cn } from "@/lib/utils";
import { requestWithdrawalServerFn, resolveBankAccountServerFn } from "@/lib/upload.functions";

export const Route = createFileRoute("/_authenticated/dashboard/wallet")({
  head: () => ({
    meta: [
      { title: "SyllaPoints & Global Cash Out — Syllaboss" },
      { name: "description", content: "Convert your SyllaPoints to local currency or international card disbursement." },
    ],
  }),
  component: WalletPage,
});

const GIFT_CARD_BRANDS = [
  { id: "amazon", name: "Amazon Gift Card", icon: "📦" },
  { id: "apple", name: "Apple App Store & iTunes", icon: "🍎" },
  { id: "visa", name: "Visa Virtual Prepaid Card", icon: "💳" },
  { id: "steam", name: "Steam Digital Wallet Code", icon: "🎮" },
];

function WalletPage() {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const qc = useQueryClient();
  const points = profile?.points ?? 0;
  const isPlus = Boolean(profile?.sylla_plus);
  const [showPlusModal, setShowPlusModal] = useState(false);

  const [amount, setAmount] = useState(MINIMUM_WITHDRAWAL_POINTS);
  const [payoutMethod, setPayoutMethod] = useState<"bank" | "card" | "giftcard">("bank");

  // Bank payout states
  const [bankQuery, setBankQuery] = useState("");
  const [selectedBank, setSelectedBank] = useState<NigerianBank | null>(null);
  const [showBankDropdown, setShowBankDropdown] = useState(false);
  const [acct, setAcct] = useState("");
  const [name, setName] = useState("");
  const [isResolving, setIsResolving] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [resolveError, setResolveError] = useState<string | null>(null);

  // Card payout states (Capitalist)
  const [cardNumber, setCardNumber] = useState("");
  const [cardHolder, setCardHolder] = useState("");

  // Gift Card states
  const [selectedGiftCard, setSelectedGiftCard] = useState(GIFT_CARD_BRANDS[0].name);
  const [giftCardEmail, setGiftCardEmail] = useState(user?.email ?? "");

  const [busy, setBusy] = useState(false);
  const [activityTab, setActivityTab] = useState<"all" | "withdrawals" | "earnings">("all");

  const isWeekend = isWeekendWithdrawalWindow();

  // Filtered banks for bank tab
  const filteredBanks = NIGERIAN_BANKS.filter((b) =>
    b.name.toLowerCase().includes(bankQuery.toLowerCase())
  ).slice(0, 10);

  // Auto-resolve account name with Paystack/Bachs when bank and 10 digits are filled
  useEffect(() => {
    if (payoutMethod !== "bank" || !selectedBank || acct.length !== 10) {
      if (payoutMethod === "bank") {
        setIsVerified(false);
        setResolveError(null);
      }
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
            bankCode: selectedBank?.code ?? "",
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
      } catch {
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
  }, [payoutMethod, selectedBank, acct]);

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

    let finalBankName = "Bank Transfer";
    let finalAccountNumber = acct.trim();
    let finalAccountName = name.trim();

    if (payoutMethod === "bank") {
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
      finalBankName = selectedBank.name;
    } else if (payoutMethod === "card") {
      const cleanCard = cardNumber.replace(/\s+/g, "");
      if (cleanCard.length < 15 || cleanCard.length > 19) {
        toast.error("Please enter a valid 16-digit debit/credit card number.");
        return;
      }
      if (!cardHolder.trim()) {
        toast.error("Please enter the cardholder's legal name.");
        return;
      }
      finalBankName = "Capitalist Global Card Disbursement";
      finalAccountNumber = `CARD-${cleanCard.slice(-4)}`;
      finalAccountName = cardHolder.trim();
    } else if (payoutMethod === "giftcard") {
      if (!giftCardEmail || !giftCardEmail.includes("@")) {
        toast.error("Please enter a valid delivery email for your gift card.");
        return;
      }
      finalBankName = `Gift Card (${selectedGiftCard})`;
      finalAccountNumber = giftCardEmail.trim();
      finalAccountName = profile?.full_name || user.email || "Valued Student";
    }

    setBusy(true);
    try {
      await requestWithdrawalServerFn({
        data: {
          userId: user.id,
          points: amount,
          bankName: finalBankName,
          accountNumber: finalAccountNumber,
          accountName: finalAccountName,
          payoutMethod,
        },
      });
      toast.success(
        isWeekend
          ? "Withdrawal requested! Processing your weekend payout."
          : "Withdrawal queued! Payouts are dispatched during the weekend window (Saturday & Sunday)."
      );
      qc.invalidateQueries({ queryKey: ["profile"] });
      qc.invalidateQueries({ queryKey: ["ledger"] });
      qc.invalidateQueries({ queryKey: ["withdrawals"] });
      setBankQuery("");
      setSelectedBank(null);
      setAcct("");
      setName("");
      setCardNumber("");
      setCardHolder("");
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
    <div className="stagger space-y-6">
      {/* Balance Card */}
      <section className="relative overflow-hidden rounded-3xl bg-forest p-6 text-white shadow-[var(--elev-3)] sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-white/80">
              <Coins className="size-3.5 text-brass-soft" />
              {POINTS_NAME} Global Wallet
            </span>
            {isPlus && (
              <span className="rounded-full bg-brass/25 px-2.5 py-1 text-[11px] font-semibold text-brass-soft">
                SyllaPlus 1.3x active
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 text-xs text-white/70 tnum">
            <span>1 pt = ₦0.83 (Regional)</span>
            <span>·</span>
            <span>1 pt = $0.004 (Global)</span>
          </div>
        </div>

        <div className="mt-7 flex flex-wrap items-baseline gap-x-6 gap-y-2">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-white/60">
              Regional Value (Africa / Asia)
            </p>
            <h1 className="mt-0.5 font-display text-4xl tracking-tight tnum sm:text-5xl">
              {formatNaira(pointsToNaira(points))}
            </h1>
          </div>
          <div className="border-l border-white/15 pl-6">
            <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-white/60">
              International Value (USD)
            </p>
            <h2 className="mt-0.5 font-display text-3xl tracking-tight tnum text-white/90 sm:text-4xl">
              {formatUsd(pointsToUsd(points))}
            </h2>
          </div>
          <span className="text-sm text-white/70 font-mono tnum self-end pb-1">
            {points.toLocaleString()} total pts
          </span>
        </div>

        <div className="mt-7 flex flex-wrap items-center gap-2.5">
          <Button
            asChild
            className="h-11 rounded-full bg-white px-5 text-forest hover:bg-white/90"
          >
            <a href="#withdraw-form">
              <ArrowUpRight className="size-4" />
              Cash out points
            </a>
          </Button>
          {!isPlus && (
            <Button
              onClick={() => setShowPlusModal(true)}
              className="h-11 rounded-full bg-brass px-5 text-white hover:bg-brass-ink"
            >
              <Zap className="size-4" />
              Upgrade to SyllaPlus
            </Button>
          )}
          <Button
            asChild
            variant="outline"
            className="h-11 rounded-full border-white/20 bg-transparent px-5 text-white hover:bg-white/10 hover:text-white"
          >
            <Link to="/dashboard/upload">
              <Upload className="size-4" />
              Upload and earn
            </Link>
          </Button>
        </div>
      </section>

      {/* Weekend Payout Status Banner */}
      <div className={cn(
        "flex items-center justify-between gap-3 p-4 rounded-2xl border text-xs leading-relaxed",
        isWeekend
          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300"
          : "border-brass/30 bg-brass/10 text-brass-ink dark:text-brass"
      )}>
        <div className="flex items-center gap-3">
          <div className={cn(
            "grid size-9 shrink-0 place-items-center rounded-xl",
            isWeekend ? "bg-emerald-500/20 text-emerald-600" : "bg-brass/20 text-brass"
          )}>
            <Calendar className="size-4" />
          </div>
          <div>
            <p className="font-bold">
              {isWeekend ? "Weekend Payout Window Active" : "Scheduled Weekend Payout Protocol"}
            </p>
            <p className="text-[11px] opacity-80">
              {isWeekend
                ? "Withdrawals requested today are reviewed and dispatched in real-time throughout Saturday and Sunday."
                : "All student cashouts are processed during the weekend window (Saturday & Sunday). You can queue your request now."}
            </p>
          </div>
        </div>
        <span className="font-mono font-bold text-[11px] shrink-0 uppercase tracking-wider px-2.5 py-1 rounded-full bg-white/40 dark:bg-black/20">
          {isWeekend ? "Active Now" : "Queued"}
        </span>
      </div>

      {/* Metrics */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="surface flex items-center gap-4 p-5">
          <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand/15 text-brand">
            <ArrowUpRight className="size-5" />
          </div>
          <div className="min-w-0">
            <p className="eyebrow">Total cashed out</p>
            <p className="mt-0.5 font-display text-2xl text-ink tnum">
              {formatNaira(paid)} <span className="text-sm font-sans text-muted-foreground">({formatUsd(paid / 1400)})</span>
            </p>
            <p className="text-[11px] text-muted-foreground">Verified payouts across all methods</p>
          </div>
        </div>

        <div className="surface flex items-center gap-4 p-5">
          <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-brass-soft text-brass-ink">
            <Clock className="size-5" />
          </div>
          <div className="min-w-0">
            <p className="eyebrow">Pending cash-outs</p>
            <p className="mt-0.5 font-display text-2xl text-ink tnum">
              {(withdrawals.data ?? []).filter((w) => w.status === "pending").length} requests
            </p>
            <p className="text-[11px] text-muted-foreground">Dispatched every Saturday & Sunday</p>
          </div>
        </div>
      </div>

      <div id="withdraw-form" className="mt-8 grid gap-6 xl:grid-cols-2">
        {/* Cash-Out Form with Multi-Method Tabs */}
        <form onSubmit={onSubmit} className="space-y-4 rounded-3xl border border-border/80 bg-card p-6 shadow-xs">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl font-semibold">Redeem SyllaPoints</h2>
            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
              Min: {MINIMUM_WITHDRAWAL_POINTS.toLocaleString()} {POINTS_NAME}
            </span>
          </div>

          {/* Amount input */}
          <div className="space-y-2">
            <Label htmlFor="amt">{POINTS_NAME} to cash out</Label>
            <Input
              id="amt"
              type="number"
              min={MINIMUM_WITHDRAWAL_POINTS}
              step={100}
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="h-11 rounded-xl font-mono text-sm"
            />
            <div className="flex flex-wrap items-center justify-between text-xs text-muted-foreground gap-1">
              <span>
                Estimated payout: <strong className="text-foreground">{formatNaira(pointsToNaira(amount))}</strong> (or <strong className="text-foreground">{formatUsd(pointsToUsd(amount))}</strong>)
              </span>
              <span>Min: {MINIMUM_WITHDRAWAL_POINTS.toLocaleString()} pts</span>
            </div>
          </div>

          {/* Payout Method Tabs */}
          <div className="space-y-2 pt-1">
            <Label>Select Payout Method</Label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setPayoutMethod("bank")}
                className={cn(
                  "p-3 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-1.5",
                  payoutMethod === "bank"
                    ? "border-primary bg-primary/10 text-primary font-bold shadow-xs"
                    : "border-border/60 bg-card text-muted-foreground hover:bg-secondary/40"
                )}
              >
                <Building2 className="size-4" />
                <span className="text-[11px] leading-tight">Bank (Bachs / NGN)</span>
              </button>

              <button
                type="button"
                onClick={() => setPayoutMethod("card")}
                className={cn(
                  "p-3 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-1.5",
                  payoutMethod === "card"
                    ? "border-primary bg-primary/10 text-primary font-bold shadow-xs"
                    : "border-border/60 bg-card text-muted-foreground hover:bg-secondary/40"
                )}
              >
                <CreditCard className="size-4" />
                <span className="text-[11px] leading-tight">Card (Capitalist)</span>
              </button>

              <button
                type="button"
                onClick={() => setPayoutMethod("giftcard")}
                className={cn(
                  "p-3 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-1.5",
                  payoutMethod === "giftcard"
                    ? "border-primary bg-primary/10 text-primary font-bold shadow-xs"
                    : "border-border/60 bg-card text-muted-foreground hover:bg-secondary/40"
                )}
              >
                <Gift className="size-4" />
                <span className="text-[11px] leading-tight">Digital Gift Cards</span>
              </button>
            </div>
          </div>

          {/* Method 1: Bank Transfer (Bachs / Paystack) */}
          {payoutMethod === "bank" && (
            <div className="space-y-4 pt-1 animate-fade-in">
              <div className="relative space-y-2">
                <Label htmlFor="bk">Select Bank</Label>
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
                    placeholder="Search bank (e.g. OPay, GTBank, Kuda, Zenith...)"
                    className="h-11 rounded-xl pl-10"
                  />
                </div>

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
                    placeholder={isResolving ? "Verifying account..." : "Auto-verified name"}
                    className={`h-11 rounded-xl font-medium ${isVerified ? "bg-brand/10 text-brand font-semibold" : ""}`}
                  />
                </div>
              </div>

              {isResolving && (
                <div className="flex items-center gap-2 rounded-xl bg-secondary/60 p-3 text-xs text-muted-foreground animate-pulse">
                  <Loader2 className="size-4 animate-spin text-primary" />
                  <span>Verifying account details with banking network...</span>
                </div>
              )}

              {isVerified && (
                <div className="flex items-center gap-2 rounded-xl border border-brand/30 bg-brand/10 p-3 text-xs text-brand">
                  <CheckCircle2 className="size-4 shrink-0 text-brand" />
                  <span>Verified Account: <strong>{name}</strong></span>
                </div>
              )}

              {resolveError && (
                <div className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
                  <AlertCircle className="size-4 shrink-0" />
                  <span>{resolveError}</span>
                </div>
              )}
            </div>
          )}

          {/* Method 2: International Card (Capitalist) */}
          {payoutMethod === "card" && (
            <div className="space-y-4 pt-1 animate-fade-in">
              <div className="rounded-2xl border border-primary/20 bg-primary/5 p-3.5 text-xs text-muted-foreground">
                <div className="flex items-center gap-2 font-semibold text-foreground">
                  <Globe className="size-4 text-primary" />
                  <span>Capitalist Global Card Disbursement</span>
                </div>
                <p className="mt-1 text-[11px] leading-relaxed">
                  Direct payout to your international Visa or Mastercard in USD. Disbursed securely through Capitalist card payout gateway.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="cnum">16-Digit Card Number</Label>
                <Input
                  id="cnum"
                  required
                  placeholder="4000 1234 5678 9010"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value)}
                  className="h-11 rounded-xl font-mono text-sm"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="chold">Cardholder Legal Name</Label>
                <Input
                  id="chold"
                  required
                  placeholder="e.g. John Doe"
                  value={cardHolder}
                  onChange={(e) => setCardHolder(e.target.value)}
                  className="h-11 rounded-xl font-medium"
                />
              </div>
            </div>
          )}

          {/* Method 3: Digital Gift Cards */}
          {payoutMethod === "giftcard" && (
            <div className="space-y-4 pt-1 animate-fade-in">
              <div className="space-y-2">
                <Label>Choose Brand</Label>
                <div className="grid grid-cols-2 gap-2">
                  {GIFT_CARD_BRANDS.map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => setSelectedGiftCard(b.name)}
                      className={cn(
                        "p-3 rounded-2xl border text-left transition-all flex items-center gap-2.5",
                        selectedGiftCard === b.name
                          ? "border-primary bg-primary/10 text-foreground font-semibold"
                          : "border-border/60 bg-card text-muted-foreground hover:bg-secondary/40"
                      )}
                    >
                      <span className="text-xl">{b.icon}</span>
                      <span className="text-xs">{b.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="gemail">Delivery Email Address</Label>
                <Input
                  id="gemail"
                  type="email"
                  required
                  value={giftCardEmail}
                  onChange={(e) => setGiftCardEmail(e.target.value)}
                  placeholder="Where should we send your digital code?"
                  className="h-11 rounded-xl"
                />
                <p className="text-[11px] text-muted-foreground">
                  The gift card redemption code and instructions will be delivered to this inbox upon weekend payout approval.
                </p>
              </div>
            </div>
          )}

          <Button
            type="submit"
            disabled={
              busy ||
              points < MINIMUM_WITHDRAWAL_POINTS ||
              (payoutMethod === "bank" && !isVerified) ||
              (payoutMethod === "card" && !cardNumber.trim()) ||
              (payoutMethod === "giftcard" && !giftCardEmail.includes("@"))
            }
            className="w-full h-11 rounded-xl font-medium shadow-xs transition-all active:scale-[0.98] mt-2"
          >
            {busy && <Loader2 className="animate-spin size-4 mr-2" />}
            {points < MINIMUM_WITHDRAWAL_POINTS
              ? `Earn ${MINIMUM_WITHDRAWAL_POINTS.toLocaleString()} ${POINTS_NAME} to cash out`
              : payoutMethod === "bank" && !isVerified
              ? "Verify bank account number"
              : "Request Cash Out"}
          </Button>
        </form>

        {/* Activity Ledger */}
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
                        Cash Out: {formatNaira(w.amount_naira)} ({formatUsd(w.amount_naira / 1400)})
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

            {(activityTab === "all" || activityTab === "earnings") &&
              (ledger.data ?? []).map((l) => (
                <div
                  key={`l-${l.id}`}
                  className="flex items-center justify-between gap-3 p-3 rounded-2xl border border-border/60 bg-secondary/15 hover:bg-secondary/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "grid size-9 place-items-center rounded-xl shrink-0",
                        l.amount > 0 ? "bg-brand/10 text-brand" : "bg-red-500/10 text-red-600"
                      )}
                    >
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
                  <span
                    className={cn(
                      "font-mono text-xs font-bold shrink-0",
                      l.amount > 0 ? "text-brand dark:text-brand" : "text-muted-foreground"
                    )}
                  >
                    {l.amount > 0 ? `+${l.amount.toLocaleString()}` : l.amount.toLocaleString()} pts
                  </span>
                </div>
              ))}

            {((activityTab === "withdrawals" && (withdrawals.data ?? []).length === 0) ||
              (activityTab === "earnings" && (ledger.data ?? []).length === 0) ||
              (activityTab === "all" &&
                (withdrawals.data ?? []).length === 0 &&
                (ledger.data ?? []).length === 0)) && (
              <div className="py-12 text-center text-xs text-muted-foreground">
                No transaction activity found.
              </div>
            )}
          </div>
        </section>
      </div>

      <SyllaPlusModal
        open={showPlusModal}
        onClose={() => setShowPlusModal(false)}
      />
    </div>
  );
}
