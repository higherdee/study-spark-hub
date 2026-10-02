import { Download, Share, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useInstall } from "@/hooks/use-install";

export function InstallButton({ variant = "outline", size = "sm", className }: { variant?: "outline" | "default" | "secondary" | "ghost"; size?: "sm" | "lg" | "default"; className?: string }) {
  const { canPrompt, installed, ios, install } = useInstall();
  const [help, setHelp] = useState(false);
  if (installed) return null;

  async function onClick() {
    if (canPrompt) {
      const ok = await install();
      if (ok) toast.success("Syllaboss is installed on your device");
      return;
    }
    setHelp(true);
  }

  return (
    <>
      <Button variant={variant} size={size} className={className} onClick={onClick}>
        <Download /> Install app
      </Button>
      {help && (
        <div className="fixed inset-0 z-50 grid place-items-end bg-foreground/40 p-4 sm:place-items-center" onClick={() => setHelp(false)}>
          <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-soft" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between">
              <h2 className="font-display text-2xl font-semibold">Install Syllaboss</h2>
              <Button variant="ghost" size="icon" aria-label="Close" onClick={() => setHelp(false)}><X /></Button>
            </div>
            {ios ? (
              <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
                <li>Open this site in Safari.</li>
                <li>Tap the <Share className="inline size-4" /> Share button.</li>
                <li>Choose <span className="font-semibold text-foreground">Add to Home Screen</span>.</li>
              </ol>
            ) : (
              <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
                <li>Open this site in Chrome or Edge (not inside another app).</li>
                <li>Open the browser menu (⋮).</li>
                <li>Tap <span className="font-semibold text-foreground">Install app</span> or <span className="font-semibold text-foreground">Add to Home screen</span>.</li>
              </ol>
            )}
          </div>
        </div>
      )}
    </>
  );
}
