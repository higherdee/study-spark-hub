import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { ArrowRight, Check, Gift, Loader2, Mail } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useProfile } from "@/lib/profile";
import { getWithdrawals } from "@/integrations/turso/client";
import { requestWithdrawalServerFn } from "@/lib/upload.functions";
import { MembershipGifts } from "@/components/wallet/membership-gifts";
import { NativePageTitle } from "@/components/native-web/screens";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { AmazonLogo, AppleLogo, VisaLogo, SteamLogo } from "@/components/wallet/gift-card-svgs";
const brands = [
  { id: "amazon", name: "Amazon", Icon: AmazonLogo },
  { id: "apple", name: "Apple", Icon: AppleLogo },
  { id: "visa", name: "Visa", Icon: VisaLogo },
  { id: "steam", name: "Steam", Icon: SteamLogo },
] as const;
export function GiftCashout() {
  const { user, getToken } = useAuth();
  const { data: profile, isPending: profilePending } = useProfile();
  const cache = useQueryClient();
  const [brand, setBrand] = useState<(typeof brands)[number]["id"]>("amazon");
  const [amount, setAmount] = useState(5);
  const [email, setEmail] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const points = Number(profile?.points || 0);
  const prices = useQuery({
    queryKey: ["gift-cashout-options", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const token = await getToken();
      const response = await fetch("/api/mobile?resource=gift-cashout", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!response.ok) throw Error("Gift card prices could not load. Please try again.");
      return (await response.json()).options as Array<{
        amountUsd: number;
        points: number;
        label: string;
      }>;
    },
  });
  const history = useQuery({
    queryKey: ["withdrawals", user?.id],
    enabled: !!user,
    queryFn: () => getWithdrawals(user!.id),
    refetchInterval: 15000,
  });
  const choice = prices.data?.find((row) => row.amountUsd === amount);
  const selectedBrand = brands.find((row) => row.id === brand)!;
  function refresh() {
    void cache.invalidateQueries({ queryKey: ["profile"] });
    void cache.invalidateQueries({ queryKey: ["ledger"] });
    void cache.invalidateQueries({ queryKey: ["withdrawals"] });
  }
  function review(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (!choice || points < choice.points) {
      setError("You don’t have enough SyllaPoints for this gift card yet.");
      return;
    }
    setConfirm(true);
  }
  async function submit() {
    if (busy || !choice) return;
    setBusy(true);
    setError("");
    try {
      await requestWithdrawalServerFn({ data: { brand, amount, email: email.trim() } });
      setConfirm(false);
      setSubmitted(true);
      refresh();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Your request could not be submitted. Please retry.",
      );
      setConfirm(false);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="app-cashout native-page">
      <NativePageTitle
        eyebrow="Make your progress count"
        title="Turn points into a gift card."
        description="A little reward for the work you put in."
      />
      <div className="app-points-balance">
        <Gift aria-hidden="true" />
        <div>
          <span>Available balance</span>
          <strong>
            {profilePending ? "…" : points.toLocaleString()} <small>SyllaPoints</small>
          </strong>
        </div>
      </div>
      <div className="app-cashout-grid">
        <MembershipGifts points={points} onIssued={refresh} />
        <form onSubmit={review} className="app-gift-request">
          <div>
            <span className="native-eyebrow">For something you love</span>
            <h2>Choose your gift card.</h2>
            <p>
              An administrator reviews your request and sends the card to your delivery email or
              Peers inbox.
            </p>
          </div>
          <fieldset disabled={busy || submitted}>
            <legend>Gift card provider</legend>
            <div className="app-gift-brands">
              {brands.map(({ id, name, Icon }) => (
                <button
                  type="button"
                  key={id}
                  aria-pressed={brand === id}
                  onClick={() => setBrand(id)}
                >
                  <Icon className="app-gift-logo" />
                  <span>{name}</span>
                  {brand === id && <Check className="size-4" />}
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset disabled={busy || submitted}>
            <legend>Card value</legend>
            {prices.isPending ? (
              <p role="status">Loading current prices…</p>
            ) : prices.isError ? (
              <p role="alert">
                Gift prices could not load.{" "}
                <button
                  type="button"
                  className="native-text-button"
                  onClick={() => void prices.refetch()}
                >
                  Try again
                </button>
              </p>
            ) : (
              <div className="app-gift-values">
                {prices.data?.map((row) => (
                  <button
                    type="button"
                    key={row.amountUsd}
                    aria-pressed={amount === row.amountUsd}
                    onClick={() => setAmount(row.amountUsd)}
                  >
                    <strong>${row.amountUsd} USD</strong>
                    <span>{row.points.toLocaleString()} pts</span>
                  </button>
                ))}
              </div>
            )}
          </fieldset>
          <label className="app-gift-email">
            <span>
              <Mail className="size-4" />
              Delivery email
            </span>
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              placeholder={user?.email || "you@example.com"}
              disabled={busy || submitted}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          {choice && (
            <div className="app-gift-summary">
              <span>
                {selectedBrand.name} · ${amount} USD
              </span>
              <strong>{choice.points.toLocaleString()} points</strong>
            </div>
          )}
          {error && (
            <p role="alert" className="native-form-error">
              {error}
            </p>
          )}
          {submitted ? (
            <div className="app-gift-success" role="status">
              <Check />
              <h3>Request received.</h3>
              <p>We’ll deliver your gift card after review. Follow its progress below.</p>
              <button
                type="button"
                className="native-text-button"
                onClick={() => setSubmitted(false)}
              >
                Request another gift card
              </button>
            </div>
          ) : (
            <button
              className="native-primary-button"
              disabled={busy || !choice || profilePending || points < choice.points}
            >
              {busy ? (
                <Loader2 className="size-5 animate-spin" />
              ) : (
                <ArrowRight className="size-5" />
              )}
              Review request
            </button>
          )}
        </form>
      </div>
      <section className="app-redemption-history">
        <h2>Your requests</h2>
        {history.isPending ? (
          <p role="status">Loading requests…</p>
        ) : history.isError ? (
          <button className="native-text-button" onClick={() => void history.refetch()}>
            Reload requests
          </button>
        ) : !history.data?.length ? (
          <p>Your gift card requests will appear here.</p>
        ) : (
          <ol>
            {history.data.map((row) => (
              <li key={row.id}>
                <Gift />
                <div>
                  <strong>{row.bank_name || "Gift card"}</strong>
                  <span>
                    {new Date(row.created_at).toLocaleDateString()} · {row.points.toLocaleString()}{" "}
                    points
                  </span>
                </div>
                <span className="app-request-status">
                  {row.status === "paid"
                    ? "Delivered"
                    : row.status === "pending"
                      ? "In review"
                      : row.status}
                </span>
              </li>
            ))}
          </ol>
        )}
      </section>
      <AlertDialog
        open={confirm}
        onOpenChange={(open) => {
          if (!busy) setConfirm(open);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm gift card cashout</AlertDialogTitle>
            <AlertDialogDescription>
              Spend {choice?.points.toLocaleString()} SyllaPoints on a ${amount}{" "}
              {selectedBrand.name} gift card? Your balance will be{" "}
              {(points - (choice?.points || 0)).toLocaleString()} points. Delivery email:{" "}
              {email.trim()}. An administrator will review your request.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Keep my points</AlertDialogCancel>
            <button
              type="button"
              className="native-primary-button"
              disabled={busy}
              onClick={() => void submit()}
            >
              {busy ? "Submitting…" : "Confirm request"}
            </button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
