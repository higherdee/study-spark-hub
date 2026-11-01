import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
export function PromoCodeEntry() {
  const [code, setCode] = useState(""); const [busy, setBusy] = useState(false); const [message, setMessage] = useState("");
  const request = useRef({ code: "", id: "" }); const { getToken } = useAuth(); const cache = useQueryClient();
  return <form className="space-y-3 rounded-2xl border p-5" onSubmit={async e => {
    e.preventDefault(); if (busy) return; setBusy(true); setMessage("");
    const normalized = code.trim().toUpperCase();
    if (request.current.code !== normalized) request.current = { code: normalized, id: crypto.randomUUID() };
    try {
      const token = await getToken(); const response = await fetch("/api/membership", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ action: "redeem-promo", code: normalized, requestId: request.current.id }) });
      const result = await response.json(); if (!response.ok) throw new Error(result.error || "Your code could not be redeemed.");
      const benefit = result.effect === "plus_days" ? `${result.value} SyllaPlus days` : result.effect === "ai_tokens" ? `${result.value} extra AI response tokens` : `${result.value} extra material downloads`;
      setMessage(`Added ${benefit}. Available until ${new Date(result.expires_at).toLocaleString()}. This does not change a paid subscription's renewal date.`);
      void cache.invalidateQueries({ queryKey: ["membership"] }); void cache.invalidateQueries({ queryKey: ["profile"] });
    } catch (error) { setMessage(error instanceof Error ? error.message : "Try again shortly."); } finally { setBusy(false); }
  }}><label htmlFor="promo-code" className="block font-semibold">Have a promo code?</label><div className="flex gap-2"><input id="promo-code" value={code} onChange={e => setCode(e.target.value)} required maxLength={32} autoCapitalize="characters" className="min-w-0 flex-1 rounded-xl border bg-background px-3 py-2 text-base" placeholder="Enter your code"/><button disabled={busy || !code.trim()} className="rounded-xl bg-primary px-4 py-2 text-primary-foreground disabled:opacity-50">{busy ? "Applying…" : "Apply"}</button></div><p role="status" className="text-sm text-muted-foreground">{message || "AI token credits expire at midnight UTC; download credits expire at the end of the UTC month."}</p></form>;
}
