import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
  Check,
  ChevronRight,
  Copy,
  Download,
  GraduationCap,
  HelpCircle,
  LogOut,
  Share2,
  Shield,
  Smartphone,
  Sparkles,
  Timer,
  User,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import {
  formatNaira,
  PLAN_NAME,
  POINTS_INSTALL_APP_BONUS,
  POINTS_NAME,
  POINTS_REFERRAL_REGISTRATION,
  POINTS_REFERRAL_UPGRADE,
  POINTS_UPGRADE_BONUS,
} from "@/lib/constants";
import { useProfile } from "@/lib/profile";
import {
  claimAppInstallBonusServerFn,
  upgradeToSyllaPlusServerFn,
} from "@/lib/upload.functions";

export const Route = createFileRoute("/_authenticated/dashboard/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Syllaboss" },
      { name: "description", content: "Account settings, SyllaPlus, referrals and preferences." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { user, signOut } = useAuth();
  const { data: profile } = useProfile();
  const qc = useQueryClient();

  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [upgrading, setUpgrading] = useState(false);
  const [claimingInstall, setClaimingInstall] = useState(false);

  const refCode = profile?.referral_code ?? `SYLLA-${(user?.id ?? "").slice(-6).toUpperCase()}`;
  const origin = typeof window !== "undefined" ? window.location.origin : "https://syllaboss.com";
  const refLink = `${origin}/auth?mode=signup&ref=${refCode}`;

  const copyCode = () => {
    navigator.clipboard.writeText(refCode);
    setCopiedCode(true);
    toast.success("Referral code copied to clipboard!");
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const copyLink = () => {
    navigator.clipboard.writeText(refLink);
    setCopiedLink(true);
    toast.success("Referral link copied!");
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const shareWhatsApp = () => {
    const text = encodeURIComponent(
      `Join me on Syllaboss to get past questions, lecture notes and earn SyllaPoints! Use my code ${refCode} to get 200 welcome bonus points: ${refLink}`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, "_blank");
  };

  const handleUpgrade = async () => {
    if (!user) return;
    setUpgrading(true);
    try {
      await upgradeToSyllaPlusServerFn({ data: { userId: user.id } });
      toast.success(`🎉 Welcome to ${PLAN_NAME}! +${POINTS_UPGRADE_BONUS} ${POINTS_NAME} credited.`);
      await qc.invalidateQueries({ queryKey: ["profile"] });
      await qc.invalidateQueries({ queryKey: ["ledger"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to upgrade");
    } finally {
      setUpgrading(false);
    }
  };

  const handleClaimInstall = async () => {
    if (!user) return;
    setClaimingInstall(true);
    try {
      const res = await claimAppInstallBonusServerFn({ data: { userId: user.id } });
      if (res.claimed) {
        toast.success(`🎉 +${POINTS_INSTALL_APP_BONUS} ${POINTS_NAME} added for app installation!`);
        await qc.invalidateQueries({ queryKey: ["profile"] });
        await qc.invalidateQueries({ queryKey: ["ledger"] });
      } else {
        toast.info("Install bonus already claimed!");
      }
    } catch (err) {
      toast.error("Could not claim install bonus");
    } finally {
      setClaimingInstall(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <PageHeader
        eyebrow="Preferences & Plan"
        title="Settings"
      />

      {/* SyllaPlus Plan Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-amber-600/5 to-card p-6 shadow-soft">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400">
                <Sparkles className="size-4" />
              </span>
              <h2 className="font-display text-xl font-bold text-foreground">
                {profile?.sylla_plus ? `${PLAN_NAME} Active` : `${PLAN_NAME} Membership`}
              </h2>
            </div>
            <p className="text-sm text-muted-foreground max-w-md">
              {profile?.sylla_plus
                ? "You enjoy ad-free study, priority AI Boss assistance, and unlimited material downloads."
                : `Upgrade to ${PLAN_NAME} to unlock instant +${POINTS_UPGRADE_BONUS} ${POINTS_NAME}, ad-free reading, and faster AI study sessions.`}
            </p>
          </div>

          {!profile?.sylla_plus ? (
            <Button
              onClick={handleUpgrade}
              disabled={upgrading}
              className="rounded-full bg-amber-600 text-white hover:bg-amber-700 shadow-md font-semibold text-xs px-5 h-9"
            >
              {upgrading ? "Upgrading..." : `Upgrade (+${POINTS_UPGRADE_BONUS} pts)`}
            </Button>
          ) : (
            <span className="rounded-full bg-amber-500/20 border border-amber-500/40 px-3 py-1 text-xs font-semibold text-amber-700 dark:text-amber-300">
              Active Member
            </span>
          )}
        </div>
      </div>

      {/* iOS Grouped Inset Card: Profile & Identity */}
      <div className="space-y-2">
        <p className="px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Student Profile
        </p>
        <div className="rounded-2xl border border-border/60 bg-card overflow-hidden divide-y divide-border/40 shadow-xs">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <div className="grid size-9 place-items-center rounded-full bg-primary/10 text-primary">
                <User className="size-4" />
              </div>
              <div>
                <p className="text-sm font-medium">{profile?.full_name || "Name not set"}</p>
                <p className="text-xs text-muted-foreground">{profile?.email || user?.email}</p>
              </div>
            </div>
            <span className="text-xs text-muted-foreground font-mono">ID: {user?.id.slice(-8)}</span>
          </div>

          <div className="flex items-center justify-between p-4 text-sm">
            <span className="text-muted-foreground">Institution</span>
            <span className="font-medium text-foreground">{profile?.institution || "Not selected"}</span>
          </div>

          <div className="flex items-center justify-between p-4 text-sm">
            <span className="text-muted-foreground">Course</span>
            <span className="font-medium text-foreground">{profile?.course || "Not selected"}</span>
          </div>

          <div className="flex items-center justify-between p-4 text-sm">
            <span className="text-muted-foreground">Department</span>
            <span className="font-medium text-foreground">{profile?.department || "General"}</span>
          </div>

          <div className="flex items-center justify-between p-4 text-sm">
            <span className="text-muted-foreground">Academic Level</span>
            <span className="font-medium text-foreground">{profile?.level || "100 Level"}</span>
          </div>
        </div>
      </div>

      {/* iOS Grouped Inset Card: Refer & Earn */}
      <div className="space-y-2">
        <p className="px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Referrals & Cash Rewards
        </p>
        <div className="rounded-2xl border border-border/60 bg-card p-5 space-y-4 shadow-xs">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="font-semibold text-foreground text-sm flex items-center gap-1.5">
                <Share2 className="size-4 text-primary" /> Share & Earn {POINTS_NAME}
              </h3>
              <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                Earn <strong className="text-foreground">+{POINTS_REFERRAL_REGISTRATION} {POINTS_NAME}</strong> when a friend registers, plus an extra{" "}
                <strong className="text-foreground">+{POINTS_REFERRAL_UPGRADE} {POINTS_NAME}</strong> when they upgrade to {PLAN_NAME}!
              </p>
            </div>
          </div>

          {/* Referral Code Box */}
          <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
            <div className="flex w-full flex-1 items-center justify-between rounded-xl border border-border bg-secondary/40 px-3.5 py-2">
              <span className="font-mono text-sm font-semibold text-foreground tracking-wider">{refCode}</span>
              <button
                onClick={copyCode}
                className="text-xs font-medium text-primary hover:underline flex items-center gap-1"
              >
                {copiedCode ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                {copiedCode ? "Copied" : "Copy code"}
              </button>
            </div>

            <div className="flex w-full sm:w-auto gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={copyLink}
                className="rounded-xl flex-1 sm:flex-initial text-xs h-9"
              >
                {copiedLink ? <Check className="size-3.5 mr-1" /> : <Copy className="size-3.5 mr-1" />}
                Copy link
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={shareWhatsApp}
                className="rounded-xl flex-1 sm:flex-initial text-xs h-9 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                WhatsApp
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* iOS Grouped Inset Card: Study & Focus Stats */}
      <div className="space-y-2">
        <p className="px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Study Session & Timer
        </p>
        <div className="rounded-2xl border border-border/60 bg-card overflow-hidden divide-y divide-border/40 shadow-xs">
          <div className="flex items-center justify-between p-4 text-sm">
            <div className="flex items-center gap-2.5">
              <Timer className="size-4 text-primary" />
              <span className="text-muted-foreground">Total Study Time</span>
            </div>
            <span className="font-semibold text-foreground">{profile?.study_minutes ?? 0} minutes</span>
          </div>

          <div className="flex items-center justify-between p-4 text-sm">
            <span className="text-muted-foreground">Reward Rate</span>
            <span className="font-medium text-foreground">+5 {POINTS_NAME} per 30 minutes</span>
          </div>

          <div className="flex items-center justify-between p-4 text-sm">
            <span className="text-muted-foreground">Inactivity Timeout</span>
            <span className="font-medium text-emerald-600 dark:text-emerald-400">
              Auto-pauses after 1 hour idle
            </span>
          </div>
        </div>
      </div>

      {/* iOS Grouped Inset Card: App Installation */}
      <div className="space-y-2">
        <p className="px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Mobile App Experience
        </p>
        <div className="rounded-2xl border border-border/60 bg-card p-4 flex items-center justify-between gap-4 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="grid size-9 place-items-center rounded-full bg-primary/10 text-primary">
              <Smartphone className="size-4" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Home Screen App</p>
              <p className="text-xs text-muted-foreground">
                {profile?.app_installed ? "Install bonus already claimed" : `Install to earn +${POINTS_INSTALL_APP_BONUS} ${POINTS_NAME}`}
              </p>
            </div>
          </div>

          {!profile?.app_installed ? (
            <Button
              variant="outline"
              size="sm"
              onClick={handleClaimInstall}
              disabled={claimingInstall}
              className="rounded-full text-xs h-8"
            >
              {claimingInstall ? "Claiming..." : `Claim +${POINTS_INSTALL_APP_BONUS} pts`}
            </Button>
          ) : (
            <span className="flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
              <Check className="size-3.5" /> Claimed
            </span>
          )}
        </div>
      </div>

      {/* iOS Destructive Action: Sign Out */}
      <div className="pt-2 pb-6">
        <div className="rounded-2xl border border-destructive/20 bg-destructive/5 overflow-hidden shadow-xs">
          <button
            onClick={signOut}
            className="w-full flex items-center justify-center gap-2 p-3.5 text-sm font-semibold text-destructive hover:bg-destructive/10 transition-colors"
          >
            <LogOut className="size-4" /> Sign out of Syllaboss
          </button>
        </div>
      </div>
    </div>
  );
}
