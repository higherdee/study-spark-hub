import { useState } from "react";
import { Check, Loader2, Sparkles, X, Zap } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import {
  SYLLAPLUS_PRICE_NAIRA,
  formatNaira,
} from "@/lib/constants";
import {
  createBachsCheckoutSessionServerFn,
  upgradeToSyllaPlusServerFn,
} from "@/lib/upload.functions";

interface SyllaPlusModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function SyllaPlusModal({ open, onClose, onSuccess }: SyllaPlusModalProps) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const handleBachsPayment = async () => {
    if (!user) {
      toast.error("Please log in to upgrade.");
      return;
    }

    setLoading(true);
    try {
      toast.loading("Initiating Bachs secure checkout...", { id: "bachs-checkout" });

      const res = await createBachsCheckoutSessionServerFn({
        data: {
          userId: user.id,
          email: user.email || "student@syllaboss.org",
          amountNaira: SYLLAPLUS_PRICE_NAIRA,
        },
      });

      if (res.checkoutUrl) {
        toast.success("Redirecting to Bachs payment portal...", { id: "bachs-checkout" });
        window.location.href = res.checkoutUrl;
        return;
      }

      // If Bachs API mock/direct activation
      toast.loading("Activating your SyllaPlus membership...", { id: "bachs-checkout" });
      await upgradeToSyllaPlusServerFn({ data: { userId: user.id } });
      await qc.invalidateQueries({ queryKey: ["profile"] });
      await qc.invalidateQueries({ queryKey: ["ledger"] });

      toast.success("Welcome to SyllaPlus! +300 points added & 1.3x multiplier unlocked!", {
        id: "bachs-checkout",
      });
      setLoading(false);
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Payment initialization failed.", {
        id: "bachs-checkout",
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
        {/* Glow ambient background */}
        <div className="absolute -top-20 -right-20 size-48 rounded-full bg-gradient-to-br from-amber-500/20 to-primary/20 blur-3xl pointer-events-none" />

        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-700 dark:text-amber-300">
            <Sparkles className="size-3.5" />
            <span>VIP Academic Pass</span>
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
            Supercharge Your Journey with <span className="text-amber-500">SyllaPlus</span>
          </h2>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
            Upgrade your account to unlock accelerated earnings, 300 bonus points right away, and unlimited AI study power.
          </p>
        </div>

        <div className="mt-6 space-y-3">
          <div className="flex items-start gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-3.5">
            <div className="grid size-8 shrink-0 place-items-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Zap className="size-4" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">1.3x Earning Multiplier</p>
              <p className="text-xs text-muted-foreground">
                Earn 1.3x on all verified uploads (33 pts), downloads (7 pts), views (3 pts), and study sessions (7 pts)!
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-2xl border border-border/60 bg-card p-3.5">
            <div className="grid size-8 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
              <Sparkles className="size-4" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">+300 SyllaPoints Bonus</p>
              <p className="text-xs text-muted-foreground">
                Instantly credited upon activation to boost your balance.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-2xl border border-border/60 bg-card p-3.5">
            <div className="grid size-8 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
              <Check className="size-4" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Unlimited Boss AI & Summaries</p>
              <p className="text-xs text-muted-foreground">
                Zero waiting time, 1-click document executive summaries, and intelligent exam prep.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-7 flex flex-col gap-2.5">
          <Button
            onClick={handleBachsPayment}
            disabled={loading}
            className="w-full h-12 rounded-xl text-sm font-semibold bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-lg shadow-amber-500/20 transition-all active:scale-[0.98]"
          >
            {loading ? (
              <Loader2 className="animate-spin size-4 mr-2" />
            ) : (
              <Sparkles className="size-4 mr-2" />
            )}
            Upgrade to SyllaPlus ({formatNaira(SYLLAPLUS_PRICE_NAIRA)}/mo)
          </Button>
          <Button
            variant="ghost"
            onClick={onClose}
            className="w-full h-10 rounded-xl text-xs text-muted-foreground hover:text-foreground"
          >
            Continue with Free Account
          </Button>
        </div>
      </div>
    </div>
  );
}
