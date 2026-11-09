import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

export function MembershipGifts({ points, onIssued }: { points: number; onIssued: () => void }) {
  const { getToken } = useAuth();
  const [confirmation, setConfirmation] = useState<{ days: number; points: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [request, setRequest] = useState<{ id: string; days: number } | null>(null);
  const options = useQuery({ queryKey: ["membership-gift-quotes"], queryFn: async () => {
    const response = await fetch("/api/mobile?resource=gift-cashout", { headers: { Authorization: `Bearer ${await getToken()}` } });
    if (!response.ok) throw new Error("Gift prices could not load.");
    return (await response.json()).membershipGifts as Array<{ days: number; points: number }>;
  } });
  async function issue(days: number) {
    const pending = request?.days === days ? request : { id: crypto.randomUUID(), days };
    setRequest(pending); setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/mobile", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${await getToken()}` }, body: JSON.stringify({ action: "membership-gift", days, requestId: pending.id }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Gift issuance failed.");
      setMessage(`Your code ${result.gift.code} is in your Peers inbox.`);
      setRequest(null); onIssued();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Please retry."); }
    finally { setBusy(false); }
  }
  return <section className="rounded-3xl border bg-card p-6 space-y-4">
    <h2 className="font-serif text-2xl">Give the gift of SyllaPlus</h2>
    <p className="text-sm text-muted-foreground">Exchange points for a code instantly delivered by DM. Use it yourself or share it. Redeem at checkout for $0 within three months.</p>
    <div className="flex flex-wrap gap-3">{options.data?.map(option => <Button key={option.days} variant="outline" disabled={busy || points < option.points} onClick={() => setConfirmation(option)}>{option.days} days · {option.points.toLocaleString()} points</Button>)}</div>
    {options.isError && <p role="alert">Gift prices could not load. <button onClick={() => void options.refetch()}>Try again</button></p>}
    {message && <p role="status" className="text-sm break-words">{message} <Link to="/dashboard/community" className="underline">Open Peers</Link></p>}
    <AlertDialog open={!!confirmation} onOpenChange={open=>{if(!open)setConfirmation(null)}}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Confirm SyllaPlus gift</AlertDialogTitle><AlertDialogDescription>Spend {confirmation?.points.toLocaleString()} SyllaPoints for {confirmation?.days} days of SyllaPlus? Your remaining balance will be {(points-(confirmation?.points||0)).toLocaleString()} points. The code will arrive in Peers and expires in three months.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Keep my points</AlertDialogCancel><AlertDialogAction onClick={()=>{if(confirmation)void issue(confirmation.days);setConfirmation(null)}}>Confirm exchange</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </section>;
}
