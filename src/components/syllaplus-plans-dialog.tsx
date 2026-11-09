import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Check, ExternalLink, Loader2, ShieldCheck, Sparkles } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { PLAN_IDS, formatPrice, type BillingSummary, type PlanId } from "@/lib/billing/catalog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const COUNTRY_CODES = "AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS XK YE YT ZA ZM ZW".split(" ");
const names = new Intl.DisplayNames(["en"], { type: "region" });
const countries = [...new Set(COUNTRY_CODES)].map((code) => ({ code, name: names.of(code) || code })).sort((a, b) => a.name.localeCompare(b.name));
const planNames: Record<PlanId, string> = { weekly: "Weekly", monthly: "Monthly", yearly: "Yearly" };
const intervals: Record<PlanId, string> = { weekly: "week", monthly: "month", yearly: "year" };
interface Catalog { bankTransfer?: boolean; transferPrices?: Record<PlanId, number>; environment: "sandbox" | "live"; country: string | null; plans: { plan: PlanId; amount: number; currency: string; tier: string; ready: boolean; approximateAmount?: number | null; approximateCurrency?: string | null }[] }

export function SyllaPlusModal({ open, onClose, onSuccess }: { open: boolean; onClose: () => void; onSuccess?: () => void }) {
  const { user, getToken } = useAuth();
  const queryClient = useQueryClient();
  const [country, setCountry] = useState("");
  const [extending,setExtending]=useState(false);
  const [selected, setSelected] = useState<PlanId>("monthly");
  const [method, setMethod] = useState<"card" | "bank_transfer">("card");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [cancelConfirm, setCancelConfirm] = useState(false);
  const [error, setError] = useState("");
  const [giftCode, setGiftCode] = useState("");
  const [giftNotice, setGiftNotice] = useState("");
  const giftRequest = useRef("");
  const checkoutId = useRef<string | null>(null);
  const notified = useRef(false);

  async function request<T>(path: string, body?: unknown): Promise<T> {
    const token = await getToken();
    const response = await fetch(path, { method: body ? "POST" : "GET", headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body ? { "Content-Type": "application/json" } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Membership could not be loaded. Please retry.");
    return result;
  }

  const catalog = useQuery<Catalog>({ queryKey: ["billing-catalog", country], enabled: open,
    queryFn: async () => {
      const response = await fetch(`/api/billing?resource=catalog${country ? `&country=${country}` : ""}`);
      if (!response.ok) throw new Error("Plans could not be loaded. Please retry.");
      return response.json();
    }, staleTime: 60000 });
  const summary = useQuery<BillingSummary>({ queryKey: ["billing", user?.id, country], enabled: open && !!user,
    queryFn: () => request(`/api/billing${country ? `?country=${country}` : ""}`), refetchOnWindowFocus: true });

  useEffect(() => { if (!country && catalog.data?.country) setCountry(catalog.data.country); }, [catalog.data?.country, country]);
  useEffect(() => { if (catalog.data?.plans.length && !catalog.data.plans.some((plan) => plan.plan === selected)) setSelected("monthly"); }, [catalog.data, selected]);
  useEffect(() => {
    if (open && summary.data?.subscription?.hasAccess && summary.data.environment === "live" && !notified.current) {
      notified.current = true;
      void queryClient.invalidateQueries({ queryKey: ["profile", user?.id] });
    }
  }, [open, summary.data, user?.id, queryClient]);
  useEffect(() => { checkoutId.current = null; setConsent(false); setError(""); }, [country, selected, method]);
  useEffect(() => { if (!catalog.data?.bankTransfer) setMethod("card"); }, [catalog.data?.bankTransfer]);

  const current = summary.data?.subscription;
  const active=summary.data?.membership?.hasAccess || current?.hasAccess;
  const endsAt=summary.data?.membership?.endsAt || current?.periodEnd;
  const cardQuote = catalog.data?.plans.find((plan) => plan.plan === selected);
  const quote = method === "bank_transfer" && cardQuote && catalog.data?.transferPrices ? { ...cardQuote, currency: "NGN", amount: catalog.data.transferPrices[selected] } : cardQuote;
  const bonusDays = summary.data?.firstRenewalBonusDays ?? 7;
  const sandbox = catalog.data?.environment === "sandbox";

  async function checkout() {
    if (!quote || !consent || !user) return;
    setBusy(true); setError("");
    try {
      checkoutId.current ||= crypto.randomUUID();
      const result = await request<{ id: string; url: string }>("/api/billing", { action: "checkout", extension:!!active, id: checkoutId.current, country, method, plan: selected, acceptedTerms: true, recurringConsent: true });
      sessionStorage.setItem("syllaboss-last-checkout", result.id);
      window.location.assign(result.url);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Checkout could not open. Please retry."); }
    finally { setBusy(false); }
  }
  async function manage() {
    setBusy(true); setError("");
    try { const result = await request<{ url: string }>("/api/billing", { action: "manage" }); window.location.assign(result.url); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Billing could not open. Please retry."); }
    finally { setBusy(false); }
  }
  async function cancel() {
    setBusy(true); setError("");
    try { await request("/api/billing", { action: "cancel", confirmed: true }); setCancelConfirm(false); await summary.refetch(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Cancellation could not be completed. Please retry."); }
    finally { setBusy(false); }
  }

  return <Dialog open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
    <DialogContent className="max-h-[92dvh] max-w-xl overflow-y-auto p-5 sm:p-7">
      <DialogHeader className="gap-3 text-left">
        <span className="grid size-11 place-items-center rounded-2xl bg-brass-soft text-brass-ink"><Sparkles className="size-5" aria-hidden /></span>
        <div><p className="eyebrow text-brass-ink">SyllaPlus</p><DialogTitle className="mt-2 font-display text-3xl font-medium tracking-tight text-ink">{active?"Your SyllaPlus.":"More room to study."}</DialogTitle></div>
        <DialogDescription className="leading-relaxed">{active ? "Your study tools and membership, in one place." : bonusDays ? "Subscribe today and get seven extra days before your first renewal." : "Keep your study tools, saved conversations, and 1.3× study rewards together."}</DialogDescription>
      </DialogHeader>
      {sandbox && <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">Test checkout. No real payment is taken, and test purchases do not change your live membership.</p>}
      {active && <div className="space-y-4">
        <div className="rounded-2xl border border-border bg-muted/40 p-5"><p className="flex items-center gap-2 font-semibold"><ShieldCheck className="size-5 text-forest" /> {sandbox ? "Test membership" : "SyllaPlus is active"}</p><p className="mt-2 text-sm text-muted-foreground">{endsAt ? `${summary.data?.membership?.daysRemaining ?? 0} days remaining` : "Membership active"}{endsAt ? ` · Access until ${new Date(endsAt).toLocaleDateString()}` : ""}</p>{current?.status === "past_due" && <p className="mt-3 text-sm text-amber-800">Your provider reported a payment issue. Update your payment method before the grace period ends.</p>}{current?.cancelAt && <p className="mt-3 text-sm">Renewal is off. Your paid access continues until the date above.</p>}</div>
        {current && <Button className="min-h-12 w-full" disabled={busy} onClick={() => void manage()}>Manage billing <ExternalLink className="ml-2 size-4" /></Button>}
        {current && !current.cancelAt && !cancelConfirm && <Button variant="ghost" className="min-h-11 w-full" disabled={busy} onClick={() => setCancelConfirm(true)}>Cancel renewal</Button>}
        {cancelConfirm && <div className="rounded-xl border border-border p-4"><p className="text-sm leading-relaxed">Cancel the next renewal? You keep SyllaPlus until your current paid period ends.</p><div className="mt-4 flex flex-wrap gap-2"><Button variant="outline" disabled={busy} onClick={() => setCancelConfirm(false)}>Keep membership</Button><Button disabled={busy} onClick={() => void cancel()}>Confirm cancellation</Button></div></div>}
        <Button variant="outline" className="w-full" onClick={()=>{setExtending(!extending);setConsent(false);checkoutId.current=null}}>{extending?"Close extension options":"Add more time"}</Button>
      </div>}
      {(!active || extending) && <>
        <ul className="grid gap-3 py-1 text-sm sm:grid-cols-2">{["1.3× study rewards", "Higher Boss AI allowance", "Study materials with Boss AI", "More flashcards and questions", "More downloads", "Saved chat history"].map((benefit) => <li key={benefit} className="flex items-start gap-2"><Check className="mt-0.5 size-4 shrink-0 text-forest" />{benefit}</li>)}</ul>
        <label className="space-y-2 text-sm font-semibold">Billing country<select value={country} onChange={(event) => setCountry(event.target.value)} className="min-h-12 w-full rounded-xl border border-input bg-background px-3 text-base"><option value="">Choose your country</option>{countries.map((item) => <option key={item.code} value={item.code}>{item.name}</option>)}</select></label>
        {catalog.isLoading ? <p className="flex items-center gap-2 text-sm"><Loader2 className="size-4 animate-spin" /> Loading plans…</p> : country && <div className={`grid gap-2 ${catalog.data?.plans.length === 2 ? "grid-cols-2" : "grid-cols-3"}`}>
          {PLAN_IDS.map((plan) => { const offer = catalog.data?.plans.find((item) => item.plan === plan); if (!offer) return null;
            return <button key={plan} type="button" aria-pressed={selected === plan} onClick={() => setSelected(plan)} className={`min-h-28 rounded-2xl border p-3 text-left transition-colors ${selected === plan ? "border-forest bg-sage/40" : "border-border bg-background hover:bg-muted"}`}><span className="block text-xs text-muted-foreground">{planNames[plan]}</span><strong className="mt-2 block text-base sm:text-lg">{formatPrice(offer.amount, offer.currency)}</strong><span className="block text-xs text-muted-foreground">per {intervals[plan]}</span></button>;
          })}
        </div>}
        {catalog.data?.bankTransfer && <div className="flex gap-2"><Button variant={method === "card" ? "default" : "outline"} onClick={() => setMethod("card")}>Card · automatic renewal</Button><Button variant={method === "bank_transfer" ? "default" : "outline"} onClick={() => setMethod("bank_transfer")}>Bank transfer</Button></div>}
        {method === "bank_transfer" && <p className="text-sm">Pay in naira for the selected period. Bank transfers renew manually. Your membership starts after Bachs confirms payment.</p>}
        {!!quote && <p className="text-xs leading-relaxed text-muted-foreground">{formatPrice(quote.amount, quote.currency)} is charged today.{active ? " Time is added after your current expiry. This checkout does not create a second subscription." : bonusDays ? " Seven extra days are added before your first renewal, once per account." : ""} {active ? "" : method === "card" ? `After that, renewal is every ${intervals[selected]}.` : "Make another payment when your membership expires."} Taxes, if any, are shown before payment. Cancel renewal anytime.</p>}
        {quote?.tier === "regional" && country !== "NG" && <p className="text-xs leading-relaxed text-muted-foreground">{quote.approximateAmount != null && quote.approximateCurrency && quote.approximateCurrency !== quote.currency ? `Approximately ${formatPrice(quote.approximateAmount, quote.approximateCurrency)} in your local currency. ` : ""}Regional pricing is based on the naira plan. Your actual payment currency is {quote.currency}; your bank’s exchange rate may differ. <a className="underline" href="https://www.exchangerate-api.com" target="_blank" rel="noreferrer">Exchange-rate source</a></p>}
        <label className="flex items-start gap-3 rounded-xl bg-muted/40 p-3 text-sm leading-relaxed"><Checkbox checked={consent} onCheckedChange={(value) => setConsent(value === true)} className="mt-0.5" /><span>I agree to the <a href="/terms" target="_blank" rel="noreferrer" className="underline">Terms</a> and <a href="/privacy" target="_blank" rel="noreferrer" className="underline">Privacy Policy</a>, the payment today{active ? ". This is a one-time extension; my existing renewal moves to the extended expiry." : method === "card" ? ", and recurring charges at the displayed interval." : ". Bank-transfer access expires at the end of the paid period."}</span></label>
        {!user ? <Button asChild className="min-h-12 w-full"><a href="/auth?mode=signin">Sign in to subscribe <ArrowRight className="ml-2 size-4" /></a></Button> : <Button className="min-h-12 w-full" disabled={busy || !consent || !quote?.ready} onClick={() => void checkout()}>{busy ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}{active?"Add time":"Subscribe"}{quote ? ` — ${formatPrice(quote.amount, quote.currency)} today` : ""}<ArrowRight className="ml-2 size-4" /></Button>}
        {quote && !quote.ready && <p className="text-sm text-muted-foreground">Checkout for this region is being configured. No payment can be taken yet.</p>}
      </>}
      <div className="space-y-2 rounded-xl border border-border p-3">
        <label className="block text-sm font-semibold" htmlFor="syllaplus-gift">SyllaPlus gift code</label>
        <input id="syllaplus-gift" value={giftCode} maxLength={32} disabled={busy} className="w-full rounded-lg border border-input bg-background px-3 py-2"
          onChange={event => { setGiftCode(event.target.value); giftRequest.current = ""; }} />
        <Button type="button" variant="outline" disabled={busy || !/^SYLLAGIFT-/i.test(giftCode.trim())} onClick={async () => {
          setBusy(true); setError(""); setGiftNotice("");
          try {
            giftRequest.current ||= crypto.randomUUID();
            const result = await request<{ reward: { value: number } }>("/api/billing", { action: "redeem-gift", code: giftCode.trim(), requestId: giftRequest.current });
            setGiftNotice(`${result.reward.value} days of SyllaPlus added.`);
            setGiftCode(""); giftRequest.current = "";
            await summary.refetch();
          } catch (cause) {
            setError(cause instanceof Error ? cause.message : "Could not redeem your gift code.");
          } finally { setBusy(false); }
        }}>Redeem gift code</Button>
        {giftNotice && <p role="status" className="text-sm text-primary">{giftNotice}</p>}
      </div>
      {(error || catalog.error || summary.error) && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{error || (catalog.error || summary.error)?.message}</p>}
      <Button variant="ghost" className="min-h-11 w-full" onClick={() => { if (current?.hasAccess) onSuccess?.(); onClose(); }}>Back to my studies</Button>
    </DialogContent>
  </Dialog>;
}
