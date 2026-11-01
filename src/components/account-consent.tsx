import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
export const TERMS_VERSION = "2026-10-31";
export function TermsBeforeSignup({ children }: { children: ReactNode }) {
  const [checked, setChecked] = useState(false);
  const [accepted, setAccepted] = useState(false);
  if (accepted) return children;
  return <section className="rounded-3xl border border-border bg-card p-7 shadow-sm"><p className="text-xs font-semibold uppercase tracking-widest text-brand">Before you join</p><h1 className="mt-3 font-serif text-3xl">Your space. Clear terms.</h1><p className="mt-4 text-sm leading-6 text-muted-foreground">Please read how Syllaboss handles your account, study materials, rewards, and personal information before creating an account.</p><label className="mt-6 flex items-start gap-3 text-sm leading-6"><Checkbox checked={checked} onCheckedChange={(value) => setChecked(value === true)} className="mt-1"/><span>I agree to the <a href="/terms" target="_blank" rel="noopener noreferrer" className="font-medium underline underline-offset-4">Terms of Service</a> and acknowledge the <a href="/privacy" target="_blank" rel="noopener noreferrer" className="font-medium underline underline-offset-4">Privacy Policy</a>.</span></label><Button className="mt-6 h-12 w-full rounded-xl" disabled={!checked} onClick={() => { sessionStorage.setItem("syllaboss-pending-terms", TERMS_VERSION); setAccepted(true); }}>Continue to create account</Button><p className="mt-4 text-xs leading-5 text-muted-foreground">Free-account chat history is retained for seven days after the transition period. SyllaPlus keeps longer study history while membership access remains active.</p></section>;
}
