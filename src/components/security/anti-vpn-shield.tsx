import { useState } from "react";
import { ShieldAlert, RefreshCw, Lock, Globe2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AntiVpnShieldProps {
  isOpen: boolean;
  ip?: string;
  reason?: string;
  onRecheck: () => void;
}

export function AntiVpnShield({ isOpen, ip, reason, onRecheck }: AntiVpnShieldProps) {
  const [checking, setChecking] = useState(false);

  if (!isOpen) return null;

  const handleRecheck = async () => {
    setChecking(true);
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("syllaboss_geo_telemetry_v1");
    }
    setTimeout(() => {
      onRecheck();
      setChecking(false);
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/85 p-4 backdrop-blur-xl animate-fade-in select-none">
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-destructive/40 bg-card p-6 sm:p-8 text-center shadow-2xl animate-scale-in">
        {/* Ambient red hazard glow */}
        <div className="absolute -top-24 -left-24 size-56 rounded-full bg-destructive/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 size-56 rounded-full bg-destructive/15 blur-3xl pointer-events-none" />

        <div className="mx-auto flex size-16 items-center justify-center rounded-2xl border border-destructive/30 bg-destructive/10 text-destructive shadow-lg shadow-destructive/10">
          <ShieldAlert className="size-8" />
        </div>

        <div className="mt-5">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-destructive/30 bg-destructive/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-destructive">
            <Lock className="size-3" /> Security Enforcement
          </span>
          <h2 className="mt-3 font-display text-2xl font-bold tracking-tight text-foreground">
            VPN or Proxy Connection Detected
          </h2>
          <p className="mt-2 text-xs sm:text-sm text-muted-foreground leading-relaxed">
            Syllaboss requires a verified direct connection to ensure academic assessment integrity, copyright compliance, and secure regional currency billing.
          </p>
        </div>

        {/* Diagnostic info */}
        <div className="mt-5 rounded-2xl border border-border/80 bg-secondary/40 p-3.5 text-left text-xs space-y-2">
          <div className="flex items-center justify-between text-muted-foreground">
            <span>Detection Flag:</span>
            <span className="font-semibold text-destructive">{reason || "Proxy / Datacenter IP"}</span>
          </div>
          {ip && (
            <div className="flex items-center justify-between text-muted-foreground">
              <span>Network IP Address:</span>
              <span className="font-mono font-medium text-foreground">{ip}</span>
            </div>
          )}
          <div className="flex items-center justify-between text-muted-foreground">
            <span>Access Policy:</span>
            <span className="font-medium text-foreground">Strict Direct Connect Only</span>
          </div>
        </div>

        <div className="mt-6 space-y-3">
          <Button
            onClick={handleRecheck}
            disabled={checking}
            className="w-full h-11 rounded-xl bg-destructive text-white hover:bg-destructive/90 font-semibold text-xs shadow-md shadow-destructive/20 active:scale-[0.98]"
          >
            <RefreshCw className={`size-4 mr-2 ${checking ? "animate-spin" : ""}`} />
            {checking ? "Re-verifying Connection..." : "I've Turned Off My VPN — Re-verify"}
          </Button>

          <p className="text-[11px] text-muted-foreground leading-snug">
            Please disconnect from NordVPN, ExpressVPN, Warp, or any active proxy server, then click the re-verify button above.
          </p>
        </div>
      </div>
    </div>
  );
}
