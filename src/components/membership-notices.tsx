import { useEffect, useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import { Sparkles, X } from "lucide-react";
import { useMembership } from "@/hooks/use-membership";
import { useAuth } from "@/hooks/use-auth";
import { SyllaPlusModal } from "./syllaplus-modal";
import { TERMS_VERSION } from "./account-consent";
export function MembershipNotices() {
  const { user, getToken } = useAuth();
  const membership = useMembership();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  useEffect(() => { const show = () => setOpen(true); window.addEventListener("syllaboss:upgrade", show); return () => window.removeEventListener("syllaboss:upgrade", show); }, []);
  useEffect(() => { setDismissed(false); }, [pathname]);
  useEffect(() => {
    document.documentElement.dataset["membership"] = membership.data?.paid ? "plus" : "free";
    if (user && sessionStorage.getItem("syllaboss-pending-terms") === TERMS_VERSION) {
      void getToken().then(token => fetch("/api/membership", { method: "POST", headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify({ action: "accept-terms", version: TERMS_VERSION, accepted: true }) })).then((response) => { if (response.ok) sessionStorage.removeItem("syllaboss-pending-terms"); }).catch(() => { /* Keep pending acceptance for the next authenticated visit. */ });
    }
  }, [user?.id, membership.data?.paid]);
  return <><SyllaPlusModal open={open} onClose={() => setOpen(false)}/>{user && membership.data && !membership.data.paid && pathname.startsWith("/dashboard") && !dismissed && <aside className="fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] right-3 z-40 max-w-[min(21rem,calc(100vw-1.5rem))] rounded-2xl border border-brand/15 bg-card p-4 shadow-lg sm:bottom-5 sm:right-5"><button aria-label="Dismiss SyllaPlus offer" onClick={() => setDismissed(true)} className="absolute right-1 top-1 grid size-9 place-items-center rounded-full text-muted-foreground"><X className="size-4"/></button><p className="flex items-center gap-2 pr-6 text-sm font-semibold"><Sparkles className="size-4 text-brand"/>Keep your study momentum.</p><p className="mt-2 text-xs leading-5 text-muted-foreground">More AI time, more downloads and longer chat history. Subscribe to SyllaPlus and get seven extra days before your first renewal.</p>{pathname.includes("assistant") && <p className="mt-2 text-xs text-muted-foreground">Free chats are deleted after seven days.{membership.data.retention.startsAt && Date.parse(membership.data.retention.startsAt) > Date.now() ? ` Your transition ends ${new Date(membership.data.retention.startsAt).toLocaleDateString()}.` : ""}</p>}<button onClick={() => setOpen(true)} className="mt-3 min-h-10 rounded-xl bg-brand px-4 text-xs font-semibold text-white">See SyllaPlus plans</button></aside>}</>;
}
