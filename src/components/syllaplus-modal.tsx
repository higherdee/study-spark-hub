import { useState } from "react";
import { Check, Loader2, Sparkles, X, Zap, CreditCard, ShieldCheck, Shield } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import {
  formatNaira,
  formatUsd,
  SYLLAPLUS_PRICING,
} from "@/lib/constants";
import { useGeo } from "@/lib/geo";
import {
  createBachsCheckoutSessionServerFn,
  upgradeToSyllaPlusServerFn,
} from "@/lib/upload.functions";
import { cn } from "@/lib/utils";

interface SyllaPlusModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function SyllaPlusModal({ open, onClose, onSuccess }: SyllaPlusModalProps) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { isRegional, countryName } = useGeo();
  const [billingCycle, setBillingCycle] = useState<"weekly" | "monthly" | "yearly">("monthly");
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const currentPriceDisplay = isRegional
    ? billingCycle === "weekly"
      ? `${formatNaira(SYLLAPLUS_PRICING.regional.weekly)} / week`
      : billingCycle === "yearly"
      ? `${formatNaira(SYLLAPLUS_PRICING.regional.yearly)} / year`
      : `${formatNaira(SYLLAPLUS_PRICING.regional.monthly)} / month`
    : billingCycle === "yearly"
    ? `${formatUsd(SYLLAPLUS_PRICING.international.yearly)} / year`
    : `${formatUsd(SYLLAPLUS_PRICING.international.monthly)} / month`;

  const handleCheckout = async () => {
    if (!user) {
      toast.error("Please log in to upgrade.");
      return;
    }

    setLoading(true);
    try {
      toast.loading("Initiating secure checkout...", { id: "checkout" });

      const amountNaira = isRegional
        ? billingCycle === "weekly"
          ? SYLLAPLUS_PRICING.regional.weekly
          : billingCycle === "yearly"
          ? SYLLAPLUS_PRICING.regional.yearly
          : SYLLAPLUS_PRICING.regional.monthly
        : Math.round(
            (billingCycle === "yearly"
              ? SYLLAPLUS_PRICING.international.yearly
              : SYLLAPLUS_PRICING.international.monthly) * 1500
          );

      const res = await createBachsCheckoutSessionServerFn({
        data: {
          userId: user.id,
          email: user.email || "student@syllaboss.org",
          amountNaira,
        },
      });

      if (res.checkoutUrl) {
        toast.success("Redirecting to payment gateway...", { id: "checkout" });
        window.location.href = res.checkoutUrl;
        return;
      }

      // Direct activation fallback
      toast.loading("Activating SyllaPlus membership...", { id: "checkout" });
      await upgradeToSyllaPlusServerFn({ data: { userId: user.id } });
      await qc.invalidateQueries({ queryKey: ["profile"] });
      await qc.invalidateQueries({ queryKey: ["ledger"] });

      toast.success("Welcome to SyllaPlus! +300 points added & 1.3x multiplier unlocked!", {
        id: "checkout",
      });
      setLoading(false);
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Payment initialization failed.", {
        id: "checkout",
      });
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-white/20 bg-card p-6 sm:p-8 shadow-2xl backdrop-blur-2xl animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Ambient glow */}
        <div className="absolute -top-24 -right-24 size-56 rounded-full bg-gradient-to-br from-brass/25 via-primary/20 to-transparent blur-3xl pointer-events-none" />

        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2 rounded-full border border-brass/30 bg-brass/10 px-3 py-1 text-xs font-semibold text-brass-ink dark:text-brass">
            <Sparkles className="size-3.5" />
            <span>VIP Academic Membership</span>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="grid size-8 place-items-center rounded-full text-muted-foreground hover:bg-secondary transition-all"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="mt-4">
          <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Upgrade to <span className="text-brass">SyllaPlus</span>
          </h2>
          <p className="mt-1.5 text-xs sm:text-sm text-muted-foreground leading-relaxed">
            Elevate your academic workflow with 1.3x reward multipliers, instant +300 point welcome bonus, and unlimited Boss AI power.
          </p>
        </div>

        {/* Location-Locked Plan Options (Strictly 1 region shown) */}
        <div className="mt-6">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
            <span>Select Billing Cycle:</span>
            <span className="font-medium text-foreground">{countryName} Pricing</span>
          </div>

          {isRegional ? (
            // Regional Tier (Africa, India, Pakistan, Nepal)
            <div className="grid grid-cols-3 gap-2 text-xs">
              <button
                type="button"
                onClick={() => setBillingCycle("weekly")}
                className={cn(
                  "p-2.5 rounded-2xl border text-center transition-all",
                  billingCycle === "weekly"
                    ? "border-brass bg-brass/10 text-foreground font-bold shadow-xs ring-1 ring-brass/30"
                    : "border-border/60 bg-card text-muted-foreground hover:bg-secondary/40"
                )}
              >
                <div className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Weekly</div>
                <div className="mt-1 font-mono font-bold text-foreground">₦2,499</div>
                <div className="text-[9px] text-muted-foreground">/ week</div>
              </button>

              <button
                type="button"
                onClick={() => setBillingCycle("monthly")}
                className={cn(
                  "p-2.5 rounded-2xl border text-center transition-all relative",
                  billingCycle === "monthly"
                    ? "border-brass bg-brass/10 text-foreground font-bold shadow-xs ring-1 ring-brass/30"
                    : "border-border/60 bg-card text-muted-foreground hover:bg-secondary/40"
                )}
              >
                <span className="absolute -top-2 left-1/2 -translate-x-1/2 rounded-full bg-brass px-1.5 py-0.2 text-[8px] font-bold text-white uppercase tracking-wider">
                  Popular
                </span>
                <div className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Monthly</div>
                <div className="mt-1 font-mono font-bold text-foreground">₦7,999</div>
                <div className="text-[9px] text-muted-foreground">/ month</div>
              </button>

              <button
                type="button"
                onClick={() => setBillingCycle("yearly")}
                className={cn(
                  "p-2.5 rounded-2xl border text-center transition-all relative",
                  billingCycle === "yearly"
                    ? "border-brass bg-brass/10 text-foreground font-bold shadow-xs ring-1 ring-brass/30"
                    : "border-border/60 bg-card text-muted-foreground hover:bg-secondary/40"
                )}
              >
                <span className="absolute -top-2 left-1/2 -translate-x-1/2 rounded-full bg-emerald-600 px-1.5 py-0.2 text-[8px] font-bold text-white uppercase tracking-wider">
                  Save 17%
                </span>
                <div className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Yearly</div>
                <div className="mt-1 font-mono font-bold text-foreground">₦80,000</div>
                <div className="text-[9px] text-muted-foreground">/ year</div>
              </button>
            </div>
          ) : (
            // International Tier (USD / Global)
            <div className="grid grid-cols-2 gap-3 text-xs">
              <button
                type="button"
                onClick={() => setBillingCycle("monthly")}
                className={cn(
                  "p-3 rounded-2xl border text-center transition-all relative",
                  billingCycle === "monthly"
                    ? "border-brass bg-brass/10 text-foreground font-bold shadow-xs ring-1 ring-brass/30"
                    : "border-border/60 bg-card text-muted-foreground hover:bg-secondary/40"
                )}
              >
                <span className="absolute -top-2 left-1/2 -translate-x-1/2 rounded-full bg-brass px-1.5 py-0.2 text-[8px] font-bold text-white uppercase tracking-wider">
                  Popular
                </span>
                <div className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Monthly</div>
                <div className="mt-1 font-mono font-bold text-foreground">$13.99</div>
                <div className="text-[10px] text-muted-foreground">/ month</div>
              </button>

              <button
                type="button"
                onClick={() => setBillingCycle("yearly")}
                className={cn(
                  "p-3 rounded-2xl border text-center transition-all relative",
                  billingCycle === "yearly"
                    ? "border-brass bg-brass/10 text-foreground font-bold shadow-xs ring-1 ring-brass/30"
                    : "border-border/60 bg-card text-muted-foreground hover:bg-secondary/40"
                )}
              >
                <span className="absolute -top-2 left-1/2 -translate-x-1/2 rounded-full bg-emerald-600 px-1.5 py-0.2 text-[8px] font-bold text-white uppercase tracking-wider">
                  Save 28%
                </span>
                <div className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Yearly</div>
                <div className="mt-1 font-mono font-bold text-foreground">$119.99</div>
                <div className="text-[10px] text-muted-foreground">/ year billed annually</div>
              </button>
            </div>
          )}
        </div>

        {/* Benefits list (Zero emojis) */}
        <div className="mt-5 space-y-2.5">
          <div className="flex items-start gap-3 rounded-2xl border border-brass/25 bg-brass/5 p-3">
            <div className="grid size-7 shrink-0 place-items-center rounded-xl bg-brass/15 text-brass-ink dark:text-brass">
              <Zap className="size-3.5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-foreground">1.3x Earning Multiplier</p>
              <p className="text-[11px] text-muted-foreground">
                Earn 33 pts per verified upload, 7 pts per study sprint, and higher royalty rates on all library downloads.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-2xl border border-border/60 bg-card p-3">
            <div className="grid size-7 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
              <Sparkles className="size-3.5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-foreground">+300 SyllaPoints Instantly Credited</p>
              <p className="text-[11px] text-muted-foreground">
                Immediate balance boost deposited into your wallet upon activation.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-2xl border border-border/60 bg-card p-3">
            <div className="grid size-7 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
              <Check className="size-3.5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-foreground">Unlimited Boss AI with KaTeX Formulas</p>
              <p className="text-[11px] text-muted-foreground">
                1-click document executive summaries, worked step-by-step problem derivations, and infinite battle quizzes.
              </p>
            </div>
          </div>
        </div>

        {/* Action button */}
        <div className="mt-6 flex flex-col gap-2">
          <Button
            onClick={handleCheckout}
            disabled={loading}
            className="w-full h-11 rounded-xl text-xs sm:text-sm font-semibold bg-gradient-to-r from-brass to-brass-ink hover:from-brass-ink hover:to-brass-ink text-white shadow-lg shadow-brass/20 transition-all active:scale-[0.98]"
          >
            {loading ? (
              <Loader2 className="animate-spin size-4 mr-2" />
            ) : (
              <CreditCard className="size-4 mr-2" />
            )}
            Subscribe ({currentPriceDisplay})
          </Button>
          <Button
            variant="ghost"
            onClick={onClose}
            className="w-full h-9 rounded-xl text-xs text-muted-foreground hover:text-foreground"
          >
            Continue with Free Account
          </Button>
          <p className="text-[10px] text-center text-muted-foreground flex items-center justify-center gap-1 mt-1">
            <Shield className="size-3 text-brass" />
            <span>Secure 256-bit payment via Bachs gateway</span>
          </p>
        </div>
      </div>
    </div>
  );
}
