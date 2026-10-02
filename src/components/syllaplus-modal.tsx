import { useState } from "react";
import { Check, Loader2, Sparkles, X, Zap } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import {
  PAYSTACK_PUBLIC_KEY,
  SYLLAPLUS_PRICE_NAIRA,
  formatNaira,
} from "@/lib/constants";
import { upgradeToSyllaPlusServerFn } from "@/lib/upload.functions";

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

  const handlePaystackPayment = () => {
    if (!user) {
      toast.error("Please log in to upgrade.");
      return;
    }

    setLoading(true);

    // Load Paystack inline script if not present
    const scriptId = "paystack-inline-js";
    let script = document.getElementById(scriptId) as HTMLScriptElement | null;

    const startPaystack = () => {
      // @ts-expect-error - PaystackPop injected via external script
      if (typeof window.PaystackPop === "undefined") {
        toast.error("Could not load payment gateway. Please check your connection.");
        setLoading(false);
        return;
      }

      // @ts-expect-error - PaystackPop
      const handler = window.PaystackPop.setup({
        key: PAYSTACK_PUBLIC_KEY,
        email: user.email || "student@syllaboss.com",
        amount: SYLLAPLUS_PRICE_NAIRA * 100, // in kobo
        currency: "NGN",
        ref: `syllaplus_${user.id}_${Date.now()}`,
        metadata: {
          custom_fields: [
            {
              display_name: "Plan",
              variable_name: "plan",
              value: "SyllaPlus Membership",
            },
            {
              display_name: "User ID",
              variable_name: "user_id",
              value: user.id,
            },
          ],
        },
        callback: async (response: { reference: string }) => {
          try {
            toast.loading("Activating your SyllaPlus membership...", { id: "plus-upgrade" });
            await upgradeToSyllaPlusServerFn({ data: { userId: user.id } });
            await qc.invalidateQueries({ queryKey: ["profile"] });
            await qc.invalidateQueries({ queryKey: ["ledger"] });
            toast.success("Welcome to SyllaPlus! +300 points added & 1.3x multiplier unlocked ⚡", {
              id: "plus-upgrade",
            });
            setLoading(false);
            if (onSuccess) onSuccess();
            onClose();
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to activate upgrade.", {
              id: "plus-upgrade",
            });
            setLoading(false);
          }
        },
        onClose: () => {
          setLoading(false);
          toast("Payment cancelled.");
        },
      });

      handler.openIframe();
    };

    if (!script) {
      script = document.createElement("script");
      script.id = scriptId;
      script.src = "https://js.paystack.co/v1/inline.js";
      script.async = true;
      script.onload = () => startPaystack();
      script.onerror = () => {
        toast.error("Failed to load Paystack payment window.");
        setLoading(false);
      };
      document.body.appendChild(script);
    } else {
      startPaystack();
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
            onClick={handlePaystackPayment}
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
